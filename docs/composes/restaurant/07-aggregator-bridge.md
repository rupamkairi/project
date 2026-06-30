# Phase 7 — Aggregator Bridge

---

## 7.1 Aggregator Webhook Routes

```
POST   /restaurant/webhooks/swiggy/:outletCode     public (HMAC-verified)
POST   /restaurant/webhooks/zomato/:outletCode     public (HMAC-verified)
POST   /restaurant/webhooks/ubereats/:outletCode   public (HMAC-verified)
GET    /restaurant/aggregator-orders               rst:manager
GET    /restaurant/aggregator-orders/:id           rst:manager
POST   /restaurant/aggregator-orders/:id/accept    rst:manager
POST   /restaurant/aggregator-orders/:id/reject    rst:manager
```

SLA: webhook must be acknowledged (HTTP 200) within 90 seconds or aggregator may cancel order and penalize outlet.

---

## 7.2 Webhook Security

Each aggregator uses HMAC-SHA256 signature verification:

```typescript
function verifySwiggySignature(rawBody: string, signature: string, secret: string): boolean {
  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
```

Apply to all aggregator webhook handlers before processing. Return HTTP 401 on invalid signature.

---

## 7.3 Normalization Layer

Each aggregator has different payload shapes. Normalize to internal `AggregatorOrderInput` before inserting:

**Swiggy normalization:**
```typescript
function normalizeSwiggyOrder(payload: SwiggyWebhookPayload, outletId: string): AggregatorOrderInput {
  return {
    source: "swiggy",
    aggregatorOrderId: payload.order_id,
    outletId,
    customer: {
      name: payload.delivery_address.name,
      phone: payload.delivery_address.mobile,
      address: `${payload.delivery_address.address}, ${payload.delivery_address.landmark}`,
    },
    items: payload.order_items.map(i => ({
      externalId: i.item_id,
      name: i.item_name,
      qty: i.quantity,
      unitPrice: i.item_price / 100,  // Swiggy sends paise
      modifiers: (i.customizations ?? []).map(c => ({ name: c.name, option: c.option, price: c.price / 100 })),
    })),
    subtotal: payload.order_total / 100,
    deliveryAddress: { lat: payload.delivery_address.lat, lng: payload.delivery_address.lng },
    specialInstructions: payload.instructions,
    estimatedDeliveryTime: payload.delivery_sla_mins,
  };
}
```

**Zomato normalization:**
```typescript
function normalizeZomatoOrder(payload: ZomatoWebhookPayload, outletId: string): AggregatorOrderInput {
  return {
    source: "zomato",
    aggregatorOrderId: payload.resId + "-" + payload.orderId,
    outletId,
    customer: {
      name: payload.customerName,
      phone: payload.customerPhone,
      address: payload.deliveryAddress,
    },
    items: payload.items.map(i => ({
      externalId: i.externalId,
      name: i.name,
      qty: i.quantity,
      unitPrice: parseFloat(i.price),
      modifiers: (i.addons ?? []).map(a => ({ name: a.groupName, option: a.name, price: parseFloat(a.price) })),
    })),
    subtotal: parseFloat(payload.totalCost),
    deliveryAddress: { lat: payload.lat, lng: payload.lng },
    specialInstructions: payload.specialInstructions,
    estimatedDeliveryTime: payload.etaMinutes,
  };
}
```

---

## 7.4 Ingestion Flow

```typescript
async function ingestAggregatorOrder(input: AggregatorOrderInput): Promise<void> {
  // 1. Idempotency — skip if already received
  const existing = await db.query.rstAggregatorOrders.findFirst({
    where: and(
      eq(rstAggregatorOrders.source, input.source),
      eq(rstAggregatorOrders.aggregatorOrderId, input.aggregatorOrderId)
    ),
  });
  if (existing) return;  // already processed, ack again without duplicate

  // 2. Store raw record immediately (ensures we can ack within 90s SLA)
  const aggOrder = await db.insert(rstAggregatorOrders).values({
    outletId: input.outletId,
    source: input.source,
    aggregatorOrderId: input.aggregatorOrderId,
    rawPayload: input,  // store original for debugging
    status: "received",
    receivedAt: new Date(),
  }).returning();

  // 3. Validate outlet is open — outlets are locations (type=outlet)
  const outlet = await mediator.query({ type: "location.getLocation", payload: { locationId: input.outletId } });
  if (outlet.status !== "active") {
    await rejectAggregatorOrder(aggOrder[0].id, "OUTLET_CLOSED");
    return;
  }

  // 4. Map aggregator items to internal menu items by externalId
  const itemMappings = await resolveMenuItems(input.items, input.outletId, input.source);
  const unmapped = itemMappings.filter(m => !m.menuItemId);
  if (unmapped.length > 0) {
    await rejectAggregatorOrder(aggOrder[0].id, `UNMAPPED_ITEMS: ${unmapped.map(m => m.name).join(", ")}`);
    return;
  }

  // 5. Create internal order — orders are transactions (type="order")
  const orderNumber = await nextOrderNumber(input.outletId);
  const placedStage = await getStageByName(outlet.organizationId, "rst.order", "Placed");
  const order = await mediator.send({
    type: "commerce.createTransaction",
    payload: {
      type: "order",
      organizationId: outlet.organizationId,
      stageId: placedStage.id,
      meta: {
        outletId: input.outletId,
        orderNumber,
        orderType: "delivery",
        source: input.source,
        deliveryAddress: input.deliveryAddress,
        specialInstructions: input.specialInstructions,
    aggregatorOrderId: aggOrder[0].id,
    subtotal: input.subtotal.toString(),
    total: input.subtotal.toString(),  // tax handled separately
  }).returning();

  // Insert items, deduct ingredients, create KOTs
  await placeOrderItems(order[0].id, itemMappings, input.items);

  // 6. Link internal order to agg record
  await db.update(rstAggregatorOrders)
    .set({ internalOrderId: order[0].id, status: "placed", acknowledgedAt: new Date() })
    .where(eq(rstAggregatorOrders.id, aggOrder[0].id));

  bus.emit("rst.order.placed", { orderId: order[0].id, source: input.source });
}
```

---

## 7.5 Reject Aggregator Order

```typescript
async function rejectAggregatorOrder(aggOrderId: string, reason: string): Promise<void> {
  await db.update(rstAggregatorOrders).set({
    status: "rejected",
    rejectionReason: reason,
    acknowledgedAt: new Date(),
  }).where(eq(rstAggregatorOrders.id, aggOrderId));

  // Call aggregator API to notify of rejection (each aggregator has different reject endpoint)
  // e.g. Swiggy: POST /api/v1/order/reject with { order_id, reason }
  // This call is best-effort — log failure but don't throw (we already acked the webhook)
}
```

---

## 7.6 Menu Item Mapping

Aggregator item IDs must be mapped to internal menu item IDs. Mapping stored in `cat_items.meta.aggregatorIds` jsonb (menu items are cat_items with type="menu_item"):

```json
{ "swiggy": "swg_12345", "zomato": "zmt_67890" }
```

Admin UI in admin app allows mapping: `PATCH /restaurant/admin/menu/:id/aggregator-ids`

```typescript
async function resolveMenuItems(items: AggregatorItem[], outletId: string, source: string, orgId: string) {
  return Promise.all(items.map(async (item) => {
    // Menu items are cat_items (type=menu_item) — query via mediator
    const menuItem = await mediator.query({
      type: "catalog.findItemByExternalId",
      payload: { organizationId: orgId, type: "menu_item", source, externalId: item.externalId },
    });
    return { ...item, menuItemId: menuItem?.id ?? null };
  }));
}
```

---

## 7.7 Manual Review Flow

`POST /restaurant/aggregator-orders/:id/accept`

Marks `status = 'acknowledged'`. Can be used when auto-processing failed.

`POST /restaurant/aggregator-orders/:id/reject`

Body: `{ reason: string }`. Calls aggregator rejection API.

---

## 7.8 Aggregator ID Configuration

Each outlet (locations record, type="outlet") has `meta.aggregatorIds` jsonb: `{ swiggy: "outletId", zomato: "resId", ubereats: "storeId" }`.

`outletCode` maps to `locations.code` (where type="outlet"). Lookup outlet by code to get `locationId` and aggregator secret.

Webhook URL routing: `POST /restaurant/webhooks/swiggy/:outletCode`

`outletCode` maps to `rstOutlets.code`. Lookup outlet by code to get `outletId` and aggregator secret.
