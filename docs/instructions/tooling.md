# Tooling Reference

Dev commands, Bun rules, TypeDoc, database commands.

---

## Runtime: Bun

Always use Bun — not Node.js, npm, pnpm, or Vite directly.

| Instead of | Use |
|---|---|
| `node <file>` | `bun <file>` |
| `ts-node <file>` | `bun <file>` |
| `jest` or `vitest` | `bun test` |
| `npm install` | `bun install` |
| `npm run <script>` | `bun run <script>` |
| `npx <pkg>` | `bunx <pkg>` |
| `webpack` or `esbuild` | `bun build <file>` |

Bun auto-loads `.env` — do not use `dotenv`.

### Bun built-in APIs (use instead of third-party packages)

| Use case | Bun API | Do NOT use |
|---|---|---|
| SQLite | `bun:sqlite` | `better-sqlite3` |
| Redis | `Bun.redis` | `ioredis` |
| Postgres | `Bun.sql` | `pg`, `postgres.js` |
| HTTP server | `Bun.serve()` | `express` |
| WebSocket | built-in `WebSocket` | `ws` |
| File reads/writes | `Bun.file` | `node:fs` readFile/writeFile |
| Shell commands | `Bun.$\`ls\`` | `execa` |

---

## Workspace commands

Run from repo root (Turbo orchestrates all packages):

| Command | What it does |
|---|---|
| `bun run dev` | Start all apps + composes in watch mode |
| `bun run build` | Build everything (Turborepo-ordered) |
| `bun run typecheck` | Type-check all packages |
| `bun run lint` | Lint all packages |
| `bun run clean` | Remove all `node_modules` |
| `bun test src/core` | Run core tests only |

---

## Server-specific commands

Run from `apps/server/`:

| Command | What it does |
|---|---|
| `bun run dev` | Start server with hot reload |
| `bun run worker:dev` | Start worker with hot reload |
| `bun run typecheck` | Type-check server only |
| `bun test` | Run all server tests |

---

## Database (Drizzle)

Run from `apps/server/`:

| Command | What it does |
|---|---|
| `bun run db:generate` | Generate Drizzle migration files |
| `bun run db:migrate` | Run pending migrations |
| `bun run db:push` | Push schema to DB (dev, no migration file) |
| `bun run db:studio` | Open Drizzle Studio UI |

---

## Documentation generation (TypeDoc + OpenAPI)

Run from `apps/server/`:

| Command | What it does |
|---|---|
| `bun run docs:build` | Generate TypeDoc HTML + OpenAPI |
| `bun run docs:generate` | TypeDoc + OpenAPI |
| `bun run docs:generate:skip-openapi` | TypeDoc only (no server needed) |
| `bun run docs:export-openapi` | Export OpenAPI spec (server must be running) |

Generated output: `apps/server/docs/generated/index.html`

### What gets documented

**TypeDoc (auto-generated):**
- `src/core/` — all core primitives, types, functions
- `src/modules/*/` — all module exports (commands, queries, events)

**OpenAPI:**
- `GET /swagger/openapi.json` — full OpenAPI 3.0 spec
- `GET /swagger` — interactive Swagger UI

### JSDoc conventions

Tag exported items with `@category`:

```typescript
/**
 * Monetary value with currency. Stored in smallest unit (cents, paise).
 * @category Core
 */
export interface Money {
  amount: number;   // integer in smallest unit
  currency: string; // ISO 4217
}
```

```typescript
/**
 * @category Module:Identity
 */
export async function createUser(data: CreateUserDto): Promise<User> { ... }
```

### Auto-generate on commit (optional)

Enable pre-commit hook:
```bash
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Skip: `git commit --no-verify`

---

## Testing (Bun test)

```typescript
// index.test.ts
import { test, expect, describe } from "bun:test";

describe("core/entity", () => {
  test("creates entity with ULID", () => {
    expect(entity.id).toMatch(/^[0-9A-Z]{26}$/);
  });
});
```

Run:
```bash
bun test              # all tests
bun test src/core     # core tests only
bun test --watch      # watch mode
bun test --coverage   # with coverage
```

---

## KiloCode memory bank

KiloCode keeps its own memory bank at `apps/server/.kilocode/rules/memory-bank/`.  
Canonical source of truth is the main docs in `docs/`.  
If KiloCode memory conflicts with `docs/` → update the memory bank to match `docs/`.

Refresh KiloCode memory: In KiloCode chat → "update memory bank"
