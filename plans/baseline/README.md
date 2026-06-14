# ProjectX Baseline Plan

**Goal:** Bring the codebase into alignment with the architecture documents. Docs are the source of truth. Where code and docs disagree, the code changes — except where the docs disagree with *themselves*, which is flagged for a human decision in [`06-docs-reconciliation.md`](./06-docs-reconciliation.md).

**Scope exclusion:** No UI / visual / styling work. The design system and component visuals will be handled later with dedicated AI + skills. This plan only covers structural, contract, and wiring concerns — including the *packaging* and *export wiring* of `@projectx/ui`, but never its component appearance.

**Implementation model:** Planning by Opus 4.8. Implementation by Sonnet 4.6. Every task is written to be picked up cold: it states the contract, the files, and an acceptance check.

---

## How this plan is organised

| File | Layer | Why it is in this order |
| --- | --- | --- |
| [`01-core.md`](./01-core.md) | Core primitives | Everything depends on Core. Four keystone gaps here block all module and compose work. Do this first. |
| [`02-infra-shell.md`](./02-infra-shell.md) | Infra + shell apps | Worker dispatch, WebSocket mount, graceful shutdown, schema/infra alignment. Depends on Core contracts being stable. |
| [`03-modules.md`](./03-modules.md) | Modules | All 10 modules are scaffold-only. Cannot be implemented until Core's schema system, BootRegistry, and SystemContext are real. |
| [`04-compose.md`](./04-compose.md) | Compose (platform) | Platform compose must route through Modules (not direct DB), expose a `ComposeManifest`, and gain an `interfaces/` contract layer. Depends on modules being callable. |
| [`05-monorepo-config.md`](./05-monorepo-config.md) | Monorepo config | tsconfig / turbo / test / alias fixes. Several are BLOCKERs because they make `typecheck` a silent no-op today. Can run in parallel with 01–04 since it is mostly config. |
| [`06-docs-reconciliation.md`](./06-docs-reconciliation.md) | Docs | The docs contradict themselves in ~8 places. Resolve those before aligning code to a moving target. |

---

## Critical path (dependency order)

```
05 (config: unblock typecheck)  ──┐  can start immediately, parallel to everything
                                  │
06 (docs: resolve conflicts) ─────┤  must finish before the contracts it touches are coded
                                  ▼
01 Core ──► 02 Infra/Shell ──► 03 Modules ──► 04 Compose
  keystones    worker/ws/db      identity-first   manifest + module routing
```

**Do not start 03 (Modules) until the four Core keystones in 01 are merged.** Modules cannot be written against a `SystemContext` that passes `{}` or a `BootRegistry` that hands out no services.

---

## The four keystones (the whole baseline hinges on these)

These are in [`01-core.md`](./01-core.md) but called out here because nothing downstream works without them:

1. **Entity Schema System is entirely missing** (`core/entity`). `EntitySchema`, `FieldSchema`, `Validators`, `EntitySchemaRegistry` do not exist. This is the foundation of the schema-driven architecture — repositories, module manifests (`entities: EntitySchema[]`), validation, and generated form/OpenAPI schemas all depend on it.
2. **AdapterRegistry is entirely missing** (`core`). Modules reach storage / notification / payment / geo / search *only* through `ctx.adapters`. Without it, `document`, `catalog`, `geo`, `notification` cannot be built.
3. **SystemContext is broken and triplicated.** The mediator passes `{} as SystemContext` to every handler (a runtime null-reference bomb), and the type is defined three times with three different shapes. It is also missing `repo`, `scheduler`, `realtime`, `adapters`, `publishBatch`.
4. **BootRegistry is redesigned away from spec.** It hands modules registration callbacks only — no access to `bus`, `store`, `db`, `adapters`, `schemas`. Modules literally cannot reach the event bus or database at boot.

---

## Severity rollup (all layers)

| Layer | BLOCKER | MAJOR | MINOR |
| --- | --- | --- | --- |
| Core | 9 | 38 | ~12 |
| Modules | 2 | 6 | 6 |
| Compose | 3 | 4 | 4 |
| Infra/Shell | 3 | 7 | 6 |
| Monorepo config | 4 | 5 | 9 |

Full per-finding detail lives in each layer file. The original audit reports are preserved verbatim in [`audit-findings.md`](./audit-findings.md).

---

## Decision points for the user (resolve before/while implementing)

These are choices the plan cannot make alone. Each is also repeated in context inside its layer file.

- **D1 — Module rollout breadth.** Implement all 10 modules fully, or tracer-bullet `identity` end-to-end first (platform depends on it), then `notification`, then align the other 8 structurally and fill later? *Plan recommendation: tracer-bullet identity → notification, structurally align the rest.* See [`03-modules.md`](./03-modules.md).
- **D2 — Platform compose: enforce module-CQRS path now?** Docs require composes to call modules only via commands/queries/events, never touch DB tables. Platform currently queries `identity`/`notification` tables directly via Drizzle. Enforce the module path now (large), or keep direct-DB as a documented bootstrap exception and migrate after modules are real? *Plan recommendation: gate on D1 — once identity+notification are real, migrate platform to the module path.* See [`04-compose.md`](./04-compose.md).
- **D3 — Where the Entity Schema validation engine sits.** Pure hand-rolled `FieldSchema` validators per docs, or back them with Zod (already a dependency) and derive `EntitySchema` from Zod? Affects every module's entity definitions. *Plan recommendation: define the `EntitySchema`/`FieldSchema` contract per docs, implement validators with Zod internally.* See [`01-core.md`](./01-core.md) Task C1.
- **D4 — Doc conflicts.** A few contracts differ *between* docs (e.g. `Meta` strict vs `unknown`, `ModuleManifest.fsms` exists in code but not master-arch). The plan picks a default for each in [`06-docs-reconciliation.md`](./06-docs-reconciliation.md); confirm or override.

---

## Superseded plans

These existing files are folded into this baseline and should be treated as historical:

- `plans/compose-workspace-plan.md` — workspace packaging is now done; superseded by `05` + `04`.
- `plans/monorepo-architecture-alignment.md` — its shell-to-compose findings are partly resolved (commit `68aff19`); current state is re-audited in `04` + `02`.

---

## Definition of done for the baseline

- [ ] `bun run typecheck` passes across all workspaces and actually checks route/source files (not a no-op).
- [ ] All four Core keystones implemented; `core/index.ts` exports the full spec surface.
- [ ] No layer imports across forbidden boundaries (modules→modules internals, core→modules, compose→compose).
- [ ] Worker dispatches jobs to real module handlers.
- [ ] `identity` and `notification` modules implemented end-to-end (commands/queries/events/fsm/jobs).
- [ ] Platform compose exposes a `ComposeManifest` and reaches data through modules (per D2).
- [ ] Docs no longer contradict the code or each other on the contracts above.
- [ ] A `test` task exists and at least Core has unit tests (TDD recommended for pure-logic Core).
