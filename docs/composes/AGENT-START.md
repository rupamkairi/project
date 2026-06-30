# Agent Bootstrap — ProjectX

Read this first before implementing any compose. No exceptions.

---

## 1. Read These Docs (In Order)

1. `docs/instructions/architectural-rules.md` — non-negotiable layer rules
2. `docs/conventions.md` — all naming: files, dirs, DB tables, exports, routes
3. `docs/instructions/tooling.md` — Bun only, DB commands, workspace commands
4. `docs/instructions/README.md` — full reading order if more context needed

---

## 2. Tooling Rules

- Runtime: **Bun** — never Node, npm, pnpm, npx
- Install: `bun install`
- Run: `bun run <script>`
- DB migration: `bun run db:generate` then `bun run db:migrate` (from `apps/server/`)
- Typecheck: `bun run typecheck` (from repo root)

---

## 3. Path Aliases

All compose packages resolve these aliases via their own `tsconfig.json`
(copy the pattern from `composes/platform/server/tsconfig.json`):

| Alias | Resolves to |
|-------|-------------|
| `@core` | `apps/server/src/core/index.ts` |
| `@core/*` | `apps/server/src/core/*` |
| `@modules/*` | `apps/server/src/modules/*` |
| `@infra/*` | `apps/server/src/infra/*` |
| `@db/*` | `apps/server/src/infra/db/*` |
| `@db/client` | `apps/server/src/infra/db/client.ts` |
| `@db/schema/*` | `apps/server/src/infra/db/schema/*` |

For a new compose at `composes/{name}/server/tsconfig.json`,
the relative paths to `apps/server/` are `../../../apps/server/src/`.

---

## 4. What Already Exists

### Core layer (`apps/server/src/core/`)
Fully implemented. Do NOT modify unless adding a new Core primitive.

Key exports from `@core`:
- `Entity`, `generateId`, `generatePrefixedId`, `createEntity`
- `DomainEvent`, `EventBus`, `InMemoryEventBus`, `createDomainEvent`
- `Command`, `Query`, `Mediator`, `createMediator`
- `StateMachine`, `FSMEngine`, `createFSMEngine`
- `RuleEngine`, `RuleExpr`, `createRuleEngine`
- `Money`, `PaginatedResult`, `PageOptions`
- `CoreError`, `NotFoundError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `ConflictError`, `BusinessError`, `IntegrationError`
- `AdapterRegistry`, `createAdapterRegistry`, `AdapterType` (union includes: `auth`, `storage`, `notification.*`, `payment`, `search`, `geo`, `fx-rates`, `ocr`, `translate`, `tax`, `fulfillment`, `email-sync`, `calendar-sync`, `telephony`)
- `SearchAdapter`, `PaymentAdapter`, `StorageAdapter`, `NotificationAdapter`, `TaxAdapter`, `FulfillmentAdapter`, `EmailSyncAdapter`, `CalendarSyncAdapter`, `TelephonyAdapter`

### Modules (`apps/server/src/modules/`)
All built and registered in `apps/server/src/index.ts`.

| Module | Commands/Queries prefix | DB tables |
|--------|------------------------|-----------|
| identity | `identity.*` | `organizations`, `actors`, `roles`, `actor_roles`, `sessions`, `api_keys` |
| catalog | `catalog.*` | `cat_categories`, `cat_items`, `cat_variants`, `cat_price_lists`, `cat_price_rules` |
| inventory | `inventory.*` | `inv_stocks`, `inv_movements`, `inv_locations` |
| ledger | `ledger.*` | `led_accounts`, `led_transactions`, `led_journals` |
| workflow | `workflow.*` | `wf_workflows`, `wf_instances`, `wf_tasks` |
| scheduling | `scheduling.*` | `sch_calendars`, `sch_events`, `sch_recurring` |
| document | `document.*` | `doc_documents`, `doc_versions`, `doc_folders` |
| notification | `notification.*` | `not_notifications`, `not_channels`, `not_preferences` |
| geo | `geo.*` | `geo_locations`, `geo_regions`, `geo_boundaries` |
| analytics | `analytics.*` | `ana_events`, `ana_metrics`, `ana_reports` |

**Compose calls modules via `mediator.dispatch()` (commands) and `mediator.query()` (queries).
Never import from a module's internals.**

### Available Plugins

| Plugin | Package | Factory |
|--------|---------|---------|
| Auth (JWT) | `@projectx/plugin-auth-server` | `createAuthPlugin(config)` |
| Notification | `@projectx/plugin-notification-server` | `createNotificationPlugin(config)` |
| Storage (S3) | `@projectx/plugin-storage-server` | `createStoragePlugin(config)` |
| Payment (Stripe/Razorpay) | `@projectx/plugin-payment-server` | `createPaymentPlugin(config)` |

### Existing Compose
- `composes/platform/` — Platform compose (users, roles, invites, settings, auth)
  - Server: `@projectx/platform-server` → `createPlatformCompose(mediator)`
  - Web: `@projectx/platform-web`

### Infrastructure
- `apps/server/src/infra/search/` — `createPgSearchAdapter()` — PgSQL FTS, registered at boot
- `apps/server/src/infra/db/schema/search.ts` — `search_index` table

---

## 5. Shell Integration — Full Checklist

Every compose must be registered in BOTH shells. Do this as the **final phase** after
all compose code is complete and typechecks pass.

### Server Shell (`apps/server/`) — 4 steps

**Step 1 — `apps/server/tsconfig.json`**: add path alias
```json
"@projectx/{name}-server": ["../../composes/{name}/server/src/index.ts"],
"@projectx/{name}-server/*": ["../../composes/{name}/server/src/*"]
```

**Step 2 — `apps/server/src/infra/db/schema/index.ts`**: export schema
```typescript
export * from "./{name}";
```

**Step 3 — `apps/server/src/index.ts`**: dynamic import + `.use()`
```typescript
const { create{Name}Compose } = await import("@projectx/{name}-server");
const {name}Compose = create{Name}Compose(mediator);
// add .use({name}Compose) to the Elysia chain
```
Use dynamic import (not top-level) to avoid circular dependency with the compose.

**Step 4 — DB migration** (from `apps/server/`):
```bash
bun run db:generate
bun run db:migrate
```

---

### Web Shell (`apps/web/`) — 3 steps

**Step 1 — `apps/web/package.json`**: add workspace dependency
```json
"@projectx/{name}-web": "workspace:*"
```
Then run `bun install`.

**Step 2 — `apps/web/tsconfig.json`**: add path alias
```json
"@projectx/{name}-web": ["../../composes/{name}/web/src"],
"@projectx/{name}-web/*": ["../../composes/{name}/web/src/*"]
```

**Step 3 — `apps/web/src/router.tsx`**: import routes + spread into tree
```typescript
import { {name}Routes } from "@projectx/{name}-web";

const routeTree = sharedRootRoute.addChildren([
  indexRoute,
  ...platformRoutes,
  ...{name}Routes,    // ← add here
]);
```

---

### Required export from compose web package

`composes/{name}/web/src/routes/index.ts` MUST export `{name}Routes` array.
All route components MUST use `sharedRootRoute` from `@projectx/shared-router` as root parent.

```typescript
import { sharedRootRoute } from "@projectx/shared-router";

const {name}LayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/{name}",
  component: {Name}Layout,
});

export const {name}Routes = [
  {name}LayoutRoute.addChildren([...childRoutes]),
];
```

---

### Route path conflict rule

- Platform web uses `/` and `/dashboard/*`
- CRM uses `/crm/*`
- Ecommerce admin uses `/admin/ecommerce/*`
- Ecommerce storefront uses `/store/*` (NOT `/` — that conflicts with platform)

---

## 6. Compose Pattern (Copy from Platform)

### File structure
```
composes/{name}/
  server/
    package.json              @projectx/{name}-server
    tsconfig.json             (extends config, sets path aliases)
    src/
      index.ts                exports create{Name}Compose(mediator), {Name}App type
      db/
        schema/{name}.ts      Drizzle table definitions (prefix: {3-letter}_)
        seed/{name}.ts        Seed function
      routes/
        {resource}.ts         Route handlers (plural)
      lib/
        {util}.ts
  web/
    package.json              @projectx/{name}-web  (or two packages for admin+storefront)
    tsconfig.json
    src/
      index.ts
      routes/
        index.ts              TanStack Router route tree
        layout.tsx
        {page}.tsx
      components/
      hooks/
      stores/
      lib/
        api.ts                Eden Treaty client
```

### Compose index.ts shape
```typescript
export function create{Name}Compose(mediator: Mediator) {
  // 1. Instantiate needed plugins
  // 2. Return new Elysia({ prefix: "/{name}" })
  //    .use(plugin)
  //    .use(routeGroup)
  //    ...
}

export type {Name}App = ReturnType<typeof create{Name}Compose>;

// Re-export DB schema types
export { ... } from "./db/schema/{name}";
export { seed{Name} } from "./db/seed/{name}";
```

### Register in shell (`apps/server/src/index.ts`)
```typescript
// Add dynamic import at boot (avoids circular):
const { create{Name}Compose } = await import("@projectx/{name}-server");
const {name}Compose = create{Name}Compose(mediator);
app = app.use({name}Compose);
```

### Add path alias in `apps/server/tsconfig.json`
```json
"@projectx/{name}-server": ["../../composes/{name}/server/src/index.ts"],
"@projectx/{name}-server/*": ["../../composes/{name}/server/src/*"]
```

---

## 6. DB Naming — Drizzle

Table prefix per compose:
- `crm` → `crm_*`
- `eco` → `eco_*`

Drizzle object name: `{prefix}{PascalCaseEntity}` → SQL: `{prefix}_{snake_plural}`

```typescript
export const crmContact = pgTable("crm_contacts", { ... });
export const ecoOrder = pgTable("eco_orders", { ... });
```

**GIN index syntax (Drizzle 0.45.1):**
```typescript
index("name_gin").using("gin", table.column)   // CORRECT
// NOT .using("gin").on() and NOT .on().using()
```

**tsvector custom type:**
```typescript
import { customType } from "drizzle-orm/pg-core";
const tsvectorType = customType<{ data: string; driverData: string }>({
  dataType() { return "tsvector"; },
});
```

---

## 7. Drizzle Schema Export

New compose DB schema must be exported from `apps/server/src/infra/db/schema/index.ts`:
```typescript
export * from "./{name}";   // add this line
```

---

## 8. Frontend — Eden Treaty Pattern

```typescript
// composes/{name}/web/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { {Name}App } from "@projectx/{name}-server";

export const {name}Api = treaty<{Name}App>(window.location.origin);
```

TanStack Router + TanStack Query + Zustand for state.
Design system: shadcn/ui zinc palette. See `packages/ui/`.

---

## 9. Common Mistakes to Avoid

- Importing from another module's internals → use `mediator.dispatch/query`
- Importing from another compose → forbidden
- Using `npm install` → use `bun install`
- Importing a plugin inside a module → plugins only in compose
- Writing `index(...).using("gin").on(col)` → wrong API; use `.using("gin", col)`
- Forgetting to export new schema from `apps/server/src/infra/db/schema/index.ts`
- Forgetting to add tsconfig path alias in `apps/server/tsconfig.json`
- Forgetting to register compose with `app.use()` in `apps/server/src/index.ts`
