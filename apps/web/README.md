# apps/web

React + Vite shell for ProjectX. Pure shell — zero feature logic.

## Responsibilities

- Render root layout
- Register compose route trees via `rootRoute.addChildren()`
- Provide global providers (QueryClient, auth session context)

## Quick start

```bash
bun install
bun run dev    # start with hot reload
bun run build  # production build
```

## Architecture

This app is a **shell**. All feature logic lives in:
- `composes/{name}/web/` — compose route trees + manifests registered here

Read before working here:
- [docs/instructions/README.md](../../docs/instructions/README.md) — agent reading order
- [docs/setup/web.md](../../docs/setup/web.md) — web architecture, routing, auth
- [docs/design-system.md](../../docs/design-system.md) — UI components, Tailwind, theming
