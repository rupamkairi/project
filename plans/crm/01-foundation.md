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

All CRM tables use prefix `crm_`. All include `baseColumns` (id, organizationId, createdAt, updatedAt, deletedAt, version, meta).

Tables created in this phase (stubs — full field specs in Phase 2):

```
crm_accounts         Account (company/org)
crm_contacts         Contact (person)
crm_leads            Lead
crm_deals            Deal
crm_pipelines        Pipeline
crm_pipeline_stages  PipelineStage
crm_activities       Activity
crm_campaigns        Campaign
crm_campaign_contacts Campaign-Contact join
crm_segments         Segment
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
- Default pipeline: "Sales Pipeline" with 5 stages (New, Contacted, Qualified, Proposal, Won)
- Default lead score thresholds in compose config

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
