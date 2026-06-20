# CRM Compose — Implementation Plan Index

Agent: claude
Status: in-progress
Reference platform: [Twenty CRM](https://github.com/twentyhq/twenty)
Gap analysis: [docs/composes/crm.md §12](../../docs/composes/crm.md)

---

## Goal

Implement a full-stack CRM compose modeled on Twenty CRM — contacts, accounts, deals, activities,
pipelines, campaigns, and email/calendar integration — fully respecting the ProjectX architecture
(Core → Module → Compose → Shell). Includes both server (Elysia) and web (React + TanStack Router).

---

## Plan Files

| File | Scope |
|------|-------|
| [01-foundation.md](./01-foundation.md) | Package scaffolding, DB schema setup, compose skeleton, permissions matrix |
| [02-entities.md](./02-entities.md) | All compose-owned DB entities with field specs |
| [03-backend-api.md](./03-backend-api.md) | Full REST route catalog — every endpoint with method, path, auth, request/response shape |
| [04-backend-logic.md](./04-backend-logic.md) | Hooks, scheduled jobs, FSMs, rule engine registrations |
| [05-integrations.md](./05-integrations.md) | Plugin wiring — search, notification, email-sync (P1), calendar-sync (P1), telephony (P2) |
| [06-frontend-structure.md](./06-frontend-structure.md) | Web compose: package layout, routing tree, layout components, nav manifest |
| [07-frontend-pages.md](./07-frontend-pages.md) | Every page/view — layout, data requirements, interactions |
| [08-frontend-components.md](./08-frontend-components.md) | Reusable CRM-specific components: cards, panels, forms, kanban, timeline |
| [09-shell-integration.md](./09-shell-integration.md) | Wire compose into server + web shells: tsconfig, package.json, router, DB migration, seed, verification |

---

## Phase Overview

```
Phase 1 — Foundation       Packages, DB schema, skeleton compose, seed data
Phase 2 — Entities         Account + Contact + Lead + Deal + Pipeline + Activity + Campaign + Segment
Phase 3 — Backend API      CRUD routes, search, import/export, webhooks
Phase 4 — Backend Logic    FSMs, hooks, jobs, rule registrations
Phase 5 — Integrations     Search (PG FTS), Notification wiring, Email-sync P1, Calendar-sync P1
Phase 6 — Frontend Shell   Route tree, layout, nav, global stores
Phase 7 — Frontend Pages   All views (list, detail, kanban, form, dashboard)
Phase 8 — Frontend Comps   Shared CRM components (contact card, timeline, deal card, etc.)
Phase 9 — Shell Wiring     Server tsconfig + index.ts + schema export; web package.json + tsconfig + router
```

---

## Architecture Position

```
apps/server (Shell)
  └── .use(crmCompose)           ← Phase 1

composes/crm/
  server/                        ← Phases 1-5
    src/
      index.ts                   ← crmCompose (Elysia) + CrmApp export
      routes/                    ← Phase 3
      hooks/                     ← Phase 4
      jobs/                      ← Phase 4
      permissions/               ← Phase 1
      db/
        schema/                  ← Phase 2
        seed/                    ← Phase 1
  web/                           ← Phases 6-8
    src/
      routes/                    ← Phase 7
      components/                ← Phase 8
      hooks/                     ← Phase 6
      stores/                    ← Phase 6
      lib/api.ts                 ← Phase 6

apps/web (Shell)
  └── ...crmRoutes               ← Phase 6
```

---

## Module Dependencies

The CRM compose uses the following modules (all pre-existing):

| Module | Used for |
|--------|---------|
| `identity` | Actor lookup, org context, role checks |
| `catalog` | Product linking on deals (optional) |
| `workflow` | Deal approval workflows, follow-up automation |
| `scheduling` | Meeting scheduling on Activities |
| `notification` | Campaign dispatch, deal alerts, follow-up reminders |
| `document` | Attach documents to contacts/deals |
| `analytics` | Pipeline metrics, rep performance, campaign stats |
| `geo` | Address geocoding for contact/account locations |

---

## P0 Blockers Resolved Before Phase 1

These were addressed in the previous session:
- `search` AdapterType + `PgSearchAdapter` — done
- `email-sync`, `calendar-sync`, `telephony`, `tax`, `fulfillment` AdapterTypes — done

Remaining P0 for CRM:
- `Segment` entity — Phase 2
- `Account` entity — Phase 2
- Campaign segmentation engine — Phase 4

---

## Risks

1. `email-sync` plugin requires OAuth flow — complex to build. Plan scopes the entity model + adapter interface only; plugin implementation is P1 separate task.
2. `custom-objects` API requires dynamic schema migration — deferred to P2.
3. Row-level ACL not in architecture — field-level `sensitive` flag is the current ceiling; document clearly.
