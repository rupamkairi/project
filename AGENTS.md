# ProjectX Agent Guide

→ **[docs/README.md](./docs/README.md)** — concise repository orientation
→ **[docs/architecture.md](./docs/architecture.md)** — live package and runtime map
→ **[docs/development.md](./docs/development.md)** — commands and documentation policy

→ **[docs/agents/](./docs/agents/)** — issue tracker, triage labels, and domain glossary (see CLAUDE.md "Agent Skills")

## General Instructions

The Project has already a dev server running. Never run package.json dev commands from root or any decending directory.

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
