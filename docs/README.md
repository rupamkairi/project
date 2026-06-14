# ProjectX Documentation

ProjectX is a compose-first application factory for dashboard-style SaaS products.  
Architecture: `Core → Module → Compose → Host Shell`

---

## Where to start

| I want to... | Read... |
|---|---|
| Understand the overall architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Build a new compose | [compose.md](./compose.md) |
| Add or modify a module | [module.md](./module.md) |
| Work on core primitives | [core.md](./core.md) |
| Set up the monorepo or a new workspace | [monorepo.md](./monorepo.md) |
| Name a file, dir, route, or DB table | [conventions.md](./conventions.md) |
| Work on the Elysia server | [setup/server.md](./setup/server.md) |
| Work on the React web app | [setup/web.md](./setup/web.md) |
| Build or modify UI | [design-system.md](./design-system.md) |
| Add file storage or notifications to a compose | [plugins/README.md](./plugins/README.md) |
| Build a new plugin | [plugins/development.md](./plugins/development.md) |
| See what agent skills are available | [skills/README.md](./skills/README.md) |
| Get started as an AI agent | [instructions/README.md](./instructions/README.md) |

---

## Document map

### Architecture & Layer Reference

| File | Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Three-layer overview, dep direction, compose & module catalog |
| [core.md](./core.md) | Core primitives: Entity, Event, CQRS, FSM, Repository, Queue, Realtime |
| [module.md](./module.md) | Module anatomy, directory structure, public interface contract |
| [compose.md](./compose.md) | Compose standards, integration contract, manifest requirements |
| [conventions.md](./conventions.md) | Naming rules for dirs, files, routes, exports, DB tables |
| [monorepo.md](./monorepo.md) | Workspaces, Turborepo build order, path aliases, packages |

### Setup Guides

| File | Covers |
|---|---|
| [setup/server.md](./setup/server.md) | Elysia server structure, middleware, DB, error handling |
| [setup/web.md](./setup/web.md) | React + TanStack Router, auth, API tiers, sidebar |

### UI & Design

| File | Covers |
|---|---|
| [design-system.md](./design-system.md) | shadcn/ui, Tailwind, component usage, theming |

### Composes

| File | Covers |
|---|---|
| [composes/index.md](./composes/index.md) | Catalog table: all composes, status, modules used |
| [composes/{name}.md](./composes/) | Per-compose doc: purpose, modules, routes, data model |
| [composes/platform/](./composes/platform/) | Platform compose detail |
| [composes/lms/](./composes/lms/) | LMS compose detail |
| [composes/ecommerce/](./composes/ecommerce/) | Ecommerce compose detail |

### Plugins

| File | Covers |
|---|---|
| [plugins/README.md](./plugins/README.md) | Plugin system architecture, dependency rules, available plugins |
| [plugins/storage.md](./plugins/storage.md) | Storage plugin: S3 uploads, file management, REST API |
| [plugins/notification.md](./plugins/notification.md) | Notification plugin: email, templates, scheduling |
| [plugins/development.md](./plugins/development.md) | How to build a new plugin |

### Agent Skills

| File | Covers |
|---|---|
| [skills/README.md](./skills/README.md) | All available skills, when to invoke each |

### AI Agent Instructions

| File | Covers |
|---|---|
| [instructions/README.md](./instructions/README.md) | Agent start-here: reading order, orientation |
| [instructions/for-agents.md](./instructions/for-agents.md) | Full reading order table, shell integration contract, plan rules |
| [instructions/architectural-rules.md](./instructions/architectural-rules.md) | Non-negotiable rules per layer |
| [instructions/tooling.md](./instructions/tooling.md) | Bun, TypeDoc, dev commands, DB commands |

---

## Current repo state (as of Wave 1)

- **Core:** Fully implemented (`bun test src/core` → 343 pass)
- **Modules:** Scaffold only — subdirs are placeholder stubs
- **Platform compose:** Server complete; web missing `platformManifest` export
- **Other composes:** Documented but not built

When code and docs conflict → **docs are the target**. Code is transitional.
