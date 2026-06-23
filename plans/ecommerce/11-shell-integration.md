# Ecommerce — Phase 11: Shell Integration

## Goal

Wire the ecommerce compose into both shells so the server exposes
`/ecommerce/admin/*` and `/ecommerce/store/*` routes, and the web app
renders both admin and storefront pages. Must be done **after Phase 10**.

---

## 11.0 Prerequisites Checklist

Before touching shell files, confirm:

- [ ] `composes/ecommerce/server/src/index.ts` exports `createEcommerceCompose(mediator)` and `EcommerceApp`
- [ ] `composes/ecommerce/server/src/db/schema/ecommerce.ts` exists with all tables
- [ ] `composes/ecommerce/web/admin/src/routes/index.ts` exports `ecommerceAdminRoutes` array
- [ ] `composes/ecommerce/web/storefront/src/routes/index.ts` exports `ecommerceStorefrontRoutes` array
- [ ] `bun run typecheck` passes inside both web packages and server package

---

## 11.1 Server Shell — 4 Files to Edit

### File 1: `apps/server/tsconfig.json`

Add to `compilerOptions.paths`:

```json
"@projectx/ecommerce-server": ["../../composes/ecommerce/server/src/index.ts"],
"@projectx/ecommerce-server/*": ["../../composes/ecommerce/server/src/*"]
```

Full paths block after adding CRM + ecommerce:
```json
{
  "paths": {
    "@core": ["./src/core/index.ts"],
    "@core/*": ["./src/core/*"],
    "@modules/*": ["./src/modules/*"],
    "@infra/*": ["./src/infra/*"],
    "@db/*": ["./src/infra/db/*"],
    "@projectx/platform-server": ["../../composes/platform/server/src/index.ts"],
    "@projectx/platform-server/*": ["../../composes/platform/server/src/*"],
    "@projectx/crm-server": ["../../composes/crm/server/src/index.ts"],
    "@projectx/crm-server/*": ["../../composes/crm/server/src/*"],
    "@projectx/ecommerce-server": ["../../composes/ecommerce/server/src/index.ts"],
    "@projectx/ecommerce-server/*": ["../../composes/ecommerce/server/src/*"]
  }
}
```

---

### File 2: `apps/server/src/infra/db/schema/index.ts`

Add at the end:
```typescript
export * from "./ecommerce";
```

---

### File 3: `apps/server/src/index.ts`

Add ecommerce compose alongside platform (and CRM if installed):

```typescript
const { createEcommerceCompose } = await import("@projectx/ecommerce-server");
const ecommerceCompose = createEcommerceCompose(mediator);

let app: any = new Elysia()
  .use(cors())
  .use(swagger())
  .use(bearer())
  .use(platformCompose)
  .use(crmCompose)            // if CRM is already registered
  .use(ecommerceCompose)      // ← add here
  .get("/health", ...)
  ...
```

**Important:** ecommerce compose needs PaymentAdapter registered before it boots.
Pass adapter registry into the compose factory:

```typescript
// createEcommerceCompose signature:
export function createEcommerceCompose(
  mediator: Mediator,
  adapters: AdapterRegistry,   // ← pass bootRegistry.adapters
) { ... }
```

In `apps/server/src/index.ts`, pass `bootRegistry.adapters`:
```typescript
const ecommerceCompose = createEcommerceCompose(mediator, bootRegistry.adapters);
```

---

### File 4: Run DB migration

From project root (or `apps/server/`):
```bash
bun db:push    # pushes eco_ detail table schema via WebSocket (Neon compatible)
```
Do not use `db:migrate` — it requires TCP and fails with Neon serverless URLs.

Confirm eco_ **detail** tables (master tables already exist from foundation modules):
`eco_regions`, `eco_tax_profiles`, `eco_tax_rates`, `eco_shipping_options`,
`eco_customer_groups`, `eco_customer_group_members`, `eco_returns`, `eco_return_items`,
`eco_claims`, `eco_swaps`, `eco_swap_items`, `eco_gift_cards`, `eco_fulfillments`,
`eco_fulfillment_items`, `eco_draft_orders`, `eco_order_edits`.

Do NOT expect `eco_orders`, `eco_order_items`, `eco_carts`, `eco_cart_items`, `eco_customers`,
`eco_products`, or `eco_variants` — those concepts live in master tables
(`transactions`, `transaction_lines`, `persons`, `cat_items`, `cat_variants`).

---

## 11.2 Web Shell — Two Web Packages

Ecommerce has **two** separate web packages (admin + storefront).
Both must be registered in the web shell.

### File 1: `apps/web/package.json`

Add both to `dependencies`:
```json
"@projectx/ecommerce-admin": "workspace:*",
"@projectx/ecommerce-storefront": "workspace:*"
```

Then install:
```bash
bun install
```

---

### File 2: `apps/web/tsconfig.json`

Add to `compilerOptions.paths`:
```json
"@projectx/ecommerce-admin": ["../../composes/ecommerce/web/admin/src"],
"@projectx/ecommerce-admin/*": ["../../composes/ecommerce/web/admin/src/*"],
"@projectx/ecommerce-storefront": ["../../composes/ecommerce/web/storefront/src"],
"@projectx/ecommerce-storefront/*": ["../../composes/ecommerce/web/storefront/src/*"]
```

---

### File 3: `apps/web/src/router.tsx`

Import both route arrays and add to route tree:

```typescript
import { Route as indexRoute } from "@/routes/index";
import { platformRoutes } from "@projectx/platform-web";
import { crmRoutes } from "@projectx/crm-web";                          // if CRM installed
import { ecommerceAdminRoutes } from "@projectx/ecommerce-admin";       // ← add
import { ecommerceStorefrontRoutes } from "@projectx/ecommerce-storefront"; // ← add
import { sharedRootRoute } from "@projectx/shared-router";
import { createRouter } from "@tanstack/react-router";

const routeTree = sharedRootRoute.addChildren([
  indexRoute,
  ...platformRoutes,
  ...crmRoutes,                     // if CRM installed
  ...ecommerceAdminRoutes,          // ← add
  ...ecommerceStorefrontRoutes,     // ← add
]);

export const router = createRouter({ routeTree, ... });
```

---

## 11.3 Required Web Package Export Shapes

### Admin (`composes/ecommerce/web/admin/src/routes/index.ts`)

```typescript
export const ecommerceAdminRoutes = [
  ecommerceAdminLayoutRoute.addChildren([
    ecoAdminDashboardRoute,         // /admin/ecommerce
    ecoAdminProductsRoute,          // /admin/ecommerce/products
    ecoAdminProductDetailRoute,     // /admin/ecommerce/products/:id
    ecoAdminProductNewRoute,        // /admin/ecommerce/products/new
    ecoAdminOrdersRoute,            // /admin/ecommerce/orders
    ecoAdminOrderDetailRoute,       // /admin/ecommerce/orders/:id
    ecoAdminCustomersRoute,         // /admin/ecommerce/customers
    ecoAdminCustomerDetailRoute,    // /admin/ecommerce/customers/:id
    ecoAdminReturnsRoute,           // /admin/ecommerce/returns
    ecoAdminReturnDetailRoute,      // /admin/ecommerce/returns/:id
    ecoAdminRegionsRoute,           // /admin/ecommerce/regions
    ecoAdminShippingRoute,          // /admin/ecommerce/shipping
    ecoAdminTaxRoute,               // /admin/ecommerce/tax
    ecoAdminAnalyticsRoute,         // /admin/ecommerce/analytics
  ]),
];
```

### Storefront (`composes/ecommerce/web/storefront/src/routes/index.ts`)

```typescript
export const ecommerceStorefrontRoutes = [
  ecommerceStorefrontLayoutRoute.addChildren([
    ecoHomeRoute,                   // /
    ecoProductsRoute,               // /products
    ecoProductDetailRoute,          // /products/:handle
    ecoCategoryRoute,               // /categories/:id
    ecoSearchRoute,                 // /search
    ecoCartRoute,                   // /cart
    ecoCheckoutRoutes,              // /checkout/* (nested: address, shipping, payment, confirmation)
    ecoAccountRoutes,               // /account/* (profile, orders, addresses)
    ecoAuthRoutes,                  // /auth/* (login, register, forgot, reset)
  ]),
];
```

**Note on route path conflict:** Storefront uses `/` as root. Platform web also uses `/`.
Solution: storefront layout route path should be `/store` or admin path `/admin/ecommerce`.
OR: storefront runs on a separate port/domain. Document the chosen approach in `composes/ecommerce/web/storefront/src/routes/index.ts`.

**Recommended:** Mount storefront under `/store` prefix to avoid conflict with platform `/` home:
```typescript
const ecommerceStorefrontLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/store",     // → /store, /store/products, /store/cart, etc.
  component: StorefrontLayout,
});
```

---

## 11.4 Seed Data

After migration, seed default data:

```typescript
// composes/ecommerce/server/src/db/seed/ecommerce.ts
export async function seedEcommerce(db: DrizzleDb) {
  // Default region
  await db.insert(ecoRegion).values({
    id: generateId(),
    orgId: PLATFORM_ORG_ID,
    name: "Default",
    currency: "USD",
    countries: ["US"],
    taxIncluded: false,
    taxProfileId: null,
  }).onConflictDoNothing();

  // Default tax profile (zero rate for development)
  const taxProfileId = generateId();
  await db.insert(ecoTaxProfile).values({
    id: taxProfileId,
    orgId: PLATFORM_ORG_ID,
    name: "Standard",
    provider: "built-in",
  }).onConflictDoNothing();

  // Default shipping option
  await db.insert(ecoShippingOption).values({
    id: generateId(),
    regionId: /* from above */ "...",
    name: "Standard Shipping",
    type: "flat_rate",
    rate: 599,    // $5.99 in cents
    estimatedDays: 5,
    conditions: null,
  }).onConflictDoNothing();
}
```

---

## 11.5 PaymentAdapter Registration

Payment plugin must be registered before ecommerce compose boots.
In `apps/server/src/index.ts`, before compose construction:

```typescript
import { createPaymentPlugin } from "@projectx/plugin-payment-server";

// Inside main():
if (process.env.PAYMENT_PROVIDER) {
  const { adapter: paymentAdapter } = createPaymentPlugin({
    provider: process.env.PAYMENT_PROVIDER as "stripe" | "razorpay",
    stripe: process.env.STRIPE_SECRET_KEY ? {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    } : undefined,
    razorpay: process.env.RAZORPAY_KEY_ID ? {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    } : undefined,
  });
  bootRegistry.adapters.register("payment", paymentAdapter);
}
```

---

## 11.6 Verification Checklist

After all edits:

- [ ] `bun run typecheck` — zero errors
- [ ] `GET /ecommerce/store/products` returns 200 with empty array
- [ ] `GET /ecommerce/admin/orders` returns 401 (not 404) — route mounted + auth guard works
- [ ] `POST /ecommerce/store/auth/register` creates a customer
- [ ] Admin web: navigates to `/admin/ecommerce` without 404
- [ ] Storefront: navigates to `/store` without 404
- [ ] TanStack Router DevTools shows both ecommerce route trees
- [ ] DB tables confirmed: `psql -c "\dt eco_*"`
- [ ] Payment webhook: `POST /payment/webhook/stripe` returns 200 (if provider configured)

---

## 11.7 Common Mistakes

- Two web packages — must add BOTH to `apps/web/package.json` and `tsconfig.json`
- Storefront `/` conflicts with platform `/` — always use `/store` prefix for storefront
- Not passing `adapters` to `createEcommerceCompose` — checkout will throw when trying to process payment
- DB migration not run after schema export added — `eco_*` tables won't exist
- `ecommerceAdminRoutes` using admin role check at route level but not inside API — always guard both layers
