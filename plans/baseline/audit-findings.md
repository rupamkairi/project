# Audit Findings (verbatim)

Raw output of the five parallel layer audits that this baseline plan was synthesized from. Kept verbatim as the evidence trail with file:line references. The actionable, sequenced version lives in `01`–`06`.

Audited on branch `bangui`, against docs as source of truth. No UI/visual findings (excluded by scope).

---

# 1. Core Layer Audit

**Spec:** `docs/architecture/core.md` (primary), `docs/optimized/core.md`.

The core layer has a working skeleton but deviates from spec in 40+ ways. Most critical: missing Entity Schema System, missing Adapter Registry, mediator passes empty `{}` as SystemContext to every handler, event bus `once`-handler cleanup bug, all 10 modules bypass `core/index.ts`.

## Per-primitive summary

| Primitive | Spec-complete? | Blocker | Major |
|---|---|---|---|
| entity | No | 1 (Schema System missing) | 1 |
| event | Partial | 1 (once-handler bug) | 5 |
| state | No | 2 | 4 |
| rule | Partial | 0 | 5 |
| cqrs | Partial | 2 | 1 |
| context | No | 4 | 3 |
| repository | No | 2 | 5 |
| module | No | 1 | 5 |
| queue | No | 0 | 10 |
| realtime | Partial | 0 | 5 |
| primitives | Partial | 0 | 2 |
| errors | Yes | 0 | 0 |
| core/index.ts | No | 2 | 8 |

## Key findings
- **entity** `[BLOCKER]`: entire Entity Schema System missing (`EntitySchema`, `FieldSchema`, `FieldType`, `Validator`, `ValidationContext`, `Validators`, `EntitySchemaRegistry`). `IDGenerator` should be an interface, not loose functions.
- **event** `[BLOCKER]`: `InMemoryEventBus.publish` once-cleanup (`event/index.ts:532`) removes ALL `once` subs after any event. Missing `SubscribeOptions.priority/filter`, `EventOutbox.writeBatch`, `ReadOptions.after/from/to`, `EventFilter.types[]/actorId`. `OutboxRecord.publishedAt` renamed `processedAt`.
- **state** `[BLOCKER]`: `FSMContext` shape wrong (`{entityId,currentState,data}` vs `{entity,actor,payload}`); `TransitionResult` shape wrong (`{success,targetState,...}` vs `{previousState,nextState,actionsExecuted,eventsEmitted}`). Missing `reachableStates`, `StateMachineRegistry`. `TimedTransition.after` vs spec `delay`. `Action` not a discriminated union.
- **rule** `[MAJOR]`: missing `TemplateRule`, ops `containsAll/withinDays/spatialWithin`, `unregister`, `CompiledRule.explain`. `RuleExplanation.details[]/operator` vs spec `failures[]/op`. `Op` not re-exported from index.
- **cqrs** `[BLOCKER]`: `createMediator.dispatch` passes `{} as SystemContext` (`cqrs/index.ts:362,375`). `SystemContext` duplicated 3×. All 7 built-in middleware factories absent.
- **context** `[BLOCKER]`: `SystemContext` missing `repo`, `scheduler`, `realtime`, `adapters`, `publishBatch`. `Queue/Job/JobOptions/BulkJob` redefined incompatibly here vs `queue/index.ts`. `Logger` misplaced. `actor.type` `"api_key"` vs `"api-key"`.
- **repository** `[BLOCKER]`: `Transaction` type undefined (outbox uses `tx:unknown`). Repository forces explicit `orgId` params; spec auto-injects. Missing `findByIdOrFail/saveBatch/hardDelete/restore/count/exists/raw/transaction/findMany`. `BaseRepository` missing constructor + abstract `buildQuery`.
- **module** `[BLOCKER]`: `BootRegistry` provides registration callbacks only, not service instances (`mediator/bus/store/schemas/rules/db/adapters/logger`). `ModuleManifest.entities:string[]` (spec `EntitySchema[]`), `migrations:string[]` (spec `Migration[]`); missing `idPrefixes/scheduledJobs/queueWorkers/defaultConfig`. `ModuleRegistry` missing `resolve`/`boot(ids?)`.
- **queue** `[MAJOR]`×10: missing `process/drain/getDLQ/replayDLQ/cancel`; `addBulk` vs `addBatch`; `priority:number` vs union; `Scheduler.schedule` vs spec `define`; missing `runOnce/list/getNext`, `ScheduledJob/JobHandler/SchedulerOptions`.
- **realtime** `[MAJOR]`: missing `connect/disconnect/getPresence/getChannels`; `subscribe` takes array not single channel; `RealTimeBridge.registerEventMapping` vs spec `forward` with channel function.
- **primitives** `[MAJOR]`: `Logger`/`Result` misplaced; `moneyFormat` hardcodes `/100` (breaks JPY).
- **cross-cutting** `[BLOCKER]`: all 10 modules import `../../core/module` directly (bypass barrel); `index.ts`/`worker.ts`/`gateway.ts` import deep core paths. `SystemContext` ×3, `Queue` ×2 (incompatible).

Missing `core/index.ts` exports: `Op`, `CompiledRule`, `Logger`, `Transaction`, `ScheduledJob`, `JobHandler`, `AdapterRegistry/AdapterType`, full schema system, `IDGenerator`, `StateMachineRegistry`, 6 middleware factories.

---

# 2. Modules Layer Audit

All 10 modules exist; 55 of 65 subdir files are single-line stubs (`// Placeholder - implementation pending`). Zero runtime behaviour.

| Module | Dirs missing | Notes |
|---|---|---|
| analytics | adapters, manifest.ts | spurious `fsm/` (read-only module) |
| catalog | adapters, manifest.ts | `jobs/` but no documented jobs |
| document | adapters, manifest.ts | undocumented `dependsOn:[identity]` |
| geo | adapters, manifest.ts | `jobs/` but no documented jobs |
| identity | adapters, manifest.ts | deps OK |
| inventory | adapters, manifest.ts | deps OK |
| ledger | adapters, manifest.ts | deps OK |
| notification | adapters, manifest.ts | deps OK |
| **scheduling** | **commands,queries,events,fsm,jobs**, adapters, manifest.ts | most incomplete |
| workflow | adapters, manifest.ts | undocumented `dependsOn:[identity]` |

- **F-01 `[BLOCKER]`** `scheduling` missing 5 of 7 subdirs.
- **F-02 `[BLOCKER]`** all 55 subdir files are stubs; no handlers, schemas, FSMs, jobs anywhere; `boot()` bodies empty.
- **F-03 `[MAJOR]`** no `manifest.ts` in any module (inlined in `index.ts`).
- **F-04/F-05 `[MAJOR]`** `ModuleManifest.entities:string[]` (spec `EntitySchema[]`), `migrations:string[]` (spec `Migration[]`).
- **F-06 `[MAJOR]`** `ModuleRegistry` API diverges (`bootRegistered/bootAll` vs `boot(ids?)`; `getModule` vs `resolve`).
- **F-07 `[MAJOR]`** `adapters/` missing in all 10 (document/catalog/geo/notification need them).
- **F-08 `[MAJOR]`** all manifests declare empty arrays → registry non-functional at runtime.
- **F-09/F-10 `[MINOR]`** undocumented `document→identity`, `workflow→identity` deps.
- **F-11 `[MINOR]`** `analytics/fsm/` exists despite read-only nature.
- **F-12 `[MINOR]`** `jobs/` in catalog/document/geo with no documented jobs.
- **F-13 `[MINOR]`** `ModuleManifest.fsms` code-only, not in master-arch docs.
- **F-14 `[MINOR]`** `SystemContext` duplicated in cqrs + module.
- No cross-module boundary violations yet (stubs have no imports), but enforce once implementation starts.

---

# 3. Compose Layer Audit (Platform)

Shell-to-compose wiring (commit 68aff19) is structurally sound: `platformCompose` `.use()`'d by Elysia shell; `platformRoutes` spread into TanStack router via `sharedRootRoute`. Web routing contract met. Deep gaps are server-side.

| # | Severity | Description | Location |
|---|---|---|---|
| 1 | BLOCKER | No `interfaces/` contract layer; compose imports host internals directly | `composes/platform/server/src/routes/*.ts` |
| 2 | BLOCKER | All route handlers bypass module command/query/event system, query DB tables directly | `routes/auth.ts:5-10`, `users.ts:5-8`, `roles.ts:5-8`, `notifications.ts:5-12`, `settings.ts` |
| 3 | MAJOR | `ComposeManifest`/`PLUGIN_MANIFEST` not exported; no compose-registry in shell | missing `web/src/manifest.ts`, `server/src/manifest.ts`, `apps/web/src/lib/compose-registry.ts` |
| 4 | MAJOR | No compose-level module selection; all 10 modules boot unconditionally | `apps/server/src/index.ts:279-289` |
| 5 | MAJOR | Server tsconfig aliases into `apps/server/src/*` internals — tight coupling | `composes/platform/server/tsconfig.json:9-15` |
| 6 | MAJOR | Server plugin has no `Plugin` class / init/shutdown / capability validation | `composes/platform/server/src/index.ts` |
| 7 | MINOR | `src/routes` excluded from web tsconfig — not type-checked | `composes/platform/web/tsconfig.json:13` |
| 8 | MINOR | `/dashboard/settings` nav link but no route file | `dashboard.layout.tsx:27` |
| 9 | MINOR | `apps/web/src/stores/auth.ts` duplicates compose auth store | `apps/web/src/stores/auth.ts` |
| 10 | MINOR | web package.json lists `@projectx/platform-server` as peerDependency | `composes/platform/web/package.json:33-35` |

Planned-but-missing composes (docs only, no code): `lms, crm, erp, pm, office, restaurant, hospitality, healthcare, ecommerce`. Only `platform` exists.

---

# 4. Shell App Audit (server + web + infra)

Reference commit `68aff19`.

| ID | Area | Severity | Finding |
|---|---|---|---|
| S2 | Server | BLOCKER | All worker job handlers are permanent stubs — no dispatch (`worker.ts:66-69`) |
| W3 | Web | BLOCKER | `stores/auth.ts` dead duplicate of platform-web auth store |
| W4 | Web | BLOCKER | 33 shadcn components in shell duplicate `@projectx/ui` *(UI-pass scope, not baseline)* |
| S3 | Server | MAJOR | WebSocket `/ws` never mounted; realtime gateway dead from entry point |
| S4 | Server | MAJOR | No SIGTERM/SIGINT handling in HTTP server; modules never shut down |
| S5 | Server | MAJOR | `app:any` in `index.ts:305-306` defeats type safety on Elysia chain |
| I5 | Infra | MAJOR | `pltComposeConfig.version` text overrides integer baseColumn — OCC broken (`platform.ts:41`) |
| I6 | Infra | MAJOR | Compose schema bundled into core infra `schema/index.ts:15-32` — layer violation |
| W5 | Web | MAJOR | Dashboard business route in shell (`routes/dashboard.tsx`) |
| W6 | Web | MAJOR | Broken link: `index.tsx:31` → `/dashboard`, route at `/_dashboard` |
| S6 | Server | MINOR | `/schemas` returns stale/wrong table names for 8 of 12 modules (`index.ts:189-275`) |
| S7 | Server | MINOR | Worker shutdown logs no in-flight job count |
| I7 | Infra | MINOR | `dotenv` imported in `env.ts:1` — redundant under Bun, violates CLAUDE.md |
| I8 | Infra | MINOR | `handleClientMessage` creates new gateway per message vs singleton (`gateway.ts:187-196`) |
| W7 | Web | MINOR | API base URL hardcoded `localhost:3000` (`lib/api.ts:3`) |
| W8 | Web | MINOR | `data-table.tsx`/`form-generator.tsx` belong in `@projectx/ui` *(UI-pass scope)* |
| W9 | Web | MINOR | `@tanstack/router-plugin` absent from vite config (if file-based routing planned) |

Infra PASSes: DB client (Neon+Drizzle singleton), cache client (ioredis, prefixed), queue client (BullMQ singleton), migrations structurally match schema. Server PASS: compose plugin mounting clean. Web PASS: compose routes registered correctly; auth init pattern correct.

Stale `/schemas` table-name map (S6): `inv_stocks`→`inv_stock_units`; `led_*`→`ldg_*`; `wf_workflows/instances`→`wf_process_templates/instances`; `sch_events/recurring`→`sch_slots/recurrences/bookings`; `not_*`→`ntf_*`; `geo_locations/regions/boundaries`→`geo_entities/territories/addresses`; `ana_*`→`anl_*`; `domain_events`→`evt_store`.

---

# 5. Monorepo Config Audit

| Severity | Items |
|---|---|
| BLOCKER (4) | `packages/router/tsconfig.json` wrong alias + broken include (empty project); `composes/platform/web/tsconfig.json` excludes routes; `apps/web/tsconfig.app.json` stale `@projectx/platform` alias active in build; `ComposeManifest` type missing entirely (0 grep hits) |
| MAJOR (5) | `packages/ui` peerDep on private `@repo/config`; `composes/platform/server/tsconfig.json` `types:[]` clears bun-types; no `test` task/infrastructure; `apps/web` missing `@projectx/server` dep + raw fetch instead of Eden Treaty; `apps/web` ESLint not extending `@repo/config/eslint/react` |
| MINOR (9) | `packages/config` no own tsconfig; `base.json` `noUnusedLocals/Params:false` (docs want true); `tailwind.config.js` `require()` in ESM; missing `tailwindcss-animate` devDep; no `build` script in router/ui/composes; no eslint config in compose pkgs; TS version split 5.3 vs 5.9; no `clean` turbo task; `packageManager` pins old bun@1.0.25 |

Workspaces array correct: `apps/*`, `composes/*/server`, `composes/*/web`, `packages/*`. Dependency versions mostly consistent (react 19.2, tanstack-router 1.161, zod 4.3, elysia 1.4, drizzle 0.45). `typecheck` currently a silent no-op for router + platform-web routes due to the tsconfig include/exclude bugs.
