# CRM — Phase 9: Shell Integration

## Goal

Wire the CRM compose into both shells so the server exposes `/crm/*` routes
and the web app renders CRM pages. Must be done **after Phase 8** is complete.

---

## 9.0 Prerequisites Checklist

Before touching shell files, confirm:

- [ ] `composes/crm/server/src/index.ts` exports `createCrmCompose(mediator)` and `CrmApp`
- [ ] `composes/crm/server/src/db/schema/crm.ts` exists with all tables
- [ ] `composes/crm/web/src/routes/index.ts` exports `crmRoutes` array
- [ ] `bun run typecheck` passes inside `composes/crm/server/` and `composes/crm/web/`

---

## 9.1 Server Shell — 4 Files to Edit

### File 1: `apps/server/tsconfig.json`

Add to `compilerOptions.paths`:

```json
"@projectx/crm-server": ["../../composes/crm/server/src/index.ts"],
"@projectx/crm-server/*": ["../../composes/crm/server/src/*"]
```

Full paths block after edit (for reference):
```json
{
  "paths": {
    "@core": ["./src/core/index.ts"],
    "@core/*": ["./src/core/*"],
    "@modules/*": ["./src/modules/*"],
    "@infra/*": ["./src/infra/*"],
    "@db/*": ["./src/infra/db/*"],
    "@projectx/platform-server": ["../../composes/platform/server/src/index.ts"],
    "@projectx/platform-server/*": ["../../composes/platform/server/src/*"],
    "@projectx/crm-server": ["../../composes/crm/server/src/index.ts"],
    "@projectx/crm-server/*": ["../../composes/crm/server/src/*"]
  }
}
```

---

### File 2: `apps/server/src/infra/db/schema/index.ts`

Add one line at the end:
```typescript
export * from "./crm";
```

---

### File 3: `apps/server/src/index.ts`

After the platform compose dynamic import block, add:

```typescript
// CRM Compose
const { createCrmCompose } = await import("@projectx/crm-server");
const crmCompose = createCrmCompose(mediator);
app = app.use(crmCompose);
```

Full import + register pattern (copy exact style from platform compose block):
```typescript
// Dynamic import to avoid circular dependency
const { createPlatformCompose } = await import("@projectx/platform-server");
const platformCompose = createPlatformCompose(mediator);

// ↓ Add this block immediately after
const { createCrmCompose } = await import("@projectx/crm-server");
const crmCompose = createCrmCompose(mediator);

let app: any = new Elysia()
  .use(cors())
  .use(swagger())
  .use(bearer())
  .use(platformCompose)
  .use(crmCompose)        // ← add here
  .get("/health", ...)
  ...
```

---

### File 4: Run DB migration

From `apps/server/`:
```bash
bun run db:generate    # generates migration for new crm_* tables
bun run db:migrate     # applies migration
```

Confirm tables created: `crm_contacts`, `crm_accounts`, `crm_deals`, `crm_pipelines`,
`crm_pipeline_stages`, `crm_leads`, `crm_activities`, `crm_segments`,
`crm_campaigns`, `crm_campaign_stats`, `crm_email_threads`, `crm_custom_fields`.

---

## 9.2 Web Shell — 3 Files to Edit

### File 1: `apps/web/package.json`

Add to `dependencies`:
```json
"@projectx/crm-web": "workspace:*"
```

Then install:
```bash
bun install
```

---

### File 2: `apps/web/tsconfig.json`

Add to `compilerOptions.paths`:
```json
"@projectx/crm-web": ["../../composes/crm/web/src"],
"@projectx/crm-web/*": ["../../composes/crm/web/src/*"]
```

Full paths block after edit:
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@projectx/platform-web": ["../../composes/platform/web/src"],
    "@projectx/platform-web/*": ["../../composes/platform/web/src/*"],
    "@projectx/crm-web": ["../../composes/crm/web/src"],
    "@projectx/crm-web/*": ["../../composes/crm/web/src/*"]
  }
}
```

---

### File 3: `apps/web/src/router.tsx`

Import CRM routes and spread into the route tree:

```typescript
import { Route as indexRoute } from "@/routes/index";
import { platformRoutes } from "@projectx/platform-web";
import { crmRoutes } from "@projectx/crm-web";          // ← add
import { sharedRootRoute } from "@projectx/shared-router";
import { createRouter } from "@tanstack/react-router";

const routeTree = sharedRootRoute.addChildren([
  indexRoute,
  ...platformRoutes,
  ...crmRoutes,          // ← add
]);

export const router = createRouter({
  routeTree,
  context: {},
  defaultErrorComponent: ({ error }) => {
    if (error?.message === "UNAUTHENTICATED") {
      window.location.href = "/login";
      return null;
    }
    throw error;
  },
  defaultNotFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    </div>
  ),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

---

## 9.3 CRM Web Package — Required Export Shape

`composes/crm/web/src/routes/index.ts` MUST export:

```typescript
export const crmRoutes = [
  crmLayoutRoute.addChildren([
    crmDashboardRoute,
    crmContactsRoute,
    crmContactDetailRoute,
    crmLeadsRoute,
    crmDealsRoute,
    crmDealsPipelineRoute,
    crmDealDetailRoute,
    crmAccountsRoute,
    crmAccountDetailRoute,
    crmActivitiesRoute,
    crmCampaignsRoute,
    crmCampaignDetailRoute,
    crmSegmentsRoute,
    crmAnalyticsRoute,
  ]),
];
```

All route components must use `sharedRootRoute` from `@projectx/shared-router` as parent.

---

## 9.4 Seed Data

After migration, run seed to create default pipeline + roles:

```typescript
// composes/crm/server/src/db/seed/crm.ts
export async function seedCrm(db: DrizzleDb) {
  // 1. Insert default pipeline
  await db.insert(crmPipeline).values({
    id: generateId(),
    orgId: PLATFORM_ORG_ID,
    name: "Sales Pipeline",
    isDefault: true,
  }).onConflictDoNothing();

  // 2. Insert default stages
  const pipelineId = ...; // from above
  await db.insert(crmPipelineStage).values([
    { id: generateId(), pipelineId, name: "Lead In",      order: 1, probability: 10 },
    { id: generateId(), pipelineId, name: "Meeting",      order: 2, probability: 30 },
    { id: generateId(), pipelineId, name: "Proposal",     order: 3, probability: 50 },
    { id: generateId(), pipelineId, name: "Negotiation",  order: 4, probability: 70 },
    { id: generateId(), pipelineId, name: "Closed Won",   order: 5, probability: 100 },
  ]).onConflictDoNothing();
}
```

Call `seedCrm` from `apps/server/src/index.ts` after boot (or via a separate seed script).

---

## 9.5 Verification Checklist

After all edits:

- [ ] `bun run typecheck` from repo root — zero errors
- [ ] `GET /crm/contacts` returns 401 (not 404) — route is mounted
- [ ] `GET /crm/pipeline` returns pipeline data
- [ ] Web app navigates to `/crm` without 404
- [ ] TanStack Router DevTools shows CRM routes in route tree
- [ ] DB tables exist: `psql -c "\dt crm_*"`

---

## 9.6 Common Mistakes

- Forgetting `bun install` after adding package.json dependency — routes import will fail
- Adding tsconfig path but not package.json dep — TypeScript resolves but bundler doesn't
- Using `import()` instead of dynamic `import()` in `apps/server/src/index.ts` — causes circular dep error at boot
- Not re-exporting schema from `apps/server/src/infra/db/schema/index.ts` — Drizzle migration won't pick up new tables
- `crmRoutes` not using `sharedRootRoute` as parent — TanStack Router throws on tree merge
