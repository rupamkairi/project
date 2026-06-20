# Ecommerce Compose — Implementation Plan Index

Agent: claude
Status: in-progress
Reference platform: [Medusa v2](https://docs.medusajs.com)
Gap analysis: [docs/composes/ecommerce.md §12](../../docs/composes/ecommerce.md)

---

## Goal

Implement a full-stack headless ecommerce compose modeled on Medusa v2 — products, cart, checkout,
orders, fulfillment, returns, tax, regions, and storefront — fully respecting the ProjectX
architecture. Includes both admin server API and customer-facing storefront web, plus admin dashboard.

---

## Plan Files

| File | Scope |
|------|-------|
| [01-foundation.md](./01-foundation.md) | Package scaffolding, DB schema, compose skeleton, roles/permissions |
| [02-entities.md](./02-entities.md) | All new compose-owned entities: ShippingOption, TaxRegion, Return, Swap, Claim, Region, CustomerGroup, DraftOrder, OrderEdit, GiftCard |
| [03-backend-checkout.md](./03-backend-checkout.md) | Cart → ShippingOption → TaxCalculation → PaymentSession → Order — full checkout flow with compensating actions |
| [04-backend-admin-api.md](./04-backend-admin-api.md) | Admin REST routes: products, orders, fulfillment, returns, customers, analytics |
| [05-backend-store-api.md](./05-backend-store-api.md) | Store REST routes: catalog search, cart, checkout, customer account, orders |
| [06-backend-logic.md](./06-backend-logic.md) | Hooks, scheduled jobs, FSMs, rules, compensating-action sagas |
| [07-plugins.md](./07-plugins.md) | Plugin wiring: payment (Stripe/Razorpay), search (PG FTS), fulfillment (P1), tax (P1) |
| [08-frontend-structure.md](./08-frontend-structure.md) | Two web packages: admin dashboard + storefront — routing, layout, auth |
| [09-frontend-admin.md](./09-frontend-admin.md) | Admin pages: dashboard, products, orders, customers, returns, analytics |
| [10-frontend-storefront.md](./10-frontend-storefront.md) | Storefront pages: home, catalog, PDP, cart, checkout, account, orders |
| [11-shell-integration.md](./11-shell-integration.md) | Wire both web packages + server compose into shells; PaymentAdapter boot, DB migration, seed, verification |

---

## Phase Overview

```
Phase 1 — Foundation          Packages, DB schema, skeleton, seed roles
Phase 2 — Missing Entities    ShippingOption, TaxRegion/Rate, Return, Claim, Swap,
                               Region, CustomerGroup, DraftOrder, OrderEdit, GiftCard
Phase 3 — Checkout Flow       Cart validation → shipping → tax → payment session → order confirm
Phase 4 — Admin API           Full admin REST surface
Phase 5 — Store API           Public + authenticated store API
Phase 6 — Backend Logic       Hooks, jobs, FSMs, saga patterns
Phase 7 — Plugins             Payment, Search, Fulfillment, Tax adapters wired
Phase 8 — Frontend Admin      Admin dashboard web app
Phase 9 — Frontend Storefront Headless storefront web app
Phase 10 — Shell Wiring    Server tsconfig + index.ts + schema; web (2 packages): package.json + tsconfig + router; PaymentAdapter boot; seed
```

---

## Architecture Position

```
apps/server (Shell)
  └── .use(ecommerceCompose)

composes/ecommerce/
  server/
    src/
      index.ts               ← ecommerceCompose (Elysia) + EcommerceApp export
      routes/
        admin/               ← Phase 4 (JWT admin role required)
        store/               ← Phase 5 (public + customer JWT)
      hooks/                 ← Phase 6
      jobs/                  ← Phase 6
      checkout/              ← Phase 3 (checkout orchestration logic)
      permissions/           ← Phase 1
      db/
        schema/              ← Phase 1-2
        seed/                ← Phase 1
  web/
    admin/                   ← Phase 8 (separate web package)
      src/
        routes/
        components/
        stores/
        lib/api.ts
    storefront/              ← Phase 9 (separate web package)
      src/
        routes/
        components/
        stores/
        lib/api.ts
```

---

## Module Dependencies

| Module | Used for |
|--------|---------|
| `identity` | Customer auth, actor resolution, admin roles |
| `catalog` | Product/variant/category data for storefront |
| `inventory` | Stock reservation, fulfillment, restock |
| `ledger` | Payment recording, refund ledger, revenue accounting |
| `workflow` | ORDER_FULFILLMENT, ORDER_RETURN, ORDER_EDIT workflows |
| `scheduling` | Delivery time estimates (optional) |
| `notification` | Order confirmation, shipping updates, return status |
| `document` | Invoice generation, packing slip |
| `analytics` | GMV, AOV, conversion rate, refund rate |
| `geo` | Address validation, shipping zone lookup, tax region lookup |

---

## P0 Blockers Resolution Status

| Blocker | Status |
|---------|--------|
| Payment plugin (Stripe + Razorpay) | Done — previous session |
| `tax` AdapterType + interface | Done — previous session |
| `fulfillment` AdapterType + interface | Done — previous session |
| `PgSearchAdapter` | Done — previous session |
| `ShippingOption` entity | Phase 2 of this plan |
| `TaxRegion` entity | Phase 2 of this plan |

---

## Risks

1. Checkout saga requires compensating actions (inventory.reserve → payment.capture → inventory.fulfill). If payment fails after reserve, inventory must be released. Explicit saga pattern needed.
2. Tax calculation varies enormously by jurisdiction. Plan scopes only a simple rate-based model; TaxJar/Avalara integration is P2.
3. Storefront is a separate web package from admin — two TanStack Router trees. Shell mounts both under different base paths.
4. Fulfillment plugin requires carrier-specific webhooks (Shiprocket, Delhivery, DHL) — complex, scoped to P1.
