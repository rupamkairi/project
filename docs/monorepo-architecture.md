# Monorepo Architecture

This project is a monorepo managed by [Turborepo](https://turbo.build/repo).
Runtime: **Bun**. Architecture: **Core → Module → Compose**.

---

## Directory Structure

```
/
├── apps/
│   ├── server/         ← Elysia HTTP server shell
│   └── web/            ← React (Vite) web shell
├── composes/
│   └── platform/       ← Example compose (Auth + Notifications)
│       ├── server/     ← Elysia plugin exported for apps/server
│       └── web/        ← Route tree exported for apps/web
├── docs/
├── packages/
│   ├── config/         ← TypeScript, ESLint, Prettier configs
│   └── router/         ← Shared TanStack Router root route
└── turbo.json
```

---

## Architectural Layers

```
COMPOSE  (Layer 3) → Named, deployable application unit
MODULE   (Layer 2) → Bounded domain: entities, commands, events, FSMs
CORE     (Layer 1) → Primitives: Entity, Event, State, Rule, Bus
INFRA    (Layer 0) → DB, Queue, Cache, Storage, Transport
```

All layers live inside `apps/server`. Composes sit outside `apps/` as independent
full-stack packages that are imported and registered into the shell applications.

---

## 1. `apps/`

### `apps/server/`

The main Elysia server. It is a **pure shell** — it owns no feature logic.

Its only responsibilities:

- Boot core infra (DB, Redis, Queue, WebSocket gateway)
- Register compose plugins via `.use()`
- Expose `/health`, `/core`, `/schemas`, `/modules` endpoints
- Export the `App` type for compose web apps that need it directly

```
apps/server/src/
├── core/
│   ├── context/
│   ├── cqrs/
│   ├── entity/
│   ├── errors/
│   ├── event/
│   ├── module/
│   ├── primitives/
│   ├── queue/
│   ├── realtime/
│   ├── repository/
│   ├── rule/
│   └── state/
├── infra/
│   ├── cache/
│   ├── db/
│   ├── queue/
│   ├── realtime/
│   └── env.ts
├── modules/
│   ├── analytics/
│   ├── catalog/
│   ├── document/
│   ├── geo/
│   ├── identity/
│   ├── inventory/
│   ├── ledger/
│   ├── notification/
│   ├── scheduling/
│   └── workflow/
├── index.ts     ← HTTP server entry
└── worker.ts    ← Background queue worker entry
```

**Layer boundary rules (never violate):**

```
core/      → imports nothing from modules/, composes/, or infra/ (except type contracts)
modules/   → imports from core/ and infra/ only. Never from another module's internals.
infra/     → implements core/ interfaces. Imports from core/ only.
composes/  → imports from modules/ and core/ only. Never cross-compose imports.
```

### `apps/web/`

The main React application. It is a **pure shell** — it owns no feature logic.

Its only responsibilities:

- Render the root layout
- Register compose route trees via `rootRoute.addChildren()`
- Provide global providers (QueryClient, auth session context)

```
apps/web/src/
├── components/    ← Shell UI only (nav, sidebar, layout wrappers)
├── hooks/         ← Shell hooks (auth session, theme)
├── lib/           ← API client setup, utils
├── routes/
│   ├── __root.tsx ← Root layout
│   └── index.tsx  ← Entry redirect
├── main.tsx
└── router.ts      ← Registers all compose route trees
```

---

## 2. `composes/`

Each compose is a **full-stack feature package**. It is the Layer 3 application unit
of the Core → Module → Compose architecture.

A compose:

- Selects and wires the modules it needs
- Declares its own roles, permissions, API surface, and notification templates
- Exports a server plugin and a web route tree for registration into the shell apps
- Never contains logic that belongs inside a single module
- Never imports from another compose

### Compose Structure

```
composes/
└── {name}/
    ├── server/
    │   ├── src/
    │   │   ├── hooks/        ← Module wiring (event → command bridges)
    │   │   ├── routes/       ← Elysia route definitions
    │   │   ├── permissions/  ← Role + permission matrix for this compose
    │   │   ├── seed/         ← Compose-level seed data (roles, templates)
    │   │   └── index.ts      ← exports named Elysia plugin
    │   ├── package.json
    │   └── tsconfig.json
    └── web/
        ├── src/
        │   ├── components/   ← Compose-specific UI components
        │   ├── hooks/        ← Compose-specific React hooks
        │   ├── lib/
        │   │   └── api.ts    ← Eden Treaty client (imports from ../server)
        │   └── routes/       ← Route components
        │       └── index.ts  ← exports named route array
        ├── package.json
        └── tsconfig.json
```

### Integration Contract

**Server side** — a compose exports a named Elysia plugin:

```typescript
// composes/platform/server/src/index.ts
import { Elysia } from "elysia";

export const platformCompose = new Elysia({ prefix: "/platform" })
  .use(authRoutes)
  .use(userRoutes)
  .use(notificationRoutes);

export type PlatformApp = typeof platformCompose;
```

`apps/server` registers it:

```typescript
// apps/server/src/index.ts
import { platformCompose } from "@repo/platform-server";

const app = new Elysia().use(platformCompose).listen(3000);

export type App = typeof app;
```

**Web side** — a compose exports a named route array:

```typescript
// composes/platform/web/src/routes/index.ts
export const platformRoutes = [
  loginRoute,
  usersRoute,
  notificationTemplatesRoute,
];
```

`apps/web` registers it:

```typescript
// apps/web/src/router.ts
import { platformRoutes } from "@repo/platform-web";

const routeTree = rootRoute.addChildren([...platformRoutes, indexRoute]);
```

**Eden Treaty** — each compose web imports its type from its own compose server,
not from `apps/server`:

```typescript
// composes/platform/web/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { PlatformApp } from "@repo/platform-server";

export const api = treaty<PlatformApp>("http://localhost:3000");
```

`apps/web` may import the root `App` type from `apps/server` if it needs a
combined client that spans all registered composes.

### Dependency Direction

```
composes/platform/web  →  composes/platform/server   (Eden Treaty types)
composes/platform/web  →  apps/server                (optional — combined App type)
apps/server            →  composes/platform/server   (Elysia plugin)
apps/web               →  composes/platform/web      (route tree)
apps/web               →  apps/server                (optional — combined App type)
```

No compose ever imports from another compose. No compose imports from `apps/`.

---

## 3. `packages/`

```
packages/
  config/      ← TypeScript configs, ESLint configs, Prettier config
  router/      ← Shared TanStack Router root route (sharedRootRoute)
```

`ui/` is intentionally excluded. All component decisions stay inside each compose's
own `web/` package.

---

### `packages/config`

The single source of truth for all tooling configuration across the monorepo.
Every app, compose, and package extends from here — never from the root or from
each other.

```
packages/config/
├── tsconfig/
│   ├── base.json      ← shared compiler options, no environment assumptions
│   ├── server.json    ← extends base — Bun runtime, no DOM
│   ├── web.json       ← extends base — React/Vite, DOM, JSX, no emit
│   └── lib.json       ← extends base — for packages/* themselves, emits declarations
├── eslint/
│   ├── base.js        ← TS rules shared by all environments
│   ├── server.js      ← extends base — Bun/server rules
│   └── react.js       ← extends base — React + hooks rules
├── prettier.config.js ← single Prettier config, imported by all
└── package.json
```

#### TypeScript Configs

**`tsconfig/base.json`** — strict settings shared by everything. No environment assumptions.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "sourceMap": true,
    "declarationMap": true
  }
}
```

**`tsconfig/server.json`** — Bun runtime. No DOM. Path aliases are NOT declared here —
they are specific to each app or compose and declared locally.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ESNext"],
    "types": ["bun-types"],
    "noEmit": false,
    "outDir": "dist",
    "declaration": true
  }
}
```

**`tsconfig/web.json`** — Vite + React. DOM included. No emit — Vite handles transpilation.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "jsx": "react-jsx",
    "useDefineForClassFields": true,
    "noEmit": true
  }
}
```

**`tsconfig/lib.json`** — for `packages/*` themselves. Emits declarations so consumers
get types. No DOM, no Bun-specific types.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ESNext"],
    "noEmit": false,
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true
  }
}
```

#### How Each Consumer Extends

| Consumer            | Extends                        | Adds                                           |
| ------------------- | ------------------------------ | ---------------------------------------------- |
| `apps/server`       | `@repo/config/tsconfig/server` | `paths` aliases to its own `src/`              |
| `apps/web`          | `@repo/config/tsconfig/web`    | nothing                                        |
| `composes/*/server` | `@repo/config/tsconfig/server` | `paths` aliases pointing to `apps/server/src/` |
| `composes/*/web`    | `@repo/config/tsconfig/web`    | nothing                                        |
| `packages/config`   | `@repo/config/tsconfig/lib`    | nothing                                        |

**`apps/server/tsconfig.json`:**

```json
{
  "extends": "@repo/config/tsconfig/server",
  "compilerOptions": {
    "paths": {
      "@core/*": ["./src/core/*"],
      "@modules/*": ["./src/modules/*"],
      "@infra/*": ["./src/infra/*"],
      "@db/*": ["./src/infra/db/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**`apps/web/tsconfig.json`:**

```json
{
  "extends": "@repo/config/tsconfig/web",
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**`composes/{name}/server/tsconfig.json`:**

```json
{
  "extends": "@repo/config/tsconfig/server",
  "compilerOptions": {
    "paths": {
      "@core/*": ["../../../apps/server/src/core/*"],
      "@modules/*": ["../../../apps/server/src/modules/*"],
      "@infra/*": ["../../../apps/server/src/infra/*"],
      "@db/*": ["../../../apps/server/src/infra/db/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**`composes/{name}/web/tsconfig.json`:**

```json
{
  "extends": "@repo/config/tsconfig/web",
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

#### ESLint Configs

Uses flat config format (`eslint.config.js`). Three presets.

**`eslint/base.js`** — TypeScript rules shared by all environments:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
);
```

**`eslint/server.js`** — relaxes `no-console` (servers log by design):

```js
import { base } from "./base.js";

export const server = [
  ...base,
  {
    rules: {
      "no-console": "off",
    },
  },
];
```

**`eslint/react.js`** — adds React and hooks rules:

```js
import { base } from "./base.js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export const react = [
  ...base,
  reactPlugin.configs.flat.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
];
```

Each app and compose has its own `eslint.config.js` that imports the right preset:

```js
// apps/server/eslint.config.js
import { server } from '@repo/config/eslint/server'
export default server

// apps/web/eslint.config.js  |  composes/*/web/eslint.config.js
import { react } from '@repo/config/eslint/react'
export default react

// composes/*/server/eslint.config.js
import { server } from '@repo/config/eslint/server'
export default server
```

#### Prettier Config

Single config, used everywhere. Each app/compose adds a `prettier.config.js`
that simply re-exports it:

```js
// packages/config/prettier.config.js
export default {
  semi: false,
  singleQuote: true,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
};
```

```js
// apps/server/prettier.config.js  — and every other app/compose
export { default } from "@repo/config/prettier.config.js";
```

#### `packages/config/package.json`

```json
{
  "name": "@repo/config",
  "private": true,
  "type": "module",
  "exports": {
    "./tsconfig/base": "./tsconfig/base.json",
    "./tsconfig/server": "./tsconfig/server.json",
    "./tsconfig/web": "./tsconfig/web.json",
    "./tsconfig/lib": "./tsconfig/lib.json",
    "./eslint/base": "./eslint/base.js",
    "./eslint/server": "./eslint/server.js",
    "./eslint/react": "./eslint/react.js",
    "./prettier.config.js": "./prettier.config.js"
  },
  "devDependencies": {
    "@eslint/js": "latest",
    "typescript-eslint": "latest",
    "eslint-plugin-react": "latest",
    "eslint-plugin-react-hooks": "latest",
    "typescript": "latest"
  }
}
```

`packages/config` has no `build` step — it ships raw `.json` and `.js` files directly.

---

### `packages/router`

The shared router package solves a critical TanStack Router limitation: **only one `createRootRoute()` can exist per application**. When multiple packages (host app and composes) each try to create their own root route, route ID collisions occur.

The solution is a single shared root route that all packages use:

```
packages/router/
├── src/
│   ├── routes/
│   │   ├── __root.tsx      ← Creates sharedRootRoute via createRootRoute()
│   │   ├── root.layout.tsx  ← The shared app shell layout component
│   │   └── index.ts         ← Exports sharedRootRoute
│   └── index.ts             ← Re-exports from ./routes
└── package.json
```

#### Usage

**Host app** (`apps/web/src/router.ts`):

```typescript
import { sharedRootRoute } from "@projectx/shared-router";
import { platformRoutes } from "@projectx/platform-web";

const routeTree = sharedRootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  ...platformRoutes,
]);

export const router = createRouter({ routeTree });
```

**Compose routes** use `sharedRootRoute` as their parent:

```typescript
import { sharedRootRoute } from "@projectx/shared-router";

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/dashboard",
  component: DashboardLayout,
});
```

#### Why This Pattern?

1. **Single root**: TanStack Router requires exactly one root route
2. **Composable**: Composes can export routes that plug into the shared tree
3. **Shared layout**: The `root.layout.tsx` provides the app shell (header, navigation)
4. **No conflicts**: All packages reference the same `sharedRootRoute`

---

## 4. `turbo.json`

Defines task dependency graph so Turborepo builds in the correct order:

```
composes/*/server  →  builds first
composes/*/web     →  builds after its own server (needs type export)
apps/server        →  builds after all compose servers
apps/web           →  builds after apps/server and all compose webs
```

---

## Shell Rule

> `apps/server` and `apps/web` own **zero feature logic**.
> All features live inside `composes/`. The apps are registration surfaces only.

---

## Multi-Compose Architecture

When more than one compose is active, four problems must be solved explicitly:
route collisions, sidebar navigation, Eden Treaty across composes, and worker
registration. This section defines the conventions that solve each one.

---

### Structure with Multiple Composes

```
composes/
├── platform/       ← Auth, Users, Notifications
│   ├── server/
│   └── web/
├── crm/            ← Contacts, Pipelines, Deals
│   ├── server/
│   └── web/
└── erp/            ← Inventory, Ledger, Procurement
    ├── server/
    └── web/
```

---

### Problem 1 — Route Collisions (Web)

**Rule: every compose owns a unique route prefix and exports a layout route at that prefix.**

Each compose web defines a layout route as the parent of all its routes:

```typescript
// composes/crm/web/src/routes/index.ts
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@repo/web/root"; // imported from apps/web shell

const crmLayout = createRoute({
  getParentRoute: () => rootRoute,
  path: "/crm", // ← compose owns this prefix
  component: CrmLayout,
});

const contactsRoute = createRoute({
  getParentRoute: () => crmLayout,
  path: "/contacts",
});
const pipelinesRoute = createRoute({
  getParentRoute: () => crmLayout,
  path: "/pipelines",
});

export const crmRoutes = crmLayout.addChildren([contactsRoute, pipelinesRoute]);
```

`apps/web` registers each compose's layout route as a child of root:

```typescript
// apps/web/src/router.ts
import { platformRoutes } from "@repo/platform-web";
import { crmRoutes } from "@repo/crm-web";
import { erpRoutes } from "@repo/erp-web";

const routeTree = rootRoute.addChildren([
  platformRoutes, // owns /platform/*
  crmRoutes, // owns /crm/*
  erpRoutes, // owns /erp/*
  indexRoute,
]);
```

Prefix ownership is declared in each compose and never shared. Collision is
impossible by convention.

---

### Problem 2 — Sidebar Navigation (Web)

**Rule: every compose web exports a manifest alongside its route tree.**

The manifest describes the compose's identity and nav items. `apps/web` collects
all manifests to render the sidebar — it never hardcodes nav links.

```typescript
// Manifest type — lives in apps/web/src/types/compose.ts
export interface ComposeManifest {
  id: string;
  label: string;
  icon: React.ComponentType;
  prefix: string;
  navItems: Array<{
    label: string;
    path: string;
    icon: React.ComponentType;
  }>;
}
```

Each compose web exports its manifest:

```typescript
// composes/crm/web/src/manifest.ts
import { Users, Kanban, BarChart } from "lucide-react";
import type { ComposeManifest } from "@repo/web/types";

export const crmManifest: ComposeManifest = {
  id: "crm",
  label: "CRM",
  icon: Users,
  prefix: "/crm",
  navItems: [
    { label: "Contacts", path: "/crm/contacts", icon: Users },
    { label: "Pipelines", path: "/crm/pipelines", icon: Kanban },
    { label: "Analytics", path: "/crm/analytics", icon: BarChart },
  ],
};
```

`apps/web` collects all manifests into a registry:

```typescript
// apps/web/src/lib/compose-registry.ts
import { platformManifest } from "@repo/platform-web";
import { crmManifest } from "@repo/crm-web";
import { erpManifest } from "@repo/erp-web";

export const composeRegistry = [platformManifest, crmManifest, erpManifest];
```

The sidebar reads directly from the registry:

```typescript
// apps/web/src/components/sidebar.tsx
import { composeRegistry } from '../lib/compose-registry'

export function Sidebar() {
  return (
    <nav>
      {composeRegistry.map(compose => (
        <SidebarSection key={compose.id} manifest={compose} />
      ))}
    </nav>
  )
}
```

Adding a new compose to the sidebar = adding one line to `compose-registry.ts`.

---

### Problem 3 — Eden Treaty Across Multiple Composes

There are two tiers of API clients. Both are needed.

**Tier 1 — Scoped client (per compose)**

Each compose web has its own `api` client typed only to its own server. Used for
all calls within that compose's own routes and hooks.

```typescript
// composes/crm/web/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { CrmApp } from "@repo/crm-server";

export const api = treaty<CrmApp>(import.meta.env.VITE_API_URL);
```

This is the default. Each compose is self-contained and type-safe within itself.

**Tier 2 — Combined client (apps/web shell)**

`apps/server` exports a combined `App` type that is the union of all registered
compose plugins. `apps/web` imports this for shell-level concerns — auth session
resolution, global inbox, cross-compose queries.

```typescript
// apps/server/src/index.ts
import { platformCompose } from "@repo/platform-server";
import { crmCompose } from "@repo/crm-server";
import { erpCompose } from "@repo/erp-server";

const app = new Elysia()
  .use(platformCompose)
  .use(crmCompose)
  .use(erpCompose)
  .listen(3000);

export type App = typeof app; // ← union of all compose types
```

```typescript
// apps/web/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { App } from "@repo/server";

export const api = treaty<App>(import.meta.env.VITE_API_URL);
```

Shell hooks (e.g. `useSession`, `useInbox`) use the combined client. Compose
hooks use the scoped client.

**When a compose web needs to call another compose's API**, it imports the combined
client from `apps/web` — it never imports from the other compose directly:

```typescript
// composes/crm/web/src/hooks/use-session.ts
// ✅ correct — use the combined shell client for cross-compose calls
import { api } from "@repo/web/lib/api";

// ❌ wrong — never import from another compose
import { api } from "@repo/platform-web/lib/api";
```

**Dependency direction — full picture:**

```
apps/server                ← composes/*/server    (Elysia plugins)
apps/web                   ← composes/*/web        (route trees + manifests)
apps/web                   ← apps/server           (combined App type)
composes/*/web             ← composes/*/server     (scoped App type)
composes/*/web             ← apps/web/lib/api      (combined client, cross-compose only)
```

---

### Problem 4 — Worker Registration

Each compose server may export queue workers for its background jobs.
`apps/server/worker.ts` collects and boots all of them.

**Convention: every compose server exports a `registerWorkers` function.**

```typescript
// composes/crm/server/src/index.ts
export const crmCompose = new Elysia({ prefix: '/crm' }) ...

export function registerCrmWorkers(queue: QueueClient) {
  queue.process('crm.sync-contact',   crmSyncContactJob)
  queue.process('crm.send-follow-up', crmFollowUpJob)
}
```

```typescript
// apps/server/src/worker.ts
import { registerPlatformWorkers } from "@repo/platform-server";
import { registerCrmWorkers } from "@repo/crm-server";
import { registerErpWorkers } from "@repo/erp-server";
import { queue } from "./infra/queue";

registerPlatformWorkers(queue);
registerCrmWorkers(queue);
registerErpWorkers(queue);

console.log("All compose workers registered");
```

If a compose has no background jobs, it simply does not export `registerWorkers`.
`worker.ts` only imports from composes that have one.

---

### Turbo Pipeline for Multiple Composes

Turborepo's `^build` handles ordering automatically — every package builds after
its declared dependencies. No manual ordering is needed as composes are added.

The only requirement: every compose `package.json` must declare its dependencies
correctly so Turborepo can infer the graph.

```
// composes/crm/web/package.json
{
  "dependencies": {
    "@repo/crm-server": "workspace:*"   ← Turbo sees this, builds crm/server first
  }
}

// apps/server/package.json
{
  "dependencies": {
    "@repo/platform-server": "workspace:*",
    "@repo/crm-server":      "workspace:*",   ← add one line per new compose
    "@repo/erp-server":      "workspace:*"
  }
}

// apps/web/package.json
{
  "dependencies": {
    "@repo/server":           "workspace:*",
    "@repo/platform-web":     "workspace:*",
    "@repo/crm-web":          "workspace:*",   ← add one line per new compose
    "@repo/erp-web":          "workspace:*"
  }
}
```

Resulting build order Turbo infers automatically:

```
composes/*/server  →  composes/*/web
                   →  apps/server    →  apps/web
```

---

## Adding a New Compose — Checklist

```
SERVER
  1. Create composes/{name}/server/
  2. Select modules, wire hooks, declare routes
  3. Export named Elysia plugin  →  export const {name}Compose
  4. Export registerWorkers()    →  only if compose has background jobs
  5. Register in apps/server/src/index.ts via .use({name}Compose)
  6. Register in apps/server/src/worker.ts via register{Name}Workers(queue)
  7. Add @repo/{name}-server to apps/server/package.json dependencies

WEB
  8. Create composes/{name}/web/
  9. Define unique route prefix  →  path: '/{name}'
  10. Export layout route + children as {name}Routes
  11. Export ComposeManifest     →  export const {name}Manifest
  12. Set up scoped Eden Treaty client using {Name}App type from compose server
  13. Register in apps/web/src/router.ts via rootRoute.addChildren([...{name}Routes])
  14. Register in apps/web/src/lib/compose-registry.ts via {name}Manifest
  15. Add @repo/{name}-web to apps/web/package.json dependencies

SEED
  16. Run compose seed to load roles and notification templates
```
