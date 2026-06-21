# Ecommerce Compose — Agent Start

**Read first:** `plans/AGENT-START.md` (universal bootstrap: path aliases, layer rules, existing modules, compose pattern).

Then return here for ecommerce-specific context.

---

## Goal

Implement ecommerce compose modeled on Medusa v2.
Full plan: `plans/ecommerce/00-index.md` (read this for phase ordering).

---

## Phase Execution Order

### Backend + Shell

1. `01-foundation.md` — scaffolding, packages, permissions, DB seed. **Must complete first.**
2. `02-entities.md` — DB schema (15 tables). Complete before routes.
3. `03-backend-checkout.md` — checkout saga (payment + inventory compensation).
4. `04-backend-admin-api.md` — admin REST routes.
5. `05-backend-store-api.md` — store (customer-facing) REST routes.
6. `06-backend-logic.md` — FSMs, jobs, rules, analytics.
7. `07-plugins.md` — plugin wiring (payment, tax, fulfillment, notification).
8. `08-frontend-structure.md` — two web packages (admin + storefront), route trees, stores.
9. `09-frontend-admin.md` — all admin pages.
10. `10-frontend-storefront.md` — storefront pages (home, PLP, PDP, cart, checkout, account, auth).
11. `11-shell-integration.md` — **integration gate.** Wire both web packages + server into shells. PaymentAdapter boot. DB migration. Seed. Verify.

Do not skip phases. Complete Phase N before Phase N+1.
**Phase 11 is the integration gate — nothing is live until this phase completes.**

### Web UI Detail (read after Phase 11)

Component-level implementation specs. Read `12-web-overview.md` first.

12. `12-web-overview.md` — pain points, design rules, file change manifest (admin + storefront).
13. `13-web-foundation.md` — admin NavBar + AuthGuard + `EcommerceAdminApiClient`; storefront header + `CartDrawer` + `EcommerceStoreApiClient`; Zustand cart + customer stores.
14. `14-web-admin-products-categories.md` — Products list/detail/variants, categories.
15. `15-web-admin-orders-fulfillment.md` — Orders list/detail, fulfillment queue, returns.
16. `16-web-admin-customers-analytics.md` — Customers, analytics dashboard, settings.
17. `17-web-storefront-home-catalog.md` — Home, PLP, PDP, `ProductCard`, `VariantSelector`, search.
18. `18-web-storefront-cart-checkout.md` — `CartDrawer`, cart page, 4-step checkout wizard.
19. `19-web-storefront-account.md` — Customer auth (login/register/forgot), account, orders, returns, addresses.

### Operations Reference (read before starting)

**Read `22-missed-integrations.md` before Phase 1.** It lists all known pitfalls.

20. `20-data-seeding.md` — DB push process, eco dev users, region/tax/shipping seed, sample products, setup order.
21. `21-compose-credentials-integration.md` — ports, env vars, Stripe keys, admin vs customer token flow, two Vite aliases, server registration.
22. `22-missed-integrations.md` — all pitfalls with causes + fixes + quick checklist.

---

## Compose Identity

| Property | Value |
|----------|-------|
| Compose name | `ecommerce` |
| Server package | `@projectx/ecommerce-server` |
| Admin web package | `@projectx/ecommerce-admin` |
| Storefront web package | `@projectx/ecommerce-storefront` |
| Server path | `composes/ecommerce/server/` |
| Admin web path | `composes/ecommerce/web/admin/` |
| Storefront web path | `composes/ecommerce/web/storefront/` |
| Elysia prefix (admin) | `/ecommerce/admin` |
| Elysia prefix (store) | `/ecommerce/store` |
| Export fn | `createEcommerceCompose(mediator)` |
| Export type | `EcommerceApp` |
| DB table prefix | `eco_` |
| Drizzle object prefix | `eco` (e.g. `ecoOrder`, `ecoProduct`) |

---

## DB Tables to Create (Phase 2)

See `plans/ecommerce/02-entities.md` for full field specs.

| Drizzle object | SQL table | Key fields |
|----------------|-----------|------------|
| `ecoProduct` | `eco_products` | id, orgId, title, handle, description, status, categoryId, tags, weight |
| `ecoVariant` | `eco_variants` | id, productId, sku, price, compareAtPrice, stockQty, options (jsonb), status |
| `ecoCategory` | `eco_categories` | id, orgId, name, slug, parentId, description |
| `ecoRegion` | `eco_regions` | id, orgId, name, currency, countries (jsonb), taxIncluded, taxProfileId |
| `ecoCart` | `eco_carts` | id, orgId, customerId (nullable), regionId, shippingAddressId, billingAddressId, couponId, status |
| `ecoCartItem` | `eco_cart_items` | id, cartId, variantId, qty, unitPrice, lineTotal |
| `ecoOrder` | `eco_orders` | id, orgId, customerId, cartId, regionId, status, subtotal, shipping, tax, discount, total, shippingAddressId, billingAddressId |
| `ecoOrderItem` | `eco_order_items` | id, orderId, variantId, qty, unitPrice, lineTotal |
| `ecoFulfillment` | `eco_fulfillments` | id, orderId, status, carrier, trackingNumber, shippedAt, deliveredAt |
| `ecoReturn` | `eco_returns` | id, orderId, customerId, status, reason, items (jsonb), refundAmount, processedAt |
| `ecoCustomer` | `eco_customers` | id, orgId, email, firstName, lastName, phone, passwordHash |
| `ecoShippingOption` | `eco_shipping_options` | id, regionId, name, type, rate, estimatedDays, conditions (jsonb) |
| `ecoTaxProfile` | `eco_tax_profiles` | id, orgId, name, provider |
| `ecoTaxRate` | `eco_tax_rates` | id, profileId, name, rate, jurisdiction, productType, isDefault |
| `ecoCoupon` | `eco_coupons` | id, orgId, code, type, value, minOrderValue, usageLimit, usedCount, expiresAt |

---

## Modules to Use via Mediator

| Need | Module | Command/Query type prefix |
|------|--------|--------------------------|
| Auth/session | identity | `identity.resolveSession`, `identity.register`, `identity.login` |
| Stock reservation | inventory | `inventory.reserve`, `inventory.release`, `inventory.deduct` |
| Financial records | ledger | `ledger.record`, `ledger.createJournal` |
| Notifications | notification | `notification.send` |
| Analytics | analytics | `analytics.track` |
| Background jobs | workflow | `workflow.schedule` |
| Product catalog sync | catalog | `catalog.getItem`, `catalog.getVariant` (read-only) |

---

## Critical: Checkout Saga (Phase 3)

Saga pattern — compensating actions on failure:

```
reserve inventory
  → create payment session
    → on success: capture payment → confirm order → deduct inventory
    → on failure: release inventory, cancel order, refund if captured
```

See `plans/ecommerce/03-backend-checkout.md` for full flow.

Payment integration via `PaymentAdapter` from `@projectx/plugin-payment-server`.
Tax calculation via `TaxAdapter` — either built-in rate lookup or external provider.
Fulfillment via `FulfillmentAdapter` — shipping option selection + tracking.

---

## Plugins Needed

| Plugin | When | Notes |
|--------|------|-------|
| `@projectx/plugin-payment-server` | Phase 7 | Stripe or Razorpay. Config from env `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, etc. |
| `@projectx/plugin-notification-server` | Phase 7 | Order confirmation, shipping emails |
| Tax | Phase 7 | Built-in `TaxAdapter` from core (rate table lookup). Optional external in P1. |
| Fulfillment | Phase 7 | Built-in rate calculation from `eco_shipping_options`. Optional external carrier in P1. |
| Search | Built-in | `createPgSearchAdapter()` already at boot. Use for product search. |

---

## Permissions Matrix

Roles to define in seed:
- `eco:admin` — full access
- `eco:manager` — products, orders, returns, analytics
- `eco:fulfillment` — view orders, update fulfillment/tracking
- `eco:support` — view orders, process returns
- `eco:customer` — store routes only (own orders, own account)

Customer auth: separate session from admin. Customers authenticate via
`POST /ecommerce/store/auth/login` → returns customer JWT. Different from actor JWT.

---

## Two Route Namespaces

Admin routes (`/ecommerce/admin/*`) — require `eco:admin | eco:manager | eco:fulfillment | eco:support`
Store routes (`/ecommerce/store/*`) — public (browse/cart) + customer auth (checkout/account)

Both under same Elysia app / compose. Split into separate route files.

---

## Frontend Framework

Both admin and storefront:
- Router: TanStack Router v1
- Data: TanStack Query v5
- State: Zustand v4
- Charts: recharts

**Admin:** shadcn/ui zinc, `@projectx/ui`, same as platform admin.

**Storefront:** Customer-facing. Can have different visual identity.
- Zinc base or white/neutral base.
- Key components: `<ProductCard>`, `<ProductGallery>`, `<VariantSelector>`, `<CartDrawer>`, `<CheckoutSteps>`
- Payment UI: Stripe.js `<CardElement>` for Stripe; `Razorpay.checkout.js` modal for Razorpay.
- API: `treaty<EcommerceApp>(origin)` — same App type for both admin and storefront client.

---

## Key FSMs (Phase 6)

1. **Order FSM:** `pending → processing → fulfilled | cancelled → refunded`
2. **Fulfillment FSM:** `pending → processing → shipped → delivered | failed`
3. **Return FSM:** `requested → approved | rejected → received → processed → refunded`
4. **Cart FSM:** `active → checkout → completed | abandoned`
5. **Product FSM:** `draft → published | archived`

---

## Shell Registration (after implementation)

**`apps/server/src/index.ts`** — add:
```typescript
const { createEcommerceCompose } = await import("@projectx/ecommerce-server");
const ecommerceCompose = createEcommerceCompose(mediator);
app = app.use(ecommerceCompose);
```

**`apps/server/tsconfig.json`** — add to paths:
```json
"@projectx/ecommerce-server": ["../../composes/ecommerce/server/src/index.ts"],
"@projectx/ecommerce-server/*": ["../../composes/ecommerce/server/src/*"]
```

**`apps/server/src/infra/db/schema/index.ts`** — add:
```typescript
export * from "./ecommerce";
```

---

## Env Variables Needed

```
# Payment
PAYMENT_PROVIDER=stripe          # or razorpay
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Notification (order emails)
MAILER_HOST=smtp.example.com
MAILER_PORT=587
MAILER_USER=noreply@...
MAILER_PASSWORD=...

# Storefront
STOREFRONT_URL=http://localhost:5174
```
