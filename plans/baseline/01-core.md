# 01 — Core Layer Alignment

**Source of truth:** `docs/architecture/core.md`, `docs/optimized/core.md`, `docs/architecture/master-architecture.md`.
**Target code:** `apps/server/src/core/**`.
**Rule:** Core has zero business vocabulary, zero imports from `modules/` or `compose/`. Everything public flows through `core/index.ts`.

Do the keystones (C1–C4) first and in order — the rest depend on them. C5–C12 can then be parallelised.

---

## KEYSTONES

### C1 — Build the Entity Schema System  `[BLOCKER]`

**Gap:** `core/entity/index.ts` has `Entity`, `ID`, `Timestamp`, `Meta`, and ID functions, but the entire schema system is absent.

**Implement (per `core.md`):**
- `FieldType` — union of supported field kinds (`string`, `number`, `boolean`, `date`, `money`, `id`, `ref`, `enum`, `json`, `geo`, …).
- `FieldSchema` — `{ type, required?, default?, validators?, ref?, enumValues?, … }`.
- `Validator` + `ValidationContext` — `(value, ctx) => true | ValidationError`.
- `Validators` — built-in set (`required`, `min`, `max`, `pattern`, `email`, `oneOf`, …).
- `EntitySchema` — `{ name, fields: Record<string, FieldSchema>, idPrefix, indexes?, … }`.
- `EntitySchemaRegistry` — `register`, `get`, `getAll`, `validate(name, data)`, `generateTypeScript()`, `generateOpenAPISchema()`, `generateFormSchema()`.
- `IDGenerator` **interface** (replace loose functions): `generate()`, `generateFor(namespace)`, `isValid(id)`, `extractTimestamp(id)`. Keep ULID impl behind it.

**Decision D3:** implement validators internally with Zod (already a dep), but keep the public `FieldSchema`/`Validator` contract per docs so modules never import Zod directly.

**Acceptance:** a module can declare `const UserSchema: EntitySchema = {...}`, register it, and `registry.validate("User", data)` returns typed failures. `core/index.ts` re-exports all of the above.

---

### C2 — Build the AdapterRegistry  `[BLOCKER]`

**Gap:** `AdapterRegistry` / `AdapterType` do not exist anywhere. `SystemContext.adapters` and `BootRegistry.adapters` both reference it.

**Implement (per `core.md` / `master-architecture.md`):**
- `AdapterType` — union (`storage`, `notification`, `payment`, `geo`, `search`, …).
- Adapter interfaces per type (`StorageAdapter`, `NotificationAdapter`, `GeoAdapter`, `SearchAdapter`, …) — define the method contracts the docs list.
- `AdapterRegistry` — `register(type, impl)`, `get<T>(type)`, `has(type)`.

**Acceptance:** `document` module can call `ctx.adapters.get<StorageAdapter>("storage").put(...)` against the interface. Real implementations are injected by the shell/infra layer (see `02`), not by Core.

---

### C3 — Fix and unify SystemContext  `[BLOCKER]`

**Gaps:**
- Defined 3× with 3 shapes: `cqrs/index.ts:140`, `module/index.ts:147`, `context/index.ts:234`. Keep **only** `context/index.ts`; the other two import it.
- `createMediator.dispatch` passes `{} as SystemContext` (`cqrs/index.ts:362,375`) — thread the real context from the call site.
- Missing fields: `repo<T>(entityName)`, `scheduler`, `realtime`, `adapters`, `publishBatch`.
- `actor.type` literal is `"api_key"`; spec is `"api-key"` (hyphen). Fix in the single surviving definition.
- `createSystemContext` stubs missing deps with `{} as X` (`context/index.ts:486-489`) — make required deps required, fail loud if absent.

**Acceptance:** one `SystemContext` type; `dispatch`/`query` receive a fully populated context; a handler reading `ctx.repo("User")`, `ctx.adapters`, `ctx.scheduler`, `ctx.realtime` type-checks.

---

### C4 — Redesign BootRegistry to provide service instances  `[BLOCKER]`

**Gap:** `module/index.ts` `BootRegistry` hands modules registration callbacks only. Per spec it must expose **service instances**: `mediator`, `bus`, `store`, `schemas` (`EntitySchemaRegistry`), `fsms` (`FSMEngine` + `StateMachineRegistry`), `rules` (`RuleEngine`), `queue`, `scheduler`, `realtime`, `db` (`DatabaseAdapter`), `adapters` (`AdapterRegistry`), `logger`.

**Also:**
- `ModuleManifest.entities`: `string[]` → `EntitySchema[]` (`module/index.ts:55`).
- `ModuleManifest.migrations`: `string[]` → `Migration[]` (`module/index.ts:80`).
- Add `idPrefixes`, `scheduledJobs`, `queueWorkers`, `defaultConfig`.
- `dependsOn`: make optional.
- `ModuleRegistry`: add `resolve(id)` (rename `getModule`), add `boot(ids?)` selective boot, keep `shutdown()`.
- Resolve `fsms` field (code-only, not in master-arch) per D4 / `06`.

**Acceptance:** a module's `boot(registry)` can do `registry.bus.subscribe(...)`, `registry.schemas.register(...)`, `registry.db.<...>`, `registry.mediator.registerCommand(...)`. `registry.boot(["identity"])` boots only that module + its deps.

---

## REMAINING CORE TASKS

### C5 — `core/event` fixes  `[BLOCKER + MAJOR]`
- **BLOCKER** `InMemoryEventBus.publish` once-handler cleanup bug (`event/index.ts:532`): it removes **all** `once` subs after any event. Remove only the matched-and-called subs.
- Add `SubscribeOptions.priority` and `SubscribeOptions.filter`.
- Add `EventOutbox.writeBatch(events, tx)`.
- `ReadOptions`: add `after` (version), `from`/`to` (Timestamp); reconcile `fromVersion` rename.
- `EventFilter`: `type: string` → `types: string[]`; add `actorId`.
- `OutboxRecord`: `processedAt` → `publishedAt` (spec name).

### C6 — `core/state` (FSM) fixes  `[BLOCKER + MAJOR]`
- **BLOCKER** `FSMContext` shape wrong: code `{entityId,currentState,data}` → spec `{entity, actor:{id,roles,orgId}, payload?}`.
- **BLOCKER** `TransitionResult` shape wrong: code `{success,targetState,actions,error}` → spec `{previousState, nextState, actionsExecuted, eventsEmitted}`.
- Add `FSMEngine.reachableStates(machineId, state)`.
- Define `StateMachineRegistry` (referenced by BootRegistry).
- `FSMEngine.resolve` returns non-optional `StateMachine` (drop `any`).
- `TimedTransition` delay field `after` → `delay`; add `StateNode.color`, `Transition.description`.
- Make `Action` a real discriminated union (4 literal types).

### C7 — `core/rule` fixes  `[MAJOR]`
- Add `TemplateRule` variant to `RuleExpr`.
- Add `Op` operators: `containsAll`, `withinDays`, `spatialWithin`.
- Add `RuleEngine.unregister(id)`.
- `CompiledRule` must expose `evaluate(ctx)` **and** `explain(ctx)`.
- `RuleExplanation`: rename `details[]` → `failures[]`, field `operator` → `op`.
- Re-export `Op` from `core/index.ts` (currently omitted).

### C8 — `core/cqrs` fixes  `[MAJOR]`
- Add the 7 built-in middleware factories the docs say ship with Core: `Authorization`, `Validation`, `Idempotency`, `Logging`, `Tracing`, `RateLimit`, `Retry`.
- `CommandHandler<T,R>`: relax `T extends Command` → payload-typed generic per spec.
- (SystemContext threading handled in C3.)

### C9 — `core/context` cleanup  `[MAJOR]`
- Remove the duplicated `Queue`/`Job`/`JobOptions`/`BulkJob` defs here (`context/index.ts:22-180`) — import from `queue/index.ts` (single source).
- Move `Logger` out to `core/primitives/logger.ts`; export from `core/index.ts`.
- Add `ip?`, `userAgent?` to `SystemContext`.
- (Repo/scheduler/realtime/adapters added in C3.)

### C10 — `core/repository` fixes  `[BLOCKER + MAJOR]`
- **BLOCKER** Define and export `Transaction` (currently `tx: unknown` in event outbox). Define `DatabaseAdapter` / `DbQuery` referenced by `BaseRepository`.
- **BLOCKER** Remove explicit `orgId` params from read methods — `BaseRepository` injects `orgId` from context. Public API: `findById`, `findByIdOrFail`, `findOne(filter)`, `findMany(filter, opts?)`, `save`, `saveBatch`, `delete`(soft), `hardDelete`, `restore`, `count`, `exists`, `raw`, `transaction`.
- `BaseRepository` constructor `(schema, db, outbox, orgId)` + abstract `buildQuery(filter): DbQuery`.
- `QueryOptions`: flatten to `{page, limit, sort, include, withDeleted}`.

### C11 — `core/queue` fixes  `[MAJOR]`
- Add `Queue.process<T>(name, handler, concurrency?)`, `drain(name)`, `getDLQ(name)`, `replayDLQ(name, limit?)`, `cancel(id)`.
- `addBulk` → `addBatch`.
- `JobOptions.priority`: `number` → `"critical"|"standard"|"bulk"`; `id` → `jobId`.
- `Scheduler`: `schedule(...)` → `define(name, cron, handler, opts?)`; add `runOnce`, `list`, `getNext`.
- Define `ScheduledJob`, `JobHandler<T>`, `SchedulerOptions`.
- Align `Job<T>` field names to spec (`payload` not `data`, `processedAt`/`completedAt`, `failedReason`, `progress`).

### C12 — `core/realtime` fixes  `[MAJOR]`
- Add `RealTimeGateway.connect(clientId, actorId, orgId)`, `disconnect(clientId)`, `getPresence(channel)`, `getChannels(clientId)`.
- `subscribe`/`unsubscribe` take single `channel: string` (not array) per spec.
- `RealTimeBridge`: `registerEventMapping(pattern, template:string)` → `forward(eventPattern, toChannel, filter?)` where `toChannel` can be a `(event)=>string`.
- `publish` returns `Promise<void>`.

### C13 — `core/primitives` + `core/errors` minor  `[MINOR]`
- Move `Result`/`Ok`/`Err` to `primitives/result.ts` (spec layout); keep error classes in `errors/`.
- `moneyFormat` hardcodes `/100` — support zero-decimal currencies (JPY) via currency metadata.
- `CoreError.meta`: type as `Meta` (strict) per D4.

---

## C14 — Enforce the Core import boundary  `[BLOCKER]`

**Gap:** All 10 modules import `../../core/module` directly; `index.ts`/`worker.ts`/`infra/realtime/gateway.ts` import internal core paths.

**Fix:**
- Ensure `core/index.ts` re-exports the **entire** public surface (see missing-exports list: `Op`, `CompiledRule`, `Logger`, `Transaction`, `ScheduledJob`, `JobHandler`, `AdapterRegistry`/`AdapterType`, full schema system, `IDGenerator`, `StateMachineRegistry`, middleware factories).
- Repoint every consumer to import from the core barrel (`@core` alias, not deep paths).
- Add a lint rule / convention note forbidding deep core imports.

**Acceptance:** `grep -rE "from ['\"].*/core/(module|errors|entity|event|...)" apps/server/src/modules` returns nothing; all go through the barrel.

---

## Suggested approach for the implementer

Core is pure logic — ideal for **TDD** (`/tdd` skill, or `backend-development:tdd-orchestrator`). Write the contract test from the doc spec first, then implement. Order: C1 → C2 → C3 → C4 (keystones), then C5–C13 in parallel, then C14 last (it depends on every export existing).
