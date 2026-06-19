# Agent Reading Order & Integration Contract

→ Quick start: [docs/instructions/README.md](./README.md)

---

## Non-negotiable behavior rules

**No tests. No app verification.**
NEVER write tests unless the user explicitly asks ("write a test", "add test coverage").
NEVER run or verify the app unless explicitly asked ("run it", "verify this").
App is assumed running. Focus on implementation only.

---

## Full reading order

Read in sequence. Do not skip.

| # | File | When required |
|---|---|---|
| 1 | [docs/ARCHITECTURE.md](../ARCHITECTURE.md) | Always — 3-layer overview, rules |
| 2 | [docs/conventions.md](../conventions.md) | Always — naming rules for all files, dirs, exports, routes |
| 3 | [docs/instructions/architectural-rules.md](./architectural-rules.md) | Always — non-negotiables |
| 4 | [docs/core.md](../core.md) | Core work, any primitive/infra task |
| 5 | [docs/module.md](../module.md) | Module work, new entities/commands/events |
| 6 | [docs/compose.md](../compose.md) | Compose work, adding or modifying any compose |
| 7 | [docs/monorepo.md](../monorepo.md) | Workspace setup, package.json, turbo, path aliases |
| 8 | [docs/setup/server.md](../setup/server.md) | Server setup, Elysia, infra, DB |
| 9 | [docs/setup/web.md](../setup/web.md) | Web setup, Vite, React, TanStack Router |
| 10 | [docs/design-system.md](../design-system.md) | Any UI work |
| 11 | [docs/plugins/README.md](../plugins/README.md) | Plugin work — storage, notification, or new plugin |
| 12 | [docs/composes/index.md](../composes/index.md) | Choosing modules for a new compose |
| 13 | `docs/composes/{name}.md` | Compose-specific detail before building that compose |

---

## Shell integration contract

Every compose must export these shapes to be mountable in the shell apps.

**Server — compose must export:**
```typescript
export const {name}Compose = new Elysia({ prefix: "/{name}" }).use(...)
export type {Name}App = typeof {name}Compose
```

**Web — compose must export:**
```typescript
export const {name}Routes: RouteObject[] = [...]
export const {name}Manifest: ComposeManifest = { id, label, icon, prefix, navItems }
```

**Register in shell:**
```typescript
// apps/server/src/index.ts
app.use({name}Compose)

// apps/web/src/router.tsx
rootRoute.addChildren([...{name}Routes])
composeRegistry.push({name}Manifest)
```

---

## Plans

Before implementing any non-trivial task, create a plan file:

```
plans/{task-slug}.<your-agent-name>.plan.md
```

Example: `plans/add-crm-compose.claude.plan.md`

See [plans/README.md](../../plans/README.md) for format and naming rules.

Wave-based baseline plan files live in `plans/baseline/` — read these before working on Wave 2+.

---

## Current repo state (Wave 1 complete)

- **Core:** Fully implemented — `bun test src/core` → 343 pass, 0 fail
- **Modules:** Scaffold only — all subdirs are placeholder stubs
- **Platform compose:** Server complete; web missing `platformManifest` export
- **All other composes:** Documented but not built

**Next waves** (per `plans/baseline/`):
- Wave 2 — `02-infra-shell.md`: worker dispatch, `/ws` mount, graceful shutdown
- Wave 3 — `03-modules.md`: `identity` module end-to-end (tracer-bullet)
- Wave 4 — `04-compose.md`: `ComposeManifest`, `interfaces/` layer, module routing

---

## Available skills

Full reference: [docs/skills/README.md](../skills/README.md)

Most relevant per task type:
- `compose-spec` — spec a feature before coding
- `compose-todo` — implementation checklist from a spec
- `elysiajs` — Elysia server patterns
- `ui-styling` — shadcn/ui, Tailwind
- `turborepo` — monorepo build config
- `tanstack-query` — React Query patterns
- `vite-advanced` — Vite build customization
