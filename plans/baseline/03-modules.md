# 03 — Modules Layer Alignment

**Source of truth:** `docs/architecture/module.md`, `docs/optimized/module.md`, `docs/architecture/master-architecture.md`.
**Target code:** `apps/server/src/modules/**`.
**Rule:** Modules own their entities/commands/queries/events/fsm/jobs. They communicate **only** via public commands, queries, events. Never import another module's internals or touch another module's tables.

**HARD DEPENDENCY:** Do not start this layer until `01` keystones (C1 schema system, C2 adapters, C3 SystemContext, C4 BootRegistry) are merged. Modules are unbuildable without them.

---

## Current state

All 10 modules exist but are scaffold-only: 10 non-empty `index.ts` shells, **55 of 65** subdir files are single-line stubs (`// Placeholder - implementation pending`). Zero runtime behaviour. `boot()` bodies are empty. All manifests declare empty `entities/events/commands/queries/fsms` arrays — so the registry knows nothing at boot.

Modules: `analytics, catalog, document, geo, identity, inventory, ledger, notification, scheduling, workflow`.

---

## DECISION D1 — rollout breadth (resolve first)

**Recommended:** tracer-bullet, not big-bang.
1. Implement **`identity`** fully end-to-end (platform depends on it). This proves the whole Core→Module→Compose path on one vertical slice.
2. Implement **`notification`** fully (platform's second dependency).
3. **Structurally align** the other 8 (correct anatomy, real manifests, schemas registered) and fill command/query/event logic in later passes.

The tasks below apply per-module; sequence them by D1.

---

## M1 — Fix module anatomy across all 10  `[MAJOR]`

Per `module.md` the anatomy is: `manifest.ts`, `index.ts`, `entities/`, `commands/`, `queries/`, `events/`, `fsm/`, `jobs/`, `adapters/`.

- **`manifest.ts` missing in all 10** — manifest is inlined in `index.ts`. Extract to a dedicated `manifest.ts` so it is independently importable (per spec). `index.ts` imports and registers it.
- **`adapters/` missing in all 10** — create where the module needs external services: `document` (`StorageAdapter`), `catalog` (`SearchAdapter`), `geo` (`GeoAdapter`), `notification` (`NotificationAdapter`). These reference Core adapter *interfaces* (`01` C2); implementations are injected by infra.
- **`scheduling` missing 5 of 7 subdirs** `[BLOCKER]` — create `commands/`, `queries/`, `events/`, `fsm/`, `jobs/`. Docs spec: 8 commands, 4 queries, 3 FSM states, 3 scheduled jobs.
- Remove structurally-wrong dirs: `analytics/fsm/` (analytics is read-only, no FSM); reconsider `jobs/` in `catalog`/`document`/`geo` (docs define no scheduled jobs for them) — keep only if a real job is planned, else remove to avoid noise.

---

## M2 — Real manifests  `[BLOCKER]`

**Gap:** every manifest passes `entities:[] events:[] commands:[] queries:[] fsms:[]`. Registry is non-functional even where modules look wired.

**Fix per module:**
- `entities: EntitySchema[]` — real `EntitySchema` objects (depends on C1, and C4 changing the field type from `string[]`).
- Declare real `commands`, `queries`, `events`, `fsms`, `idPrefixes`, `scheduledJobs`, `queueWorkers`, `migrations: Migration[]`, `defaultConfig`.
- `dependsOn` — only documented deps. Note current undocumented deps: `document → identity`, `workflow → identity` (D-level — confirm in `06` or document them).

---

## M3 — Implement `boot()` per module  `[BLOCKER]`

**Gap:** all `boot()` bodies are empty comment blocks.

**Fix:** using the redesigned `BootRegistry` (`01` C4), each `boot(registry)` must:
- register entity schemas (`registry.schemas.register(...)`),
- register command/query handlers (`registry.mediator.registerCommand/Query(...)`),
- subscribe event handlers (`registry.bus.subscribe(...)`),
- register FSMs (`registry.fsms.register(...)`),
- register queue workers (`registry.queue.process(...)`) — feeds the worker dispatch in `02` S1,
- register scheduled jobs (`registry.scheduler.define(...)`).

---

## M4 — Implement command/query/event/fsm/jobs logic

Per D1 priority. For each implemented module:
- **commands/** — `CommandHandler`s producing domain events, guarded by rules/FSM.
- **queries/** — `QueryHandler`s reading via injected repository (no cross-module table access).
- **events/** — subscribers reacting to own + other modules' public events.
- **fsm/** — `StateMachine` definitions using the fixed `FSMContext`/`TransitionResult` from `01` C6.
- **jobs/** — `JobHandler`s for scheduled/queued work.

Reference per-module specs in `docs/architecture/module.md` for the exact command/query/state lists.

---

## M5 — Enforce boundaries  `[BLOCKER, ongoing]`

- No module imports another module's internal files. Cross-module needs go through events or the mediator (public commands/queries).
- No module touches another module's DB tables directly.
- Modules import Core only from the barrel (`@core`), never deep paths (ties to `01` C14).

**Acceptance:** boundary grep is clean; a module interaction (e.g. `workflow` assigning to an `identity` actor) happens via event/command, not import.

---

## Suggested approach
Core + module internals are pure logic — use **TDD** per handler. Start with `identity`: schema → manifest → boot → one command (e.g. `identity.createUser`) → its event → one query → FSM for user status. That single green slice de-risks the entire pattern before scaling to the other modules.
