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

### Backend (Phases 1–11)

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

### Web UI Implementation Detail (Phases 12–19)

Component-level specs for both admin and storefront. Read after Phase 8.

| File | Scope |
|------|-------|
| [12-web-overview.md](./12-web-overview.md) | Pain points, design rules, full file change manifest for both web packages |
| [13-web-foundation.md](./13-web-foundation.md) | Admin layout + AuthGuard, storefront layout + CartDrawer, two API clients, Zustand stores |
| [14-web-admin-products-categories.md](./14-web-admin-products-categories.md) | Products list, product detail, variant management, categories |
| [15-web-admin-orders-fulfillment.md](./15-web-admin-orders-fulfillment.md) | Orders list/detail, fulfillment queue, returns list/detail |
| [16-web-admin-customers-analytics.md](./16-web-admin-customers-analytics.md) | Customers list/detail, analytics dashboard, settings (regions/shipping/tax/coupons) |
| [17-web-storefront-home-catalog.md](./17-web-storefront-home-catalog.md) | Home page, PLP, category page, PDP, ProductCard, VariantSelector, search |
| [18-web-storefront-cart-checkout.md](./18-web-storefront-cart-checkout.md) | CartDrawer, cart page, 4-step checkout wizard (address/shipping/payment/confirm) |
| [19-web-storefront-account.md](./19-web-storefront-account.md) | Customer auth pages, account profile, order history, return requests, saved addresses |

### Operations & Integration Reference (Phases 20–22)

Operational runbooks. Read before starting any new compose.

| File | Scope |
|------|-------|
| [20-data-seeding.md](./20-data-seeding.md) | DB push, eco dev users, default region/tax/shipping seed, sample products, full setup order |
| [21-compose-credentials-integration.md](./21-compose-credentials-integration.md) | Ports, env vars, Stripe keys, customer vs admin token flow, Vite aliases, shell registration |
| [22-missed-integrations.md](./22-missed-integrations.md) | All integration pitfalls + quick checklist (PaymentAdapter boot order, customer token, saga compensation, etc.) |

---

## Phase Overview

```
Phase  1 — Foundation          Packages, DB schema, skeleton, seed roles
Phase  2 — Missing Entities    ShippingOption, TaxRegion/Rate, Return, Claim, Swap,
                               Region, CustomerGroup, DraftOrder, OrderEdit, GiftCard
Phase  3 — Checkout Flow       Cart validation → shipping → tax → payment session → order confirm
Phase  4 — Admin API           Full admin REST surface
Phase  5 — Store API           Public + authenticated store API
Phase  6 — Backend Logic       Hooks, jobs, FSMs, saga patterns
Phase  7 — Plugins             Payment, Search, Fulfillment, Tax adapters wired
Phase  8 — Frontend Structure  Two web packages: routing, layout, nav, global stores
Phase  9 — Frontend Admin      All admin pages (dashboard, products, orders, customers, analytics)
Phase 10 — Frontend Storefront Storefront pages (home, catalog, PDP, cart, checkout, account)
Phase 11 — Shell Wiring        Server tsconfig + index.ts + schema; web (2 packages); PaymentAdapter boot; seed
Phase 12 — Web Overview        Pain points, design rules, file change manifest
Phase 13 — Web Foundation      Admin NavBar + AuthGuard; storefront header + CartDrawer; API clients; Zustand
Phase 14 — Web Admin Products  Products list/detail, variant mgmt, categories
Phase 15 — Web Admin Orders    Orders list/detail, fulfillment queue, returns
Phase 16 — Web Admin Customers Customers, analytics dashboard, settings
Phase 17 — Web Storefront Home Home, PLP, PDP, ProductCard, VariantSelector, search
Phase 18 — Web Cart/Checkout   CartDrawer, cart page, 4-step checkout wizard
Phase 19 — Web Account         Customer auth, account profile, order history, returns
Phase 20 — Data Seeding        DB push, dev users, region/tax/shipping seed, sample products
Phase 21 — Credentials Config  Ports, env vars, Stripe keys, token flow, Vite aliases
Phase 22 — Missed Integrations All pitfalls + quick checklist for ecommerce
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
