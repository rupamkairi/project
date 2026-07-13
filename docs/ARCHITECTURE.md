# Architecture

## Runtime

`apps/server` is the Elysia host. At boot it creates shared runtime services, boots the domain modules, and mounts every active server compose. `apps/web` is the Vite/React host. It combines the compose route exports into one TanStack Router tree.

```
apps/server  -> core + modules -> compose server packages -> Elysia routes
apps/web     -> shared router/UI -> compose web packages -> TanStack routes
```

The active composes are mounted in both hosts:

| Compose | Server prefix | Web entry |
| --- | --- | --- |
| Platform | `/platform` | `/dashboard` |
| CRM | `/crm` | `/crm` |
| Ecommerce | `/ecommerce` | `/ecommerce/admin`, `/ecommerce/store` |
| ERP | `/erp` | `/erp` |
| LMS | `/lms` | `/lms` |
| Restaurant | `/restaurants` | `/restaurants` |

The platform compose owns authentication and shared dashboard concerns. The server host registers the platform compose before the others; public paths and integrations are configured in `composes/platform/server/src/index.ts`.

## Boundaries represented in the code

- `apps/server/src/core/` provides shared primitives and runtime abstractions.
- `apps/server/src/modules/` contains domain modules booted by the server host.
- `composes/*` own product-specific routes, schemas, hooks/jobs, UI, and manifests.
- `plugins/*` provide optional server/web integrations consumed by composes.
- `packages/router` and `packages/ui` are shared web packages.

These folders describe the current organization, not a promise that every abstraction is enforced universally. When changing behavior, inspect the concrete import and boot path first.

## Data and API reference

The database schema is assembled from `apps/server/src/infra/db/schema/` plus compose schema exports. Compose-specific tables live beneath their compose server package. Inspect the schema barrels and Drizzle configuration before changing persistence or migration behavior.

The running server exposes Swagger at `/swagger`. The server package can generate TypeDoc and OpenAPI artifacts through its `docs:*` scripts; generated artifacts are not maintained as hand-written repository documentation.
