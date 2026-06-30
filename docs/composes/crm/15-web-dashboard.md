# Phase 5 — Dashboard

## Goal

Replace the 4 hardcoded zero-cards with real data. Add activity feed + pipeline snapshot.

---

## Layout

```
┌─ PageHeader "CRM" ─────────────────────────────────────────────────┐
├─ KPI Row: 4 cards ──────────────────────────────────────────────────┤
├─ Two columns ───────────────────────────────────────────────────────┤
│  Left (2/3):  Recent Activities                                      │
│  Right (1/3): Pipeline Snapshot                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## KPI Cards

Load via `crmApi.getAnalytics()` → `GET /crm/analytics/summary`

Counts are sourced from master tables: `contactCount` from `persons` (type=contact),
`openLeadCount` from `persons` (type=lead) joined `crm_leads` (status≠converted).
`activeDealCount` and `pipelineValue` from `crm_deals` (status=open).

```typescript
const KPI_CARDS = [
  { label: "Total Contacts", key: "contactCount",    icon: Users,        href: "/crm/contacts"  },
  { label: "Active Deals",   key: "activeDealCount", icon: TrendingUp,   href: "/crm/deals"     },
  { label: "Pipeline Value", key: "pipelineValue",   icon: DollarSign,   href: "/crm/deals"     },
  { label: "Open Leads",     key: "openLeadCount",   icon: UserPlus,     href: "/crm/leads"     },
]
```

Each card is a `Card` from `@projectx/ui`, clickable (link to the relevant section), with skeleton while loading.

Pipeline Value formatted via `Intl.NumberFormat` (compact: `$12.4k`).

---

## Recent Activities

Load: `crmApi.getActivities({ limit: 8, sort: "dueAt:desc" })`

Each row:
- Type icon (colored by type) 
- Subject text
- Contact name (linked to detail)
- Time ago (e.g. "2h ago", "Yesterday")

Use `Skeleton` while loading. If empty: `EmptyState` from `@projectx/ui`.

Link to full activities list: "View all →" at bottom.

---

## Pipeline Snapshot

Load:
1. `crmApi.getPipelines()` → pick `isDefault: true` (server reads `pipelines` master where `entityType = "crm.deal"`)
2. `crmApi.getPipelineStages(pipelineId)` → stages (server reads `pipeline_stages` master)
3. `crmApi.getDeals({ pipelineId })` → group by `stage_id` client-side

Render as a vertical list of stages with deal count + total value:

```
Lead In       ●●● 3 deals  $4,500
Meeting       ●● 2 deals   $12,000
Proposal      ● 1 deal     $8,000
Negotiation   — 0 deals
Closed Won    ● 1 deal     $6,500
```

Progress bar per stage: `value.amount / totalPipelineValue` as `<Progress>` from `@projectx/ui`.

---

## Server endpoint

`GET /crm/analytics/summary` already exists via `createAnalyticsRoutes`.

Check `routes/analytics.ts` — if it returns a summary shape, reuse it. If not, add:

```typescript
.get("/summary", async (ctx) => {
  const actor = (ctx as any).actor;
  const result = await mediator.query({
    type: "crm.getAnalyticsSummary",
    params: {},
    actorId: actor?.id,
    orgId: actor?.orgId,
  });
  return result;
})
```

Expected response shape:
```typescript
{
  contactCount: number;
  activeDealCount: number;
  pipelineValue: number;     // sum of open deal values
  openLeadCount: number;
}
```

---

## Checks

- Dashboard loads KPI cards with skeleton → real numbers
- Clicking a KPI card navigates to the right section
- Recent activities list shows up to 8 entries
- Pipeline snapshot shows stage-by-stage breakdown
- Empty states render when no data exists (new environment)
