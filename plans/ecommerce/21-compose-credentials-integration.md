# Ecommerce — Phase 21: Compose Credentials & Integration Config

## Goal

Document every config point: ports, env vars, auth token flow, payment keys, Vite aliases, and shell registration — so wiring ecommerce into any environment is unambiguous.

---

## 21.1 Port Architecture

Same as CRM. Two separate processes:

| Process | Port | Env var |
|---------|------|---------|
| API server (`apps/server`) | `10050` | `PORT` in `apps/server/src/infra/env.ts` |
| Vite dev server (`apps/web`) | `10060` | `VITE_PORT` in `.env` |

**Rule:** All API calls from web packages must use absolute URL via `VITE_API_URL`. Relative paths like `/ecommerce/...` hit Vite (10060) and return 404.

---

## 21.2 Required Env Vars

**Server-side** — `apps/server/.env` (or repo root `.env`):
```env
# Payment (pick one)
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Or Razorpay:
# PAYMENT_PROVIDER=razorpay
# RAZORPAY_KEY_ID=rzp_test_...
# RAZORPAY_KEY_SECRET=...
# RAZORPAY_WEBHOOK_SECRET=...

# Notification (order confirmation emails)
MAILER_HOST=smtp.example.com
MAILER_PORT=587
MAILER_USER=noreply@example.com
MAILER_PASSWORD=...

# Storefront origin (for CORS + email links)
STOREFRONT_URL=http://localhost:5174
```

**Frontend (Vite)** — repo root `.env`:
```env
VITE_API_URL=http://localhost:10050

# Stripe frontend key (different from server secret key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Critical:** `STRIPE_SECRET_KEY` (server) and `VITE_STRIPE_PUBLISHABLE_KEY` (frontend) are different keys. Never expose `STRIPE_SECRET_KEY` to the frontend.

---

## 21.3 Two API Clients — Two Base Paths

Ecommerce has two URL namespaces:

| Client | Base URL | Token source |
|--------|----------|-------------|
| `EcommerceAdminApiClient` | `VITE_API_URL + "/ecommerce/admin"` | `platform_token` (localStorage) |
| `EcommerceStoreApiClient` | `VITE_API_URL + "/ecommerce/store"` | `eco_customer_token` (localStorage) |

Never mix token keys. Admin calls with customer token → 403. Customer calls with platform token → 401.

---

## 21.4 Auth Token Flow — Admin

Same as CRM admin flow:
1. Login at `/login` via `platformApi.login(email, password)`
2. Server returns `{ token }` — stored as `localStorage.setItem("platform_token", token)`
3. `EcommerceAdminApiClient` reads `useAuthStore.getState().token` — same as platform
4. Auth plugin resolves token → actor with `roles: ["eco:admin"]` etc.

---

## 21.5 Auth Token Flow — Customer (Storefront)

Separate flow from platform:
1. Customer POSTs to `POST /ecommerce/store/auth/login` with `{ email, password }`
2. Server checks `persons` master table (`type = "customer"`), compares bcrypt hash from `meta.passwordHash`
3. Returns `{ customer: {...}, token: "eco_jwt_..." }`
4. Frontend: `localStorage.setItem("eco_customer_token", token)`
5. `EcommerceStoreApiClient` reads `localStorage.getItem("eco_customer_token")`
6. Store routes: auth plugin resolves `eco_customer_token` → customer context (NOT actor context)

**Customer context shape** (different from actor):
```typescript
interface CustomerContext {
  customerId: string;
  orgId: string;
  email: string;
}
```

Access in store route handlers via `(ctx as any).customer` (not `.actor`).

---

## 21.6 Platform Login Card — Dev Credentials Update

**File:** `composes/platform/web/src/routes/auth/login.tsx`

Add ecommerce admin users to the dev credentials card:

```tsx
<div className="space-y-0.5">
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ecommerce Admin</p>
  <p>eco-admin@platform.local / eco123 (admin)</p>
  <p>eco-manager@platform.local / eco123 (manager)</p>
  <p>eco-fulfillment@platform.local / eco123 (fulfillment)</p>
</div>
```

Storefront test customers (logged in via storefront, not platform login):
```tsx
<div className="space-y-0.5">
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Storefront</p>
  <p>customer1@test.local / test123</p>
  <p>customer2@test.local / test123</p>
</div>
```

---

## 21.7 Vite Aliases for Two Web Packages

**File:** `apps/web/vite.config.ts`

Two packages to add (admin + storefront):

```typescript
const composes = {
  platform: "../../composes/platform/web/src",
  crm: "../../composes/crm/web/src",
  ecommerceAdmin: "../../composes/ecommerce/web/admin/src",
  ecommerceStorefront: "../../composes/ecommerce/web/storefront/src",
};

resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
    "@projectx/platform-web": path.resolve(__dirname, composes.platform),
    "@projectx/crm-web": path.resolve(__dirname, composes.crm),
    "@projectx/ecommerce-admin": path.resolve(__dirname, composes.ecommerceAdmin),
    "@projectx/ecommerce-storefront": path.resolve(__dirname, composes.ecommerceStorefront),
    "@projectx/ui": path.resolve(__dirname, packages.ui),
  },
},
```

---

## 21.8 Web Shell Registration (`apps/web`)

Three files need updating — all three must be done together.

**`apps/web/package.json`:**
```json
"@projectx/ecommerce-admin": "workspace:*",
"@projectx/ecommerce-storefront": "workspace:*"
```

**`apps/web/tsconfig.json`:**
```json
"@projectx/ecommerce-admin": ["../../composes/ecommerce/web/admin/src"],
"@projectx/ecommerce-admin/*": ["../../composes/ecommerce/web/admin/src/*"],
"@projectx/ecommerce-storefront": ["../../composes/ecommerce/web/storefront/src"],
"@projectx/ecommerce-storefront/*": ["../../composes/ecommerce/web/storefront/src/*"]
```

**`apps/web/src/router.tsx`:**
```typescript
import { ecommerceAdminRoutes } from "@projectx/ecommerce-admin";
import { ecommerceStorefrontRoutes } from "@projectx/ecommerce-storefront";

const routeTree = sharedRootRoute.addChildren([
  indexRoute,
  ...platformRoutes,
  ...crmRoutes,
  ...ecommerceAdminRoutes,       // ← admin under /admin/ecommerce/*
  ...ecommerceStorefrontRoutes,  // ← storefront under /store/*
]);
```

Run `bun install` after updating `package.json`.

---

## 21.9 Server Shell Registration (`apps/server`)

**`apps/server/tsconfig.json`** — add:
```json
"@projectx/ecommerce-server": ["../../composes/ecommerce/server/src/index.ts"],
"@projectx/ecommerce-server/*": ["../../composes/ecommerce/server/src/*"]
```

**`apps/server/src/infra/db/schema/index.ts`** — add:
```typescript
export * from "./ecommerce";
```

**`apps/server/src/index.ts`** — add after platform/crm composes:
```typescript
// Register payment adapter before ecommerce compose boots
if (process.env.PAYMENT_PROVIDER) {
  const { createPaymentPlugin } = await import("@projectx/plugin-payment-server");
  const paymentPlugin = createPaymentPlugin({
    provider: process.env.PAYMENT_PROVIDER as "stripe" | "razorpay",
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID!,
      keySecret: process.env.RAZORPAY_KEY_SECRET!,
    },
  });
  bootRegistry.adapters.register("payment", paymentPlugin.adapter);
}

const { createEcommerceCompose } = await import("@projectx/ecommerce-server");
const ecommerceCompose = createEcommerceCompose(mediator, bootRegistry.adapters);
app = app.use(ecommerceCompose);
```

Note: `createEcommerceCompose(mediator, adapters)` takes adapters as second arg (for PaymentAdapter access).

---

## 21.10 Stripe Frontend Setup

**`index.html`** (or dynamic load in storefront) — NOT needed if using `@stripe/stripe-js`:

```bash
cd composes/ecommerce/web/storefront && bun add @stripe/stripe-js @stripe/react-stripe-js
```

Load in checkout step 3 only (code-split to avoid loading Stripe on every page):
```typescript
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);
// Pass to <Elements> component only on payment step
```

---

## 21.11 Globals.css — Required Addition

**File:** `apps/web/src/globals.css`

```css
@source "../../../composes/ecommerce/web/admin/src";
@source "../../../composes/ecommerce/web/storefront/src";
```

Without these, Tailwind won't scan ecommerce component classes → missing styles in production build.
