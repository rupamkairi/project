# CRM — Phase 6: Frontend Structure

## Goal

Define the CRM web compose package structure: routing tree, global layout,
navigation manifest, API client (Eden Treaty), and shared stores.
Everything lives in `composes/crm/web/`.

---

## 6.1 Package Layout

```
composes/crm/web/
  package.json              @projectx/compose-crm-web
  tsconfig.json
  src/
    index.ts                exports crmRoutes, crmManifest
    routes/
      index.ts              exports route tree
      layout.tsx            CRM shell layout (sidebar + topbar)
      dashboard.tsx         /crm
      contacts/
        index.tsx           /crm/contacts (list)
        $id.tsx             /crm/contacts/:id (detail)
        new.tsx             /crm/contacts/new
      accounts/
        index.tsx
        $id.tsx
        new.tsx
      leads/
        index.tsx
        $id.tsx
        new.tsx
      deals/
        index.tsx           /crm/deals (list view)
        $id.tsx             /crm/deals/:id
        new.tsx
        pipeline.tsx        /crm/deals/pipeline (kanban view)
      activities/
        index.tsx
        upcoming.tsx
      pipelines/
        index.tsx
        $id.tsx
      campaigns/
        index.tsx
        $id.tsx
        new.tsx
      segments/
        index.tsx
        $id.tsx
        new.tsx
      analytics/
        index.tsx
        pipeline.tsx
        reps.tsx
    components/
      contact-card.tsx
      deal-card.tsx
      activity-timeline.tsx
      kanban-board.tsx
      kanban-column.tsx
      lead-score-badge.tsx
      segment-filter-builder.tsx
      campaign-stats.tsx
      import-modal.tsx
      deal-form.tsx
      contact-form.tsx
      activity-form.tsx
    hooks/
      use-crm-contacts.ts
      use-crm-deals.ts
      use-crm-activities.ts
      use-crm-search.ts
      use-pipeline.ts
    stores/
      crm.store.ts           Zustand: selected pipeline, active filters, search state
    lib/
      api.ts                 Eden Treaty typed client
```

---

## 6.2 Route Tree

TanStack Router conventions. All CRM routes nested under `/crm` layout.

```typescript
// composes/crm/web/src/routes/index.ts
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "@projectx/router";

export const crmLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/crm",
  component: CrmLayout,
});

export const crmRoutes = [
  crmLayoutRoute.addChildren([
    dashboardRoute,         // /crm
    contactsRoute,          // /crm/contacts
    contactDetailRoute,     // /crm/contacts/:id
    contactNewRoute,        // /crm/contacts/new
    accountsRoute,
    accountDetailRoute,
    leadsRoute,
    leadDetailRoute,
    dealsListRoute,         // /crm/deals
    dealsPipelineRoute,     // /crm/deals/pipeline
    dealDetailRoute,        // /crm/deals/:id
    activitiesRoute,
    activitiesUpcomingRoute,
    pipelinesRoute,
    pipelineDetailRoute,
    campaignsRoute,
    campaignDetailRoute,
    segmentsRoute,
    analyticsRoute,
    analyticsPipelineRoute,
    analyticsRepsRoute,
  ]),
];
```

---

## 6.3 CRM Layout Component

File: `composes/crm/web/src/routes/layout.tsx`

```tsx
export function CrmLayout() {
  return (
    <div className="flex h-screen">
      <CrmSidebar />
      <main className="flex-1 overflow-auto">
        <CrmTopbar />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

### Sidebar navigation items

```typescript
const NAV_ITEMS = [
  { label: "Dashboard",   icon: "LayoutDashboard", to: "/crm" },
  { label: "Contacts",    icon: "Users",           to: "/crm/contacts" },
  { label: "Accounts",    icon: "Building2",       to: "/crm/accounts" },
  { label: "Leads",       icon: "UserPlus",        to: "/crm/leads" },
  { label: "Deals",       icon: "TrendingUp",      to: "/crm/deals" },
  { label: "Activities",  icon: "Calendar",        to: "/crm/activities" },
  { label: "Campaigns",   icon: "Megaphone",       to: "/crm/campaigns" },
  { label: "Analytics",   icon: "BarChart2",       to: "/crm/analytics", roles: ["crm:admin", "crm:sales-manager"] },
];
```

---

## 6.4 API Client

File: `composes/crm/web/src/lib/api.ts`

Class-based client (no Eden Treaty — routes use `ctx as any` which breaks inference). All
paths are absolute using `VITE_API_URL` — relative paths hit Vite (port 10060), not the API
server (port 10050).

```typescript
import { useAuthStore } from "@projectx/platform-web";

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/crm";

class CrmApiClient {
  private get token() { return useAuthStore.getState().token; }

  private async request<T>(path: string, init: RequestInit = {}): Promise<{ data?: T; error?: string }> {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...init.headers,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` };
    return { data: body as T };
  }

  // Contacts — server filters persons by type=contact
  getContacts(params?: Record<string, any>) { return this.request("/contacts", { method: "GET" }); }
  getContact(id: string) { return this.request(`/contacts/${id}`); }
  createContact(body: any) { return this.request("/contacts", { method: "POST", body: JSON.stringify(body) }); }
  updateContact(id: string, body: any) { return this.request(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  deleteContact(id: string) { return this.request(`/contacts/${id}`, { method: "DELETE" }); }

  // Accounts — server filters parties by type=company
  getAccounts(params?: Record<string, any>) { return this.request("/parties", { method: "GET" }); }
  getAccount(id: string) { return this.request(`/parties/${id}`); }
  createAccount(body: any) { return this.request("/parties", { method: "POST", body: JSON.stringify(body) }); }
  updateAccount(id: string, body: any) { return this.request(`/parties/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }

  // Leads — server filters persons by type=lead
  getLeads(params?: Record<string, any>) { return this.request("/leads", { method: "GET" }); }
  getLead(id: string) { return this.request(`/leads/${id}`); }
  createLead(body: any) { return this.request("/leads", { method: "POST", body: JSON.stringify(body) }); }
  convertLead(id: string) { return this.request(`/leads/${id}/convert`, { method: "POST" }); }

  // Deals — crm_deals (CRM-owned)
  getDeals(params?: Record<string, any>) { return this.request("/deals", { method: "GET" }); }
  getDeal(id: string) { return this.request(`/deals/${id}`); }
  createDeal(body: any) { return this.request("/deals", { method: "POST", body: JSON.stringify(body) }); }
  updateDeal(id: string, body: any) { return this.request(`/deals/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  moveDeal(id: string, stageId: string) { return this.request(`/deals/${id}/move`, { method: "POST", body: JSON.stringify({ stageId }) }); }

  // Pipelines — server reads from pipelines master (entityType=crm.deal)
  getPipelines(params?: Record<string, any>) { return this.request("/pipelines", { method: "GET" }); }
  getPipeline(id: string) { return this.request(`/pipelines/${id}`); }
  getPipelineStages(id: string) { return this.request(`/pipelines/${id}/stages`); }

  // Activities — server reads from activities master
  getActivities(params?: Record<string, any>) { return this.request("/activities", { method: "GET" }); }
  createActivity(body: any) { return this.request("/activities", { method: "POST", body: JSON.stringify(body) }); }

  // Campaigns, Segments (CRM-owned tables)
  getCampaigns(params?: Record<string, any>) { return this.request("/campaigns", { method: "GET" }); }
  getSegments(params?: Record<string, any>) { return this.request("/segments", { method: "GET" }); }
  getSegmentContacts(id: string) { return this.request(`/segments/${id}/contacts`); }

  // Analytics
  getAnalytics(params?: Record<string, any>) { return this.request("/analytics/summary", { method: "GET" }); }
}

export const crmApi = new CrmApiClient();
```

Pages use `useState + useEffect` (no TanStack Query):

```typescript
// Example in contacts/index.tsx
const [contacts, setContacts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  crmApi.getContacts({ page, search, status }).then(({ data }) => {
    setContacts(data?.data ?? []);
    setLoading(false);
  });
}, [page, search, status]);
```

---

## 6.5 Zustand Store

File: `composes/crm/web/src/stores/crm.store.ts`

```typescript
interface CrmStore {
  // Pipeline view
  activePipelineId: string | null;
  setActivePipeline: (id: string) => void;

  // Deals view mode
  dealsViewMode: "list" | "kanban";
  setDealsViewMode: (mode: "list" | "kanban") => void;

  // Global search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Active filters (per-view, persisted in URL search params)
  contactFilters: ContactFilters;
  dealFilters: DealFilters;
  setContactFilters: (f: Partial<ContactFilters>) => void;
  setDealFilters: (f: Partial<DealFilters>) => void;
}
```

---

## 6.6 CRM Manifest

```typescript
export const crmManifest = {
  id: "crm",
  label: "CRM",
  icon: "Users",
  baseRoute: "/crm",
  description: "Customer relationship management",
  requiredRoles: ["crm:admin", "crm:sales-manager", "crm:sales-rep", "crm:viewer"],
  navItems: NAV_ITEMS,
};
```

---

## 6.7 Design System Usage

Follow `docs/design-system.md` — zinc palette, shadcn/ui.

Key components from `@projectx/ui` used in CRM:
- `DataTable` — contacts list, deals list, activities feed
- `Sheet` — slide-in detail panels (contact detail, deal detail)
- `Dialog` — create/edit forms
- `Command` — global search (CMD+K)
- `Badge` — lead score, deal status, campaign status
- `KanbanBoard` — deals pipeline view (custom component)
- `Avatar` + `AvatarGroup` — deal contacts, team members
- `Timeline` — activity timeline on detail pages
