# Phase 22 — Missed Integrations & Critical Pitfalls

---

## 22.1 KDS Latency: WebSocket, Not Polling

**Pitfall:** Using polling for KDS → 1-3s lag → kitchen misses orders during rush.

**Requirement:** KOT must appear on KDS within 1s of placement.

**Pattern:**
```typescript
// In order.placed hook:
bus.on("rst.order.placed", async ({ outletId, kots }) => {
  for (const kot of kots) {
    server.publish(
      `kds:${outletId}:${kot.station}`,
      JSON.stringify({ type: "new_kot", kot }),
    );
  }
});
```

**Web side must subscribe on mount, not poll.**

---

## 22.2 Ingredient Deduction: Inside DB Transaction

**Pitfall:** Deducting ingredients outside the order placement transaction → order commits but stock stays unchanged on error.

**Pattern — MTA version: order lines go to transaction_lines, ingredients deducted via inventory mediator, KOTs go to rst_kot:**
```typescript
// 1. Add order lines via commerce mediator (transaction_lines)
for (const item of itemRows) {
  await mediator.send({ type: "commerce.addLine", payload: { transactionId: orderId, itemId: item.itemId, qty: item.qty, unitPrice: item.unitPrice } });
}

// 2. Deduct ingredients via inventory mediator (cat_items type=stock_item)
for (const deduction of deductions) {
  await mediator.send({
    type: "inventory.deductStock",
    payload: { itemId: deduction.itemId, qty: deduction.qty, organizationId: orgId },
  });
}

// 3. Create KOTs via direct Drizzle on rst_kot (rst-owned table)
await db.insert(rstKot).values(kotRows);
```

---

## 22.3 Aggregator Webhook: Store Raw First

**Pitfall:** Processing webhook synchronously → aggregator times out at 90s → retries → duplicate orders.

**Pattern:**
```typescript
app.post("/restaurant/webhooks/swiggy/:outletCode", async ({ request, params }) => {
  const raw = await request.text();

  // Step 1: Store raw payload immediately (< 1ms)
  await db.insert(rstAggregatorWebhooks).values({
    id: createId(),
    source: "swiggy",
    outletCode: params.outletCode,
    rawPayload: raw,
    status: "pending",
  });

  // Step 2: Return 200 immediately
  // Step 3: Process asynchronously via job queue or background task
  processAggregatorWebhookAsync(raw, "swiggy", params.outletCode);

  return { status: "ack" };  // Must be < 90s from receipt
});
```

---

## 22.4 Aggregator: Idempotency on aggregatorOrderId

**Pitfall:** Aggregator retries a successful webhook → duplicate order created.

**Guard before ingestion:** Check `rst_aggregator_orders` table for existing `aggregatorOrderId` (unique constraint):
```typescript
// rst_aggregator_orders is an rst-owned detail table (not affected by MTA)
const existing = await db.query.rstAggregatorOrders.findFirst({
  where: eq(rstAggregatorOrders.aggregatorOrderId, normalizedOrder.aggregatorOrderId),
});

if (existing) {
  return { status: "already_processed", orderId: existing.internalOrderId };
}
```

---

## 22.5 Bill Split: Rounding to First Split

**Pitfall:** 3-way split of ₹100 → ₹33.33 each = ₹99.99. One rupee missing → bill never settles.

**Pattern:**
```typescript
function computeSplits(total: number, count: number): number[] {
  const base = Math.floor((total * 100) / count) / 100;
  const remainder = Math.round((total - base * count) * 100) / 100;
  return Array.from({ length: count }, (_, i) => i === 0 ? base + remainder : base);
}
// First split absorbs rounding remainder
```

---

## 22.6 Bill Settlement: Validate All Items Covered

**Pitfall:** Split bill request references only 3 of 4 items → one item lost.

**Guard:**
```typescript
const allItemIds = new Set(bill.items.map(i => i.id));
const coveredItemIds = new Set(splits.flatMap(s => s.itemIds));

for (const itemId of allItemIds) {
  if (!coveredItemIds.has(itemId)) {
    throw new ValidationError(`ITEM_NOT_COVERED:${itemId}`);
  }
}
// Also check no item appears in multiple splits
```

---

## 22.7 Shift Close: Outstanding Orders Guard

**Pitfall:** Shift closed with open orders still on tables → revenue not captured.

**Guard before shift.close:**
```typescript
// Orders are transactions (type="order") — count open orders via mediator or raw query on transactions
const openOrders = await mediator.query({
  type: "commerce.countTransactions",
  payload: {
    organizationId: orgId,
    type: "order",
    metaFilter: { outletId },
    stageNames: ["Placed", "Preparing", "Ready"],  // rst.order pipeline stages
  },
});

if (openOrders[0].count > 0) {
  throw new ConflictError("OPEN_ORDERS_EXIST", { count: openOrders[0].count });
}
```

---

## 22.8 Order Number Generation: Sequential

**Pitfall:** Using `ULID` for order numbers → non-sequential, confusing for kitchen.

**Pattern:**
```typescript
// Atomic increment via DB sequence
const seq = await db.execute(sql`
  UPDATE rst_order_sequences
  SET last_seq = last_seq + 1
  WHERE outlet_id = ${outletId}
  RETURNING last_seq
`);

const orderNumber = `ORD-${outletCode}-${new Date().getFullYear()}-${String(seq[0].last_seq).padStart(6, "0")}`;
```

KOT number: `KOT-{OUTLET_CODE}-{SHIFT_SEQ}` using shift-scoped sequence.

---

## 22.9 86'd Items: Broadcast to All Open POS Sessions

**Pitfall:** 86 toggle saved to DB but open POS sessions still show item as available.

**Pattern:**
```typescript
bus.on("rst.menu.item-86d", async ({ menuItemId, outletId, is86d }) => {
  server.publish(`pos:${outletId}`, JSON.stringify({
    type: "menu_item_86d",
    menuItemId,
    is86d,
  }));
});
```

POS subscribes to `pos:{outletId}` channel and updates cart/menu state locally.

---

## 22.10 Operating Hours: Timezone Awareness

**Pitfall:** `outletAcceptsOrders()` compares UTC time against `HH:MM` local hours → outlet rejects orders at wrong times.

**Pattern:**
```typescript
function isWithinOperatingHours(hours: DayHours, timezone: string): boolean {
  const now = new Date();
  const local = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return local >= hours.open && local < hours.close;
}
```

Store `outlet.timezone` (e.g. `Asia/Kolkata`) and pass to this function.

---

## 22.11 Rider Location: Debounce DB Writes

**Pitfall:** Rider app sends GPS every 5s → continuous DB writes per active rider.

**Pattern:** Same debounce pattern as LMS video heartbeat:
```typescript
const locationDebounce = new Map<string, NodeJS.Timeout>();

function scheduleLocationWrite(riderId: string, lat: string, lng: string) {
  const key = riderId;
  if (locationDebounce.has(key)) clearTimeout(locationDebounce.get(key)!);
  locationDebounce.set(key, setTimeout(async () => {
    // Riders are persons (type=rider) — update location in meta via mediator
    await mediator.send({ type: "identity.updatePersonMeta", payload: { personId: riderId, meta: { currentLocation: { lat, lng } } } });
    locationDebounce.delete(key);
  }, 5_000));
}
// Max 1 DB write per 5s per rider; WebSocket broadcast still happens immediately
```

---

## 22.12 Checklist Before Going Live

- [ ] `RST_SWIGGY_HMAC_SECRET` and `RST_ZOMATO_HMAC_SECRET` set in server env
- [ ] Aggregator webhook endpoints whitelisted in aggregator dashboards
- [ ] KDS tested with WebSocket (not SSE/polling)
- [ ] `locations.meta.lastOrderSeq` initialized to 0 for each outlet location on seed
- [ ] `seedPipeline(orgId, "rst.order", [...])` and `seedPipeline(orgId, "rst.delivery", [...])` run before first order
- [ ] Ingredient deduction tested with concurrent requests (race condition)
- [ ] Bill split rounding verified for 3-way and 5-way splits
- [ ] Shift close guard tested with open orders present
- [ ] Operating hours timezone tested for DST boundary days
- [ ] Rider `isBusy` reset on delivery completion and failure
- [ ] 86'd item broadcast tested on open POS tab without page refresh
