# CRM Web UI — Complete Rebuild Plan

## Goal

Replace all placeholder CRM pages with fully functional, data-connected pages. Match the platform compose's design system exactly: `@projectx/ui` components, consistent token usage, AuthGuard integration.

## Reference

- Gold-standard page: `composes/platform/web/src/routes/dashboard.users.tsx`
- UI package: `packages/ui/src/`
- Platform layout: `composes/platform/web/src/routes/dashboard.layout.tsx`

## Core Rules

- Use `@projectx/ui` for every component (no raw HTML buttons/tables)
- Replace Eden Treaty client with a class-based `CrmApiClient` (like `platformApi`)
- All list pages: PageHeader + search/filters + Table + skeleton + pagination + Create/Edit dialogs
- All detail pages: tabs layout (Details | Activities | Relations)
- Auth: import `useAuthStore` from `@projectx/platform-web`, wrap layout in `AuthGuard`

## Current Pain Points

| Problem | Fix |
|---|---|
| `routes/layout.tsx` is bare `<Outlet />` | Add NavBar + AuthGuard |
| `lib/api.ts` Eden Treaty — types unreliable since routes use `(ctx as any)` | Replace with class-based `CrmApiClient` using `VITE_API_URL` absolute URLs |
| All 14 route pages are static placeholders | Full implementation per phase plan |
| `apps/web/src/globals.css` missing CRM `@source` | Add `@source` for CRM web |
| Stores use wrong Eden Treaty call shape | Rewrite stores to use `crmApi.*` methods |
| Pages used TanStack Query | Use `useState + useEffect` instead |
| API client used relative paths (`/crm/...`) | Use absolute `VITE_API_URL + "/crm/..."` — relative hits Vite (10060), not API server (10050) |

## Implementation Phases

| Phase | File | Description |
|---|---|---|
| 1 | `01-foundation.plan.md` | Layout, NavBar, API client, globals.css fix |
| 2 | `02-contacts-accounts-leads.plan.md` | 3 entities × (list + detail) |
| 3 | `03-deals.plan.md` | Deals kanban + list toggle |
| 4 | `04-activities-campaigns-segments.plan.md` | Activities, Campaigns, Segments |
| 5 | `05-dashboard.plan.md` | Dashboard KPIs + activity feed |

## All Files Changed

```
apps/web/src/globals.css                                  ← add @source for crm web
composes/crm/web/src/lib/api.ts                           ← replace with CrmApiClient class
composes/crm/web/src/routes/layout.tsx                    ← NavBar + AuthGuard
composes/crm/web/src/routes/dashboard.tsx                 ← KPI cards + activity feed
composes/crm/web/src/routes/contacts/index.tsx            ← list + create/edit
composes/crm/web/src/routes/contacts/detail.tsx           ← profile + tabs
composes/crm/web/src/routes/accounts/index.tsx            ← list + create/edit
composes/crm/web/src/routes/accounts/detail.tsx           ← profile + contacts + deals
composes/crm/web/src/routes/leads/index.tsx               ← list + status filter + convert
composes/crm/web/src/routes/leads/detail.tsx              ← profile + convert action
composes/crm/web/src/routes/deals/index.tsx               ← kanban + list toggle
composes/crm/web/src/routes/deals/detail.tsx              ← deal info + activities
composes/crm/web/src/routes/activities/index.tsx          ← list + type filter + create
composes/crm/web/src/routes/campaigns/index.tsx           ← list + status filter
composes/crm/web/src/routes/campaigns/detail.tsx          ← stats + contacts
composes/crm/web/src/routes/segments/index.tsx            ← list + count
composes/crm/web/src/routes/segments/detail.tsx           ← rules + contacts
composes/crm/web/src/stores/contacts.ts                   ← update to class client
composes/crm/web/src/stores/deals.ts                      ← update to class client
composes/crm/web/src/stores/activities.ts                 ← update to class client
composes/crm/web/src/stores/pipelines.ts                  ← update to class client
```

## Risks

- Eden Treaty call shapes in stores will break before the client swap — do foundation first
- Deals kanban requires pipelines endpoint to load stages first
- Auth guard import path: `@projectx/platform-web` must export `AuthGuard` + `useAuthStore`
