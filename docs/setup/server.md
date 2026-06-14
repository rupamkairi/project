# Server Setup

Elysia HTTP server (`apps/server`) and background worker (`apps/server/src/worker.ts`).

→ For monorepo structure and workspaces: [monorepo.md](../monorepo.md)
→ For module layer details: [module.md](../module.md)
→ For compose plug model: [compose.md](../compose.md)

---

## Directory structure

```
apps/server/src/
├── core/             ← Primitives and runtime machinery
│   ├── context/      ← SystemContext per request
│   ├── cqrs/         ← Mediator, command/query handlers
│   ├── entity/       ← Entity interface, ULID ID gen, schema
│   ├── errors/       ← CoreError hierarchy, HTTP status mapping
│   ├── event/        ← EventBus, EventStore, Outbox
│   ├── module/       ← ModuleRegistry, lifecycle, boot order
│   ├── primitives/   ← Money, Pagination, Result types
│   ├── queue/        ← Job, JobOptions, Scheduler interfaces
│   ├── realtime/     ← WebSocket bridge (EventBus → WS)
│   ├── repository/   ← BaseRepository (abstract, org-scoped)
│   ├── rule/         ← Rule engine, named rule store
│   └── state/        ← FSM engine, transitions, actions
├── infra/
│   ├── cache/        ← Cache implementation
│   ├── db/           ← Drizzle ORM setup + shared schema
│   ├── queue/        ← Redis/BullMQ queue implementation
│   ├── realtime/     ← WebSocket gateway implementation
│   └── env.ts        ← Environment variable loading + validation
├── modules/
│   └── {name}/       ← See module.md for structure
├── index.ts          ← HTTP server entry point
└── worker.ts         ← Background worker entry point
```

---

## Entry points

### `index.ts` — HTTP server

Startup sequence:
1. Create `ModuleRegistry`
2. Register all 10 modules
3. Boot modules (`registry.boot()`) — resolves dependency order via topological sort
4. Dynamically import active compose plugin
5. Create Elysia app with `cors`, `swagger`, `bearer` middleware
6. Mount compose via `.use(composePlugin)`
7. Register shell endpoints: `/health`, `/modules`, `/core`, `/schemas`
8. Attach global error handler
9. Listen on `env.PORT`

Shell endpoints:
- `GET /health` — liveness check
- `GET /modules` — registered module manifest list
- `GET /core` — core layer metadata
- `GET /schemas` — entity schema registry

**Never add feature routes here.** Feature routes live in compose plugins.

### `worker.ts` — Background worker

Startup sequence:
1. Create `ModuleRegistry`, register all modules, boot
2. For each module queue: create queue + worker instance
3. Route incoming jobs to handlers
4. Register `SIGTERM` / `SIGINT` for graceful shutdown

---

## Middleware stack

```typescript
const app = new Elysia()
  .use(cors({ origin: env.CORS_ORIGIN }))
  .use(swagger())
  .use(bearer())
  .use(activeCompose)
```

| Middleware | Purpose |
|------------|---------|
| `@elysiajs/cors` | Cross-origin requests |
| `@elysiajs/swagger` | Auto-generated OpenAPI docs at `/swagger` |
| `@elysiajs/bearer` | Bearer token extraction into context |

---

## Error handling

All errors extend `CoreError` from `core/errors/`:

| Class | HTTP status | Use for |
|-------|------------|---------|
| `ValidationError` | 400 | Bad input |
| `AuthenticationError` | 401 | Not logged in |
| `AuthorizationError` | 403 | No permission |
| `NotFoundError` | 404 | Resource missing |
| `ConflictError` | 409 | Duplicate / state conflict |
| `BusinessError` | 422 | Domain rule violation |
| `IntegrationError` | 502 | External service failure |

Global handler in `index.ts` catches all `CoreError` subclasses and maps to the correct HTTP status.

---

## Database (Drizzle + PostgreSQL)

Config in `infra/db/`. Drizzle schema lives in two places:

- `apps/server/src/infra/db/` — shared infra tables (sessions, events, jobs)
- `composes/{name}/server/src/db/schema/` — compose-owned tables

DB table naming: `{3-letter-prefix}_{snake_case_entity}` — see [conventions.md](../conventions.md).

---

## Environment variables

Loaded and validated in `infra/env.ts`. Required variables:

```bash
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
CORS_ORIGIN=http://localhost:5173
```

---

## Adding a new module

1. Create `src/modules/{name}/` with subdirs: `entities/`, `commands/`, `queries/`, `events/`, `fsm/`, `jobs/`, `adapters/`
2. Create `src/modules/{name}/index.ts` exporting an `AppModule` object with embedded manifest
3. Register in `apps/server/src/index.ts`: `registry.register({Name}Module)`
4. Register in `apps/server/src/worker.ts` for queue workers

Full module spec: [module.md](../module.md)

---

## Adding a new compose

1. Create `composes/{name}/server/`
2. Export `{name}Compose` Elysia plugin and `{Name}App` type
3. Import and `.use()` in `apps/server/src/index.ts`
4. Add `@projectx/{name}-server` to `apps/server/package.json`

Full compose integration: [compose.md](../compose.md)
