# Phase 11 — Shell Integration

---

## 11.1 Server Shell

**File:** `apps/server/src/index.ts` (add erp compose mount)

```typescript
import { createErpCompose } from "@projectx/erp-compose";

// After existing compose mounts:
const erp = createErpCompose(mediator, bus, scheduler);
app.use(erp);
```

**File:** `apps/server/tsconfig.json` (add path alias)

```json
{
  "compilerOptions": {
    "paths": {
      "@projectx/erp-compose": ["../../composes/erp/server/src/index.ts"]
    }
  }
}
```

---

## 11.2 Schema Export

**File:** `composes/erp/server/src/schema/index.ts`

```typescript
export * from "./erp-vendors";
export * from "./erp-purchase-requisitions";
export * from "./erp-purchase-orders";
export * from "./erp-purchase-order-items";
export * from "./erp-grns";
export * from "./erp-grn-items";
export * from "./erp-vendor-invoices";
export * from "./erp-vendor-invoice-items";
export * from "./erp-payment-vouchers";
export * from "./erp-customers-erp";
export * from "./erp-quotations";
export * from "./erp-sales-orders";
export * from "./erp-delivery-notes";
export * from "./erp-sales-invoices";
export * from "./erp-items";
export * from "./erp-warehouses";
export * from "./erp-stock-ledger";
export * from "./erp-stock-entries";
export * from "./erp-accounts";
export * from "./erp-fiscal-years";
export * from "./erp-journal-entries";
export * from "./erp-journal-lines";
export * from "./erp-bank-accounts";
export * from "./erp-bank-transactions";
export * from "./erp-boms";
export * from "./erp-bom-items";
export * from "./erp-work-orders";
export * from "./erp-fixed-assets";
export * from "./erp-departments";
export * from "./erp-employees";
export * from "./erp-leave-types";
export * from "./erp-leave-allocations";
export * from "./erp-leave-applications";
export * from "./erp-attendance";
export * from "./erp-salary-structures";
export * from "./erp-salary-slips";
export * from "./erp-payroll-entries";
export * from "./erp-gst-templates";
export * from "./erp-gst-returns";
```

**File:** `apps/server/src/db/schema.ts` (add erp schemas)

```typescript
export * from "@projectx/erp-compose/schema";
// (existing exports stay)
```

---

## 11.3 DB Migration

```bash
# Push erp schema to DB
bun run db:push

# If migration file needed
bun run db:generate
bun run db:migrate
```

All `erp_*` tables are prefixed — no collision with other compose tables.

---

## 11.4 Web Shell

**File:** `apps/web/src/router/index.tsx` (add erp routes)

```typescript
import { ErpRoutes } from "@projectx/erp-web";

// Inside router definition:
{
  path: "/erp",
  element: <ErpLayout />,
  children: ErpRoutes,
}
```

**File:** `apps/web/tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@projectx/erp-web": ["../../packages/erp-web/src/index.ts"]
    }
  }
}
```

**File:** `apps/web/vite.config.ts`

```typescript
resolve: {
  alias: {
    "@projectx/erp-web": path.resolve(__dirname, "../../packages/erp-web/src"),
  },
}
```

**File:** `apps/web/src/styles/globals.css`

```css
@source "../../packages/erp-web/src/**/*.{ts,tsx}";
```

---

## 11.5 Compose Factory

**File:** `composes/erp/server/src/index.ts`

```typescript
import Elysia from "elysia";
import { registerErpHooks } from "./hooks/erp.hooks";
import { registerErpJobs } from "./jobs/erp.jobs";
import { procurementRoutes } from "./routes/procurement";
import { salesRoutes } from "./routes/sales";
import { inventoryRoutes } from "./routes/inventory";
import { financeRoutes } from "./routes/finance";
import { manufacturingRoutes } from "./routes/manufacturing";
import { hrRoutes } from "./routes/hr";
import { taxRoutes } from "./routes/tax";

export function createErpCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
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

export type ErpApp = ReturnType<typeof createErpCompose>;
```

---

## 11.6 Package Structure

```
composes/erp/
  server/
    src/
      index.ts           ← compose factory
      routes/            ← one file per domain
      handlers/
      schema/            ← drizzle tables
      fsm/
      hooks/
      jobs/
      rules/
    package.json

packages/erp-web/
  src/
    index.ts
    api/erp-client.ts
    stores/
    components/
    pages/
    routes.tsx
  package.json
```

**`composes/erp/server/package.json`:**

```json
{
  "name": "@projectx/erp-compose",
  "version": "0.1.0",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  }
}
```

**`packages/erp-web/package.json`:**

```json
{
  "name": "@projectx/erp-web",
  "version": "0.1.0",
  "exports": {
    ".": "./src/index.ts"
  }
}
```
