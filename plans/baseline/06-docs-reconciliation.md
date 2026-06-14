# 06 — Docs Reconciliation

The docs are the source of truth, but in ~8 places they contradict **themselves** (one doc vs another, or a doc vs a deliberate code improvement). Aligning code to a self-contradicting spec is impossible, so resolve these first. Each has a recommended default (Decision D4); confirm or override before the related code task runs.

For each: pick the canonical answer, update the losing doc, then code to it.

---

## R1 — `Meta` type: strict vs loose
- `core.md` (deep): `Meta = Record<string, string|number|boolean|null>`.
- `optimized/core.md`: `Meta = Record<string, unknown>`.
- Code follows the strict form.
- **Recommend:** keep strict (code is right). Update `optimized/core.md`. `CoreError.meta` should then use `Meta` (see `01` C13).

**RESOLVED:** Strict wins. Canonical: `Meta = Record<string, string | number | boolean | null>`.
`docs/architecture/core.md` was already correct (left unchanged).
`docs/optimized/core.md` updated: `Record<string, unknown>` changed to `Record<string, string | number | boolean | null>`.

## R2 — `ModuleManifest.fsms` field
- Code (`core/module/index.ts:75`) has `fsms: string[]`; all modules declare `fsms:[]`.
- `master-architecture.md` and `optimized/module.md` omit `fsms` from the manifest.
- **Recommend:** keep `fsms` (modules do own FSMs) but type it per the schema decision; add it to the docs' `ModuleManifest`.

## R3 — `ComposeManifest` location
- `monorepo-architecture.md`: `apps/web/src/types/compose.ts`.
- `composing-server.md`: implies it lives inside the compose; also defines a separate server `PLUGIN_MANIFEST`.
- **Recommend:** one shared `ComposeManifest` type in a shared package (used by shell + every compose web); keep the server `PLUGIN_MANIFEST` as a distinct server-side declaration. Update both docs to match. (Drives `04` CP1, `05` CF4.)

**RESOLVED:** Shared package wins. `ComposeManifest` (web/UI navigation type, shape: `{ id, label, icon, prefix, navItems }`) lives in a shared package (e.g. `@projectx/shared-router` or `@projectx/compose-types`), imported by both `apps/web` and every compose web.
`docs/monorepo-architecture.md` updated: comment changed from `apps/web/src/types/compose.ts` to shared package; import in example updated from `@repo/web/types` to `@projectx/shared-router`.
`docs/web/lms/composing-server.md` updated: clarifying comment added above `PLUGIN_MANIFEST` stating it is a server-side-only declaration, distinct from `ComposeManifest` (web, shared package).

## R4 — `actor.type` literal
- Code: `"api_key"` (underscore). Spec: `"api-key"` (hyphen).
- **Recommend:** hyphen (spec). Fix code (`01` C3). No doc change.

**RESOLVED:** Hyphen `"api-key"` is canonical.
Two docs were found using the underscore form and corrected:
- `docs/web/lms/composing-server.md`: `ActorContext.actor.type` union updated from `"api_key"` to `"api-key"`.
- `docs/architecture/project-setup-server.md`: `SystemContext.actor.type` union updated from `'api_key'` to `'api-key'`.
Note: the Postgres enum definition (`pgEnum('actor_type', ['human', 'system', 'api_key'])`) on line 715 of `project-setup-server.md` was left unchanged -- that is a DB column name constraint, not the TypeScript type literal.

## R5 — Repository org-scoping
- Code requires explicit `orgId` params on read methods. Spec injects `orgId` automatically in `BaseRepository`.
- **Recommend:** spec wins — auto-inject (`01` C10). No doc change; this is code-to-doc.

## R6 — `Result`/`Logger` file placement
- Spec: `Result` in `primitives/result.ts`, `Logger` in `primitives/logger.ts`.
- Code: `Result` in `errors/`, `Logger` in `context/`.
- **Recommend:** follow spec layout (`01` C9, C13). No doc change.

**RESOLVED:** Spec wins. `Result`/`Ok`/`Err` belong in `core/primitives/result.ts`; `Logger` belongs in `core/primitives/logger.ts`.
`docs/architecture/core.md` already states both files in the `primitives/` directory (lines 85-86 of directory listing) -- no doc edit needed.
`docs/optimized/core.md` has no directory listing -- no doc edit needed.
This is a code-move task only (tracked under `01` C9/C13).

## R7 — Module `dependsOn` undocumented edges
- Code: `document → identity`, `workflow → identity`.
- Docs list no deps for these.
- **Recommend:** the edges are plausible (both reference actors). Confirm intent, then **document them** in `module.md` rather than removing. (Ties to `03` M2.)

## R8 — Platform direct-DB bootstrap exception
- Docs: composes never touch module tables.
- Code: platform queries `identity`/`notification` tables directly.
- **Recommend:** add an explicit, time-boxed "bootstrap exception" note in `compose-standards.md` (or platform README) stating direct-DB is temporary until modules are real, then removed (D2 / `04` CP3). Keeps docs honest about current state without endorsing the pattern long-term.

---

## Also: structural-noise the docs imply but code over-scaffolds
- `analytics/fsm/` exists though analytics is read-only (no FSM) — remove dir, no doc change (`03` M1).
- `jobs/` in `catalog`/`document`/`geo` — docs define no scheduled jobs; remove unless a real job is planned (`03` M1).

---

## Output of this file
A short changelog of which doc was edited and the canonical decision, so future agents see one consistent spec. Do this **before** the dependent code tasks (`01` C3/C9/C10/C13, `03` M1/M2, `04` CP1/CP3).
