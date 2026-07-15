---
description: ProjectX system prompt — applies to all AI agents working on this project.
alwaysApply: true
---

# ProjectX — Claude Code System Prompt

## Documentation

Start here before any task:

- **[docs/README.md](./docs/README.md)** — repository orientation
- **[docs/architecture.md](./docs/architecture.md)** — live package and runtime map
- **[docs/development.md](./docs/development.md)** — commands and documentation policy

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

Non-negotiable:

- **Core** — zero business logic, zero domain vocabulary, zero vendor deps
- **Module** — communicates via EventBus + CQRS Mediator only; never cross-module imports
- **Compose** — orchestration only; never import from another compose
- **Shell** (`apps/server`, `apps/web`) — zero feature logic; mounts composes only
- **Plugin** — never import from a module; never imported by a module; compose is the only meeting point

---

## Tooling

Use Bun — not Node.js, npm, or pnpm. See **[docs/development.md](./docs/development.md)** for repository commands.

---

## Conventions

Use the existing local package and route conventions; source code is canonical.

---

## Agent Skills

- Triage issues: use the `triage` skill. Issues and triage labels are tracked as local markdown under `docs/agents/`.
- Domain glossary (ubiquitous language): `docs/agents/domain.md`.

---

## No Tests. No App Verification.

NEVER write tests unless explicitly asked ("write a test", "add test coverage").
NEVER run or verify the app unless explicitly asked ("run it", "verify this").
App is assumed running. Implement only.

---

## Core principle

**Code wins over docs.** If code and docs conflict, update the documentation to reflect the implementation.
