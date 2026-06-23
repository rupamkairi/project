# Ecommerce — Phase 6: Backend Logic

## Goal

Define all hooks, scheduled jobs, FSM registrations, rule engine configs,
and compensating-action patterns for the ecommerce compose.

---

## 6.1 FSM Registrations

Order and fulfillment FSMs run against `pipeline_stages` rows. The `transactions.stage_id` field records the current stage. Use `seedPipeline()` to create these pipelines on first boot.

### Order FSM

Seed: `await seedPipeline(orgId, "eco.order", [{ name: "Draft" }, { name: "Placed" }, { name: "Fulfilling" }, { name: "Shipped" }, { name: "Delivered" }, { name: "Completed" }, { name: "Cancelled" }, { name: "Refunded" }])`

```
Pipeline entityType: eco.order
Stages: Draft | Placed | Fulfilling | Shipped | Delivered | Completed | Cancelled | Refunded

Transitions:
  Draft → Placed          trigger: payment session created (checkout)
  Placed → Fulfilling     trigger: payment webhook (onPaymentReceived) — inventory allocated
  Fulfilling → Shipped    trigger: eco_fulfillments.stageId → shipped
  Shipped → Delivered     trigger: eco_fulfillments.stageId → delivered
  Delivered → Completed   trigger: auto-complete job (7 days after delivered)
  Completed → Refunded    trigger: return fully processed
  Placed | Fulfilling → Cancelled  guard: admin cancels; releases inventory
```

### Return FSM

```
Machine ID: ecommerce.return
States: requested | approved | rejected | received | processed | refunded

Transitions:
  requested → approved    guard: admin approves
  requested → rejected    guard: admin rejects (requires reason)
  approved → received     guard: warehouse staff marks received
  received → processed    guard: items inspected
  processed → refunded    trigger: payment.refund succeeds + ledger entry
```

### Fulfillment FSM

Seed: `await seedPipeline(orgId, "eco.fulfillment", [{ name: "Pending" }, { name: "Shipped" }, { name: "In Transit" }, { name: "Delivered" }, { name: "Returned" }])`

`eco_fulfillments.stageId` points to the current `pipeline_stages` row for `entityType = "eco.fulfillment"`.

```
Pipeline entityType: eco.fulfillment
Stages: Pending | Shipped | In Transit | Delivered | Returned

Transitions:
  Pending → Shipped       trigger: admin updates with tracking number
  Shipped → In Transit    trigger: carrier webhook (first scan)
  In Transit → Delivered  trigger: carrier webhook (delivery scan)
  Pending → Returned      guard: order cancelled before shipping
```

### Swap FSM

```
Machine ID: ecommerce.swap
States: pending | confirmed | return_received | fulfilled | cancelled

Transitions:
  pending → confirmed          trigger: admin confirms + payment session if difference > 0
  confirmed → return_received  trigger: return items received
  return_received → fulfilled  trigger: new items shipped
  any → cancelled              guard: before fulfilled
```

---

## 6.2 Event Hooks

File: `composes/ecommerce/server/src/hooks/index.ts`

### `ecommerce.order.paid` (fired by onPaymentReceived)

- Ledger: record payment
- FSM: order pending → processing
- Workflow: start ORDER_FULFILLMENT
- Notification: order confirmation email to customer

### `ecommerce.fulfillment.shipped`

```typescript
bus.on("ecommerce.fulfillment.shipped", async (event) => {
  const { orderId, trackingNumber, estimatedDelivery, carrierId } = event.payload;

  // 1. Order FSM: fulfillment → shipped
  await mediator.send({ type: "ecommerce.transitionOrder", orderId, to: "shipped" });

  // 2. Notification: shipping confirmation
  await mediator.send({
    type: "notification.send",
    templateId: "ecommerce.shipping-confirmation",
    context: { orderId, trackingNumber, estimatedDelivery },
  });

  // 3. Analytics: track shipment event
  await mediator.send({ type: "analytics.captureEvent", name: "order.shipped", props: { orderId, carrierId } });
});
```

### `ecommerce.fulfillment.delivered`

```typescript
bus.on("ecommerce.fulfillment.delivered", async (event) => {
  const { orderId } = event.payload;

  // Order FSM: shipped → delivered
  await mediator.send({ type: "ecommerce.transitionOrder", orderId, to: "delivered" });

  // Notification: delivery confirmation
  await mediator.send({ type: "notification.send", templateId: "ecommerce.delivered", context: { orderId } });
});
```

### `ecommerce.return.requested`

```typescript
bus.on("ecommerce.return.requested", async (event) => {
  const { returnId, orderId, customerId } = event.payload;

  // Notify support team
  await mediator.send({
    type: "notification.send",
    templateId: "ecommerce.return-requested-admin",
    recipientRole: "eco:support",
    context: { returnId, orderId },
  });

  // Notify customer: return received
  await mediator.send({
    type: "notification.send",
    templateId: "ecommerce.return-confirmation",
    recipientId: customerId,
    context: { returnId, orderId },
  });
});
```

### `ecommerce.return.refunded`

```typescript
bus.on("ecommerce.return.refunded", async (event) => {
  const { returnId, orderId, refundAmount, customerId } = event.payload;

  // Order FSM: completed → refunded (if fully refunded)
  // Ledger: issue refund entry
  await mediator.send({ type: "ledger.issueRefund", orderId, amount: refundAmount });

  // Notification: refund issued email
  await mediator.send({
    type: "notification.send",
    templateId: "ecommerce.refund-issued",
    recipientId: customerId,
    context: { refundAmount, orderId },
  });
});
```

### `cat.item.published` (from catalog module)

```typescript
bus.on("cat.item.published", async (event) => {
  const searchAdapter = bootRegistry.adapters.get<SearchAdapter>("search");
  await searchAdapter.sync("Product", event);
});
```

---

## 6.3 Scheduled Jobs

File: `composes/ecommerce/server/src/jobs/index.ts`

### `ecommerce.expire-pending-orders` — every 5 minutes

```typescript
// Find orders where status='pending' AND createdAt < now - 30min
// For each: onPaymentFailed(orderId) — releases inventory, cancels
```

### `ecommerce.abandoned-cart-recovery` — daily at 10:00 UTC

```typescript
// Find carts where updatedAt < now - 1h AND status='active' AND has items AND has customer email
// For each: send abandoned-cart-recovery notification (includes cart link)
// Mark cart as 'recovery_sent' to avoid duplicate sends
```

### `ecommerce.auto-complete-orders` — daily at 00:00 UTC

```typescript
// Find orders where status='delivered' AND deliveredAt < now - 7 days
// For each: transition FSM: delivered → completed
// Post completion analytics snapshot
```

### `ecommerce.low-stock-alerts` — every 30 minutes

```typescript
// For each variant with stock < reorder threshold:
// Emit eco.variant.lowStock event → notify eco:admin + eco:manager
```

### `ecommerce.sales-report-daily` — daily at 06:00 UTC

```typescript
// Aggregate: GMV, order count, AOV, refund amount for yesterday
// Store as analytics.Snapshot
// Email report to eco:admin recipients
```

### `ecommerce.process-scheduled-campaigns` — (if promotions module added)

```typescript
// Find promotions with scheduledStart < now AND status='scheduled'
// Activate via rule engine
```

### `ecommerce.carrier-tracking-poll` — every 4 hours

```typescript
// Find fulfillments where status='shipped' AND deliveredAt IS NULL
// For each: call FulfillmentAdapter.getTracking(fulfillmentId)
// Update status based on latest carrier event
// If delivered: emit ecommerce.fulfillment.delivered
```

---

## 6.4 Rule Engine Registrations

### `ecommerce.out-of-stock-prevention`

```typescript
{
  id: "ecommerce.out-of-stock-prevention",
  name: "Prevent adding out-of-stock variants to cart",
  condition: { op: "lte", field: "inventory.available", value: 0 },
  action: { type: "reject", message: "This item is out of stock" },
}
```

### `ecommerce.coupon-single-use-per-customer`

```typescript
{
  id: "ecommerce.coupon-single-use-per-customer",
  name: "Each coupon code can only be used once per customer",
  condition: {
    op: "and",
    conditions: [
      { op: "eq", field: "coupon.singleUsePerCustomer", value: true },
      { op: "gte", field: "coupon.usageByCustomer", value: 1 },
    ],
  },
  action: { type: "reject", message: "You have already used this coupon" },
}
```

### `ecommerce.flash-sale-validity`

```typescript
{
  id: "ecommerce.flash-sale-validity",
  name: "Flash sale price only valid within time window",
  condition: {
    op: "or",
    conditions: [
      { op: "lt", field: "priceList.validTo", value: "now" },
      { op: "gt", field: "priceList.validFrom", value: "now" },
    ],
  },
  action: { type: "exclude" }, // exclude flash-sale price list
}
```

### `ecommerce.return-window`

```typescript
{
  id: "ecommerce.return-window",
  name: "Returns only allowed within 30 days of delivery",
  condition: {
    op: "gt",
    field: "order.deliveredAt",
    value: { op: "subtract", field: "now", amount: 30, unit: "days" },
  },
  action: { type: "reject", message: "Return window has expired (30 days)" },
}
```

### `ecommerce.high-value-order-review`

```typescript
{
  id: "ecommerce.high-value-order-review",
  name: "Orders over 100,000 require manual review",
  condition: { op: "gte", field: "order.total.amount", value: 10000000 }, // 100,000 USD
  action: { type: "flag", flag: "requiresReview" },
}
```

---

## 6.5 Notification Templates

Seed file: `db/seed/notification-templates.seed.ts`

| Template ID | Trigger | Recipient | Channel |
|-------------|---------|-----------|---------|
| `ecommerce.order-confirmation` | order.paid | Customer | Email |
| `ecommerce.shipping-confirmation` | fulfillment.shipped | Customer | Email |
| `ecommerce.delivered` | fulfillment.delivered | Customer | Email |
| `ecommerce.return-confirmation` | return.requested | Customer | Email |
| `ecommerce.refund-issued` | return.refunded | Customer | Email |
| `ecommerce.payment-failed` | payment failed | Customer | Email |
| `ecommerce.abandoned-cart` | job: abandoned cart | Customer | Email |
| `ecommerce.low-stock-admin` | job: low stock | eco:admin | Email + In-app |
| `ecommerce.return-requested-admin` | return.requested | eco:support | In-app |
| `ecommerce.order-placed-admin` | order.paid (high-value) | eco:admin | Email + In-app |

---

## 6.6 Analytics Metrics Registration

Registered at compose boot via analytics module:

```typescript
const ECOMMERCE_METRICS = [
  { id: "eco.gmv",               name: "Gross Merchandise Value",    entity: "Order", field: "total.amount",  aggregation: "sum" },
  { id: "eco.order-count",       name: "Order Count",                entity: "Order", field: "id",           aggregation: "count" },
  { id: "eco.aov",               name: "Average Order Value",        entity: "Order", field: "total.amount",  aggregation: "avg" },
  { id: "eco.refund-rate",       name: "Refund Rate",                entity: "Return", computed: "returns/orders * 100" },
  { id: "eco.conversion-rate",   name: "Cart Conversion Rate",       entity: "Cart",  computed: "orders/carts * 100" },
  { id: "eco.cart-abandonment",  name: "Cart Abandonment Rate",      entity: "Cart",  computed: "(carts - orders) / carts * 100" },
  { id: "eco.inventory-turn",    name: "Inventory Turnover",         entity: "Inventory", computed: "sold_units / avg_stock" },
];
```
