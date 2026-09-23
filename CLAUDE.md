---
description: ProjectX system prompt — applies to all AI agents working on this project.
alwaysApply: true
---

# ProjectX — Agent System Prompt

**Canonical agent instructions.** `AGENTS.md` points here; do not duplicate rules elsewhere.

## Source of truth (read this before any task)

Documentation can lag the code. **Always prefer the codebase** when deciding how something works or how to implement a change.

| Priority | Where to look                                                                                    | Use for                                                      |
| -------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 1        | **Implementation** — routes, handlers, modules, composes, `package.json` scripts                 | Behavior, APIs, wiring, conventions in practice              |
| 2        | **Persistence** — `apps/server/src/infra/db/schema/`, compose `src/db/schema/`, migrations       | Tables, columns, relationships (implicit FKs via `text` ids) |
| 3        | **Hosts** — `apps/server/src/index.ts`, `apps/web/src/router.tsx`, compose `server/src/index.ts` | What is mounted and under which prefixes                     |
| 4        | **Generated** — `/swagger`, `apps/server` `docs:*` scripts                                       | API surface snapshots (regenerate; do not hand-maintain)     |
| 5        | **`docs/`**                                                                                      | Short orientation only — not a spec                          |

When docs and code disagree, **trust the code** and update `docs/` only if durable orientation changed.

Orientation (not specs):

- **[docs/README.md](./docs/README.md)** — repository map
- **[docs/architecture.md](./docs/architecture.md)** — packages and runtime overview
- **[docs/development.md](./docs/development.md)** — Bun commands and doc policy
- **`docs/agents/`** — triage issues, domain glossary (`domain.md`), master tables (`master-tables.md`), database design (`database-design.md`)

**Master / shared tables:** unprefixed / family-prefixed tables in `apps/server/src/infra/db/schema/` (e.g. `persons`, `parties`, `locations`, `transactions`, `cat_*`, `pipelines`, `activities`, `ldg_*`, `inv_*`, `sch_*`, `wf_*`, `tax_*`). Compose-owned tables use compose prefixes (`crm_`, `erp_`, `eco_`, etc.). Orientation: [docs/agents/master-tables.md](./docs/agents/master-tables.md). Columns live in schema files.

---

## General instructions

The project already has a dev server running. **Never** run `dev` scripts from the repo root or any nested `package.json` unless the user explicitly asks you to run or verify the app.

---

## Planning mode

When running in Plan Mode or when asked to create a plan:

- Always create a new plan file under the given directory.
- File name: `./plans/<task-name>.<agent-name>.plan.md` (lowercase kebab-case).
- Include only: Goal, Assumptions, Steps, Risks / checks.
- Do not edit or follow up on the plan file after implementation unless explicitly asked.

---

## Architectural rules

Non-negotiable:

- **Core** — zero business logic, zero domain vocabulary, zero vendor deps
- **Module** — communicates via EventBus + CQRS Mediator only; never cross-module imports
- **Compose** — orchestration only; never import from another compose
- **Shell** (`apps/server`, `apps/web`) — zero feature logic; mounts composes only
- **Plugin** — never import from a module; never imported by a module; compose is the only meeting point
- **Persistence** — reuse master tables as much as possible; do not introduce new compose tables without justification. New columns are acceptable only with generic, cross-compose reusable names; prefer `meta` / `attributes` / `conditions` JSONB for compose-specific detail.

---

## Tooling

Use **Bun** — not Node.js, npm, or pnpm. See **[docs/development.md](./docs/development.md)** for repository commands.

---

## Conventions

Match existing package layout, imports, and route patterns in the tree you are changing. **Copy working neighbors** (same compose or same layer) instead of inferring from markdown.

---

## Agent skills

- Triage issues: `triage` skill; issues under `docs/agents/`.
- Domain glossary: `docs/agents/domain.md`.

---

## No tests. No app verification.

NEVER write tests unless explicitly asked ("write a test", "add test coverage").
NEVER run or verify the app unless explicitly asked ("run it", "verify this").
App is assumed running. Implement only.

---

## Core principle

**Code wins over docs.** Implement and inspect source; treat `docs/` as hints. If you change behavior, align docs only when they are meant to stay accurate for humans — never let stale docs override the implementation.
