# Compose — Ecommerce System

## Layer 3 of Core → Module → Compose

---

## What is a Compose?

A **Compose** is a named, deployable application. It selects the Modules it needs, wires them together through Hooks and Rules, declares its API surface, and enforces exactly which actor roles can reach which endpoints.

A Compose is **never** a framework extension or a new abstraction layer. It is configuration and orchestration — nothing more.

---

## Ecommerce Compose Overview

```
Compose ID:     ecommerce
Version:        1.0.0
Modules Used:   identity, catalog, inventory, ledger, workflow, geo, notification, analytics
Apps Served:    StoreAdmin  →  internal management interface
                Storefront  →  customer-facing interface
```

---

## 1. Module Selection & Configuration

```typescript
const EcommerceCompose: ComposeDefinition = {
  id: "ecommerce",
  name: "Ecommerce Platform",
  modules: [
    "identity",
    "catalog",
    "inventory",
    "ledger",
    "workflow",
    "geo",
    "notification",
    "analytics",
  ],

  // Module-level overrides scoped to this Compose
  moduleConfig: {
    catalog: {
      itemLabel: "Product", // rename generic "Item" to "Product" in this Compose
      enableVariants: true,
      enablePriceLists: true,
    },
    inventory: {
      trackingMode: "variant", // per-variant stock tracking
      allowBackorder: false,
    },
    ledger: {
      baseCurrency: "INR",
      supportedCurrencies: ["INR", "USD", "EUR"],
      defaultAccounts: {
        revenue: "ACC-SALES-REVENUE",
        tax: "ACC-TAX-COLLECTED",
        refunds: "ACC-REFUNDS",
        paymentReceivable: "ACC-PAYMENT-RECEIVABLE",
      },
    },
    geo: {
      enableDeliveryZones: true,
      enablePickupLocations: true,
    },
  },
};
```

---

## 2. Actor Roles & Permission Model

### Role Definitions

| Role              | Who                      | Scope                          |
| ----------------- | ------------------------ | ------------------------------ |
| `super-admin`     | Platform owner           | Global — all orgs              |
| `store-admin`     | Merchant / Store manager | Org-scoped — full store access |
| `store-staff`     | Warehouse, support staff | Org-scoped — limited           |
| `customer`        | Registered buyer         | Self-scoped — own data only    |
| `guest`           | Anonymous visitor        | Public — read-only catalog     |
| `api-integration` | External system API key  | Declared scopes only           |

### Permission Matrix

```
Format: resource:action — ✓ allowed, — denied, ◑ own-only

                              super-admin  store-admin  store-staff  customer   guest
─────────────────────────────────────────────────────────────────────────────────────
catalog:read                      ✓            ✓            ✓           ✓         ✓
catalog:create                    ✓            ✓            —           —         —
catalog:update                    ✓            ✓            —           —         —
catalog:delete                    ✓            ✓            —           —         —
catalog:publish                   ✓            ✓            —           —         —

inventory:read                    ✓            ✓            ✓           —         —
inventory:adjust                  ✓            ✓            ✓           —         —
inventory:transfer                ✓            ✓            ✓           —         —

order:create                      ✓            ✓            —           ✓         —
order:read                        ✓            ✓            ✓           ◑         —
order:update-status               ✓            ✓            ✓           —         —
order:cancel                      ✓            ✓            —           ◑         —
order:refund                      ✓            ✓            —           —         —

ledger:read                       ✓            ✓            —           —         —
ledger:post                       ✓            —            —           —         —

actor:manage                      ✓            ✓            —           —         —
actor:read-self                   —            —            —           ✓         —

analytics:read                    ✓            ✓            —           —         —

notification:manage               ✓            ✓            —           —         —

address:manage                    ✓            ✓            —           ◑         —

coupon:create                     ✓            ✓            —           —         —
coupon:apply                      ✓            ✓            —           ✓         —

review:create                     —            —            —           ✓         —
review:read                       ✓            ✓            ✓           ✓         ✓
review:moderate                   ✓            ✓            —           —         —
```

---

## 3. Ecommerce Entity Extensions

These entities are composed-level extensions — they combine Module primitives into business objects specific to e-commerce.

### Order (composed from: ledger + catalog + inventory + workflow)

```typescript
// Order is an entity that the Compose defines by wiring modules together
// It is NOT a new Module — it lives in the Compose layer

interface Order extends Entity {
  customerId: ID;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  couponCode?: string;
  discount: Money;
  subtotal: Money;
  tax: Money;
  shippingFee: Money;
  total: Money;
  ledgerTransactionId?: ID; // linked ledger entry
  workflowInstanceId?: ID; // linked fulfillment workflow
  gatewayRef?: string; // payment gateway order/session ID
  notes?: string;
}

type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
```

### Order FSM

```
pending_payment
  → payment_failed        [on: payment.failed]
  → confirmed             [on: payment.received]     → triggers fulfillment workflow
      → processing        [on: workflow.stage:pick-pack-entered]
          → shipped       [on: shipment.dispatched]  → sends tracking notification
              → delivered [on: shipment.delivered]   → triggers review request
  → cancelled             [guard: payment not received AND within 30min]
  → refunded              [from: delivered, guard: within return window]
```

---

## 4. Ecommerce Hooks (Business Orchestration)

Hooks are the only place where cross-module logic lives in a Compose.

### Hook: Order Placed

```typescript
// Trigger: customer places an order

compose.hook({
  on: "order.placed",
  handler: async (event, ctx) => {
    const order = event.payload;

    // 1. Reserve inventory for each item
    for (const item of order.items) {
      await ctx.dispatch("inventory.reserve", {
        variantId: item.variantId,
        qty: item.quantity,
        ref: order.id,
      });
    }

    // 2. Create payment session
    const session = await ctx.payment.createPaymentSession({
      amount: order.total,
      currency: order.currency,
      orderId: order.id,
      customerId: order.customerId,
    });

    // 3. Update order with gateway session
    await ctx.dispatch("ecommerce.updateOrderGatewayRef", {
      orderId: order.id,
      gatewayRef: session.id,
      paymentUrl: session.url,
    });

    // 4. Notify customer — payment pending
    await ctx.dispatch("notification.send", {
      templateKey: "order-payment-pending",
      to: order.customerId,
      variables: {
        orderId: order.id,
        paymentUrl: session.url,
        total: order.total,
      },
    });
  },
});
```

### Hook: Payment Received

```typescript
compose.hook({
  on: "payment.received",
  filter: { source: "ecommerce" },
  handler: async (event, ctx) => {
    const { orderId, amount, gatewayRef } = event.payload;

    // 1. Post ledger transaction
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-PAYMENT-RECEIVABLE",
      credit: "ACC-SALES-REVENUE",
      amount,
      reference: orderId,
      description: `Payment for Order ${orderId}`,
    });

    // 2. Advance order FSM → confirmed
    await ctx.dispatch("ecommerce.advanceOrder", {
      orderId,
      event: "payment.received",
    });

    // 3. Start fulfillment workflow
    await ctx.dispatch("workflow.startProcess", {
      templateId: "ORDER_FULFILLMENT",
      entityId: orderId,
      entityType: "Order",
      context: { orderId },
    });

    // 4. Notify customer — order confirmed
    await ctx.dispatch("notification.send", {
      templateKey: "order-confirmed",
      to: event.payload.customerId,
      variables: { orderId, gatewayRef },
    });
  },
});
```

### Hook: Payment Failed

```typescript
compose.hook({
  on: "payment.failed",
  filter: { source: "ecommerce" },
  handler: async (event, ctx) => {
    const { orderId } = event.payload;

    // 1. Release inventory reservations
    const order = await ctx.query("ecommerce.getOrder", { id: orderId });
    for (const item of order.items) {
      await ctx.dispatch("inventory.release", {
        variantId: item.variantId,
        qty: item.quantity,
        ref: orderId,
      });
    }

    // 2. Advance order FSM → payment_failed
    await ctx.dispatch("ecommerce.advanceOrder", {
      orderId,
      event: "payment.failed",
    });

    // 3. Notify customer — payment failed with retry link
    await ctx.dispatch("notification.send", {
      templateKey: "order-payment-failed",
      to: order.customerId,
      variables: { orderId, retryUrl: order.paymentUrl },
    });
  },
});
```

### Hook: Order Shipped

```typescript
compose.hook({
  on: "workflow.task.completed",
  filter: { taskLabel: "dispatch-shipment" },
  handler: async (event, ctx) => {
    const { orderId, trackingNumber, carrier } = event.payload;

    // 1. Update geo — create shipment GeoEntity
    await ctx.dispatch("geo.attachLocation", {
      entityId: orderId,
      entityType: "Shipment",
      trackingNumber,
      carrier,
    });

    // 2. Advance order FSM → shipped
    await ctx.dispatch("ecommerce.advanceOrder", {
      orderId,
      event: "shipment.dispatched",
    });

    // 3. Notify customer with tracking
    await ctx.dispatch("notification.send", {
      templateKey: "order-shipped",
      to: event.payload.customerId,
      channels: ["email", "sms"],
      variables: {
        orderId,
        trackingNumber,
        carrier,
        trackingUrl: `https://track.store.com/${trackingNumber}`,
      },
    });
  },
});
```

### Hook: Order Delivered — Request Review

```typescript
compose.hook({
  on: "shipment.delivered",
  handler: async (event, ctx) => {
    const { orderId, customerId } = event.payload;

    // 1. Advance FSM → delivered
    await ctx.dispatch("ecommerce.advanceOrder", {
      orderId,
      event: "shipment.delivered",
    });

    // 2. Schedule review request — delay 24h
    await ctx.queue.add(
      "send-review-request",
      { orderId, customerId },
      {
        delay: hours(24),
        priority: "bulk",
      },
    );
  },
});
```

### Hook: Refund Requested

```typescript
compose.hook({
  on: "ecommerce.refund-requested",
  handler: async (event, ctx) => {
    const { orderId, actorId, reason } = event.payload;
    const order = await ctx.query("ecommerce.getOrder", { id: orderId });

    // Guard: within return window (configurable rule)
    const withinWindow = ctx.rules.evaluate(
      { field: "order.deliveredAt", op: "gt", value: daysAgo(7) },
      { order },
    );
    if (!withinWindow) throw new BusinessError("RETURN_WINDOW_EXPIRED");

    // 1. Issue refund via payment adapter
    await ctx.payment.refund(order.gatewayRef, order.total);

    // 2. Post ledger reversal
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-REFUNDS",
      credit: "ACC-PAYMENT-RECEIVABLE",
      amount: order.total,
      reference: orderId,
      description: `Refund for Order ${orderId}`,
    });

    // 3. Restock items
    for (const item of order.items) {
      await ctx.dispatch("inventory.receive", {
        variantId: item.variantId,
        locationId: ctx.config.defaultWarehouseId,
        qty: item.quantity,
      });
    }

    // 4. Advance FSM → refunded
    await ctx.dispatch("ecommerce.advanceOrder", {
      orderId,
      event: "refund.issued",
    });

    // 5. Notify customer
    await ctx.dispatch("notification.send", {
      templateKey: "order-refunded",
      to: order.customerId,
      variables: { orderId, amount: order.total },
    });
  },
});
```

---

## 5. Compose Rules (Business Rules as Data)

```typescript
compose.rules([
  // Products cannot be ordered if out of stock (applied at checkout)
  {
    id: "no-out-of-stock-orders",
    scope: "order:create",
    guard: { field: "item.inventory.available", op: "gt", value: 0 },
  },

  // Orders above ₹10,000 require manual review before dispatch
  {
    id: "high-value-order-review",
    scope: "workflow.stage:pick-pack",
    condition: { field: "order.total", op: "gte", value: 10000 },
    action: "require-approval", // adds an approval task before stage entry
    approverRole: "store-admin",
  },

  // Return window: 7 days from delivery
  {
    id: "return-window",
    scope: "ecommerce.refund-requested",
    guard: { field: "order.deliveredAt", op: "gt", value: { relative: "-7d" } },
  },

  // Coupons can only be applied once per customer
  {
    id: "coupon-single-use-per-customer",
    scope: "coupon:apply",
    guard: {
      not: {
        field: "coupon.usedByCustomer",
        op: "eq",
        value: { ref: "actor.id" },
      },
    },
  },

  // Flash sale price only valid during window
  {
    id: "flash-sale-validity",
    scope: "catalog.resolvePrice",
    guard: {
      and: [
        { field: "priceList.validFrom", op: "lte", value: { ref: "now" } },
        { field: "priceList.validTo", op: "gte", value: { ref: "now" } },
      ],
    },
  },
]);
```

---

## 6. Fulfillment Workflow Template

Registered as a `ProcessTemplate` in the workflow module at boot:

```
Template ID: ORDER_FULFILLMENT
Stages:

1. pick-pack
   Entry Guard: order.status = 'confirmed'
   Tasks:
     - Pick items from warehouse shelf      [role: warehouse-staff]
     - Pack and label shipment              [role: warehouse-staff]
     - Attach packing slip                  [role: warehouse-staff]

2. quality-check  (conditional — applies if order.total >= ₹5000)
   Entry Guard: previous stage completed
   Tasks:
     - Quality verify contents              [role: store-staff]
     - Confirm item count matches order     [role: store-staff]

3. dispatch
   Entry Guard: previous stage completed
   Tasks:
     - Hand over to carrier                 [role: warehouse-staff]
     - Enter tracking number                [role: warehouse-staff]
     → On complete: emits 'shipment.dispatched' → triggers Hook: Order Shipped

4. delivery-confirmed
   Entry Guard: shipment.delivered event received (via carrier webhook)
   → Auto-completes when webhook arrives
   → Emits process.completed
```

---

## 7. API Surface

### API Structure

```
Base URL: https://api.store.com/v1

Apps:
  StoreAdmin   → /admin/*     Auth: Bearer JWT (store-admin, store-staff roles)
  Storefront   → /store/*     Auth: Bearer JWT (customer) or none (guest)
  Webhooks     → /webhooks/*  Auth: HMAC signature verification
```

---

### StoreAdmin API (`/admin/*`)

**Requires:** `store-admin` or `store-staff` role. All routes are org-scoped.

```
── Products ──────────────────────────────────────────────────────────
GET    /admin/products                    catalog:read
POST   /admin/products                    catalog:create
GET    /admin/products/:id                catalog:read
PATCH  /admin/products/:id                catalog:update
DELETE /admin/products/:id                catalog:delete
POST   /admin/products/:id/publish        catalog:publish
POST   /admin/products/:id/archive        catalog:publish
GET    /admin/products/:id/variants       catalog:read
POST   /admin/products/:id/variants       catalog:create

── Categories ────────────────────────────────────────────────────────
GET    /admin/categories                  catalog:read
POST   /admin/categories                  catalog:create
PATCH  /admin/categories/:id              catalog:update
DELETE /admin/categories/:id              catalog:delete

── Price Lists ───────────────────────────────────────────────────────
GET    /admin/price-lists                 catalog:read
POST   /admin/price-lists                 catalog:create
POST   /admin/price-lists/:id/rules       catalog:update
DELETE /admin/price-lists/:id             catalog:delete

── Inventory ─────────────────────────────────────────────────────────
GET    /admin/inventory                   inventory:read
GET    /admin/inventory/:variantId        inventory:read
POST   /admin/inventory/adjust            inventory:adjust
POST   /admin/inventory/transfer          inventory:transfer
GET    /admin/inventory/low-stock         inventory:read

── Orders ────────────────────────────────────────────────────────────
GET    /admin/orders                      order:read
GET    /admin/orders/:id                  order:read
PATCH  /admin/orders/:id/status           order:update-status
POST   /admin/orders/:id/cancel           order:cancel          [store-admin only]
POST   /admin/orders/:id/refund           order:refund          [store-admin only]
GET    /admin/orders/:id/timeline         order:read            ← event history

── Customers ─────────────────────────────────────────────────────────
GET    /admin/customers                   actor:manage
GET    /admin/customers/:id               actor:manage
GET    /admin/customers/:id/orders        order:read
POST   /admin/customers/:id/suspend       actor:manage          [store-admin only]

── Coupons ───────────────────────────────────────────────────────────
GET    /admin/coupons                     coupon:create
POST   /admin/coupons                     coupon:create
PATCH  /admin/coupons/:id                 coupon:create
DELETE /admin/coupons/:id                 coupon:create         [store-admin only]

── Delivery Zones ────────────────────────────────────────────────────
GET    /admin/delivery-zones              catalog:read
POST   /admin/delivery-zones              catalog:create
PATCH  /admin/delivery-zones/:id          catalog:update

── Analytics ─────────────────────────────────────────────────────────
GET    /admin/analytics/overview          analytics:read        ← dashboard metrics
GET    /admin/analytics/sales             analytics:read
GET    /admin/analytics/inventory         analytics:read
GET    /admin/analytics/customers         analytics:read
POST   /admin/analytics/reports           analytics:read
GET    /admin/analytics/reports/:jobId    analytics:read

── Notifications ─────────────────────────────────────────────────────
GET    /admin/notification-templates      notification:manage
PATCH  /admin/notification-templates/:key notification:manage

── Settings ──────────────────────────────────────────────────────────
GET    /admin/settings                    store-admin only
PATCH  /admin/settings                    store-admin only
GET    /admin/settings/payments           store-admin only
POST   /admin/settings/payments/test      store-admin only
```

---

### Storefront API (`/store/*`)

**Guest routes:** No auth required, org resolved via `X-Store-ID` header or subdomain.
**Customer routes:** Bearer JWT required with `customer` role.

```
── Catalog (Public) ──────────────────────────────────────────────────
GET    /store/products                    public
GET    /store/products/:slug              public
GET    /store/products/:id/variants       public
GET    /store/categories                  public
GET    /store/categories/:slug/products   public
GET    /store/search?q=                   public               ← SearchAdapter

── Cart (Session-based, no auth required) ────────────────────────────
POST   /store/cart                        public               ← creates cart
GET    /store/cart/:cartId                public
PATCH  /store/cart/:cartId/items          public               ← add/update items
DELETE /store/cart/:cartId/items/:itemId  public
POST   /store/cart/:cartId/apply-coupon   public
DELETE /store/cart/:cartId/coupon         public
POST   /store/cart/:cartId/validate       public               ← stock + rule check

── Checkout ──────────────────────────────────────────────────────────
POST   /store/checkout                    public or customer   ← places order
GET    /store/checkout/:orderId/payment   public               ← get payment URL

── Auth ──────────────────────────────────────────────────────────────
POST   /store/auth/register               public
POST   /store/auth/login                  public
POST   /store/auth/logout                 customer
POST   /store/auth/forgot-password        public
POST   /store/auth/reset-password         public
POST   /store/auth/verify-email           public

── Customer Account ──────────────────────────────────────────────────
GET    /store/account                     customer:own
PATCH  /store/account                     customer:own
GET    /store/account/addresses           customer:own
POST   /store/account/addresses           customer:own
PATCH  /store/account/addresses/:id       customer:own
DELETE /store/account/addresses/:id       customer:own

── Orders ────────────────────────────────────────────────────────────
GET    /store/orders                      customer:own
GET    /store/orders/:id                  customer:own
POST   /store/orders/:id/cancel           customer:own         [within cancel window]
POST   /store/orders/:id/return           customer:own         [within return window]
GET    /store/orders/:id/tracking         customer:own

── Reviews ───────────────────────────────────────────────────────────
GET    /store/products/:id/reviews        public
POST   /store/products/:id/reviews        customer:own         [verified purchase only]

── Notifications ─────────────────────────────────────────────────────
GET    /store/notifications               customer:own
PATCH  /store/notifications/:id/read      customer:own
PATCH  /store/account/notification-prefs  customer:own
```

---

### Webhook Ingestion (`/webhooks/*`)

```
POST   /webhooks/stripe            → normalized → DomainEvent → EventBus
POST   /webhooks/razorpay          → normalized → DomainEvent → EventBus
POST   /webhooks/shiprocket        → normalized → DomainEvent → EventBus
POST   /webhooks/delhivery         → normalized → DomainEvent → EventBus

Auth: HMAC signature header verified per provider before any processing.
Response: Always 200 immediately. Processing is async via Queue.
```

---

## 8. Real-Time Channels (Ecommerce)

| Channel                                    | Who Subscribes               | Events              |
| ------------------------------------------ | ---------------------------- | ------------------- |
| `org:{orgId}:orders`                       | StoreAdmin live order feed   | `order.*`           |
| `org:{orgId}:inventory:{locationId}`       | Warehouse staff              | `stock.*`           |
| `org:{orgId}:workflow`                     | Staff task board             | `task.*`, `stage.*` |
| `org:{orgId}:actor:{id}:inbox`             | Customer (in-app bell)       | `notification.*`    |
| `store:{storeId}:order:{orderId}:tracking` | Customer order tracking page | `shipment.*`        |

---

## 9. Scheduled Jobs (Ecommerce-Specific)

```
ecommerce.expire-pending-orders       every 5min
  → Find orders in 'pending_payment' > 30min
  → Cancel + release inventory + notify customer

ecommerce.send-review-requests        daily
  → Process bulk review request queue from delivered orders

ecommerce.sync-carrier-tracking       every 15min
  → Poll carrier APIs for shipped orders
  → Emit shipment events if status changed

ecommerce.flash-sale-activation       every 1min
  → Activate/deactivate PriceLists based on validFrom/validTo

ecommerce.low-stock-alerts            every 30min
  → Notify store-admin of variants below reorder threshold

ecommerce.abandoned-cart-recovery     daily (9AM)
  → Customers with carts older than 1h, no order placed
  → Send recovery notification (email + optional discount)

ecommerce.sales-report-daily          nightly (midnight)
  → Generate and store daily snapshot for analytics dashboard
```

---

## 10. Integrations Registered

```typescript
EcommerceCompose.integrations = {
  payment: [StripeAdapter, RazorpayAdapter], // active adapter from config
  storage: [S3Adapter], // product images, invoices
  cdn: "CloudFrontAdapter", // signed URL generation
  search: TypesenseAdapter, // product search index
  maps: GoogleMapsAdapter, // delivery zone checks
  sms: MSG91Adapter,
  email: ResendAdapter,
  push: FCMAdapter,
};
```

---

## 11. Boot Sequence

```
1. Load Core (Entity, EventBus, EventStore, Mediator, RuleEngine, Repositories)
2. Connect Infrastructure (DB, Redis, Queue, Storage)
3. Boot Modules in dependency order:
      identity → catalog → inventory → ledger → workflow → geo → notification → analytics
4. Run DB migrations (each module's migration files)
5. Register Compose Hooks
6. Register Compose Rules
7. Seed ProcessTemplates (ORDER_FULFILLMENT, etc.)
8. Register Scheduled Jobs
9. Start Real-Time Gateway (WebSocket server)
10. Register Webhook routes
11. Start API Server (StoreAdmin + Storefront routers)
12. Emit system.ready event
```
