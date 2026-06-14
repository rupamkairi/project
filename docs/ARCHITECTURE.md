# Architecture Overview

## Core → Module → Compose → Host Shell

ProjectX is a compose-first application factory. Any dashboard-style SaaS product is assembled by orchestrating pre-built Modules through a Compose layer, mounted on thin Host Shell apps.

---

## The Three Questions

| Layer | Question | Rule |
|-------|----------|------|
| **Core** | How does the system work? | Zero business logic. Zero domain vocabulary. Zero vendor deps. Everything depends on Core; Core depends on nothing. |
| **Module** | What does the system know? | Bounded domain concern. Communicates only via EventBus + CQRS Mediator. Owns its own DB namespace. Never imports from another module. |
| **Compose** | What does the system do? | Orchestration only. Selects modules, wires cross-module behavior, defines roles/permissions/routes. Never imports from another compose. |
| **Shell** | Where does it run? | Zero feature logic. Mounts composes as plugins. No business routes. |

---

## Dependency direction

```
Host Shell  →  Compose  →  Module  →  Core
                  ↑              ↑
              Plugins ───────────┘
           (depend on Core interfaces only)

EventBus / Mediator: only cross-module communication
```

No upward dependencies. No sideways dependencies between modules. No sideways dependencies between composes. Plugins depend on Core interfaces; they never import from modules. Modules never import from plugins. The compose is the only place they meet.

---

## Multi-compose deployment

Multiple composes run simultaneously in one shell. Each compose gets a unique route prefix. Shared infrastructure plugins (auth, logging, security) are registered once at the shell level before any compose is mounted.

### Server mounting order

```typescript
// apps/server/src/index.ts
const security = createSecurityPlugin({ ... });
const logging  = createLoggingPlugin({ ... });
const auth     = createAuthPlugin({ ... });  // Platform compose configures the provider

app
  .use(security.plugin)   // 1. headers, rate limiting, CORS — runs first on every request
  .use(logging.plugin)    // 2. request logging
  .use(auth.plugin)       // 3. token validation → populates ctx.actor
  .use(platformCompose)   // 4. /platform — also mounts /platform/auth/* routes
  .use(crmCompose)        // 5. /crm — receives ctx.actor automatically
  .use(erpCompose);       // 6. /erp — receives ctx.actor automatically
```

Rules:
- Security plugin always first
- Auth plugin before composes
- Platform compose (or whichever compose owns identity) configures the auth provider
- Other composes declare no auth dependency — they receive `ctx.actor` transparently

### Web mounting

Each compose exports a route tree branch and a manifest. The shell merges them:

```typescript
// apps/web/src/router.ts
import { platformRoutes, platformManifest } from "@projectx/compose-platform-web";
import { crmRoutes, crmManifest }           from "@projectx/compose-crm-web";
import { erpRoutes, erpManifest }           from "@projectx/compose-erp-web";
import { mergeManifests }                   from "@projectx/router";

const router = createRouter({
  routeTree: rootRoute.addChildren([
    ...platformRoutes,   // /login, /dashboard, /dashboard/users, /dashboard/roles
    ...crmRoutes,        // /crm/customers, /crm/deals, /crm/activities
    ...erpRoutes,        // /erp/ledger, /erp/inventory, /erp/procurement
  ]),
});

export const appManifest = mergeManifests([
  platformManifest,
  crmManifest,
  erpManifest,
]);
```

### Supported combinations

Any compose can run alongside any other compose. Common deployments:

| Deployment | Composes |
|------------|---------|
| Base platform only | `platform` |
| Platform + CRM | `platform` + `crm` |
| Platform + ERP | `platform` + `erp` |
| Full ops suite | `platform` + `crm` + `erp` + `pm` |
| Hospitality stack | `platform` + `hospitality` + `restaurant` |

Platform compose is required in any deployment that uses the auth plugin's `LocalJWTProvider`, because Platform owns the identity module (actor/session DB records). For external auth providers (Auth0, Clerk), Platform compose is optional.

---

## Module catalog

10 standard modules, all reusable across any compose:

`identity` · `catalog` · `inventory` · `ledger` · `workflow` · `scheduling` · `document` · `notification` · `geo` · `analytics`

→ Full reference: [module.md](./module.md)

---

## Compose catalog

Each compose is a full-stack application built from modules:

| Compose | Primary use case |
|---------|----------------|
| platform | Auth, users, roles, notifications — base for all deployments |
| crm | Customer relationship management |
| erp | Enterprise resource planning |
| lms | Learning management |
| pm | Project management |
| office | HR, attendance, payroll, office ops |
| healthcare | Clinical + administrative hospital/clinic ops |
| hospitality | Hotel property management |
| restaurant | Dine-in, kitchen, delivery |
| ecommerce | Online store, orders, fulfillment |

→ Full catalog: [composes/index.md](./composes/index.md)

---

## Monorepo layout

```
apps/
  server/          ← Elysia HTTP shell
  web/             ← React + Vite shell

composes/
  {name}/
    server/        ← Elysia plugin package
    web/           ← Route tree + manifest package

packages/
  config/          ← Tailwind, TS, ESLint config
  router/          ← Shared TanStack root route
  ui/              ← Shared shadcn/ui components
```

→ Full reference: [monorepo.md](./monorepo.md)

---

## Document map

| Document | Read when |
|----------|----------|
| [core.md](./core.md) | Working on primitives, infra, or runtime machinery |
| [module.md](./module.md) | Adding or modifying a module |
| [compose.md](./compose.md) | Building or modifying a compose |
| [monorepo.md](./monorepo.md) | Package setup, workspaces, Turborepo, path aliases |
| [conventions.md](./conventions.md) | Naming anything — dirs, files, routes, exports, DB |
| [design-system.md](./design-system.md) | Any UI work |
| [setup/server.md](./setup/server.md) | Elysia server setup, infra, DB, middleware |
| [setup/web.md](./setup/web.md) | React + TanStack setup, routing, auth |
| [composes/index.md](./composes/index.md) | Choosing modules, new compose planning |
| [plugins/README.md](./plugins/README.md) | Plugin system — storage, notification, new plugin |
| [skills/README.md](./skills/README.md) | Agent skills — when to use each |
| [instructions/README.md](./instructions/README.md) | AI agent reading order and orientation |

→ Full documentation index: [README.md](./README.md)  
→ AI agent start: [instructions/README.md](./instructions/README.md)
