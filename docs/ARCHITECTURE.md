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
                               ↑
                           EventBus / Mediator (only cross-module communication)
```

No upward dependencies. No sideways dependencies between modules. No sideways dependencies between composes.

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
