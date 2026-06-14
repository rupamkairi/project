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
- [docs/instructions/README.md](../../docs/instructions/README.md) — agent reading order
- [docs/setup/server.md](../../docs/setup/server.md) — server architecture + infra setup
- [docs/core.md](../../docs/core.md) — core primitives reference
- [docs/instructions/tooling.md](../../docs/instructions/tooling.md) — Bun, DB, TypeDoc commands
