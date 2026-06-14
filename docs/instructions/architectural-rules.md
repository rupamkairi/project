# Architectural Rules

Non-negotiable. Apply to all work regardless of scope.

---

## Core

- Zero business logic
- Zero domain vocabulary (no "user", "order", "invoice" — only generic primitives)
- Zero vendor dependencies (no SDK imports, no external services)
- Everything in the system depends on Core
- Core depends on nothing

---

## Module

- Owns exactly one bounded concern (entities, commands, queries, events, FSMs)
- Communicates with other modules only through EventBus and CQRS Mediator
- Never imports from another module's internals
- Never accesses another module's database tables directly
- Owns its own DB namespace (table prefix = module name)

---

## Compose

- Orchestration only — selects modules, wires cross-module behavior, defines roles/permissions/routes
- May call modules only through their public interfaces
- Never imports from another compose
- If logic is reusable across multiple composes → move it to a Module or Core primitive
- Must export `{name}Compose` (Elysia plugin) and `{name}Manifest` (ComposeManifest) per the shell contract

---

## Shell (`apps/server`, `apps/web`)

- Zero feature logic
- `apps/server`: boot infra, register compose plugins via `.use()`, expose `/health` `/core` `/schemas` `/modules`
- `apps/web`: render root layout, register compose route trees, provide global providers
- No business routes, no domain logic, no DB access

---

## Plugins

- A plugin never imports from a module
- A module never imports from a plugin
- The compose is the only place plugins and modules meet (at boot, via factory)
- Plugin packages live in `plugins/{capability}/`; package name `@projectx/plugin-{capability}-{server|web}`

---

## General

- When code and docs conflict → **docs are the target**. Code is transitional.
- All naming follows `docs/conventions.md` — do not guess, read it first.
- All changes to cross-layer contracts require updating the relevant doc.

---

## Dependency diagram

```
apps/server, apps/web  (Shell)
        │
        ▼
composes/{name}/       (Compose) ──────── plugins/{capability}/
        │                                         │
        ▼                                         │ (depends on core interfaces)
apps/server/src/modules/{name}/  (Module)         │
        │                                         │
        ▼                                         ▼
apps/server/src/core/            (Core)  ◄────────
```

No arrows go upward. No arrows go sideways between modules. No arrows go sideways between composes.
