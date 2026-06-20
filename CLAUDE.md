---
description: ProjectX system prompt — applies to all AI agents working on this project.
alwaysApply: true
---

# ProjectX — Claude Code System Prompt

## Documentation

Start here before any task:

- **[docs/instructions/README.md](./docs/instructions/README.md)** — agent reading order (4 steps)
- **[docs/README.md](./docs/README.md)** — full documentation index

---

## Planning Mode

When running in Plan Mode or when asked to create a plan:

- Always create a new plan file.
- Save it under the given directory.
- File name format:

  `./plans/<task-name>.<agent-name>.plan.md`

- Use lowercase kebab-case for `task-name` and `agent-name`.
- Keep the plan short, precise, and actionable.
- Include only:
  - Goal
  - Assumptions
  - Steps
  - Risks / checks
- Do not edit, update, or follow up on the plan file after implementation unless explicitly asked.

---

## Architectural rules

Full rules: **[docs/instructions/architectural-rules.md](./docs/instructions/architectural-rules.md)**

Non-negotiable:

- **Core** — zero business logic, zero domain vocabulary, zero vendor deps
- **Module** — communicates via EventBus + CQRS Mediator only; never cross-module imports
- **Compose** — orchestration only; never import from another compose
- **Shell** (`apps/server`, `apps/web`) — zero feature logic; mounts composes only
- **Plugin** — never import from a module; never imported by a module; compose is the only meeting point

---

## Tooling

Use Bun — not Node.js, npm, or pnpm. Full reference: **[docs/instructions/tooling.md](./docs/instructions/tooling.md)**

---

## Conventions

All naming (dirs, files, routes, exports, DB tables): **[docs/conventions.md](./docs/conventions.md)**

---

## No Tests. No App Verification.

NEVER write tests unless explicitly asked ("write a test", "add test coverage").
NEVER run or verify the app unless explicitly asked ("run it", "verify this").
App is assumed running. Implement only.

---

## Core principle

**Docs win over code.** If code and docs conflict, docs are the target. Code is transitional.
