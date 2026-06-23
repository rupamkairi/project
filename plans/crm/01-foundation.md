# CRM — Phase 1: Foundation

## Goal

Scaffold the full `composes/crm/` directory tree, establish the DB schema foundation,
define the permissions matrix, wire the compose into both shells, and seed baseline data.

---

## 1.1 Package Structure

```
composes/crm/
  server/
    package.json          name: @projectx/compose-crm-server
    tsconfig.json
    src/
      index.ts
      permissions/
        index.ts          role definitions + permission matrix
      db/
        schema/
          index.ts        barrel — re-exports all crm tables
        seed/
          roles.seed.ts   admin, sales-manager, sales-rep, viewer
  web/
    package.json          name: @projectx/compose-crm-web
    tsconfig.json
    src/
      index.ts            exports crmRoutes, crmManifest
      routes/
        index.ts
      components/
      hooks/
      stores/
      lib/
        api.ts
```

### `server/package.json`

```json
{
  "name": "@projectx/compose-crm-server",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "elysia": "^1.4.25",
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "@projectx/config": "workspace:*",
    "bun-types": "^1.0.0",
    "typescript": "^5.3.3"
  }
}
```

### `web/package.json`

```json
{
  "name": "@projectx/compose-crm-web",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "exports": { ".": "./src/index.ts", "./api": "./src/lib/api.ts" },
  "dependencies": {
    "@projectx/ui": "workspace:*",
    "@projectx/router": "workspace:*",
    "@tanstack/react-router": "^1.x",
    "@tanstack/react-query": "^5.x",
    "react": "^19.0.0",
    "lucide-react": "^0.577.0"
  },
  "devDependencies": {
    "@projectx/config": "workspace:*"
  }
}
```

---

## 1.2 DB Schema Foundation

New Drizzle file: `composes/crm/server/src/db/schema/index.ts`

All CRM detail tables use prefix `crm_`. All include `baseColumns` (id, organizationId, createdAt, updatedAt, deletedAt, version, meta).

**Master tables are NOT created here.** `persons`, `parties`, `pipelines`, `pipeline_stages`, `activities`, and `geo_addresses` are owned by foundation modules and provisioned at server boot. Run `bun db:push` from project root to ensure master tables exist before running CRM migrations.

Detail tables created in this phase (stubs — full field specs in Phase 2):

```
crm_leads            Lead sequencing/qualification detail (extends persons type=lead)
crm_deals            Deal opportunity
crm_campaigns        Marketing campaign
crm_campaign_contacts Campaign-Contact delivery join
crm_segments         Audience segment (filter expression)
crm_email_threads    P1 — inbound/outbound email threads
crm_email_messages   P1 — individual emails within a thread
```

Each table file: `composes/crm/server/src/db/schema/{name}.ts`

---

## 1.3 Permissions Matrix

File: `composes/crm/server/src/permissions/index.ts`

Four roles defined:

| Role | Slug | Description |
|------|------|-------------|
| CRM Admin | `crm:admin` | Full access; manage pipelines, campaigns, export |
| Sales Manager | `crm:sales-manager` | Full access to all records; can approve high-value deals; access analytics |
| Sales Rep | `crm:sales-rep` | Own records only; cannot delete; cannot access analytics |
| Viewer | `crm:viewer` | Read-only across all records |

Permission matrix (resource → roles with access):

| Resource | Admin | Sales Manager | Sales Rep | Viewer |
|----------|-------|---------------|-----------|--------|
| contacts | CRUD | CRUD | CRU (own) | R |
| accounts | CRUD | CRUD | CRU (own) | R |
| leads | CRUD | CRUD | CRU (own) | R |
| deals | CRUD | CRUD | CRU (own) | R |
| activities | CRUD | CRUD | CRU (own) | R |
| pipelines | CRUD | CRUD | R | R |
| campaigns | CRUD | CRUD | R | R |
| segments | CRUD | CRUD | R | R |
| analytics | R | R | — | — |
| import/export | Yes | Yes | — | — |

Permission interface pattern:

```typescript
export const CRM_PERMISSIONS = {
  "contact:read":   ["crm:admin", "crm:sales-manager", "crm:sales-rep", "crm:viewer"],
  "contact:create": ["crm:admin", "crm:sales-manager", "crm:sales-rep"],
  "contact:update": ["crm:admin", "crm:sales-manager", "crm:sales-rep"],
  "contact:delete": ["crm:admin", "crm:sales-manager"],
  "deal:approve":   ["crm:admin", "crm:sales-manager"],
  // ...
} as const;
```

---

## 1.4 Compose Skeleton

File: `composes/crm/server/src/index.ts`

```typescript
export const crmCompose = new Elysia({ prefix: "/crm" })
  .use(contactsRoutes)
  .use(accountsRoutes)
  .use(leadsRoutes)
  .use(dealsRoutes)
  .use(activitiesRoutes)
  .use(pipelinesRoutes)
  .use(campaignsRoutes)
  .use(segmentsRoutes)
  .use(analyticsRoutes)
  .use(importExportRoutes);

export type CrmApp = typeof crmCompose;
```

Shell mount in `apps/server/src/index.ts`:

```typescript
import { crmCompose } from "@projectx/compose-crm-server";
// After platformCompose:
app.use(crmCompose);
```

---

## 1.5 Seed Data

File: `composes/crm/server/src/db/seed/roles.seed.ts`

Seeds:
- 4 roles (crm:admin, crm:sales-manager, crm:sales-rep, crm:viewer) into identity `roles` table
- Default pipelines via `seedPipeline()` from `apps/server/src/infra/db/seed.ts`:
  - `crm.deal` pipeline: Prospecting → Qualification → Proposal → Closed Won → Closed Lost
  - `crm.lead` pipeline: New → Contacted → Qualified → Converted
- Default lead score thresholds in compose config

Pipeline seed pattern:
```typescript
import { seedPipeline } from "apps/server/src/infra/db/seed"
await seedPipeline(orgId, "crm.deal", [
  { name: "Prospecting",   meta: { probability: 10 } },
  { name: "Qualification", meta: { probability: 30 } },
  { name: "Proposal",      meta: { probability: 60 } },
  { name: "Closed Won",    meta: { probability: 100 } },
  { name: "Closed Lost",   meta: { probability: 0 } },
])
await seedPipeline(orgId, "crm.lead", [
  { name: "New" }, { name: "Contacted" }, { name: "Qualified" }, { name: "Converted" },
])
```

Seed contacts/accounts by inserting directly into `persons` (type=`contact`) and `parties` (type=`company`) master tables.

---

## 1.6 Web Shell Mount

File: `composes/crm/web/src/index.ts`

```typescript
export { crmRoutes } from "./routes";
export const crmManifest = {
  id: "crm",
  label: "CRM",
  icon: "Users",
  baseRoute: "/crm",
  roles: ["crm:admin", "crm:sales-manager", "crm:sales-rep", "crm:viewer"],
};
```

Mount in `apps/web/src/router.ts`:

```typescript
import { crmRoutes, crmManifest } from "@projectx/compose-crm-web";
// Add crmRoutes to TanStack route tree under /crm
```

---

## Deliverables Checklist

- [ ] `composes/crm/server/package.json`
- [ ] `composes/crm/server/tsconfig.json`
- [ ] `composes/crm/server/src/index.ts` (skeleton)
- [ ] `composes/crm/server/src/permissions/index.ts`
- [ ] `composes/crm/server/src/db/schema/index.ts` (barrel)
- [ ] `composes/crm/server/src/db/seed/roles.seed.ts`
- [ ] `composes/crm/web/package.json`
- [ ] `composes/crm/web/tsconfig.json`
- [ ] `composes/crm/web/src/index.ts`
- [ ] `apps/server/src/index.ts` — add `.use(crmCompose)`
- [ ] `apps/web/src/router.ts` — add `...crmRoutes`
