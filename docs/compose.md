# Compose — Standards and Integration Contract

A **Compose** is the application layer that turns reusable Modules into a real product.

---

## What a Compose is

A Compose:
- Selects which modules are active
- Defines the application identity, roles, permissions, settings, and route base
- Owns application-specific aggregates that do not belong in a reusable module
- Wires modules together through hooks, rules, jobs, views, and navigation
- Defines how the application plugs into server and web shells

A Compose is **not**:
- Core infrastructure
- A reusable bounded module
- A place for vendor SDK code
- Shared code that belongs in Core, a module, or `packages/ui`
- A second host application

---

## Layer boundaries

### Belongs in a Compose

Anything tied to one specific application type:

- Application-specific aggregates: `Course`, `Enrollment` (LMS) / `Order`, `Cart` (Ecommerce) / `Project`, `Milestone` (PM)
- Role definitions and permission matrices for this application
- Navigation structure, dashboard shells, widget catalog
- Notification templates specific to this application
- Orchestration: "when enrollment activates → create progress, post ledger, notify learner"
- Compose-scoped settings, feature flags, saved views

### Belongs in a Module

Anything reusable across multiple application types:

- Identity and access management
- Workflow engine behavior
- Generic notifications
- Documents and files
- Scheduling primitives
- Analytics capture
- Ledger primitives

### Promote to Module when

Move something out of a Compose and into a Module when it becomes:
- Reusable in two or more Composes
- A bounded capability with its own stable commands, queries, and events
- Independent of one application's route structure and UX

---

## Directory structure

```
composes/
└── {name}/
    ├── server/
    │   ├── src/
    │   │   ├── routes/       ← Elysia route definitions (plural resource files)
    │   │   ├── hooks/        ← Module wiring (event → command bridges)
    │   │   ├── permissions/  ← Role + permission matrix
    │   │   ├── db/
    │   │   │   ├── schema/   ← Compose-owned Drizzle tables
    │   │   │   └── seed/     ← Roles, templates, defaults
    │   │   └── index.ts      ← exports {name}Compose + {Name}App
    │   ├── package.json
    │   └── tsconfig.json
    └── web/
        ├── src/
        │   ├── routes/       ← Route components + index.ts exports {name}Routes
        │   ├── components/   ← Compose-specific UI components
        │   ├── hooks/        ← Compose-specific React hooks
        │   ├── stores/       ← Zustand stores
        │   └── lib/
        │       └── api.ts    ← Eden Treaty client typed to {Name}App
        ├── package.json
        └── tsconfig.json
```

---

## Server integration contract

Every compose server **must** export:

```typescript
// composes/{name}/server/src/index.ts
import { Elysia } from "elysia";

export const {name}Compose = new Elysia({ prefix: "/{name}" })
  .use(authRoutes)
  .use(usersRoutes)

export type {Name}App = typeof {name}Compose
```

Register in `apps/server/src/index.ts`:

```typescript
import { {name}Compose } from "@projectx/{name}-server";

const app = new Elysia()
  .use(platformCompose)
  .use({name}Compose)      // ← add here
  .listen(3000);

export type App = typeof app;
```

---

## Web integration contract

Every compose web **must** export:

```typescript
// composes/{name}/web/src/routes/index.ts
export const {name}Routes = [loginRoute, dashboardRoute, ...]

// composes/{name}/web/src/manifest.ts
import type { ComposeManifest } from "@projectx/shared-router";

export const {name}Manifest: ComposeManifest = {
  id: "{name}",
  label: "Display Name",
  icon: SomeIcon,
  prefix: "/{name}",
  navItems: [
    { label: "Section", path: "/{name}/section", icon: SomeIcon },
    {
      label: "Sub-section",
      path: "/{name}/sub",
      icon: SomeIcon,
      children: [
        { label: "Detail", path: "/{name}/sub/detail" },
      ],
    },
  ],
  version: "1.0.0",
  description: "Optional — shown in app switcher or admin panel",
}
```

### `ComposeManifest` type

Exported from `@projectx/shared-router`. **Target contract — not yet implemented in packages/router.**

```typescript
export interface ComposeManifest {
  id: string;                  // unique compose key: "platform", "crm", "erp"
  label: string;               // display name: "Platform Admin", "CRM"
  icon: ComponentType;         // icon component for nav + app switcher
  prefix: string;              // route prefix: "/platform", "/crm"
  navItems: Array<{
    label: string;
    path: string;
    icon: ComponentType;
    children?: Array<{
      label: string;
      path: string;
      icon?: ComponentType;
    }>;
  }>;
  version?: string;            // semver — shown in admin/debug views
  description?: string;        // shown in app switcher tooltip
}
```

### Compose registry

`apps/web` collects all manifests and renders the sidebar dynamically. No hardcoded nav in the shell:

```typescript
// apps/web/src/lib/compose-registry.ts
import type { ComposeManifest } from "@projectx/shared-router";

export const composeRegistry: ComposeManifest[] = [];
```

```typescript
// apps/web/src/router.tsx
import { {name}Routes, {name}Manifest } from "@projectx/{name}-web";

const routeTree = sharedRootRoute.addChildren([...platformRoutes, ...{name}Routes]);
composeRegistry.push({name}Manifest);
```

The shell sidebar reads `composeRegistry` to build navigation. Adding a new compose updates nav without touching shell components.

---

## Eden Treaty (API client)

**Scoped client** — for calls within the compose's own routes:

```typescript
// composes/{name}/web/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { {Name}App } from "@projectx/{name}-server";

export const {name}Api = treaty<{Name}App>(import.meta.env.VITE_API_URL);
```

**Combined client** — for shell-level or cross-compose calls only:

```typescript
// apps/web/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { App } from "@projectx/server";

export const api = treaty<App>(import.meta.env.VITE_API_URL);
```

When a compose web needs another compose's API — import the combined client from `apps/web`, never from the other compose directly.

---

## Dependency direction

```
composes/{name}/web   →  composes/{name}/server    (scoped Eden Treaty types)
composes/{name}/web   →  apps/server               (combined App type — cross-compose only)
apps/server           →  composes/{name}/server    (Elysia plugin)
apps/web              →  composes/{name}/web       (route tree + manifest)
apps/web              →  apps/server               (combined App type)
```

No compose ever imports from another compose. No compose imports from `apps/`.

---

## Worker integration

If a compose has background jobs, export a `register{Name}Workers` function:

```typescript
// composes/{name}/server/src/index.ts
export function register{Name}Workers(queue: QueueClient) {
  queue.process('{name}.job-name', jobHandler)
}
```

Register in `apps/server/src/worker.ts`:

```typescript
import { register{Name}Workers } from "@projectx/{name}-server";
register{Name}Workers(queue);
```

---

## Multi-compose routing

Each compose owns a **unique route prefix**. No two composes share a prefix.

Web routes use layout nesting:

```typescript
const {name}Layout = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/{name}",          // ← unique prefix
  component: {Name}Layout,
});
```

`apps/web` collects all manifests into a registry and renders the sidebar dynamically. No hardcoded nav links in the shell.

---

## Shared runtime data

Mutable compose data must distinguish scope:

| Key | Scope |
|-----|-------|
| `compose_id` | compose-level settings and defaults |
| `organization_id` | tenant-level overrides |
| `actor_id` | user-specific customizations |

---

## Pre-implementation checklist

Before building a new compose, document:

- [ ] Purpose and app surfaces
- [ ] Selected modules
- [ ] Actor roles and permission matrix
- [ ] Compose-owned aggregates (entities that don't belong in a module)
- [ ] Core hooks and rules (cross-module wiring)
- [ ] Server surface (routes, jobs, seeds)
- [ ] Web surface (routes, nav items, dashboard shells)
- [ ] DB prefix (3 lowercase letters)
- [ ] Integration defaults and gotchas

Doc location: `docs/composes/{name}.md`

---

## New compose — full checklist

```
SERVER
  1. Create composes/{name}/server/
  2. Define DB prefix (3 letters, unique)
  3. Create compose-owned schema tables
  4. Implement routes in routes/ (plural resource files)
  5. Export {name}Compose (Elysia plugin) and {Name}App (type)
  6. Export register{Name}Workers() if compose has background jobs
  7. Add to apps/server/src/index.ts via .use({name}Compose)
  8. Add to apps/server/src/worker.ts if workers exist
  9. Add @projectx/{name}-server to apps/server/package.json

WEB
  10. Create composes/{name}/web/
  11. Define unique route prefix /{name}
  12. Create routes, export as {name}Routes array
  13. Create and export {name}Manifest (ComposeManifest)
  14. Set up scoped Eden Treaty client typed to {Name}App
  15. Add to apps/web/src/router.tsx
  16. Add to apps/web/src/lib/compose-registry.ts
  17. Add @projectx/{name}-web to apps/web/package.json
  18. Add @source line to apps/web/src/globals.css:
        @source "../../../composes/{name}/web/src";
      Missing this → all Tailwind classes in the compose produce no CSS.
      See: docs/gotchas/package-ui-gotchas.md
```
