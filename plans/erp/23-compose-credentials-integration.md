# Phase 23 — Compose, Credentials & Integration

---

## 23.1 Port Architecture

| Service | Port | Notes |
|---------|------|-------|
| `apps/server` | 10000 | main API, hosts all composes |
| `apps/web` | 3000 | Vite dev server |

ERP routes served from `apps/server` under `/erp/*` prefix.
No separate ERP port. ERP compose mounts into same Elysia app.

---

## 23.2 Environment Variables

**Server `.env`:**

```env
# Database (shared with all composes)
DATABASE_URL=postgresql://...@neon.../projectx

# GST IRP API (e-Invoice)
GST_IRP_URL=https://einvoice1.gst.gov.in/rest/EICore/eivital/v1.03
GST_IRP_CLIENT_ID=your_client_id
GST_IRP_CLIENT_SECRET=your_client_secret
GST_IRP_GSTIN=27AAAAA0000A1Z5      # org's GSTIN

# Organisation config
ORG_GSTIN=27AAAAA0000A1Z5
ORG_STATE_CODE=27                   # Maharashtra

# FX Rates (optional)
FX_RATES_API_KEY=your_key           # e.g. from openexchangerates.org

# Period lock
PERIOD_CLOSE_ALLOWED_ROLES=erp:admin,erp:finance-controller
```

**Web `.env`:**

```env
VITE_API_URL=http://localhost:10000
```

No extra Vite vars for ERP — uses platform token from existing auth flow.

---

## 23.3 GST IRP API Integration

IRN generation calls:
1. Obtain auth token from IRP (`POST /eivital/v1.03/auth`)
2. Cache token (expires in 6h)
3. Generate IRN (`POST /eicore/v1.03/Invoice`)
4. Store `irn`, `ackNo`, `ackDt`, `signedQrCode` on `erpSalesInvoice`

**Rate limit:** IRP allows ~10 IRN requests/minute. Add debounce on frontend — "Generate IRN" button disabled for 5s after click.

**Sandbox:** GST NIC provides a sandbox URL for testing. Use `GST_IRP_URL=https://einvoice1-sandbox.nic.in/...` in dev.

---

## 23.4 Compose Factory Signature

```typescript
// composes/erp/server/src/index.ts

export function createErpCompose(
  mediator: Mediator,
  bus: EventBus,
  scheduler: Scheduler,
) {
  // 3 args — no adapters (ERP has no payment plugin unlike ecommerce)
  registerErpHooks(bus, mediator);
  registerErpJobs(scheduler, mediator);
  return new Elysia({ prefix: "/erp" })
    .use(procurementRoutes(mediator))
    .use(salesRoutes(mediator))
    .use(inventoryRoutes(mediator))
    .use(financeRoutes(mediator))
    .use(manufacturingRoutes(mediator))
    .use(hrRoutes(mediator))
    .use(taxRoutes(mediator));
}
```

---

## 23.5 Server Shell Registration

**`apps/server/src/index.ts`:**

```typescript
const erp = createErpCompose(mediator, bus, scheduler);

app
  .use(crmCompose)
  .use(ecommerceCompose)
  .use(erp)         // ← add here
  .listen(PORT);
```

Registration order: ERP compose registers hooks + jobs immediately on call. No special boot order needed.

---

## 23.6 Vite Aliases

**`apps/web/vite.config.ts`:**

```typescript
resolve: {
  alias: {
    // existing
    "@projectx/crm-web":        path.resolve(__dirname, "../../packages/crm-web/src"),
    "@projectx/ecommerce-admin": path.resolve(__dirname, "../../packages/ecommerce-admin/src"),
    "@projectx/ecommerce-store": path.resolve(__dirname, "../../packages/ecommerce-store/src"),
    // new
    "@projectx/erp-web":        path.resolve(__dirname, "../../packages/erp-web/src"),
  },
}
```

---

## 23.7 Schema Integration

**`apps/server/src/db/schema.ts`:**

```typescript
export * from "@projectx/erp-compose/schema";
// (add below existing exports)
```

All ERP tables prefixed `erp_` — no naming collision.

---

## 23.8 Drizzle Config

**`drizzle.config.ts`:**

```typescript
export default defineConfig({
  schema: "./apps/server/src/db/schema.ts",  // unchanged — auto-picks up erp schemas via re-export
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

---

## 23.9 tsconfig Paths

**`apps/server/tsconfig.json`:**

```json
{
  "paths": {
    "@projectx/erp-compose":        ["../../composes/erp/server/src/index.ts"],
    "@projectx/erp-compose/schema": ["../../composes/erp/server/src/schema/index.ts"]
  }
}
```

**`apps/web/tsconfig.json`:**

```json
{
  "paths": {
    "@projectx/erp-web": ["../../packages/erp-web/src/index.ts"]
  }
}
```
