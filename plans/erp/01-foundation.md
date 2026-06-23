# Phase 1 — Foundation

## Goal

Scaffold ERP compose packages, implement skeleton compose factory, define all roles/permissions, and set up the seed runner.

---

## 1.1 Package Scaffolding

### Server package

```
composes/erp/server/
  package.json         name: "@projectx/erp-server"
  tsconfig.json        extends apps/server tsconfig, adds path aliases
  src/
    index.ts           createErpCompose factory + ErpApp type export
    permissions/
      matrix.ts        role definitions + permission checks
    db/
      schema/
        erp.ts         all erp_ detail table Drizzle definitions (MTA — master tables not defined here)
      seed/
        erp.seed.ts    seedErp(db) — fiscal year, CoA, warehouses, GST templates
    routes/            (empty, filled in Phases 3–9)
    hooks/             (empty, filled in Phase 10)
    jobs/              (empty, filled in Phase 10)
    fsm/               (empty, filled in Phase 10)
    rules/             (empty, filled in Phase 10)
```

### Web package

```
composes/erp/web/
  package.json         name: "@projectx/erp-web"
  tsconfig.json
  src/
    index.ts           exports erpRoutes array
    routes/
      index.ts         TanStack Router route tree
      layout.tsx       NavBar + AuthGuard
    lib/
      api.ts           ErpApiClient class
    stores/            (empty, filled in Phase 13)
    components/        (empty, filled in Phases 14–21)
```

---

## 1.2 Compose Factory Skeleton

**File:** `composes/erp/server/src/index.ts`

```typescript
import Elysia from "elysia";
import { Mediator, EventBus } from "@core";
import type { Scheduler } from "@core";

export function createErpCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  // Handlers, hooks, jobs registered here in later phases

  return new Elysia({ prefix: "/erp" })
    .onError({ as: "scoped" }, ({ error, set }) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("No handler registered")) {
        set.status = 503;
        return { error: "ERP service unavailable" };
      }
      set.status = 500;
      return { error: msg };
    })
    .get("/health", () => ({ status: "ok", compose: "erp" }));
  // Routes added .use() per domain in Phases 3–9
}

export type ErpApp = ReturnType<typeof createErpCompose>;
export { seedErp } from "./db/seed/erp.seed";
```

---

## 1.3 tsconfig — Path Aliases

**File:** `composes/erp/server/tsconfig.json`

Copy from `composes/platform/server/tsconfig.json`. All aliases resolve to `../../../apps/server/src/`.

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@core": ["../../../apps/server/src/core/index.ts"],
      "@core/*": ["../../../apps/server/src/core/*"],
      "@modules/*": ["../../../apps/server/src/modules/*"],
      "@infra/*": ["../../../apps/server/src/infra/*"],
      "@db/*": ["../../../apps/server/src/infra/db/*"],
      "@db/client": ["../../../apps/server/src/infra/db/client.ts"],
      "@db/schema/*": ["../../../apps/server/src/infra/db/schema/*"]
    }
  }
}
```

---

## 1.4 Roles & Permissions Matrix

**File:** `composes/erp/server/src/permissions/matrix.ts`

```typescript
export const ERP_ROLES = {
  ADMIN: "erp:admin",
  PROCUREMENT: "erp:procurement-officer",
  WAREHOUSE: "erp:warehouse-manager",
  FINANCE: "erp:finance-controller",
  OPERATIONS: "erp:operations-manager",
  VENDOR: "erp:vendor",
  AUDITOR: "erp:auditor",
  HR: "erp:hr-manager",
  EMPLOYEE: "erp:employee",
} as const;

export function hasPermission(actor: any, permission: string): boolean {
  const { roles, permissions } = actor;
  if (roles.includes(ERP_ROLES.ADMIN)) return true;
  if (permissions.includes("erp:*")) return true;
  return permissions.includes(permission);
}

// Usage in route handler:
// const actor = (ctx as any).actor;
// if (!hasPermission(actor, "erp:purchase-order:approve")) throw new AuthorizationError("Insufficient role");
```

### Permission map

| Permission | Roles |
|-----------|-------|
| `erp:vendor:read` | admin, procurement, warehouse, finance, operations, auditor |
| `erp:vendor:create` | admin, procurement |
| `erp:vendor:approve` | admin, finance |
| `erp:purchase-req:create` | admin, procurement, operations |
| `erp:purchase-req:approve` | admin, finance, operations |
| `erp:purchase-order:create` | admin, procurement |
| `erp:purchase-order:approve` | admin, finance |
| `erp:goods-receipt:create` | admin, warehouse |
| `erp:goods-receipt:approve` | admin, procurement, warehouse |
| `erp:invoice:create` | admin, procurement, finance, vendor |
| `erp:invoice:approve` | admin, finance |
| `erp:invoice:pay` | admin, finance |
| `erp:inventory:read` | admin, procurement, warehouse, finance, operations, auditor |
| `erp:inventory:transfer` | admin, warehouse |
| `erp:ledger:read` | admin, finance, auditor |
| `erp:ledger:post` | admin, finance |
| `erp:ledger:close-period` | admin, finance |
| `erp:sales-order:create` | admin, operations |
| `erp:sales-order:approve` | admin, finance |
| `erp:hr:read` | admin, hr |
| `erp:hr:manage` | admin, hr |
| `erp:payroll:run` | admin, finance, hr |
| `erp:employee:self` | employee (own records only) |

---

## 1.5 ID Prefixes

ERP detail tables only. Master table entities (vendors, customers, employees, items, warehouses, transactions) use IDs generated by foundation modules.

| Entity | Prefix | Example |
|--------|--------|---------|
| Purchase Requisition | `pr` | `pr_01ARZ...` |
| PR Item | `pri` | `pri_01ARZ...` |
| GRN | `grn` | `grn_01ARZ...` |
| GRN Item | `gri` | `gri_01ARZ...` |
| Delivery Note | `dn` | `dn_01ARZ...` |
| DN Item | `dni` | `dni_01ARZ...` |
| Stock Entry | `ste` | `ste_01ARZ...` |
| Stock Entry Item | `sei` | `sei_01ARZ...` |
| Stock Ledger | `slg` | `slg_01ARZ...` |
| BOM | `bom` | `bom_01ARZ...` |
| BOM Item | `bmi` | `bmi_01ARZ...` |
| Work Order | `wo` | `wo_01ARZ...` |
| Department | `dep` | `dep_01ARZ...` |
| GL Account | `acc` | `acc_01ARZ...` |
| Fiscal Year | `fy` | `fy_01ARZ...` |
| Journal Entry | `je` | `je_01ARZ...` |
| Bank Account | `bka` | `bka_01ARZ...` |
| Payroll Run | `prn` | `prn_01ARZ...` |
| Salary Slip | `ss` | `ss_01ARZ...` |
| Asset | `ast` | `ast_01ARZ...` |
| GST Template | `gst` | `gst_01ARZ...` |

---

## 1.6 Reference Number Generators

Human-readable reference numbers (separate from ULID IDs):

```typescript
// Pattern: {prefix}-{YYYY}-{sequence}
// Examples: PO-2024-001, GRN-2024-001, SI-2024-001

export async function nextRefNo(db: DB, orgId: string, prefix: string, year: number): Promise<string> {
  // Query max sequence for this org+prefix+year, increment by 1
  // Store last seq in a counter table or compute from existing records
  const count = await db.select({ c: count() })
    .from(/* relevant table */)
    .where(and(eq(col.orgId, orgId), like(col.refNo, `${prefix}-${year}-%`)));
  const seq = (count[0]?.c ?? 0) + 1;
  return `${prefix}-${year}-${String(seq).padStart(3, "0")}`;
}
```

---

## Checks

- `GET /erp/health` returns `{ status: "ok", compose: "erp" }`
- `createErpCompose(mediator, bus, scheduler)` callable with no crashes
- All role constants exported from `permissions/matrix.ts`
