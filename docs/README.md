# ProjectX

ProjectX is a Bun monorepo that assembles dashboard applications from a server shell, a React web shell, domain modules, and compose packages.

The source tree is authoritative. This directory records stable orientation only; use package entry points, route files, schemas, and tests to determine current behavior.

## Read this first

- [Architecture](./architecture.md) — packages, active composes, and runtime wiring.
- [Development](./development.md) — commands, generated API references, and working rules.
- `AGENTS.md` — repository instructions for automated contributors.

## Source map

| Area | Source of truth |
| --- | --- |
| Server boot and mounted APIs | `apps/server/src/index.ts` |
| Web route assembly | `apps/web/src/router.tsx` |
| Compose API entry points | `composes/*/server/src/index.ts` |
| Compose UI entry points and manifests | `composes/*/web*/src/index.ts`, `src/manifest.ts` |
| Core and domain modules | `apps/server/src/core/`, `apps/server/src/modules/` |
| Database schemas and migrations | `apps/server/src/infra/db/` and compose `src/db/` directories |
| Shared routing and UI | `packages/router/`, `packages/ui/` |
| Optional integrations | `plugins/*/server/`, `plugins/*/web/` |

Do not add implementation plans, API inventories, or package mirrors here. Keep enduring context brief and link to code instead.
