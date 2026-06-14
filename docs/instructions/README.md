# AI Agent Instructions

Start here if you are an AI agent beginning work on ProjectX.

---

## Step 1 — Mandatory reads (every task)

Read these before writing any code:

1. [docs/ARCHITECTURE.md](../ARCHITECTURE.md) — Three-layer overview, dependency direction, module & compose catalog
2. [docs/conventions.md](../conventions.md) — Naming rules for everything (dirs, files, routes, exports, DB tables)
3. [docs/instructions/architectural-rules.md](./architectural-rules.md) — Non-negotiable rules per layer

---

## Step 2 — Task-specific reads

| Task type | Read additionally |
|---|---|
| Core work (primitives, infra) | [docs/core.md](../core.md) |
| Module work (new entity/command/event) | [docs/module.md](../module.md) |
| Compose work | [docs/compose.md](../compose.md) |
| Package setup, workspaces, Turborepo | [docs/monorepo.md](../monorepo.md) |
| Server setup (Elysia, DB, middleware) | [docs/setup/server.md](../setup/server.md) |
| Web setup (React, TanStack Router, auth) | [docs/setup/web.md](../setup/web.md) |
| UI work | [docs/design-system.md](../design-system.md) |
| Plugin work (auth, logging, security, storage, notification) | [docs/plugins/README.md](../plugins/README.md) |
| Building a new plugin | [docs/plugins/development.md](../plugins/development.md) |
| Choosing modules for a compose | [docs/composes/index.md](../composes/index.md) |
| Compose-specific detail | `docs/composes/{name}.md` |
| Dev commands, Bun, TypeDoc | [docs/instructions/tooling.md](./tooling.md) |

---

## Step 3 — Check available skills

Before implementing, check [docs/skills/README.md](../skills/README.md) for relevant skills.

Key skills for common tasks:
- `compose-spec` — design a feature before coding
- `compose-todo` — break a spec into implementation steps
- `elysiajs` — Elysia server patterns and integrations
- `ui-styling` — shadcn/ui, Tailwind patterns
- `turborepo` — monorepo build configuration

---

## Step 4 — Write a plan if needed

Write a plan before starting non-trivial work:
```
plans/{task-slug}.<your-agent-name>.plan.md
```
Example: `plans/add-crm-compose.claude.plan.md`

See [plans/README.md](../../plans/README.md) for format and rules. See `plans/baseline/` for the Wave roadmap.

---

## Full reading order reference

→ [docs/instructions/for-agents.md](./for-agents.md) — complete table with all docs and shell integration contract

---

## Core principle

When code and docs conflict → **docs are the target**. Code is transitional.
