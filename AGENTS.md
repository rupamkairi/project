# ProjectX Agent Guide

→ **[docs/instructions/README.md](./docs/instructions/README.md)** — Agent reading order and orientation  
→ **[docs/README.md](./docs/README.md)** — Full documentation index  
→ **[docs/instructions/for-agents.md](./docs/instructions/for-agents.md)** — Complete reading order table + shell integration contract  
→ **[docs/instructions/architectural-rules.md](./docs/instructions/architectural-rules.md)** — Non-negotiable rules

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
