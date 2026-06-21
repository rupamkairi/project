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

Replace Eden Treaty with a class-based client matching the platform pattern.
Eden Treaty is unreliable here because all server routes use `(ctx as any)` — no type inference.

```typescript
import { useAuthStore } from "@projectx/platform-web";

class CrmApiClient {
  private get token() {
    return useAuthStore.getState().token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<{ data?: T; error?: string }> {
    const res = await fetch(`/crm${path}`, {
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

  // Contacts
  getContacts(params?: Record<string, any>) { ... }
  getContact(id: string) { ... }
  createContact(body: any) { ... }
  updateContact(id: string, body: any) { ... }
  deleteContact(id: string) { ... }

  // Accounts — same CRUD shape
  // Leads — same CRUD shape + convertLead(id)
  // Deals — same CRUD + moveDeal(id, stageId)
  // Activities — same CRUD
  // Pipelines — getPipelines(), getPipeline(id)
  // Campaigns — same CRUD
  // Segments — same CRUD
  // Analytics — getAnalytics(params)
}

export const crmApi = new CrmApiClient();
```

All stores and pages use `crmApi.*` methods.

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
