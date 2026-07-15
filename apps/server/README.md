# apps/server

Elysia HTTP shell for ProjectX. Pure infrastructure — zero feature logic.

## Responsibilities

- Boot core infra (DB, Redis, Queue, WebSocket gateway)
- Register compose plugins via `.use()`
- Expose `/health`, `/core`, `/schemas`, `/modules`
- Export `App` type for Eden Treaty clients

## Quick start

```bash
bun install
bun run dev        # start with hot reload
bun run worker:dev # start queue worker
```

## Architecture

This app is a **shell**. All feature logic lives in:

- `src/core/` — primitives (entity, event, CQRS, FSM, repository, queue...)
- `src/modules/` — domain modules (identity, catalog, ledger, workflow...)
- `composes/{name}/server/` — compose plugins mounted here

Read before working here:

- [docs/README.md](../../docs/README.md) — repository orientation
- [docs/architecture.md](../../docs/architecture.md) — live runtime map
- [docs/development.md](../../docs/development.md) — Bun, database, and API artifact commands
