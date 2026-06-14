# Monorepo Reference

Runtime: **Bun**. Build system: **Turborepo**. Package manager: `bun`.

---

## Directory structure

```
/
├── apps/
│   ├── server/             ← Elysia HTTP shell
│   └── web/               ← React + Vite shell
├── composes/
│   └── {name}/
│       ├── server/         ← Elysia plugin package
│       └── web/           ← Route tree + manifest package
├── packages/
│   ├── config/            ← TypeScript, ESLint, Prettier, Tailwind
│   ├── router/            ← Shared TanStack root route
│   └── ui/               ← Shared shadcn/ui components
├── docs/
├── plans/
├── turbo.json
├── package.json           ← Root workspace config
└── bun.lock
```

---

## Workspaces

Root `package.json` workspace glob:

```json
{
  "workspaces": [
    "apps/*",
    "composes/*/server",
    "composes/*/web",
    "packages/*"
  ]
}
```

When adding a new compose, this glob picks it up automatically — no root `package.json` edit needed.

---

## Package naming

| Package | Name |
|---------|------|
| `apps/server` | `@projectx/server` |
| `apps/web` | `@projectx/web` |
| `composes/{name}/server` | `@projectx/{name}-server` |
| `composes/{name}/web` | `@projectx/{name}-web` |
| `packages/config` | `@projectx/config` |
| `packages/router` | `@projectx/shared-router` |
| `packages/ui` | `@projectx/ui` |

---

## Path aliases

### `apps/server/tsconfig.json`

```json
{
  "paths": {
    "@core/*":    ["./src/core/*"],
    "@modules/*": ["./src/modules/*"],
    "@infra/*":   ["./src/infra/*"],
    "@db/*":      ["./src/infra/db/*"]
  }
}
```

### `composes/{name}/server/tsconfig.json`

```json
{
  "paths": {
    "@core/*":    ["../../../apps/server/src/core/*"],
    "@modules/*": ["../../../apps/server/src/modules/*"],
    "@infra/*":   ["../../../apps/server/src/infra/*"],
    "@db/*":      ["../../../apps/server/src/infra/db/*"]
  }
}
```

Same relative depth for all compose servers — they always sit three levels from repo root.

---

## Turborepo build order

`turbo.json` uses `^build` which automatically infers order from `package.json` dependencies:

```
composes/{name}/server
  → composes/{name}/web      (needs server's App type)
  → apps/server              (needs compose plugin)
    → apps/web               (needs combined App type + web packages)
```

Turbo builds `composes/*/server` first, then `composes/*/web` and `apps/server` in parallel (respecting deps), then `apps/web` last.

**No manual ordering needed** — just declare dependencies correctly in each package's `package.json`.

### Adding a new compose to turbo graph

```json
// composes/{name}/web/package.json
{
  "dependencies": {
    "@projectx/{name}-server": "workspace:*"
  }
}

// apps/server/package.json — add one line
{
  "dependencies": {
    "@projectx/{name}-server": "workspace:*"
  }
}

// apps/web/package.json — add one line
{
  "dependencies": {
    "@projectx/{name}-web": "workspace:*"
  }
}
```

---

## Layer boundary rules

```
core/      → imports nothing from modules/, composes/, or infra/
modules/   → imports from core/ and infra/ only
infra/     → implements core/ interfaces; imports core/ only
composes/  → imports from modules/ and core/ only; never cross-compose
apps/      → imports from composes/ and packages/ only
packages/  → imports from other packages/ only; no apps/ or composes/
```

---

## packages/ reference

### `@projectx/shared-router`

Exports `sharedRootRoute` — the single TanStack Router root route shared by all packages.

```typescript
import { sharedRootRoute } from "@projectx/shared-router";
```

Why it exists: TanStack Router allows only one `createRootRoute()` per app. All composes and the host app must use this shared instance to avoid route ID collisions.

### `@projectx/ui`

Exports shadcn/ui components. All web apps must import UI components from here.

```typescript
import { Button, Input, Card, Badge, Spinner, cn } from "@projectx/ui";
```

Never install shadcn components directly in a compose or app. Add them to `packages/ui` and import from there.

### `@projectx/config`

Shared configs only — not imported in code. Referenced in `extends` and `preset` fields:

```json
// tsconfig.json
{ "extends": "@projectx/config/tsconfig/base.json" }
```

```js
// tailwind.config.js
module.exports = { presets: [require("@projectx/config/tailwind.config")] }
```

```css
/* index.css */
@import "@projectx/config/src/index.css";
```

---

## Internal structure of `apps/server`

```
apps/server/src/
├── core/
│   ├── context/     ← SystemContext, mediator
│   ├── cqrs/        ← Mediator, command/query dispatch
│   ├── entity/      ← EntitySchema, ID gen (ULID)
│   ├── errors/      ← AppError, typed error hierarchy
│   ├── event/       ← EventBus, EventStore, Outbox
│   ├── module/      ← ModuleRegistry, module loading
│   ├── primitives/  ← Money, Result, PaginatedResult
│   ├── queue/       ← Queue primitives
│   ├── realtime/    ← WebSocket/pub-sub primitives
│   ├── repository/  ← BaseRepository, query options
│   ├── rule/        ← RuleEngine, RuleExpr
│   └── state/       ← StateMachine, FSMEngine
├── infra/
│   ├── db/          ← Drizzle client, schema, migrations
│   ├── cache/       ← Redis client
│   ├── queue/       ← BullMQ worker
│   ├── realtime/    ← WebSocket server
│   └── env.ts       ← Validated env vars
├── modules/
│   ├── identity/
│   ├── catalog/
│   ├── inventory/
│   ├── ledger/
│   ├── workflow/
│   ├── scheduling/
│   ├── document/
│   ├── notification/
│   ├── geo/
│   └── analytics/
├── index.ts         ← HTTP server entry
└── worker.ts        ← Background queue worker entry
```

**Boundary rule (never violate):**
```
core/      → imports nothing else in this tree
infra/     → imports from core/ only (implements core interfaces)
modules/   → imports from core/ and infra/ only; never cross-module
```

---

## Internal structure of `apps/web`

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

`apps/web` is a pure shell — it owns no feature logic.

---

## Dev commands

| Command | What |
|---------|------|
| `bun run dev` | Start all apps and composes in watch mode |
| `bun run build` | Build everything (Turbo-ordered) |
| `bun run typecheck` | Type-check all packages |
| `bun run lint` | Lint all packages |
| `bun run clean` | Remove all `node_modules` |
