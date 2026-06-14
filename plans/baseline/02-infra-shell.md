# 02 — Infra + Shell Apps Alignment

**Source of truth:** `docs/architecture/project-setup-server.md`, `project-setup-web.md`, `docs/server-architecture.md`, `docs/web-architecture.md`.
**Target code:** `apps/server/src/{index.ts,worker.ts,infra/**}`, `apps/web/src/**` (structure/wiring only — no UI).
**Rule:** Shells are thin. Zero business/feature logic, zero domain routes. They mount composes and provide infra.

Depends on Core contracts from `01` being stable (especially the queue/adapter/realtime interfaces).

---

## SERVER SHELL

### S1 — Wire worker job dispatch  `[BLOCKER]`
**Gap:** `worker.ts:66-69` — every job handler is a stub: logs, `// TODO: Route to actual handler based on job name`, returns `{processed:true}`. All 10 queues swallow jobs.

**Fix:**
- Build a job-handler registry populated at module boot (modules declare `queueWorkers` in their manifest — see `01` C4 and `03`).
- `createWorker(queueName, ...)` looks up the handler by `job.name` and dispatches with a real `SystemContext`.
- Unknown job name → fail loud (DLQ), not silent success.

**Acceptance:** enqueue a known job → its module handler runs; unknown job → routed to DLQ with error.

### S2 — Mount the WebSocket `/ws` endpoint  `[MAJOR]`
**Gap:** `infra/realtime/gateway.ts` is fully implemented but `index.ts` never mounts a `.ws("/ws", ...)` route. Realtime infra is dead from the entry point.

**Fix:** mount `/ws` in `index.ts`, wire `registerClient`/`unregisterClient`/`handleClientMessage` to the singleton gateway (see S6).

### S3 — Add graceful shutdown to the HTTP server  `[MAJOR]`
**Gap:** `worker.ts` handles SIGTERM/SIGINT; `index.ts` does not. Killing the server skips Elysia drain and module `shutdown()` hooks.

**Fix:** `process.on("SIGTERM"/"SIGINT")` → stop accepting, drain in-flight, call `moduleRegistry.shutdown()`, close DB/cache/queue connections.

### S4 — Remove `app: any`, fix dynamic import  `[MAJOR]`
**Gap:** `index.ts:305-306` dynamically imports `platformCompose` and types `app` as `any`, defeating type safety on the whole Elysia chain. The path alias makes a static import resolvable.

**Fix:** static import `platformCompose`; let Elysia infer the chain type. Confirm no real circular dependency (if one exists, break it at the type level, not with `any`).

### S5 — Fix stale `/schemas` introspection metadata  `[MINOR]`
**Gap:** `index.ts:189-275` `dbSchemas` array lists wrong table names for 8 of 12 modules (e.g. `inv_stocks` vs actual `inv_stock_units`, `led_*` vs `ldg_*`, `not_*` vs `ntf_*`, `geo_locations` vs `geo_entities`, `ana_*` vs `anl_*`, `domain_events` vs `evt_store`).

**Fix:** derive `/schemas` from the actual Drizzle schema exports (or the `EntitySchemaRegistry` once C1 lands) rather than a hand-maintained array. Removes future drift.

---

## INFRA

### I1 — Fix `pltComposeConfig.version` type  `[MAJOR]`
**Gap:** `composes/platform/server/src/db/schema/platform.ts:41` spreads `baseColumns` (`version: integer`) then overrides with `version: text(...)`. Migration confirms `plt_compose_config.version` is `text` while sibling tables are `integer`. Breaks optimistic concurrency (needs integer).

**Fix:** decide config-version semantics — if it is a config schema version string, rename the column (e.g. `config_version`) so it does not shadow the OCC `version`; otherwise keep `integer`. Regenerate migration.

### I2 — Unbundle compose schema from core infra  `[MAJOR]`
**Gap:** `apps/server/src/infra/db/schema/index.ts:15-32` imports `@projectx/platform-server/db/schema/platform`, merging compose schema into core infra. Couples release cycles; violates "compose not referenced by core".

**Fix:** keep compose schema in its own Drizzle config/migration namespace. Core infra schema index should contain only core + module tables. Compose migrations run separately.

### I3 — Remove redundant `dotenv`  `[MINOR]`
**Gap:** `infra/env.ts:1` `import "dotenv/config"` + `dotenv` dependency. Server CLAUDE.md: "Bun loads .env, don't use dotenv."

**Fix:** delete the import and the dependency; rely on Bun's `.env` loading.

### I4 — Use the realtime gateway singleton  `[MINOR]`
**Gap:** `gateway.ts:187-196` calls `createRealtimeGateway()` per message inside `handleClientMessage` instead of the exported singleton. Works only because state is module-level Maps.

**Fix:** reference the exported singleton; do not construct per message.

### I5 — Worker shutdown observability  `[MINOR]`
**Gap:** `closeQueueConnections()` closes workers without logging in-flight/abandoned job counts.

**Fix:** log counts on shutdown for operator debugging.

---

## WEB SHELL (structure/wiring only — NO UI)

> All component-visual items from the audit (W4 component-library dedup, W8 data-table/form-generator placement) are **deferred to the later UI pass** and intentionally excluded here, except where they are pure packaging/wiring.

### W1 — Remove dead duplicate auth store  `[BLOCKER]`
**Gap:** `apps/web/src/stores/auth.ts` is a full duplicate `useAuthStore`, never imported (shell uses `@projectx/platform-web`). Drift hazard — could be imported by accident, creating two auth states.

**Fix:** delete `apps/web/src/stores/auth.ts`. Confirm nothing imports it.

### W2 — Move/remove the shell dashboard business route  `[MAJOR]`
**Gap:** `apps/web/src/routes/dashboard.tsx` (registered `/_dashboard`) is business/dev-tool logic in the shell, hardcodes `localhost:3000`. Docs label it legacy.

**Fix:** if it is a dev introspection tool, move it behind a dev-only flag or into a dedicated dev compose; otherwise delete. Shell `routes/` keeps only shell concerns (404, root).

### W3 — Fix broken `/dashboard` link  `[MAJOR]`
**Gap:** `routes/index.tsx:31` links `to="/dashboard"` but route is registered `/_dashboard` (a layout segment, not a path). Navigating 404s.

**Fix:** resolve alongside W2 — either correct the link target or remove it when the route moves.

### W4 — API base URL via env  `[MINOR]`
**Gap:** `apps/web/src/lib/api.ts:3` hardcodes `http://localhost:3000`.

**Fix:** use `import.meta.env.VITE_API_URL` with a local default.

### W5 — Eden Treaty typed client (depends on `04`)  `[MAJOR]`
**Gap:** `apps/web` uses raw `fetch` with hand-written types; docs require the Eden Treaty `App` type for type-safe calls, and `apps/web` is missing the `@projectx/server` workspace dep.

**Fix:** add the dep, adopt Eden Treaty for shell-level API typing. Coordinate with compose export shape in `04`.

---

## Notes
- Adapter *implementations* (storage/notification/geo/etc.) are injected here in infra against the Core `AdapterRegistry` interfaces from `01` C2. Stub or real per environment.
- Items W4/W8 from the shell audit about component placement are tracked for the **UI pass**, not this baseline.
