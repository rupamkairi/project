# Server Quality Standard

This is the server-side contract for every compose in ProjectX.
If compose server code disagrees with this document, the code needs to move.

---

## Canonical shape

Every live compose server must expose the same outer contract:

- `create{Name}Compose(...)` returns an `Elysia` plugin
- `{Name}App` is the composed app type alias
- route modules live under `src/routes/`
- route modules export `create{Name}Routes(...)` factories
- compose-owned side effects live in `register{Name}Hooks(...)` and `register{Name}Jobs(...)`
- compose-owned setup data lives in `seed{Name}(...)`
- `apps/server` is the only host shell that mounts composes

The root compose decides the prefix. Feature routes never define a second host.

---

## Required rules

1. One compose, one prefix.
2. Compose code may call modules through `mediator.dispatch()` and `mediator.query()`.
3. Compose code may touch `@db/client` directly only for:
   - compose-owned detail tables
   - shared master-table reads/writes explicitly allowed by `docs/master-tables.md`
4. Cross-cutting side effects go through injected collaborators, not globals.
5. Route modules stay resource-oriented and return `Elysia` instances.
6. Package exports and tsconfig aliases must match the server contract used by `apps/server`.

---

## Allowed exceptions

- A compose may accept `AdapterRegistry` when it needs plugin-backed integrations.
- A compose may accept `EventBus` and/or `Scheduler` when it owns hooks or jobs.
- A compose may use `.group()` when it still preserves the same compose prefix and does not create a second host shell.
- A compose may have multiple visible surfaces if the product requires it, but they must still hang off one compose prefix.

---

## Compliance matrix

| Compose | Canonical factory | Extra deps | Notes |
|---|---|---|---|
| Platform | `createPlatformCompose(mediator)` | auth / notification / storage plugins | Owns login, users, roles, invites, settings, overview, masters. |
| CRM | `createCrmCompose(mediator)` | none | Hooks and jobs are exported separately. |
| Ecommerce | `createEcommerceCompose(mediator, adapters)` | `AdapterRegistry` | Owns both `/admin` and `/store` surfaces under one compose. |
| ERP | `createErpCompose(mediator, bus, scheduler)` | `EventBus`, `Scheduler` | Uses hooks and jobs for orchestration. |
| LMS | `createLmsCompose(mediator, bus?, scheduler?)` | optional `EventBus`, optional `Scheduler` | Optional collaborators are only used when present. |
| Restaurant | `createRestaurantCompose(mediator, bus, scheduler?)` | `EventBus`, optional `Scheduler` | Uses hooks and jobs for operational workflows. |

---

## Package contract

Every server package should provide:

- root export: `.` → `src/index.ts`
- schema export(s) for compose-owned tables
- seed export(s) for compose-owned setup data
- a tsconfig alias set that includes shared server paths and the package itself where self-imports are used

The server shell must import compose factories dynamically and mount the returned plugins in `apps/server/src/index.ts`.

---

## Verification

- `bun run typecheck`
- targeted package typechecks when package scripts exist
- shell registration stays aligned with the compliance matrix
