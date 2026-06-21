# CRM — Phase 16: Data Seeding

## Goal

Populate the database with CRM tables, default pipeline data, and dev users so the compose is testable locally.

---

## 16.1 DB Schema Push

CRM tables are defined in `composes/crm/server/src/db/schema/` and re-exported via `apps/server/src/infra/db/schema/index.ts`. Drizzle-kit reads this barrel file.

### Why `db:push` and not `db:migrate`

`db:migrate` requires a direct TCP connection. Neon serverless driver (`@neondatabase/serverless`) only supports WebSocket — drizzle-kit detects the Neon URL, picks the serverless driver, and the migration transaction fails.

`db:push` uses Neon's native WebSocket protocol and works.

```bash
cd apps/server && bun run db:push
```

### TTY Prompt Issue

`drizzle.config.ts` must have `strict: false` for non-interactive shells (CI, subprocesses, Claude Code tool calls). With `strict: true`, drizzle-kit waits for keyboard confirmation and hangs.

Current config at `apps/server/drizzle.config.ts`:
```typescript
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/db/schema/index.ts",
  out: "./src/infra/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: false,
  strict: false,
});
```

### Verify Tables Exist

After push, confirm CRM tables are present:
```
crm_contacts
crm_accounts
crm_leads
crm_deals
crm_pipeline_stages
crm_pipelines
crm_activities
crm_segments
crm_campaigns
crm_campaign_contacts
crm_custom_fields
```

---

## 16.2 CRM Dev Users Seed

File: `apps/server/src/infra/db/seed-crm-dev.ts`

Creates 4 roles + 3 dev actors directly via Drizzle insert (not through mediator — handlers may not be registered at seed time).

```bash
cd apps/server && bun run db:seed:crm
```

### What It Creates

| Email | Password | Role |
|-------|----------|------|
| `crm-admin@platform.local` | `crm123` | `crm:admin` |
| `crm-rep@platform.local` | `crm123` | `crm:sales-rep` |
| `crm-viewer@platform.local` | `crm123` | `crm:viewer` |

Roles created:

| Role ID | Name | Permissions |
|---------|------|-------------|
| `plt_role_crm-admin` | `crm:admin` | `crm:*` |
| `plt_role_crm-sales-manager` | `crm:sales-manager` | `crm:read, crm:create, crm:update, crm:assign, crm:analytics` |
| `plt_role_crm-sales-rep` | `crm:sales-rep` | `crm:read, crm:create, crm:update` |
| `plt_role_crm-viewer` | `crm:viewer` | `crm:read` |

Seed is **idempotent** — safe to re-run. Uses `onConflictDoNothing` for roles; `onConflictDoUpdate` for actors (refreshes password hash).

---

## 16.3 Default Pipeline Seed

File: `composes/crm/server/src/db/seed/roles.seed.ts` — `seedCrm(mediator)` function.

Called from `apps/server/src/index.ts` at boot (if wired) or manually. Creates:

- Pipeline: `Sales Pipeline` (isDefault: true, currency: USD)
- Stages: Lead In (10%), Meeting (30%), Proposal (50%), Negotiation (70%), Closed Won (100%)

**Note:** This seed dispatches `crm.createPipeline` and `crm.createPipelineStage` through the mediator. Handlers **must be registered first** (`registerCrmHandlers` called in `createCrmCompose`). If called before compose setup, pipeline seed silently fails — wrap in try/catch, check pipeline exists before creating deals.

---

## 16.4 Full Local Setup Order

```bash
# 1. Push CRM tables to DB (run from apps/server)
bun run db:push

# 2. Seed platform base data (orgs, admin user)
bun run db:seed

# 3. Seed CRM dev users + roles
bun run db:seed:crm

# 4. Start server (registers handlers + seeds pipeline at boot)
bun run dev
```

---

## 16.5 Edge Cases

| Situation | Symptom | Fix |
|-----------|---------|-----|
| `db:push` hangs waiting for input | Process doesn't exit | Set `strict: false` in drizzle.config.ts |
| `db:migrate` fails on Neon URL | `@neondatabase/serverless can only connect via websocket` | Use `db:push` instead |
| Pipeline seed silently fails | `GET /crm/pipelines` returns `[]` | Ensure `registerCrmHandlers` runs before `seedCrm`; check server logs for mediator errors |
| CRM users can't log in | 401 on all `/crm/*` routes | Run `db:seed:crm`; confirm `actor_crm_admin` row exists in `actors` table |
| Seed re-run resets password | Old hash replaced | By design — `onConflictDoUpdate` refreshes `passwordHash` |
| CRM tables missing after push | 404 on all routes | CRM schema not in barrel — check `apps/server/src/infra/db/schema/index.ts` imports from `@projectx/crm-server/db/schema` |
