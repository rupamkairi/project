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
5. **docs/monorepo-architecture.md** - Contains detailed monorepo structure, workspaces, and TypeScript config patterns

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

## Shell-Only Pattern

The **apps/server** and **apps/web** are pure shells that must NOT contain feature logic.

### apps/server Shell Responsibilities

- Boot core infra (DB, Redis, Queue, WebSocket gateway)
- Register compose plugins via `.use()`
- Expose `/health`, `/core`, `/schemas`, `/modules` endpoints
- Export the `App` type for compose web apps that need it directly
- **NEVER** import modules directly or define routes in the shell

### apps/web Shell Responsibilities

- Render the root layout
- Register compose route trees via `rootRoute.addChildren()`
- Provide global providers (QueryClient, auth session context)
- **NEVER** define feature-specific routes or screens in the shell

### Compose Integration Contract

**Server side** — a compose MUST export a named Elysia plugin:

```typescript
// composes/{name}/server/src/index.ts
import { Elysia } from "elysia";

export const {name}Compose = new Elysia({ prefix: "/{name}" })
  .use(authRoutes)
  .use(userRoutes);

export type {Name}App = typeof {name}Compose;
```

**Web side** — a compose MUST export a named route array:

```typescript
// composes/{name}/web/src/routes/index.ts
export const {name}Routes = [
  loginRoute,
  usersRoute,
  dashboardRoute,
];
```

**apps/server** registers it:

```typescript
// apps/server/src/index.ts
import { platformCompose } from "@projectx/platform-server";

const app = new Elysia().use(platformCompose).listen(3000);
```

**apps/web** registers it:

```typescript
// apps/web/src/router.ts
import { platformRoutes } from "@projectx/platform-web";

const routeTree = rootRoute.addChildren([...platformRoutes, indexRoute]);
```

## Monorepo Structure

```
/
├── apps/
│   ├── server/         ← Elysia HTTP server shell
│   └── web/            ← React (Vite) web shell
├── composes/
│   └── {name}/       ← Full-stack feature package
│       ├── server/     ← Elysia plugin exported for apps/server
│       │   ├── src/
│       │   │   ├── routes/       ← Route definitions
│       │   │   ├── db/schema/    ← Compose-specific schema
│       │   │   ├── db/seed/      ← Compose seed data
│       │   │   └── index.ts      ← exports named Elysia plugin
│       │   └── package.json
│       └── web/        ← Route tree exported for apps/web
│           ├── src/
│           │   ├── routes/       ← Route components
│           │   ├── components/   ← Compose-specific UI
│           │   ├── lib/api.ts    ← Eden Treaty client
│           │   └── index.ts      ← exports route array
│           └── package.json
├── packages/           ← Shared packages (config, etc.)
└── turbo.json
```

### Path Aliases

**apps/server/tsconfig.json:**

```json
{
  "paths": {
    "@core/*": ["./src/core/*"],
    "@modules/*": ["./src/modules/*"],
    "@infra/*": ["./src/infra/*"],
    "@db/*": ["./src/infra/db/*"]
  }
}
```

**composes/{name}/server/tsconfig.json:**

```json
{
  "paths": {
    "@core/*": ["../../../apps/server/src/core/*"],
    "@modules/*": ["../../../apps/server/src/modules/*"],
    "@infra/*": ["../../../apps/server/src/infra/*"],
    "@db/*": ["../../../apps/server/src/infra/db/*"]
  }
}
```

### Dependency Direction

```
composes/{name}/web  →  composes/{name}/server   (Eden Treaty types)
composes/{name}/web  →  apps/server              (optional — combined App type)
apps/server           →  composes/{name}/server    (Elysia plugin)
apps/web              →  composes/{name}/web       (route tree)
apps/web              →  apps/server               (optional — combined App type)
```

No compose ever imports from another compose. No compose imports from `apps/`.

## Workspace Configuration

The root `package.json` must include composes in workspaces:

```json
{
  "workspaces": ["apps/*", "composes/*/server", "composes/*/web", "packages/*"]
}
```

Each compose package should have proper exports in its `package.json`:

```json
// composes/platform/server/package.json
{
  "name": "@projectx/platform-server",
  "exports": {
    ".": "./src/index.ts",
    "./db/schema/platform": "./src/db/schema/platform.ts",
    "./db/seed/platform": "./src/db/seed/platform.ts"
  }
}
```

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
