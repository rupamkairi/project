# Ecommerce — Phase 1: Foundation

## Goal

Scaffold `composes/ecommerce/` with two web sub-packages (admin + storefront), establish base DB
schema, define admin and customer roles, wire into both shells, and seed default data.

---

## 1.1 Package Structure

```
composes/ecommerce/
  server/
    package.json          name: @projectx/compose-ecommerce-server
    tsconfig.json
    src/
      index.ts
      permissions/
        index.ts
      checkout/
        index.ts          checkout orchestration (Phase 3)
      db/
        schema/
          index.ts        barrel
        seed/
          roles.seed.ts
          regions.seed.ts default regions (US, EU, IN)
  web/
    admin/
      package.json        name: @projectx/compose-ecommerce-admin
      tsconfig.json
      src/
        index.ts          exports adminRoutes, adminManifest
        routes/
        components/
        hooks/
        stores/
        lib/
          api.ts
    storefront/
      package.json        name: @projectx/compose-ecommerce-storefront
      tsconfig.json
      src/
        index.ts          exports storefrontRoutes, storefrontManifest
        routes/
        components/
        hooks/
        stores/
        lib/
          api.ts
```

---

## 1.2 Server package.json

```json
{
  "name": "@projectx/compose-ecommerce-server",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "elysia": "^1.4.25",
    "drizzle-orm": "^0.45.1",
    "@projectx/plugin-payment-server": "workspace:*"
  }
}
```

---

## 1.3 DB Schema — Existing Tables (already defined in compose)

From `docs/composes/ecommerce.md` — tables already scoped in the compose:

```
eco_orders         Order
eco_order_items    OrderItem
eco_carts          Cart
eco_cart_items     CartItem
eco_coupons        Coupon
eco_reviews        Review
eco_stores         Store
```

All use prefix `eco_`. New tables added in Phase 2.

---

## 1.4 Permissions Matrix

Two sets of roles — admin users and customer users.

### Admin Roles

| Role | Slug | Description |
|------|------|-------------|
| Store Admin | `eco:admin` | Full store management |
| Store Manager | `eco:manager` | Orders, products, customers — no settings |
| Fulfillment Staff | `eco:fulfillment` | View orders, update fulfillment status |
| Support Agent | `eco:support` | View orders, initiate returns, no product edit |

### Customer Role

| Role | Slug | Description |
|------|------|-------------|
| Customer | `eco:customer` | Own account, orders, returns |

Permission matrix:

| Resource | Admin | Manager | Fulfillment | Support | Customer |
|----------|-------|---------|-------------|---------|---------|
| products | CRUD | CRUD | R | R | R (published) |
| orders | CRUD | CRUD | R+update status | R+initiate return | Own |
| customers | CRUD | CRUD | — | R | Own |
| returns | CRUD | CRUD | update status | Create | Own |
| analytics | R | R | — | — | — |
| settings | CRUD | — | — | — | — |
| regions | CRUD | R | — | — | — |
| shipping options | CRUD | CRUD | R | R | R |
| tax regions | CRUD | R | — | — | — |

---

## 1.5 Compose Skeleton

File: `composes/ecommerce/server/src/index.ts`

```typescript
export const ecommerceCompose = new Elysia({ prefix: "/ecommerce" })
  // Admin routes (require eco:admin/manager/fulfillment/support role)
  .use(adminProductsRoutes)
  .use(adminOrdersRoutes)
  .use(adminCustomersRoutes)
  .use(adminReturnsRoutes)
  .use(adminFulfillmentRoutes)
  .use(adminRegionsRoutes)
  .use(adminShippingRoutes)
  .use(adminTaxRoutes)
  .use(adminAnalyticsRoutes)
  .use(adminImportRoutes)
  // Store routes (public + customer JWT)
  .use(storeCatalogRoutes)
  .use(storeCartRoutes)
  .use(storeCheckoutRoutes)
  .use(storeCustomerRoutes)
  .use(storeOrderRoutes)
  .use(storeSearchRoutes);

export type EcommerceApp = typeof ecommerceCompose;
```

Shell mount in `apps/server/src/index.ts`:

```typescript
import { ecommerceCompose } from "@projectx/compose-ecommerce-server";
app.use(ecommerceCompose);   // after platformCompose
```

---

## 1.6 Plugin Registration at Compose Boot

Payment and Search adapters registered in compose init:

```typescript
// composes/ecommerce/server/src/index.ts
import { createPaymentPlugin } from "@projectx/plugin-payment-server";

const payment = createPaymentPlugin({
  provider: env.PAYMENT_PROVIDER as "stripe" | "razorpay",
  stripe: { secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET },
  razorpay: { ... },
  onPaymentReceived: async (orderId, amount, gatewayRef) => {
    // mediator.send markOrderPaid command
  },
  onPaymentFailed: async (orderId, gatewayRef) => {
    // release inventory, notify customer
  },
});

bootRegistry.adapters.register("payment", payment.adapter);

const ecommerceCompose = new Elysia({ prefix: "/ecommerce" })
  .use(payment.plugin)
  // ... other routes
```

---

## 1.7 Seed Data

File: `composes/ecommerce/server/src/db/seed/roles.seed.ts`

Seeds 5 roles (eco:admin, eco:manager, eco:fulfillment, eco:support, eco:customer).

File: `composes/ecommerce/server/src/db/seed/regions.seed.ts`

Seeds 3 default regions:

```
Region: United States
  currency: USD, countries: ["US"], taxProfileId: "us-default"

Region: European Union
  currency: EUR, countries: ["DE","FR","NL","IT","ES"], taxProfileId: "eu-vat"

Region: India
  currency: INR, countries: ["IN"], taxProfileId: "in-gst"
```

---

## 1.8 Web Shell Mount

Admin app mounted at `/admin/ecommerce`:

```typescript
// apps/web/src/router.ts
import { adminRoutes, adminManifest } from "@projectx/compose-ecommerce-admin";
import { storefrontRoutes } from "@projectx/compose-ecommerce-storefront";
```

Storefront is a separate TanStack tree rooted at `/` (or a distinct subdomain deployment).

---

## Deliverables Checklist

- [ ] `composes/ecommerce/server/package.json`
- [ ] `composes/ecommerce/server/tsconfig.json`
- [ ] `composes/ecommerce/server/src/index.ts` (skeleton)
- [ ] `composes/ecommerce/server/src/permissions/index.ts`
- [ ] `composes/ecommerce/server/src/db/schema/index.ts`
- [ ] `composes/ecommerce/server/src/db/seed/roles.seed.ts`
- [ ] `composes/ecommerce/server/src/db/seed/regions.seed.ts`
- [ ] `composes/ecommerce/web/admin/package.json`
- [ ] `composes/ecommerce/web/admin/src/index.ts`
- [ ] `composes/ecommerce/web/storefront/package.json`
- [ ] `composes/ecommerce/web/storefront/src/index.ts`
- [ ] `apps/server/src/index.ts` — add `.use(ecommerceCompose)`
- [ ] `apps/web/src/router.ts` — add admin + storefront routes
