# ProjectX Agent Guide

## Purpose

ProjectX is being shaped as a **compose-first application factory** for dashboard-style products. The architecture target is:

- **Core** for primitives and runtime machinery
- **Module** for reusable bounded capabilities
- **Compose** for application-specific orchestration
- **Host apps** as thin shells that mount one active Compose

At this stage, architecture and standards docs are ahead of the code. Do not assume the current code structure is the final intended architecture.

## Read This First

Before making architecture, compose, server, or web decisions, read these documents in order:

1. [docs/architecture/master-architecture.md](/Users/rupamkairi/Projects/projectx/project/docs/architecture/master-architecture.md)
2. [docs/architecture/core.md](/Users/rupamkairi/Projects/projectx/project/docs/architecture/core.md)
3. [docs/architecture/module.md](/Users/rupamkairi/Projects/projectx/project/docs/architecture/module.md)
4. [docs/architecture/compose-standards.md](/Users/rupamkairi/Projects/projectx/project/docs/architecture/compose-standards.md)

Then read the compose-specific references relevant to the task:

- [docs/architecture/compose-lms.md](/Users/rupamkairi/Projects/projectx/project/docs/architecture/compose-lms.md)
- [docs/web/lms/composing-server.md](/Users/rupamkairi/Projects/projectx/project/docs/web/lms/composing-server.md)
- [docs/web/lms/composing-web.md](/Users/rupamkairi/Projects/projectx/project/docs/web/lms/composing-web.md)
- [docs/web/lms/lms-frontend.md](/Users/rupamkairi/Projects/projectx/project/docs/web/lms/lms-frontend.md)

## Architectural Rules

### Core

- Keep Core free of business-specific vocabulary.
- Core owns primitives, contracts, registries, bus/mediator/scheduler, rules, FSMs, and adapter interfaces.

### Module

- Modules are reusable bounded contexts.
- Modules own their own entities, commands, queries, events, and FSMs.
- Modules communicate only through public commands, queries, and events.
- Never import another module's internals or access another module's persistence directly.

### Compose

- Compose is orchestration only.
- Compose selects Modules, defines roles/permissions/settings, owns application-specific aggregates, and wires cross-module behavior through hooks and rules.
- Compose may call Modules only through public interfaces.
- If a concept becomes reusable across multiple Composes, it should stop living in the Compose and move into a Module or shared package.

### Host Apps

- The host server and host web apps should stay thin.
- Avoid hardcoding compose-specific routes, screens, or business orchestration into app entrypoints.
- Current hardcoded patterns in the repo are transitional references, not the target standard.

## Documentation Rules

- For architecture work, update docs before or alongside code.
- For standards work, do docs only unless the task explicitly asks for implementation.
- New Compose docs belong in `docs/architecture/compose-<id>.md`.
- Compose web docs belong in `docs/web/<id>/`.
- If a change affects architectural boundaries, update [compose-standards.md](/Users/rupamkairi/Projects/projectx/project/docs/architecture/compose-standards.md).

## Current Project Defaults

- One active Compose per deployment/workspace.
- Dashboard/admin-first on the web.
- Compose-scoped shared things stay inside the Compose.
- Cross-compose shared things belong in Core, Modules, or shared UI.
- Runtime-configurable compose data should distinguish `compose_id`, `organization_id`, and `actor_id`.

## Current Repo Reality

Use the current codebase as context, but not as the standard:

- LMS in `apps/web` is a useful compose reference, but much of it is still hardcoded and mock-data-driven.
- Ecommerce in `apps/server` is a useful server compose reference, but it is still embedded in the current app shell.
- When code and docs disagree on architecture, prefer the docs unless the user explicitly asks to follow current code.

## Compose Work Guidance

When asked to design or implement a new Compose:

- identify what belongs in Core, Module, Compose, and host shell
- document role model, aggregates, hooks, rules, routes, and shared storage
- keep server and web plug points compose-scoped
- avoid leaking one Compose's UI or domain contracts into another

## Frontend Guidance

For frontend work, check the repo-local skills when relevant:

- `.agents/skills/vercel-react-best-practices`
- `.agents/skills/web-design-guidelines`
- `.agents/skills/building-components`
- `.agents/skills/workflow`

Use them only when the task matches their scope.

## Non-Negotiable Gotchas

- Do not put reusable domain logic in a Compose.
- Do not put compose-specific naming in Core.
- Do not let the host app become the place where business orchestration lives.
- Do not treat mock data or temporary route wiring as canonical architecture.
- Do not change code on documentation-only tasks unless explicitly asked.
