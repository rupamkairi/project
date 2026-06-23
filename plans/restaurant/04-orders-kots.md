# Phase 4 — Orders & KOTs

---

## 4.1 Order Routes

```
POST   /restaurant/orders                      rst:staff
GET    /restaurant/orders                      rst:staff
GET    /restaurant/orders/:id                  rst:staff
POST   /restaurant/orders/:id/place            rst:staff
POST   /restaurant/orders/:id/accept           rst:manager | rst:kitchen
POST   /restaurant/orders/:id/reject           rst:manager
POST   /restaurant/orders/:id/items            rst:staff
DELETE /restaurant/orders/:id/items/:itemId    rst:staff
GET    /restaurant/orders/live                 rst:staff (SSE stream)
```

---

## 4.2 Create & Place Order

**Create draft order:**

```typescript
// POST /restaurant/orders
{
  outletId: string;
  type: "dine-in" | "takeaway" | "delivery";
  tableId?: string;         // dine-in
  coverCount?: number;      // dine-in
  customerId?: string;
  deliveryAddress?: object; // delivery
  specialInstructions?: string;
  couponCode?: string;
}
```

On create:
1. Validate outlet accepts orders (type-check from phase 3)
2. If dine-in: validate table `status = 'available'`, set `status = 'occupied'`
3. `status = 'draft'`
4. Assign `orderNumber = ORD-{OUTLET_CODE}-{YEAR}-{SEQ}` (atomic increment on `locations.meta.lastOrderSeq` for the outlet)

**Place order (`/place`):**

Body: `{ items: { menuItemId, qty, modifiers, note }[] }`

Guards:
1. Status = `draft`
2. At least 1 item
3. Each item validated: exists, belongs to outlet, `isAvailable = true`
4. Modifier selections validated against modifier definitions (required fields, min/max select)

On place:
1. Insert `transaction_lines` (via `commerce.addLine` mediator call)
2. Compute `subtotal`, `tax`, `deliveryFee`, `total`
3. Apply coupon if present
4. Ingredient deduction (see section 4.4)
5. Status → `placed`
6. Emit `rst.order.placed`
7. Trigger KOT creation (section 4.5)
8. Emit `rst.kds.new-order` → WebSocket broadcast to KDS

---

## 4.3 Order FSM

```
draft ──[order.place]──► placed
  guard: items present, outlet open, items available
  entry: ingredient deduction, KOT creation, KDS broadcast

placed ──[order.accept]──► accepted
  guard: role = kitchen-staff or manager
  entry: estimatedReadyAt = now + prep time

placed ──[order.reject]──► rejected
  guard: role = manager
  entry: reverse ingredient stock, notify customer

accepted ──[order.start-prep]──► preparing
  entry: all KOTs → preparing

preparing ──[order.ready]──► ready
  guard: all KOTs status = 'ready'
  entry: notify waiter (dine-in) or notify delivery (delivery)

ready ──[order.serve]──► served            (dine-in)
ready ──[order.dispatch]──► out-for-delivery  (delivery)
  entry: create rst_delivery record

served ──[order.complete]──► completed
out-for-delivery ──[delivery.delivered]──► completed
  entry: update table status to 'dirty' (dine-in), settle bill, update analytics
```

---

## 4.4 Ingredient Deduction (Transactional)

On `order.place`, inside DB transaction:

```typescript
async function deductIngredients(tx: Tx, outletId: string, items: OrderItem[]): Promise<void> {
  for (const item of items) {
    const recipe = await tx.query.rstRecipes.findFirst({
      where: eq(rstRecipes.menuItemId, item.menuItemId),
    });
    if (!recipe) continue;  // no recipe = no deduction

    for (const ingredient of recipe.ingredients) {
      const needed = ingredient.qty * item.qty;

      // Ingredients are cat_items (type=stock_item) — stock tracked in meta.currentStock
      // Use inventory module via mediator for deduction to keep stock consistent
      const result = await mediator.send({
        type: "inventory.deductStock",
        payload: {
          itemId: ingredient.itemId,  // cat_items.id (stock_item)
          qty: needed,
          organizationId: orgId,
        },
      });

      if (result.length === 0) {
        throw new ConflictError(
          "INSUFFICIENT_STOCK",
          `Insufficient stock for ingredient in ${item.name}`
        );
      }
    }
  }
}
```

If transaction fails: all deductions rolled back automatically. Order not placed.

---

## 4.5 KOT Creation

On `order.place`, group order items by `station`:

```typescript
async function createKots(tx: Tx, order: Order, items: OrderItem[]): Promise<void> {
  const byStation = groupBy(items, (i) => i.station ?? "default");

  for (const [station, stationItems] of Object.entries(byStation)) {
    const kotNumber = await nextKotNumber(tx, order.outletId);  // atomic seq

    const kot = await tx.insert(rstKots).values({
      orderId: order.id,
      outletId: order.outletId,
      kotNumber,
      status: "sent",
      station,
    }).returning();

    await tx.insert(rstKotItems).values(
      stationItems.map((item) => ({
        kotId: kot[0].id,
        orderItemId: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        qty: item.qty,
        modifiers: item.modifiers.map((m) => m.option),
        status: "pending",
      }))
    );
  }
}
```

KOT number format: `KOT-{OUTLET_CODE}-{SHIFT_SEQ}` — reset per shift.

---

## 4.6 KOT Routes

```
GET    /restaurant/kots                     rst:kitchen
GET    /restaurant/kots/:id                 rst:kitchen
POST   /restaurant/kots/:id/accept          rst:kitchen
POST   /restaurant/kots/:id/start           rst:kitchen
POST   /restaurant/kots/:id/ready           rst:kitchen
POST   /restaurant/kots/:id/cancel          rst:manager
```

**KOT FSM:**
```
sent ──[kot.accept]──► accepted
  guard: role = kitchen-staff or manager
  entry: acceptedAt = now()

accepted ──[kot.start]──► preparing
  entry: prepStartAt = now()

preparing ──[kot.ready]──► ready
  entry: readyAt = now()
  side-effect: check if all KOTs for this order = 'ready' → emit rst.order.all-kots-ready

sent | accepted | preparing ──[kot.cancel]──► cancelled
  guard: role = manager
  entry: void associated order items, reverse ingredient deduction
```

**KDS broadcast (< 1s target):**

On every KOT status change:
```typescript
bus.emit("rst.kds.kot-update", { kotId, status, outletId, station });
// WebSocket handler picks up and pushes to all KDS clients subscribed to outletId+station
```

---

## 4.7 Add Items to Existing Order

`POST /restaurant/orders/:id/items`

Body: `{ items: { menuItemId, qty, modifiers?, note? }[] }`

Guards:
1. Order status = `draft` | `placed` | `accepted` | `preparing`
2. Items validated same as place

Creates a new KOT with `priority = 'normal'` (or `'rush'` if order already serving).
Deducts ingredients.

---

## 4.8 Live Order Stream

`GET /restaurant/orders/live`

Server-Sent Events. Filter by `outletId` from auth context.

Events:
- `order.placed` — new order created
- `order.status-update` — status changed
- `kot.update` — KOT status changed
- `item.86d` — menu item just marked unavailable

Clients reconnect on disconnect. Each event includes full order object (not delta).
