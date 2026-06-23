# CRM — Phase 18: Missed Integrations & Known Pitfalls

## Goal

Document every non-obvious integration point that broke during CRM implementation — causes, symptoms, and fixes. Use this as a checklist when building or reviewing a new compose.

---

## 18.1 `mediator.send` Does Not Exist — Use `mediator.dispatch`

**Symptom:** `mediator.send is not a function. (In 'mediator.send(...)', 'mediator.send' is undefined)`

**Cause:** The `Mediator` interface (`apps/server/src/core/cqrs/index.ts`) exposes:
- `dispatch(cmd)` — for commands (mutations)
- `query(q)` — for queries (reads)

There is no `.send()` method. Scaffold-generated code used `.send()` — wrong.

**Fix:** Replace all `mediator.send(` with `mediator.dispatch(` in routes and seed files.

```bash
# Bulk fix across all route files
find composes/crm/server/src/routes/ -name "*.ts" -exec sed -i '' 's/mediator\.send(/mediator.dispatch(/g' {} \;
```

---

## 18.2 Elysia `onError` Scope — Must Use `{ as: "scoped" }`

**Symptom:** `onError` handler defined on the CRM compose Elysia instance doesn't catch errors thrown by child `.use()` route plugins — they propagate as unhandled 500s.

**Cause:** Elysia's default error scope is `"local"` — only applies to routes on that exact instance. Child plugins added via `.use()` have their own scope.

**Fix:** Use `{ as: "scoped" }` to cover all child plugins:

```typescript
return new Elysia({ prefix: "/crm" })
  .onError({ as: "scoped" }, ({ error, set }) => {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("No handler registered")) {
      set.status = 503;
      return { error: "CRM service not yet available" };
    }
    set.status = 500;
    return { error: msg };
  })
  .use(createContactsRoutes(mediator))
  // ...
```

Scope options: `"local"` (default, same instance only), `"scoped"` (instance + children), `"global"` (entire app).

---

## 18.3 Web Compose API Client Must Use Absolute URL

**Symptom:** `POST http://localhost:10060/crm/contacts 404` — CRM form submissions fail.

**Cause:** Vite dev server runs on port 10060. API server runs on 10050. Vite has no proxy config for `/crm/*`. A relative URL like `/crm/contacts` hits Vite, which returns 404.

**Fix:** Use `VITE_API_URL` env var:

```typescript
// Wrong
const BASE = "/crm";

// Correct
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/crm";
```

Also add `vite-env.d.ts` in the compose's `web/src/` for TypeScript support.

---

## 18.4 `generateId()` Takes No Arguments — Use `generatePrefixedId(prefix)`

**Symptom:** TypeScript error or unexpected ID format — IDs appear as plain ULIDs without prefix.

**Cause:** `generateId()` from `@core` returns a plain ULID with no prefix. `generatePrefixedId(prefix)` returns `"prefix_ULID"`.

```typescript
import { generatePrefixedId as generateId } from "@core";
// now generateId("cct") → "cct_01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

**CRM ID prefixes used:**

| Entity | Prefix |
|--------|--------|
| Contact | `cct` |
| Account | `cac` |
| Lead | `cld` |
| Deal | `cdl` |
| Activity | `cav` |
| Pipeline | `cpl` |
| Pipeline Stage | `cps` |
| Campaign | `ccp` |
| Segment | `csg` |

---

## 18.5 Mediator Handlers Must Be Registered Before Routes Are Called

**Symptom:** 503 `"No handler registered for command: crm.createContact"` even after adding handler files.

**Cause:** `registerCrmHandlers(mediator)` must be called inside `createCrmCompose` **before** route plugins are mounted. The handler registration must happen at compose creation time, not lazily.

**Correct order in `createCrmCompose`:**

```typescript
export function createCrmCompose(mediator, bus, scheduler) {
  registerCrmHandlers(mediator);   // ← first
  registerCrmSearchSync(bus, mediator);
  registerCrmJobs(scheduler, mediator);
  registerCrmHooks(bus, mediator);

  return new Elysia({ prefix: "/crm" })
    .onError(...)
    .use(createContactsRoutes(mediator))
    // ...
}
```

---

## 18.6 DB Schema Must Be Re-exported Through `apps/server` Barrel

**Symptom:** `db:push` doesn't create CRM detail tables. `db:generate` produces no migration for CRM.

**Cause:** Drizzle-kit reads only `apps/server/src/infra/db/schema/index.ts`. If CRM detail tables aren't re-exported from this file, Drizzle doesn't know they exist.

**Fix:** `apps/server/src/infra/db/schema/index.ts` must import and re-export CRM detail tables only:

```typescript
// CRM detail tables — do NOT include crmContacts, crmAccounts, crmPipelines (they don't exist)
import { crmLeads, crmDeals, crmSegments, crmCampaigns, crmCampaignContacts, crmEmailThreads, crmEmailMessages }
  from "@projectx/crm-server/db/schema";
export { crmLeads, crmDeals, crmSegments, crmCampaigns, crmCampaignContacts, crmEmailThreads, crmEmailMessages };
```

This was done for CRM. Any new compose must follow the same pattern — export only the compose's own detail tables.

## 18.14 Do Not Create Master Tables in Compose Schema

**Symptom:** Drizzle tries to create `crm_contacts`, `crm_accounts`, `crm_pipelines`, etc., which either conflict with master tables or create phantom tables the mediator never touches.

**Cause:** Old scaffold pattern defined all entities as compose-owned tables. Under MTA, contacts, accounts, leads (person record), pipelines, pipeline stages, and activities live in master tables owned by foundation modules.

**Fix:** CRM compose schema files must NOT define `crm_contacts`, `crm_accounts`, `crm_pipelines`, `crm_pipeline_stages`, or `crm_activities`. Only these detail tables are CRM-owned:
- `crm_leads` (sequencing extension for persons of type=lead)
- `crm_deals`
- `crm_segments`
- `crm_campaigns`
- `crm_campaign_contacts`
- `crm_email_threads` (P1)
- `crm_email_messages` (P1)

Master reads go through mediator queries (`party.listPersons`, `pipeline.listStages`, `activity.list`).
Master writes go through mediator commands (`party.createPerson`, `party.createParty`, `activity.log`).

---

## 18.7 Route Factory Pattern — Not Module-Level Constants

**Symptom:** `mediator` is undefined inside route handlers, or handlers can't access `mediator` via closure.

**Cause:** If routes are defined as module-level constants (e.g. `export const contactsRoutes = new Elysia(...)`) instead of factory functions, the `mediator` closure is never established.

**Correct pattern:**

```typescript
// Wrong — mediator not available
export const contactsRoutes = new Elysia({ prefix: "/contacts" })
  .post("/", async (ctx) => { mediator.dispatch(...) }); // mediator is undefined

// Correct — mediator captured in closure
export function createContactsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/contacts" })
    .post("/", async (ctx) => { mediator.dispatch(...) }); // works
}
```

---

## 18.8 `CommandHandler` Payload Shape — `id` Is Not in `Command.payload`

**Symptom:** Update/delete handlers can't find the record ID — `cmd.payload.id` is undefined.

**Cause:** Route factories dispatch update commands with `id` at the top level of the command object, not nested in `payload`:

```typescript
mediator.dispatch({
  type: "crm.updateContact",
  id: params.id,      // ← top level
  payload: body,      // ← only the update fields
  actorId: actor?.id,
  orgId: actor?.orgId,
});
```

The `Command<T>` interface has `payload: T` but `id` is not in the interface — it's an extra property passed through.

**Fix in handlers:** Access via `(cmd as any).id`:

```typescript
export const updateContactHandler: CommandHandler = async (cmd) => {
  const { id, payload } = cmd as any;
  // id = "cct_01ARZ..."
  // payload = { firstName: "...", ... }
};
```

---

## 18.9 `db:push` Requires Non-Interactive Shell Config

**Symptom:** `db:push` hangs or exits with `Interactive prompts require a TTY terminal`.

**Cause:** `strict: true` in `drizzle.config.ts` causes drizzle-kit to prompt for confirmation before applying changes. No TTY available in subprocesses or CI.

**Fix:** `apps/server/drizzle.config.ts`:
```typescript
export default defineConfig({
  ...
  verbose: false,
  strict: false,   // ← allows unattended push
});
```

---

## 18.10 CRM Compose `createCrmCompose` Signature Changed

**Symptom:** `registerCrmSearchSync` or `registerCrmJobs` throw because `bus`/`scheduler` is undefined.

**Cause:** Original scaffold had `createCrmCompose(mediator)`. Correct signature requires all three:

```typescript
// Wrong — bus and scheduler undefined
createCrmCompose(mediator)

// Correct
createCrmCompose(mediator, bus, bootRegistry.scheduler)
```

Call site is `apps/server/src/index.ts`.

---

## 18.11 `lastLoginAt` Column May Not Exist in `actors` Table

**Symptom:** DB error on login — `column actors.last_login_at does not exist`.

**Cause:** `actors` table schema includes `lastLoginAt` but it may be missing from an older migration that ran before the column was added.

**Fix:** Run `db:push` to sync the schema. The column is safe to add — no existing data depends on it.

---

## 18.12 Vite Alias Must Be Added for CRM Web Package

**Symptom:** `Cannot find module '@projectx/crm-web'` when bundling `apps/web`.

**Cause:** `apps/web/vite.config.ts` only has aliases for packages declared in its `resolve.alias`. `apps/web/package.json` must list the package, and `vite.config.ts` must map the alias.

**Fix:**

`apps/web/package.json`:
```json
"@projectx/crm-web": "workspace:*"
```

`apps/web/vite.config.ts`:
```typescript
"@projectx/crm-web": path.resolve(__dirname, "../../composes/crm/web/src"),
```

`apps/web/tsconfig.json`:
```json
"@projectx/crm-web": ["../../composes/crm/web/src"],
"@projectx/crm-web/*": ["../../composes/crm/web/src/*"]
```

All three must be present. Missing any one causes either a TS error, a bundler error, or a runtime module-not-found error.

---

## 18.13 TanStack Router — `getParentRoute` Must Be Synchronous

**Symptom:** `Cannot destructure property 'path' of undefined` or router tree build error.

**Cause:** TanStack Router v1 requires `getParentRoute` to return a route object synchronously. Async dynamic imports in `getParentRoute` break the tree.

**Wrong:**
```typescript
getParentRoute: async () => (await import("./layout")).layoutRoute
```

**Correct:**
```typescript
import { crmLayoutRoute } from "./layout"; // static import at top
// ...
getParentRoute: () => crmLayoutRoute        // sync return
```

All child routes must use `getParentRoute: () => <parent>` with a statically imported parent.

---

## Quick Checklist — New Compose Integration

- [ ] Compose schema files define only detail tables — never recreate master tables (`persons`, `parties`, `pipelines`, `pipeline_stages`, `activities`)
- [ ] Master reads use mediator queries; master writes use mediator commands
- [ ] Pipeline seeded via `seedPipeline(orgId, entityType, stages)` — not direct inserts into `crm_pipelines`
- [ ] `VITE_API_URL` in `.env` — absolute URL, not relative
- [ ] `vite-env.d.ts` in compose web `src/` — typed `ImportMetaEnv`
- [ ] API client uses `VITE_API_URL + "/compose-prefix"` — not `/compose-prefix`
- [ ] Route factories accept `mediator` as closure param — not module-level constants
- [ ] Handlers use `mediator.dispatch()` for commands, `mediator.query()` for reads
- [ ] `registerXxxHandlers(mediator)` called inside `createXxxCompose` before routes
- [ ] `onError({ as: "scoped" })` on compose Elysia instance — not `as: "local"`
- [ ] DB schema re-exported from `apps/server/src/infra/db/schema/index.ts`
- [ ] `db:push` (not `db:migrate`) run after schema changes — `strict: false` in config
- [ ] Seed file uses `db.insert()` directly — not `mediator.dispatch()` (handlers may not be registered)
- [ ] Compose registered in `apps/server/src/index.ts` with `createXxxCompose(mediator, bus, scheduler)`
- [ ] Server tsconfig alias added for compose server package
- [ ] Vite alias + web tsconfig + web package.json all updated for compose web package
- [ ] Dev credentials added to platform login card
- [ ] `getParentRoute` in TanStack routes is synchronous — no async imports
