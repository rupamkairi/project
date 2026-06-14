# 04 — Compose Layer Alignment (Platform)

**Source of truth:** `docs/architecture/compose-standards.md`, `docs/compose/platform/*`, `docs/web/lms/composing-server.md`, `composing-web.md`, `docs/monorepo-architecture.md`.
**Target code:** `composes/platform/**`.
**Rules:** Compose is orchestration only. It selects modules, calls them **only** via commands/queries/events (never their tables), declares roles/permissions/settings, and exposes a `ComposeManifest`. Composes never import each other.

Depends on `03` modules (`identity`, `notification`) being callable for the module-path migration.

---

## What already works (commit 68aff19)
- Server: `composes/platform/server/src/index.ts` exports `platformCompose` (Elysia plugin, `prefix:/platform`); `apps/server/src/index.ts` `.use(platformCompose)`. ✓
- Web: `composes/platform/web/src/routes/index.ts` exports `platformRoutes`; `apps/web/src/router.tsx` spreads them into `sharedRootRoute`. ✓ (routing contract met)

The deep gaps are server-side: the compose bypasses modules and has no manifest or interfaces layer.

---

## DECISION D2 — enforce the module-CQRS path now?
Platform routes currently query `identity`/`notification` tables directly via Drizzle (`@db/schema/*`). Docs forbid this. **Recommended:** gate on `03` D1 — once `identity` + `notification` modules are real, migrate platform to call them via commands/queries/events. Until then, keep direct-DB as a **documented bootstrap exception** (note it in `06`), do not add new direct-DB routes.

---

## CP1 — Add ComposeManifest  `[MAJOR]`
**Gap:** `ComposeManifest` type does not exist anywhere; platform exports no manifest; no `compose-registry` in `apps/web`. Sidebar nav is hardcoded in `dashboard.layout.tsx:22-28`.

**Fix:**
- Define `ComposeManifest` type. Per `monorepo-architecture.md` it lives at `apps/web/src/types/compose.ts`: `{ id, label, icon, prefix, navItems }`. (Confirm location vs `packages/router` in `06` — a shared package is cleaner since both shell and composes use it.)
- Export `platformManifest: ComposeManifest` from `composes/platform/web`.
- Add `apps/web/src/lib/compose-registry.ts` consuming manifests to build nav.
- Server side: add the `PLUGIN_MANIFEST` (`composing-server.md` §4) declaring id, entities, events, commands, required capabilities, migrations.

**Acceptance:** sidebar nav is manifest-driven, not hardcoded; registry lists active composes.

---

## CP2 — Add the `interfaces/` contract layer  `[BLOCKER]`
**Gap:** `composing-server.md` §2 requires `interfaces/index.ts` (zero-dependency contract: `PluginContext`, `EventBus`, `FSMEngine`, `DatabaseClient`, …). Platform has none and instead hard-imports host internals.

**Fix:** create `composes/platform/server/src/interfaces/` defining what the compose needs; the host injects implementations. This is the root fix that unblocks CP3 and CP4.

---

## CP3 — Route through modules, not DB tables  `[BLOCKER]`
**Gap:** `routes/{auth,users,roles,notifications,settings}.ts` import `@db/client` + `@db/schema/*` and call Drizzle directly, bypassing module command/query/event interfaces.

**Fix (gated on D2):** replace direct Drizzle calls with mediator dispatch — `ctx.dispatch("identity.createUser", ...)`, `ctx.query("identity.listUsers", ...)`, etc. No `@db/*` imports in compose routes.

**Acceptance:** `grep "@db/" composes/platform/server/src/routes` returns nothing.

---

## CP4 — Compose-level module selection  `[MAJOR]`
**Gap:** all 10 modules boot unconditionally (`apps/server/src/index.ts:279-289`). Platform doc says it selects `["identity","notification"]`. No `ComposeDefinition` enforces this.

**Fix:** compose declares `modules: ["identity","notification"]`; the shell boots only the active compose's modules via `registry.boot(ids)` (the selective boot added in `01` C4).

---

## CP5 — tsconfig coupling  `[MAJOR]`
**Gap:** `composes/platform/server/tsconfig.json:9-15` aliases `@core/* @modules/* @infra/* @db/*` straight into `apps/server/src/*`. Compose is welded to host internals; cannot be packaged/tested independently.

**Fix:** once CP2/CP3 land, the compose imports from its own `interfaces/` + injected context, not host internals. Trim these aliases. (Coordinate with the tsconfig include/exclude fixes in `05`.)

---

## CP6 — Server plugin lifecycle  `[MINOR]`
**Gap:** `platformCompose` is a plain Elysia instance — no `init`/`shutdown`, no capability validation, no `getManifest()/getRoutes()/getJobs()` (docs `composing-server.md` §4 Plugin class).

**Fix:** wrap in the documented Plugin contract with lifecycle hooks. Lower priority than CP2-CP4.

---

## CP7 — Misc  `[MINOR]`
- Dead `/dashboard/settings` nav link (`dashboard.layout.tsx:27`) — route file missing. Add the route or remove the link.
- `composes/platform/web/package.json` lists `@projectx/platform-server` as `peerDependency` — web should not depend on server package. Move shared types to a shared package or make it a proper dep only if Eden Treaty types require it. (Ties to `02` W5.)
- `apps/web/src/stores/auth.ts` duplicate — handled in `02` W1.

---

## Planned-but-missing composes (informational, out of baseline scope)
Docs describe 9 more composes (`lms, crm, erp, pm, office, restaurant, hospitality, healthcare, ecommerce`); none exist in code. **Do not build these in the baseline.** Platform is the reference compose — get its pattern right (CP1-CP5) so the others can follow.
