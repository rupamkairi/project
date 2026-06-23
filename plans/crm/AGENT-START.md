# CRM Compose — Agent Start

**Read first:** `plans/AGENT-START.md` (universal bootstrap: path aliases, layer rules, existing modules, compose pattern).

Then return here for CRM-specific context.

---

## Goal

Implement CRM compose modeled on Twenty CRM.
Full plan: `plans/crm/00-index.md` (read this for phase ordering).

---

## Phase Execution Order

### Backend

1. `01-foundation.md` — scaffolding, packages, DB seed. **Must complete before any other phase.**
2. `02-entities.md` — DB schema. Complete before routes.
3. `03-backend-api.md` — REST routes.
4. `04-backend-logic.md` — FSMs, jobs, rules, hooks.
5. `05-integrations.md` — plugin wiring (search, notification, email-sync, telephony).
6. `06-frontend-structure.md` — web package layout, route tree, API client, Zustand stores.
7. `07-frontend-pages.md` — all 13 pages.
8. `08-frontend-components.md` — reusable CRM-specific components.
9. `09-shell-integration.md` — **integration gate.** Wire into server + web shell. Run migration. Verify.

Do not skip phases. Do not start Phase N before Phase N-1 is fully complete.
**Phase 9 is the integration gate — nothing is live until this phase completes.**

### Web UI Implementation Detail (read after Phase 9)

These plans provide component-level specs for the full web layer rebuild.
Read `10-web-overview.md` first — it maps pain points and all changed files.
Then execute phases 11–15 in order.

10. `10-web-overview.md` — pain points, design rules, full file change manifest.
11. `11-web-foundation.md` — layout shell (NavBar + AuthGuard), `CrmApiClient` class, Tailwind `@source`, store rewire.
12. `12-web-contacts-accounts-leads.md` — Contacts, Accounts, Leads list + detail pages.
13. `13-web-deals.md` — Deals kanban + list toggle, deal card, stage move dialogs.
14. `14-web-activities-campaigns-segments.md` — Activities, Campaigns, Segments pages.
15. `15-web-dashboard.md` — Dashboard KPI cards, activity feed, pipeline snapshot.

### Operations & Integration Reference (read before/during implementation)

These are runbooks discovered during CRM implementation. **Read 18 before starting any new compose.**

16. `16-data-seeding.md` — DB push process, CRM dev users, pipeline seed, full local setup order.
17. `17-compose-credentials-integration.md` — `VITE_API_URL`, ports, auth token flow, login card, Vite/tsconfig aliases.
18. `18-missed-integrations.md` — All pitfalls with causes + fixes. Includes a quick checklist at the end.

---

## Compose Identity

| Property | Value |
|----------|-------|
| Compose name | `crm` |
| Server package | `@projectx/crm-server` |
| Web package | `@projectx/crm-web` |
| Server path | `composes/crm/server/` |
| Web path | `composes/crm/web/` |
| Elysia prefix | `/crm` |
| Export fn | `createCrmCompose(mediator, bus, scheduler)` |
| Export type | `CrmApp` |
| Manifest export | `crmManifest` |
| DB table prefix | `crm_` |
| Drizzle object prefix | `crm` (e.g. `crmContact`, `crmDeal`) |

---

## DB Tables — Master Table Architecture (Phase 2)

> **Master Table Architecture** — never recreate `persons`, `parties`, `pipelines`, `pipeline_stages`, or `activities` in the CRM compose. These are owned by foundation modules and already exist in the DB. Filter them by `type` + `organization_id`. See `docs/master-tables.md`.

See `plans/crm/02-entities.md` for full field specs.

### Master tables (read/filter only — already exist in DB)

| Master table | Module | CRM filter |
|-------------|--------|------------|
| `parties` | party | `type = "company"` (accounts) |
| `persons` | party | `type = "contact"` or `type = "lead"` |
| `pipelines` | pipeline | `entityType = "crm.deal"` or `"crm.lead"` |
| `pipeline_stages` | pipeline | stages per CRM pipeline |
| `activities` | activity | `call \| email \| meeting \| note \| task \| log` |
| `geo_addresses` | geo | polymorphic — linked to persons/parties |

Reads use mediator queries: `party.listPersons`, `party.listParties`, `pipeline.listStages`, `activity.list`.
Writes use mediator commands: `party.createPerson`, `party.createParty`, `activity.log`.

Pipeline seeding: use `seedPipeline(orgId, 'crm.deal', stages)` from `apps/server/src/infra/db/seed.ts`.

### Detail tables (crm-owned — create these in Phase 2)

| Drizzle object | SQL table | Key fields |
|----------------|-----------|------------|
| `crmLead` | `crm_leads` | person_id, party_id, stage_id, ownerId, status (FSM), interest, estimatedValue, qualifiedAt, convertedAt, dealId |
| `crmDeal` | `crm_deals` | title, person_id, party_id, stage_id, pipelineId, ownerId, status (FSM), value, probability, expectedCloseDate, rottingAt, approvalStatus |
| `crmSegment` | `crm_segments` | name, filters (jsonb RuleExpr), contactCount, lastComputedAt |
| `crmCampaign` | `crm_campaigns` | name, type, status (FSM), segment_id, templateId, scheduledAt, sentAt, recipient/delivery counts |
| `crmCampaignContact` | `crm_campaign_contacts` | campaign_id, person_id, status, sentAt, openedAt, clickedAt |
| `crmEmailThread` | `crm_email_threads` | externalThreadId, provider, person_id, subject, lastMessageAt (P1) |
| `crmEmailMessage` | `crm_email_messages` | thread_id, externalMessageId, from, to, bodyText, receivedAt, direction (P1) |

All detail tables link to masters via plain `text("..._id")` columns — no `references()`.

---

## Modules to Use via Mediator

| Need | Module | Command/Query type prefix |
|------|--------|--------------------------|
| User/actor lookup | identity | `identity.getActor`, `identity.getPermissions` |
| File attachments | document | `document.create`, `document.list` |
| Notifications | notification | `notification.send` |
| Analytics events | analytics | `analytics.track` |
| Background jobs | workflow | `workflow.schedule` |

---

## Plugins Needed

| Plugin | When | Config source |
|--------|------|---------------|
| `@projectx/plugin-notification-server` | Phase 5 | env: `MAILER_*` |
| `@projectx/plugin-payment-server` | Not needed for CRM | — |
| `@projectx/plugin-search-server` | Built-in (PgSearchAdapter already registered at boot) | — |
| `email-sync` (P1) | Phase 5 | env: `EMAIL_SYNC_*` — wire via `EmailSyncAdapter` |
| `telephony` (P2) | Phase 5 | env: `TELEPHONY_*` — wire via `TelephonyAdapter` |

Search: do NOT add a search plugin. Use the existing `SearchAdapter` from `bootRegistry.adapters.get("search")` passed via compose factory arg or mediator context.

---

## Permissions Matrix

Roles to define in seed:
- `crm:admin` — full access
- `crm:sales-manager` — full access to all contacts/deals, can reassign
- `crm:rep` — own contacts/deals only
- `crm:viewer` — read-only

Route guard pattern (copy from platform compose auth guard):
```typescript
// in route handler
const actor = ctx.actor; // from auth plugin context
if (!actor.roles.some(r => ["crm:admin","crm:sales-manager"].includes(r))) {
  throw new AuthorizationError("Insufficient role");
}
```

---

## Frontend Framework

- Router: TanStack Router v1 (file-based flat routes)
- Data: TanStack Query v5
- State: Zustand v4
- UI: shadcn/ui zinc + `@projectx/ui` components
- Drag-and-drop (Kanban): `@dnd-kit/core` + `@dnd-kit/sortable`
- Charts: recharts
- API: Eden Treaty (`treaty<CrmApp>(origin)`)

Route file naming: `{parent}.{segment}.tsx`
Example: `crm.contacts.tsx`, `crm.contacts.$id.tsx`, `crm.deals.pipeline.tsx`

---

## Key FSMs to Implement (Phase 4)

1. **Lead FSM:** `new → contacted → qualified → converted | disqualified`
2. **Deal FSM:** `open → won | lost | abandoned` (stage moves are separate from FSM)
3. **Campaign FSM:** `draft → scheduled → sending → sent | cancelled | failed`
4. **Activity FSM:** `pending → done | cancelled` (for tasks/meetings)

---

## Shell Registration (after implementation)

Two files need updating in `apps/server/`:

**`src/index.ts`** — add after platform compose:
```typescript
const { createCrmCompose } = await import("@projectx/crm-server");
const crmCompose = createCrmCompose(mediator, bus, bootRegistry.scheduler);
app = app.use(crmCompose);
```

**`tsconfig.json`** — add to paths:
```json
"@projectx/crm-server": ["../../composes/crm/server/src/index.ts"],
"@projectx/crm-server/*": ["../../composes/crm/server/src/*"]
```

**`src/infra/db/schema/index.ts`** — add:
```typescript
export * from "./crm";
```
