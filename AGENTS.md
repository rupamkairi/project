# ProjectX Agent Guide

## What is this project

ProjectX is a **compose-first application factory** for dashboard-style SaaS products.
Architecture: `Core → Module → Compose → Host Shell`

---

## Read order — before any task

Read these in sequence. Do not skip.

| # | File | When required |
|---|------|--------------|
| 1 | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Always — 3-layer overview, rules |
| 2 | [docs/conventions.md](./docs/conventions.md) | Always — naming rules for all files, dirs, exports, routes |
| 3 | [docs/core.md](./docs/core.md) | Core work, any primitive/infra task |
| 4 | [docs/module.md](./docs/module.md) | Module work, new entities/commands/events |
| 5 | [docs/compose.md](./docs/compose.md) | Compose work, adding or modifying any compose |
| 6 | [docs/monorepo.md](./docs/monorepo.md) | Workspace setup, package.json, turbo, path aliases |
| 7 | [docs/setup/server.md](./docs/setup/server.md) | Server setup, Elysia, infra, DB |
| 8 | [docs/setup/web.md](./docs/setup/web.md) | Web setup, Vite, React, TanStack Router |
| 9 | [docs/design-system.md](./docs/design-system.md) | Any UI work |
| 10 | [docs/composes/index.md](./docs/composes/index.md) | Choosing modules for a new compose |
| 11 | `docs/composes/{name}.md` | Compose-specific detail before building that compose |

---

## Architectural rules — non-negotiable

**Core**
- Zero business logic, zero domain vocabulary, zero vendor dependencies
- Everything depends on Core. Core depends on nothing.

**Module**
- Owns one bounded concern (entities, commands, queries, events, FSMs)
- Communicates only through EventBus and CQRS Mediator
- Never imports from another module's internals
- Never accesses another module's DB tables directly

**Compose**
- Orchestration only — selects modules, wires cross-module behavior
- May call modules only through their public interfaces
- Never imports from another compose
- If logic is reusable across composes → move it to a Module or Core

**Shell (apps/server, apps/web)**
- Zero feature logic
- `apps/server`: boot infra, register compose plugins, expose `/health` `/core` `/schemas` `/modules`
- `apps/web`: render root layout, register compose route trees, provide global providers

---

## Shell integration contract

**Server** — compose must export:
```typescript
export const {name}Compose = new Elysia({ prefix: "/{name}" }).use(...)
export type {Name}App = typeof {name}Compose
```

**Web** — compose must export:
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
plans/{task-slug}.{your-agent-name}.plan.md
```

See [plans/README.md](./plans/README.md) for format and rules.

---

## Naming conventions

All naming (dirs, files, routes, exports, DB tables) is in [docs/conventions.md](./docs/conventions.md).
Do not guess. Read it first.

---

## Current repo state

- Core: scaffold only (module/ implemented; others are placeholders)
- Modules: scaffold only (all subdirs are placeholders)
- Platform compose: server complete; web missing `{name}Manifest` export
- All other composes: documented but not built

When code and docs conflict → **docs are the target**. Code is transitional.
