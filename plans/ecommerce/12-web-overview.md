# Ecommerce Web UI — Complete Implementation Plan

## Goal

Build two fully functional web UIs from scratch:
1. **Admin** (`@projectx/ecommerce-admin`) — merchant dashboard: products, orders, fulfillment, returns, customers, analytics, settings
2. **Storefront** (`@projectx/ecommerce-storefront`) — customer-facing shop: catalog, cart, checkout, account

Match platform compose's design system for admin. Storefront can diverge visually (customer-facing).

## Reference

- Gold-standard admin page: `composes/platform/web/src/routes/dashboard.users.tsx`
- UI package: `packages/ui/src/`
- Platform layout: `composes/platform/web/src/routes/dashboard.layout.tsx`
- Auth pattern: `@projectx/platform-web` exports `AuthGuard`, `useAuthStore`

## Core Rules — Admin

- Use `@projectx/ui` for every component
- Class-based `EcommerceAdminApiClient` (like `platformApi`, not Eden Treaty)
- All list pages: PageHeader + search/filters + Table + skeleton + pagination + Create/Edit dialogs
- All detail pages: tabs layout (Overview | Details | Activity)
- Auth: import `useAuthStore` from `@projectx/platform-web`, wrap layout in `AuthGuard`
- Roles guarded: `eco:admin | eco:manager | eco:fulfillment | eco:support`

## Core Rules — Storefront

- Class-based `EcommerceStoreApiClient` using `eco_customer_token` from localStorage
- Customer auth separate from platform auth — different JWT, different localStorage key
- Cart state: Zustand store with `persist` middleware (survives page refresh)
- Stripe.js loaded via `<script>` in `index.html` OR via `@stripe/stripe-js` npm package
- TanStack Query for all server state; Zustand only for cart + UI state
- Route prefix: ALL storefront routes under `/store/*`

## Pain Points to Fix

| Problem | Fix |
|---------|-----|
| Admin `routes/layout.tsx` is bare `<Outlet />` | Add NavBar + AuthGuard |
| Storefront `routes/layout.tsx` is bare `<Outlet />` | Add StorefrontHeader + CartDrawer |
| Eden Treaty client — types unreliable | Replace with class-based clients |
| No customer auth flow | Build login/register/forgot-password pages |
| No cart persistence across refresh | Add Zustand persist to cart store |
| `apps/web/src/globals.css` missing ecommerce `@source` | Add both package paths |
| Admin web package not in `apps/web` | Wire package.json + tsconfig + router |
| Storefront web package not in `apps/web` | Wire package.json + tsconfig + router |

## Implementation Phases

| Phase | File | Description |
|-------|------|-------------|
| 13 | `13-web-foundation.md` | Both layout shells, API clients, globals.css, Zustand cart |
| 14 | `14-web-admin-products-categories.md` | Products + Categories admin pages |
| 15 | `15-web-admin-orders-fulfillment.md` | Orders, Fulfillment, Returns admin pages |
| 16 | `16-web-admin-customers-analytics.md` | Customers, Analytics, Settings admin pages |
| 17 | `17-web-storefront-home-catalog.md` | Storefront: Home, PLP, PDP |
| 18 | `18-web-storefront-cart-checkout.md` | Cart drawer, Cart page, Checkout wizard |
| 19 | `19-web-storefront-account.md` | Customer auth, Account, Order history, Returns |

## All Files Changed

```
# Shared shell
apps/web/src/globals.css                                       ← add @source for both eco packages
apps/web/package.json                                          ← add both workspace deps
apps/web/tsconfig.json                                         ← add both path aliases
apps/web/vite.config.ts                                        ← add both Vite aliases
apps/web/src/router.tsx                                        ← spread ecommerceAdminRoutes + ecommerceStorefrontRoutes

# Admin web
composes/ecommerce/web/admin/src/lib/api.ts                    ← EcommerceAdminApiClient class
composes/ecommerce/web/admin/src/routes/layout.tsx             ← NavBar + AuthGuard
composes/ecommerce/web/admin/src/routes/dashboard.tsx          ← KPI cards: GMV, orders, AOV
composes/ecommerce/web/admin/src/routes/products/index.tsx     ← list + create/edit
composes/ecommerce/web/admin/src/routes/products/detail.tsx    ← tabs: details + variants + media
composes/ecommerce/web/admin/src/routes/categories/index.tsx   ← category tree/table
composes/ecommerce/web/admin/src/routes/orders/index.tsx       ← list + status filter
composes/ecommerce/web/admin/src/routes/orders/detail.tsx      ← items + address + fulfillment
composes/ecommerce/web/admin/src/routes/fulfillment/index.tsx  ← fulfillment queue
composes/ecommerce/web/admin/src/routes/returns/index.tsx      ← returns queue
composes/ecommerce/web/admin/src/routes/returns/detail.tsx     ← approve/reject/refund
composes/ecommerce/web/admin/src/routes/customers/index.tsx    ← customer list
composes/ecommerce/web/admin/src/routes/customers/detail.tsx   ← profile + orders
composes/ecommerce/web/admin/src/routes/analytics/index.tsx    ← GMV chart, metrics
composes/ecommerce/web/admin/src/routes/settings/index.tsx     ← regions, shipping, tax
composes/ecommerce/web/admin/src/stores/orders.ts              ← order state + filters
composes/ecommerce/web/admin/src/stores/products.ts            ← product state
composes/ecommerce/web/admin/src/stores/fulfillment.ts         ← fulfillment queue state

# Storefront web
composes/ecommerce/web/storefront/src/lib/api.ts               ← EcommerceStoreApiClient class
composes/ecommerce/web/storefront/src/routes/layout.tsx        ← StorefrontHeader + CartDrawer
composes/ecommerce/web/storefront/src/routes/index.tsx         ← Home page
composes/ecommerce/web/storefront/src/routes/products/index.tsx    ← PLP
composes/ecommerce/web/storefront/src/routes/products/detail.tsx   ← PDP
composes/ecommerce/web/storefront/src/routes/categories/$id.tsx    ← Category PLP
composes/ecommerce/web/storefront/src/routes/cart.tsx          ← Cart page
composes/ecommerce/web/storefront/src/routes/checkout.tsx      ← 4-step checkout wizard
composes/ecommerce/web/storefront/src/routes/account/index.tsx ← Profile + orders
composes/ecommerce/web/storefront/src/routes/account/orders/$id.tsx  ← Order detail
composes/ecommerce/web/storefront/src/routes/auth/login.tsx    ← Customer login
composes/ecommerce/web/storefront/src/routes/auth/register.tsx ← Customer register
composes/ecommerce/web/storefront/src/routes/auth/forgot.tsx   ← Forgot password
composes/ecommerce/web/storefront/src/routes/search.tsx        ← Search results
composes/ecommerce/web/storefront/src/stores/cart.ts           ← Cart (persisted Zustand)
composes/ecommerce/web/storefront/src/stores/customer.ts       ← Customer session
composes/ecommerce/web/storefront/src/components/CartDrawer.tsx
composes/ecommerce/web/storefront/src/components/ProductCard.tsx
composes/ecommerce/web/storefront/src/components/VariantSelector.tsx
composes/ecommerce/web/storefront/src/components/CheckoutSteps.tsx
composes/ecommerce/web/storefront/src/vite-env.d.ts
```

## Risks

- Customer auth (eco_customer_token) is separate from platform auth — must never mix
- Checkout requires PaymentAdapter to be registered at boot — verify Phase 11 (shell integration) done first
- Stripe.js requires `VITE_STRIPE_PUBLISHABLE_KEY` env var on the frontend — different from server `STRIPE_SECRET_KEY`
- Storefront must use `/store/*` prefix — `/` is taken by platform
- Cart persist middleware requires `zustand/middleware` import — don't use bare `create`
