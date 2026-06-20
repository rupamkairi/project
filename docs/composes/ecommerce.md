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

---

## 12. Gap Analysis — Medusa eCommerce vs. ProjectX eCommerce

**Reference platform:** [Medusa v2](https://docs.medusajs.com) — open-source headless commerce platform.
**Scope:** Backend only. Frontend/storefront UI gaps excluded.

---

### Feature Comparison Table

Status key: ✅ Ready | ⚠️ Partial | ❌ Missing

| Feature | Medusa | ProjectX Mapping | Status | Gap |
|---------|--------|-----------------|--------|-----|
| Product catalog (items, variants, categories, tags) | `Product` module: products, variants, options, categories, collections, tags | `catalog` module: Item, Variant, Category, AttributeSet, PriceList, PriceRule | ✅ | — |
| Product images / media | Product images attached to products/variants | StorageAdapter + document module can attach | ✅ | Pattern exists; needs wiring in catalog |
| Multi-currency pricing | Price lists per currency/region | `catalog.PriceList` with currency + `ledger` multi-currency | ✅ | — |
| Price tiers (qty-based) | `PriceRule` with min qty | `catalog.PriceRule` with `minQty` | ✅ | — |
| Inventory (multi-location, reservations) | `Inventory` module: stock levels, reservations, locations, backorders | `inventory` module: StockUnit, Location, StockMovement, reserve/release/fulfill | ✅ | — |
| Inventory kits / bundles | One SKU → multiple inventory units | No bundle concept in `catalog` or `inventory` | ❌ | Needs `BundleItem` entity in catalog and multi-unit reservation in inventory |
| Cart (session-based) | `Cart` module: line items, shipping, address, tax, promotions | Compose-level Cart (session-based) with items, coupon, validate | ✅ | — |
| Order lifecycle (FSM) | Order statuses as enum transitions | Full FSM with 8 states and guarded transitions | ✅ | — |
| Draft orders (admin creates on behalf of customer) | Admin can create draft orders | No draft order concept | ❌ | Needs `DraftOrder` entity + `POST /admin/orders/draft` endpoint |
| Order edits (add/remove items after placement) | Order edits with version control | No order edit model | ❌ | Needs `OrderEdit` entity with versioned line items, approval before apply |
| Returns & RMA | Return entity, return shipping, multi-item partial returns | Basic `refund-requested` hook only | ⚠️ | Needs `Return` entity, return-shipping workflow, partial item return tracking |
| Refunds | Refund via payment provider + ledger reversal | Hook: `ecommerce.refund-requested` → payment.refund → ledger reversal | ✅ | Hook exists; requires payment plugin (Planned) |
| Claims (damaged goods, missing items) | `Claim` entity linked to order | No claim concept | ❌ | Needs `Claim` entity with type (missing/damaged/other), replacement or refund resolution |
| Swaps / exchanges | Return item + replace with different variant | No swap concept | ❌ | Needs `Swap` entity: return items + new items, balances refund vs. charge |
| Payment sessions | Payment sessions with auth/capture/void | Hooks reference `ctx.payment.createPaymentSession()` | ⚠️ | Payment plugin is **Planned** — not implemented. Critical blocker. |
| Payment capture (separate from auth) | Auth + capture as separate steps | No two-step payment flow documented | ⚠️ | PaymentAdapter interface needs `authorize()` + `capture()` + `void()` methods |
| Fulfillment provider abstraction | `FulfillmentProvider` interface (DHL, FedEx, ShipBob, etc.) | No `fulfillment` AdapterType in Core | ❌ | Needs `FulfillmentAdapter` in Core + fulfillment plugin |
| Multi-fulfillment per order | Split order across multiple warehouse locations | ORDER_FULFILLMENT workflow is single-path | ❌ | Needs `Fulfillment` entity (sub-order), split-fulfillment workflow template |
| Tracking number / carrier webhook | Carrier webhook → `shipment.delivered` | `geo.attachLocation()` + carrier webhook ingest | ⚠️ | Webhook ingest exists (Shiprocket, Delhivery); carrier tracking polling job exists; needs carrier-specific normalization |
| Tax regions + rates | `TaxRegion`, `TaxRate`, tax provider (TaxJar) | `ledger.TaxRate` (accounting rate), no checkout tax calculator | ❌ | No `tax` AdapterType; no geo-based tax region entity; no line-item tax calculation at cart |
| Tax-inclusive pricing | Price includes tax, extracted at display | No tax-inclusive model | ❌ | Needs `PriceList.taxInclusive: boolean` + tax-extraction logic at price resolution |
| Promotions engine (campaign + rules) | `Promotion` module: campaigns, budget, conditions, discount types | Coupon entity + flash-sale PriceList rule | ⚠️ | No campaign budget tracking; no compound conditions (customer group + cart total); no BOGO/free-shipping types |
| Gift cards / store credit | Gift card as product + store credit balance | No gift card or store credit entity | ❌ | Needs `GiftCard` entity + `StoreCredit` balance on customer + payment method integration |
| Coupon (single-use per customer, expiry) | Discount codes with usage limits | `coupon-single-use-per-customer` rule exists | ✅ | — |
| Flash sale (time-window pricing) | Price rules with validity window | `flash-sale-validity` rule + PriceList `validFrom/validTo` + activation job | ✅ | — |
| Customer (registered + guest) | Customer module: account, addresses, groups, auth | Identity module: Actor with `type: human/system`; ecommerce compose uses `customer` role | ✅ | — |
| Customer groups | Groups for B2B pricing and promotions | Identity roles only; no commercial customer groups | ❌ | Needs `CustomerGroup` entity; PriceList audience supports `segment/role`; needs group-based price resolution |
| Sales channels (web, POS, B2B, mobile) | Multi-channel: products/inventory/pricing scoped per channel | No channel concept; org-scoped only | ❌ | Needs `SalesChannel` entity; product/inventory/pricing filtered by channel |
| Multi-region | Region entity: currency, tax rules, shipping options per geo | No Region entity; ledger has multi-currency but no geo-region | ❌ | Needs `Region` entity linking currency + tax profile + shipping options |
| Multi-language / translations | 20+ admin UI languages, per-locale product content | Not in architecture | ❌ | Needs `Translation` entity pattern on catalog items (name, description per locale) |
| Shipping zones + service zones | Geographic shipping zones with carrier assignment | `geo` module delivery zones; ecommerce compose has delivery zone admin API | ⚠️ | Foundation exists; no `ShippingOption` entity that ties zone + carrier + rate |
| Shipping options (flat rate, calculated) | Shipping options per zone with pricing rules | No `ShippingOption` entity in compose | ❌ | Needs `ShippingOption` entity (name, type, zoneId, rate); resolves at checkout |
| Abandoned cart recovery | Scheduler job + recovery email | `ecommerce.abandoned-cart-recovery` daily job | ✅ | — |
| Product reviews | Review with verified-purchase guard | `review:create` endpoint (customer:own, verified purchase only) | ✅ | — |
| Low-stock alerts | Notification when variant below threshold | `ecommerce.low-stock-alerts` every 30min | ✅ | — |
| Pending order expiry | Cancel pending orders after TTL | `ecommerce.expire-pending-orders` every 5min | ✅ | — |
| Admin API (full CRUD) | REST admin API for all resources | `/admin/*` fully documented | ✅ | — |
| Storefront API (public + customer) | REST storefront API with publishable key scoping | `/store/*` documented; auth via JWT customer role | ✅ | — |
| Publishable API keys (channel scoping) | API key scoped to specific sales channel | identity.APIKey exists; no channel-scoping | ⚠️ | APIKey entity exists; needs `scopedChannels: ID[]` field + channel validation middleware |
| Webhook ingestion (payment, carrier) | Payment + carrier webhooks → EventBus | Stripe, Razorpay, Shiprocket, Delhivery webhooks with HMAC | ✅ | — |
| Full-text product search | Elasticsearch / Meilisearch / Algolia | Search plugin: **Planned** | ⚠️ | Same as CRM — search plugin not implemented |
| Notification (email, SMS, push) | SendGrid, Resend, Twilio, FCM | notification module + email/SMS/push adapters | ✅ | — |
| Real-time (order feed, inventory, tracking) | Via event subscribers | 5 named WebSocket channels | ✅ | — |
| Durable workflow with rollback | Step-level compensating actions, automatic retry | workflow module: ProcessInstances, no step-level rollback | ⚠️ | If inventory.reserve succeeds but payment fails, inventory must be manually released. Needs compensating action pattern. |
| Analytics / reporting | PostHog integration, event tracking | `analytics` module: Metric, Snapshot, ReportDefinition | ⚠️ | Module is generic; no ecommerce-specific metrics seeded (GMV, AOV, conversion rate, etc.) |
| Multi-store (one org, multiple storefronts) | Multi-store in one Medusa instance | Multi-org = multi-store (different orgs) | ⚠️ | Single org cannot have multiple storefronts with different domains/settings |
| MFA (admin users) | TOTP / authenticator app for admin | Not documented in identity module or auth plugin | ❌ | Needs TOTP support in auth plugin |
| SAML / SSO | SAML provider support | Auth plugin has provider interface; no SAML documented | ⚠️ | Needs SAMLProvider in auth plugin |
| Batch import (products, inventory) | Bulk CSV import/export for products and inventory | No import endpoint in ecommerce compose | ❌ | Needs `POST /admin/products/import` + `POST /admin/inventory/import` with queue-based processing |
| Sales report (daily/weekly) | Analytics dashboard + report export | `ecommerce.sales-report-daily` nightly job | ✅ | — |

---

### System Preparedness Assessment

**What's solid:**

- Catalog module fully covers Medusa's Product module needs (items, variants, categories, price lists, price rules).
- Inventory module matches Medusa's inventory capabilities (multi-location, reservations, adjustments, reorder rules).
- Order FSM is more rigorous than Medusa's enum-based status model.
- Ledger module provides real double-entry accounting — something Medusa completely lacks.
- Rule engine handles all business guards (out-of-stock prevention, high-value review, return window, coupon single-use, flash sale validity).
- EventBus + hooks cover all Medusa's event subscriber patterns.
- Real-time channels cover all Medusa's live update needs.
- Scheduled jobs cover all Medusa's cron-equivalent needs.
- Webhook ingestion with HMAC verification matches Medusa's approach.

**What blocks implementation:**

| Blocker | Impact | Priority |
|---------|--------|----------|
| Payment plugin not implemented (`Planned`) | Cannot create payment sessions, capture, or refund. Entire checkout is blocked. | P0 Critical |
| No tax calculation at checkout | Line items have no tax; final order totals will be wrong | P0 Critical |
| No `ShippingOption` entity | Checkout cannot present shipping choices to customer | P0 Critical |
| Search plugin not implemented (`Planned`) | Product search (`GET /store/search`) does not work | P0 Critical |
| No `FulfillmentAdapter` in Core | Cannot integrate carriers (DHL, FedEx, Shiprocket) via abstraction | P1 |
| No Return/RMA entity | Returns and refunds are manually handled hooks only | P1 |
| No Region entity | Cannot configure per-geo payment, tax, shipping | P1 |

---

### What to Build — Ordered by Priority

#### P0 — Required before ecommerce compose is launchable

| Item | Type | Where | Description |
|------|------|--------|-------------|
| Payment plugin | Plugin | `plugins/payment/` | `createPaymentPlugin()`. Implement `PaymentAdapter` interface: `createSession()`, `authorize()`, `capture()`, `void()`, `refund()`. Adapters: Stripe, Razorpay. |
| `tax` AdapterType + interface | Core | `core/src/entity/types.ts` | Add `"tax"` to `AdapterType`. `TaxAdapter` interface: `calculateTax(lineItems, taxRegion)` → returns tax amounts per line. |
| `TaxRegion` + `TaxRate` entities | Compose | ecommerce compose | Geo-based tax regions with applicable rates. Linked at checkout to `shippingAddress.country`. |
| Tax calculation at checkout | Compose hook | ecommerce compose | On `ecommerce.validateCart`: resolve `TaxRegion` from address → call `TaxAdapter.calculateTax()` → populate `order.tax`. |
| `ShippingOption` entity | Compose | ecommerce compose | `name, zoneId, providerId, type(flat_rate/calculated), rate: Money, conditions: RuleExpr`. Resolves at checkout. |
| Shipping option resolver | Compose API | ecommerce compose | `GET /store/cart/:id/shipping-options` — returns available shipping options for cart address. |
| Search plugin | Plugin | `plugins/search/` | `createSearchPlugin()`. TypesenseAdapter. Syncs catalog items on `item.published`. Powers `GET /store/search`. |

#### P1 — Required for feature parity with Medusa

| Item | Type | Where | Description |
|------|------|--------|-------------|
| `Return` entity + workflow | Compose | ecommerce compose | `Return` entity: `orderId, items[], status, reason, returnShippingOption`. FSM: `requested → approved → received → processed`. Links to `inventory.receive` and `ledger.issueRefund`. |
| `Claim` entity | Compose | ecommerce compose | `Claim` entity: `orderId, type(missing/damaged/other), resolution(refund/replace)`. Triggers inventory or payment action. |
| `Swap` entity | Compose | ecommerce compose | `Swap` entity: `orderId, returnItems[], newItems[]`. Balances refund vs. charge difference. |
| `Region` entity | Compose | ecommerce compose | `Region` entity: `name, currency, countries[], taxProfileId, paymentProviders[], fulfillmentProviders[]`. Resolves at checkout from address. |
| `fulfillment` AdapterType | Core | `core/src/entity/types.ts` | `FulfillmentAdapter` interface: `createFulfillment()`, `cancelFulfillment()`, `getTracking()`. |
| Fulfillment plugin | Plugin | `plugins/fulfillment/` | Adapters: Shiprocket, Delhivery (already have webhooks), DHL, generic. |
| Multi-fulfillment | Compose | ecommerce compose | `Fulfillment` entity (sub-order): `orderId, locationId, items[], trackingNumber, carrierId`. ORDER_FULFILLMENT workflow spawns one `Fulfillment` per source location. |
| `CustomerGroup` entity | Compose / identity | identity module or ecommerce compose | `CustomerGroup` entity: `name, conditions: RuleExpr`. PriceList audience `"segment"` resolves to customer groups. Enables B2B/wholesale pricing. |
| Draft orders | Compose | ecommerce compose | `DraftOrder` entity + `POST /admin/orders/draft`. Admin creates, edits, then converts to real order (bypasses payment session, for COD/offline payments). |
| Order edits | Compose | ecommerce compose | `OrderEdit` entity: `orderId, changes[], status`. Admin proposes, customer confirms (or admin force-applies). Recalculates totals. |
| `GiftCard` entity | Compose | ecommerce compose | `GiftCard` entity: `code, balance: Money, expiresAt`. Applied at checkout as payment method. Balance deducted on capture. |
| Inventory kits | Catalog module extension | `catalog` module | `BundleItem` entity: `parentItemId, componentItemId, qty`. `inventory.reserve()` fans out to components. |
| Batch import (products) | Compose API | ecommerce compose | `POST /admin/products/import` — CSV/JSON upload, queue-based, returns `jobId`. |
| Ecommerce analytics seed | Compose boot | ecommerce compose | Register standard metrics: GMV, AOV, conversion-rate, cart-abandonment-rate, refund-rate, inventory-turn. |

#### P2 — Enhances maturity

| Item | Type | Where | Description |
|------|------|--------|-------------|
| Tax-inclusive pricing | Catalog + compose | `catalog` module | `PriceList.taxInclusive: boolean`. At display: extract tax from price. At checkout: do not add tax again. |
| Promotions engine (advanced) | Compose | ecommerce compose | `Promotion` entity: `type(percentage/fixed/free_shipping/bogo), conditions: RuleExpr[], usageLimit, budget: Money`. Replaces simple coupon model. |
| Sales channels | Compose | ecommerce compose | `SalesChannel` entity. Products, pricing, inventory filtered by channel. Publishable API keys scoped to channel. |
| Multi-language / translations | Catalog extension | `catalog` module | `ItemTranslation` entity: `itemId, locale, name, description`. Resolved by `Accept-Language` header. |
| MFA (admin users) | Auth plugin | `plugins/auth/` | TOTP second factor in auth plugin. `identity.Actor` gets `totpEnabled: boolean, totpSecret: string (sensitive)`. |
| SAML auth provider | Auth plugin | `plugins/auth/` | SAMLProvider adapter. |
| Compensating actions in workflow | Workflow module | `workflow` module | Per-task `compensate` handler: if downstream step fails, rollback prior steps. Enables safe multi-step sagas. |
| Workflow step: ExternalHTTPAction | Workflow module | `workflow` module | Step type that calls external URL. Enables no-code integration with 3rd-party services. |
| Multi-store (one org, N storefronts) | Compose | ecommerce compose | `Store` entity per org: `name, domain, defaultCurrency, defaultRegionId`. Storefront API resolves store from `X-Store-ID` header or subdomain. Currently implied but not modeled. |

---

### Missing Plugins Summary

| Plugin | Status | Impact |
|--------|--------|--------|
| `@projectx/plugin-payment-server` | **Planned** — not implemented | Blocks all checkout and refund flows |
| `@projectx/plugin-search-server` | **Planned** — not implemented | Blocks product search and contact search |
| `@projectx/plugin-jobs-server` | **Planned** — not implemented | Background job management UI; not hard blocker |
| `@projectx/plugin-fulfillment-server` | **Not planned** — needs design | Carrier integrations for shipping |

### Missing Core Adapter Types

Add to `core/src/entity/types.ts`:

```typescript
// Currently missing — needed for ecommerce + CRM:
| "tax"          // checkout tax calculation
| "fulfillment"  // carrier / 3PL (ecommerce)
| "email-sync"   // inbound email sync (CRM)
| "calendar-sync" // calendar sync (CRM)
| "telephony"    // click-to-call (CRM)
```
