# Phase 2 — Contacts, Accounts, Leads

All 3 entities share the same UI pattern. Use platform's `dashboard.users.tsx` as the template.

---

## Shared List Page Pattern

Every list page = PageHeader + filter bar + Table + skeleton + pagination + dialogs.

```
┌─ PageHeader ────────────────────────────── [Add Button] ─┐
├─ Search input ──── [Status filter chips] ─────────────────┤
├─ Table ───────────────────────────────────────────────────┤
│  skeleton rows while loading                               │
│  empty state when no results                               │
│  data rows with row actions (edit / delete)                │
├─ Pagination: Prev [x/y] Next ──────────────────────────────┤
└───────────────────────────────────────────────────────────┘
  + Create Dialog (sheet or dialog)
  + Edit Dialog
  + ConfirmDialog for delete
```

---

## 2.1 Contacts

### List — `routes/contacts/index.tsx`

**Columns:** Avatar+Name | Email | Title | Account | Lead Score | Status | Actions

```typescript
import { PageHeader, Button, Input, Table, TableHeader, TableRow,
  TableHead, TableBody, TableCell, Avatar, AvatarFallback,
  StatusBadge, Skeleton, Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, Label, ConfirmDialog } from "@projectx/ui"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
```

Status filters: All | Active | Inactive | Archived

Lead score shown as Badge variant mapped:
- 0–29 → `secondary`, 30–59 → `outline`, 60–79 → `default`, 80+ → `success`

Create/Edit dialog fields: firstName*, lastName*, email, phone, title, department, accountId (select)

**Data:** `useEffect → crmApi.getContacts({ page, search, status }) → setContacts`

> Server returns persons filtered by `type = "contact"` from the `persons` master table.

### Detail — `routes/contacts/detail.tsx`

Layout: two-column on desktop (profile left, tabs right)

```
┌─ [← Back]  Avatar  Name  Title                [Edit] ─────┐
│  Lead Score badge  |  Status badge  |  Last contacted       │
├───────────────────────────────────────────────────────────── │
│  Tabs: Details | Activities | Deals                          │
│                                                              │
│  Details: email, phone, department, account link, owner      │
│  Activities: timeline list (from crmApi.getActivities)       │
│  Deals: table of related deals                               │
└───────────────────────────────────────────────────────────── ┘
```

Load: `crmApi.getContact(contactId)` on mount.

---

## 2.2 Accounts

### List — `routes/accounts/index.tsx`

**Columns:** Name | Domain | Industry | Employees | Status | Actions

> Account data comes from `parties` master (type=`company`) via `crmApi.getAccounts()`.
> Server route calls `party.listParties` query with `type: "company"`.

Status filters: All | Active | Inactive

Create/Edit dialog fields: name*, domain, industry (select), website, employeeCount, description

### Detail — `routes/accounts/detail.tsx`

Tabs: Details | Contacts | Deals

- Contacts tab: contacts whose `party_id` matches this account's master party row
  → `crmApi.getContacts({ partyId: account.id })`
- Deals tab: deals where `party_id === account.id`
  → `crmApi.getDeals({ partyId: account.id })`

---

## 2.3 Leads

### List — `routes/leads/index.tsx`

**Columns:** Avatar+Name | Email | Source | Lead Score | Status | Actions

> Lead data comes from `persons` master (type=`lead`) via `crmApi.getLeads()`, joined with `crm_leads` detail for `status`, `estimatedValue`, and FSM state. Lead score lives in `persons.meta.leadScore`.

Status filters: All | New | Contacted | Qualified | Disqualified

Extra action per row: **Convert** button → opens ConfirmDialog
- On confirm: `crmApi.convertLead(id)` → `POST /crm/leads/:id/convert`
- Server flips `persons.type` from `lead` → `contact` and creates a `crm_deals` row

Create/Edit dialog fields: firstName*, lastName*, email, phone, source (select), notes

### Detail — `routes/leads/detail.tsx`

```
┌─ [← Back]  Name  Source badge  Status badge  ─── [Convert] [Edit] ─┐
├─ Tabs: Details | Notes                                                │
└────────────────────────────────────────────────────────────────────── ┘
```

Convert button → ConfirmDialog "Convert this lead to a contact?" → `crmApi.convertLead(id)` → navigate to `/crm/contacts`

---

## Server-side note

`convertLead` endpoint doesn't exist yet. Add to `composes/crm/server/src/routes/leads.ts`:

```typescript
.post("/:id/convert", async (ctx) => {
  const actor = (ctx as any).actor;
  const { params } = ctx as any;
  const contact = await mediator.send({
    type: "crm.convertLead",
    payload: { leadId: params.id },
    actorId: actor?.id,
    orgId: actor?.orgId,
  });
  return contact;
})
```

---

## Shared components (no new files needed)

All UI from `@projectx/ui`. Icons from `lucide-react`. No new shared components.

---

## Checks

- Contacts list loads with skeleton → real data
- Create contact dialog validates required fields
- Clicking a contact row navigates to `/crm/contacts/:id`
- Detail page loads contact + shows tabs
- Lead "Convert" opens confirm dialog and navigates after success
