# Phase 1 — Foundation

## Goal

Wire up the CRM shell: layout with navigation, auth guard, a working API client, and Tailwind source scanning.

---

## Step 1 — Fix `globals.css` Tailwind source

**File:** `apps/web/src/globals.css`

Add CRM web to `@source` list so Tailwind scans CRM classes:

```css
@source "../../../composes/crm/web/src";
```

---

## Step 2 — Replace API client

**File:** `composes/crm/web/src/lib/api.ts`

Replace Eden Treaty with a class-based client. Eden Treaty is unreliable here because all server
routes use `(ctx as any)` — no type inference. API calls must use an absolute URL via
`VITE_API_URL` — relative paths like `/crm/...` hit Vite (port 10060), not the API server (port 10050).

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

  // Contacts — server filters persons master by type=contact
  getContacts(params?: Record<string, any>) { return this.request("/contacts"); }
  getContact(id: string) { return this.request(`/contacts/${id}`); }
  createContact(body: any) { return this.request("/contacts", { method: "POST", body: JSON.stringify(body) }); }
  updateContact(id: string, body: any) { return this.request(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  deleteContact(id: string) { return this.request(`/contacts/${id}`, { method: "DELETE" }); }

  // Accounts — server filters parties master by type=company
  getAccounts(params?: Record<string, any>) { return this.request("/parties"); }
  getAccount(id: string) { return this.request(`/parties/${id}`); }
  createAccount(body: any) { return this.request("/parties", { method: "POST", body: JSON.stringify(body) }); }

  // Leads — server filters persons master by type=lead
  getLeads(params?: Record<string, any>) { return this.request("/leads"); }
  getLead(id: string) { return this.request(`/leads/${id}`); }
  createLead(body: any) { return this.request("/leads", { method: "POST", body: JSON.stringify(body) }); }
  convertLead(id: string) { return this.request(`/leads/${id}/convert`, { method: "POST" }); }

  // Deals — crm_deals (CRM-owned detail table)
  getDeals(params?: Record<string, any>) { return this.request("/deals"); }
  getDeal(id: string) { return this.request(`/deals/${id}`); }
  createDeal(body: any) { return this.request("/deals", { method: "POST", body: JSON.stringify(body) }); }
  updateDeal(id: string, body: any) { return this.request(`/deals/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  moveDeal(id: string, stageId: string) { return this.request(`/deals/${id}/move`, { method: "POST", body: JSON.stringify({ stageId }) }); }

  // Pipelines — server reads from pipelines master (entityType=crm.deal)
  getPipelines(params?: Record<string, any>) { return this.request("/pipelines"); }
  getPipelineStages(id: string) { return this.request(`/pipelines/${id}/stages`); }

  // Activities — server reads from activities master
  getActivities(params?: Record<string, any>) { return this.request("/activities"); }
  createActivity(body: any) { return this.request("/activities", { method: "POST", body: JSON.stringify(body) }); }

  // Campaigns, Segments — CRM-owned detail tables
  getCampaigns(params?: Record<string, any>) { return this.request("/campaigns"); }
  getSegments(params?: Record<string, any>) { return this.request("/segments"); }
  getSegmentContacts(id: string) { return this.request(`/segments/${id}/contacts`); }

  // Analytics
  getAnalytics() { return this.request("/analytics/summary"); }
}

export const crmApi = new CrmApiClient();
```

All stores and pages use `crmApi.*` methods. Pages use `useState + useEffect` (no TanStack Query).

---

## Step 3 — CRM Layout with NavBar + AuthGuard

**File:** `composes/crm/web/src/routes/layout.tsx`

Mirror `composes/platform/web/src/routes/dashboard.layout.tsx` exactly, with CRM nav items.

```typescript
import { NavBar, Avatar, AvatarFallback, DropdownMenu, ... } from "@projectx/ui"
import { AuthGuard, useAuthStore } from "@projectx/platform-web"
import { useNavigate, Outlet } from "@tanstack/react-router"
import {
  LayoutDashboard, Users, Building2, UserPlus, 
  TrendingUp, Activity, Megaphone, Filter
} from "lucide-react"

const NAV_ITEMS = [
  { label: "Dashboard",  href: "/crm",            icon: LayoutDashboard, exact: true },
  { label: "Contacts",   href: "/crm/contacts",   icon: Users },
  { label: "Accounts",   href: "/crm/accounts",   icon: Building2 },
  { label: "Leads",      href: "/crm/leads",      icon: UserPlus },
  { label: "Deals",      href: "/crm/deals",      icon: TrendingUp },
  { label: "Activities", href: "/crm/activities", icon: Activity },
  { label: "Campaigns",  href: "/crm/campaigns",  icon: Megaphone },
  { label: "Segments",   href: "/crm/segments",   icon: Filter },
]

export default function CrmLayout() {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <NavBar items={NAV_ITEMS} actions={<UserMenu />} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  )
}
```

`UserMenu` — identical to platform's: avatar initials, dropdown with Sign out action.

---

## Step 4 — Update Zustand stores

**Files:** `stores/contacts.ts`, `stores/deals.ts`, `stores/activities.ts`, `stores/pipelines.ts`

Replace all `crmApi.contacts.get()` Eden Treaty calls with `crmApi.getContacts()` etc.

Pattern per store:
```typescript
fetchContacts: async (params?) => {
  set({ loading: true, error: null });
  const { data, error } = await crmApi.getContacts(params);
  if (error) set({ error, loading: false });
  else set({ contacts: data?.data ?? [], loading: false });
}
```

---

## Checks

- CRM nav renders with all 8 items
- Navigating `/crm/contacts` doesn't redirect (AuthGuard passes)
- `crmApi.getContacts()` returns `{ data, pagination }` or `{ error }`
