# Ecommerce — Phase 22: Missed Integrations & Known Pitfalls

## Goal

Document every non-obvious integration point that will break during ecommerce implementation — causes, symptoms, fixes. Read this before Phase 1 and review before Phase 11.

---

## 22.1 PaymentAdapter Must Register BEFORE Compose Boots

**Symptom:** `bootRegistry.adapters.get("payment")` returns `undefined` inside compose → checkout throws `PaymentAdapter not registered`.

**Cause:** `createEcommerceCompose(mediator, adapters)` receives the adapter registry at compose creation time. If the payment plugin isn't registered first, the registry snapshot passed to the compose has no payment adapter.

**Fix:** Always register payment plugin before calling `createEcommerceCompose`:
```typescript
// WRONG order
const ecommerceCompose = createEcommerceCompose(mediator, bootRegistry.adapters);
bootRegistry.adapters.register("payment", paymentPlugin.adapter); // too late

// CORRECT order
bootRegistry.adapters.register("payment", paymentPlugin.adapter); // first
const ecommerceCompose = createEcommerceCompose(mediator, bootRegistry.adapters); // then compose
```

---

## 22.2 Customer Token is NOT Platform Token

**Symptom:** Customer login returns 200 but all subsequent store API calls return 401 or 403.

**Cause:** Admin API client uses `localStorage.getItem("platform_token")`. Store API client must use `localStorage.getItem("eco_customer_token")`. If mixed, the wrong token type reaches the wrong auth handler.

**Fix:** Two clients, two keys. Never share:
```typescript
// Admin client — platform token
const token = useAuthStore.getState().token; // "platform_token" key

// Store client — customer token
const token = localStorage.getItem("eco_customer_token"); // different key
```

Auth plugin must have two token-resolution paths: one for actors (platform JWT) and one for customers (eco JWT). Implement as separate Elysia plugins or as branching logic in one plugin based on token prefix.

---

## 22.3 Storefront API URL Must Be Absolute — Relative Paths Hit Vite

**Symptom:** `POST http://localhost:10060/ecommerce/store/auth/login 404`

**Cause:** Vite dev server on 10060 has no proxy for `/ecommerce/*`. Relative URL hits Vite → 404.

**Fix:**
```typescript
// Wrong
const BASE = "/ecommerce/store";

// Correct
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/ecommerce/store";
```

Same applies to admin client (`/ecommerce/admin`).

---

## 22.4 Checkout Saga Must Compensate on Payment Failure

**Symptom:** Inventory reserved, payment fails → inventory stuck as reserved forever → stock appears lower than actual.

**Cause:** Checkout saga has no compensation for payment failure case.

**Correct saga pattern:**
```typescript
// Step 1: reserve inventory
await mediator.dispatch({ type: "inventory.reserve", variantId, qty });

try {
  // Step 2: create payment session
  const session = await paymentAdapter.createSession(amount);

  // Step 3: capture payment
  await paymentAdapter.capture(session.id, paymentData);

  // Step 4: confirm order (deduct inventory)
  await mediator.dispatch({ type: "inventory.deduct", variantId, qty });
  await mediator.dispatch({ type: "eco.confirmOrder", orderId });

} catch (err) {
  // Compensate: release reserved inventory
  await mediator.dispatch({ type: "inventory.release", variantId, qty });
  throw err;
}
```

See `plans/ecommerce/03-backend-checkout.md` for full saga.

---

## 22.5 Cart State Persists in Browser — Survives DB Reset

**Symptom:** After `db:push` / local DB reset, storefront throws 404 on cart operations. Browser has stale `cartId` in localStorage.

**Cause:** `useCartStore` uses Zustand `persist` middleware → `cartId` survives page refreshes. After DB reset, the old cart ID no longer exists server-side.

**Fix during dev:** Clear localStorage manually:
```javascript
// In browser devtools console
localStorage.removeItem("eco-cart-storage");
```

**Defensive fix in code:** On any cart operation that returns 404, clear `cartId` and create a new cart:
```typescript
const { data, error } = await ecommerceStoreApi.addToCart(cartId, variantId, qty);
if (error?.includes("404")) {
  useCartStore.getState().setCartId(null);
  // retry with new cart
}
```

---

## 22.6 Two Web Packages Need Two Vite Aliases — Missing One Breaks Build

**Symptom:** `Cannot find module '@projectx/ecommerce-admin'` or `Cannot find module '@projectx/ecommerce-storefront'` when bundling `apps/web`.

**Cause:** Both packages need their own entry in `apps/web/vite.config.ts`. Missing one causes a build-time bundler error.

**All three files must be updated together:**
1. `apps/web/package.json` — `"@projectx/ecommerce-admin": "workspace:*"` AND `"@projectx/ecommerce-storefront": "workspace:*"`
2. `apps/web/tsconfig.json` — paths for both packages
3. `apps/web/vite.config.ts` — resolve.alias for both packages

Missing any one → either TypeScript error, bundler error, or runtime module-not-found.

---

## 22.7 Storefront Route Prefix MUST Be `/store/*`

**Symptom:** Platform home page (`/`) or dashboard (`/dashboard`) stops rendering after adding storefront routes.

**Cause:** Storefront root layout route uses `path: "/"` → conflicts with platform's root index route.

**Fix:** Storefront layout route MUST use `path: "/store"`:
```typescript
// Wrong
const storefrontLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/",   // ← conflicts with platform
});

// Correct
const storefrontLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/store",  // ← no conflict
});
```

Admin layout route: `path: "/admin/ecommerce"` (not `/admin` — that's too generic if another admin panel exists).

---

## 22.8 Stripe Frontend Key vs Server Secret Key — Cannot Swap

**Symptom:** Stripe Elements throw `"No such PaymentIntent"` or `"Invalid API key"` in browser.

**Cause:** Two different Stripe keys:
- `sk_test_...` — server-side secret. Used in `STRIPE_SECRET_KEY`. NEVER exposed to frontend.
- `pk_test_...` — client-side publishable. Used in `VITE_STRIPE_PUBLISHABLE_KEY`. Safe to expose.

**Fix:** Ensure correct keys in correct env vars:
```env
# apps/server/.env (or root .env — server only)
STRIPE_SECRET_KEY=sk_test_...

# root .env (Vite reads VITE_* vars)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

In storefront:
```typescript
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);
```

If `VITE_STRIPE_PUBLISHABLE_KEY` is undefined → `loadStripe(undefined)` → Stripe throws immediately.

---

## 22.9 Tax Calculation Runs BEFORE Payment Session Creation

**Symptom:** Tax always shows $0 or "TBD" during checkout even with tax rates seeded.

**Cause:** Tax must be calculated and applied to cart before `createPaymentSession` — the payment amount must include tax.

**Correct order:**
```
setShippingAddress(cartId, address)
  → selectShippingOption(cartId, shippingOptionId)
    → server calculates tax based on address jurisdiction
    → cart.total updated with tax
    → createPaymentSession(cartId) ← amount includes tax
```

If tax not calculated before payment session: payment captures wrong amount.

---

## 22.10 `mediator.send` Does Not Exist — Use `dispatch` / `query`

Same as CRM pitfall. The Mediator interface:
- `mediator.dispatch(cmd)` — commands (mutations)
- `mediator.query(q)` — queries (reads)

No `.send()` method. Scaffold code may use `.send()` — wrong. Bulk fix:
```bash
find composes/ecommerce/server/src/ -name "*.ts" -exec sed -i '' 's/mediator\.send(/mediator.dispatch(/g' {} \;
```

---

## 22.11 Elysia `onError` Scope — Use `{ as: "scoped" }`

Same as CRM pitfall. Default scope `"local"` doesn't catch errors from child `.use()` plugins.

```typescript
return new Elysia({ prefix: "/ecommerce" })
  .onError({ as: "scoped" }, ({ error, set }) => {
    const msg = error instanceof Error ? error.message : String(error);
    set.status = 500;
    return { error: msg };
  })
  .use(createAdminRoutes(mediator, adapters))
  .use(createStoreRoutes(mediator))
```

---

## 22.12 DB Schema Missing from Barrel → `db:push` Skips Tables

**Symptom:** `db:push` runs but `eco_products` (or other eco tables) not created.

**Cause:** `apps/server/src/infra/db/schema/index.ts` missing `export * from "./ecommerce"`.

**Fix:**
```typescript
// apps/server/src/infra/db/schema/index.ts
export * from "./platform";
export * from "./crm";
export * from "./ecommerce";   // ← add this
```

---

## 22.13 Customer Auth Endpoint Returns 401 Before Compose Registers Handler

**Symptom:** `POST /ecommerce/store/auth/login` → 503 `"No handler registered for command: eco.loginCustomer"`.

**Cause:** `registerEcommerceHandlers(mediator)` must be called inside `createEcommerceCompose` BEFORE route plugins mount. Handler registration must be synchronous at compose creation time.

**Correct order:**
```typescript
export function createEcommerceCompose(mediator: Mediator, adapters: AdapterRegistry) {
  registerEcommerceHandlers(mediator, adapters);   // ← first
  registerEcommerceJobs(scheduler, mediator);
  registerEcommerceHooks(bus, mediator);

  return new Elysia({ prefix: "/ecommerce" })
    .onError({ as: "scoped" }, ...)
    .use(createAdminRoutes(mediator, adapters))    // ← then routes
    .use(createStoreRoutes(mediator))
}
```

---

## Quick Checklist — Ecommerce Integration

- [ ] `PAYMENT_PROVIDER` + payment keys in server env
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` in root `.env` (frontend env)
- [ ] PaymentAdapter registered BEFORE `createEcommerceCompose` call
- [ ] `createEcommerceCompose(mediator, adapters)` — 2 args, not 1
- [ ] Admin API client uses `VITE_API_URL + "/ecommerce/admin"` — absolute URL
- [ ] Store API client uses `VITE_API_URL + "/ecommerce/store"` — absolute URL
- [ ] Admin token key: `platform_token` | Customer token key: `eco_customer_token`
- [ ] Storefront layout route uses `path: "/store"` — not `"/"`
- [ ] Admin layout route uses `path: "/admin/ecommerce"`
- [ ] Two Vite aliases added: `ecommerce-admin` + `ecommerce-storefront`
- [ ] Two tsconfig path aliases added (admin + storefront)
- [ ] Two workspace deps in `apps/web/package.json`
- [ ] Two `@source` lines in `apps/web/src/globals.css`
- [ ] `export * from "./ecommerce"` in schema barrel
- [ ] `db:push` (not `db:migrate`) after schema changes — `strict: false`
- [ ] `registerEcommerceHandlers(mediator, adapters)` called before routes mount
- [ ] `onError({ as: "scoped" })` on compose Elysia instance
- [ ] Checkout saga: `inventory.reserve` → payment → on fail `inventory.release`
- [ ] Tax calculated before `createPaymentSession` — amount must include tax
- [ ] Cart persist key: `eco-cart-storage` — clear on DB reset during dev
- [ ] Customer routes access `(ctx as any).customer` — not `.actor`
- [ ] Dev credentials added to platform login card (admin + storefront test customers)
- [ ] `@stripe/stripe-js` installed in storefront web package
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` never undefined — fallback throws clearly
