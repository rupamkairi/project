# CRM Manual Testing Guide

> Status: CRM scaffold complete. Mediator handlers not yet implemented — all list endpoints return empty arrays (by design). CRUD writes will 500 silently. Goal: verify UI renders, routes load, empty states show, no crashes.

---

## Prerequisites

- App running locally (`bun dev` from repo root)
- Valid user account (registered via platform auth)
- Browser DevTools open — Network tab + Console

---

## 1. Auth Gate

1. Open incognito tab, go to `/crm`
2. **Expected:** redirect to `/login`
3. Log in, land back at `/crm`
4. DevTools → Application → Local Storage → confirm `platform_token` present

---

## 2. Navigation Shell

1. Go to `/crm` while logged in
2. **Expected:** NavBar with 8 items: Dashboard, Contacts, Accounts, Leads, Deals, Activities, Campaigns, Segments
3. Click each — URL changes, correct page loads, no white screen
4. User avatar dropdown → shows name/email + "Sign out"
5. Narrow viewport (≤768px) → hamburger menu appears, nav items accessible

---

## 3. Dashboard `/crm`

1. Navigate to `/crm`
2. **Expected:**
   - 4 KPI cards render: Total Contacts / Active Deals / Pipeline Value / Open Leads — all show `0`
   - Recent Activities section → "No activities" or empty list (no crash)
   - Pipeline Snapshot → "No stages" or empty (no crash)
3. Click each KPI card → navigates to matching section
4. Console → zero uncaught TypeErrors

---

## 4. Contacts `/crm/contacts`

**List page**

1. Navigate to `/crm/contacts`
2. **Expected:** skeleton loaders → empty state "No contacts found" — no `TypeError: Cannot read properties of undefined (reading 'length')`
3. Status filter chips (Active / Inactive / Archived) → each click re-fetches, no crash
4. Search box → type + submit → no crash, empty state persists

**Create dialog**

1. Click "+ Add Contact"
2. Fields: First Name\*, Last Name\*, Email, Phone, Title, Department
3. Submit without First Name → browser validation blocks submit
4. Fill required fields + submit → Network tab shows `POST /crm/contacts` → dialog closes, list reloads

**Edit / Delete**

1. If row exists: pencil icon → edit dialog opens pre-filled
2. Trash icon → ConfirmDialog: "Delete Contact?" → Cancel = no action; Confirm → `DELETE /crm/contacts/:id`

**Detail `/crm/contacts/:id`**

1. Click a contact row → `/crm/contacts/:id`
2. **Expected:** detail page renders (skeleton → name/avatar/status, Tabs: Details | Activities | Deals)
3. Empty tabs → graceful messages, no crashes

---

## 5. Accounts `/crm/accounts`

Same pattern as Contacts, additional checks:

- Table columns: Name, Domain, Industry, Employees, Status, Actions
- Create dialog fields: Name\*, Domain, Industry, Employees (number), Website
- Detail tabs: Details | Contacts | Deals

---

## 6. Leads `/crm/leads`

1. Status filter chips: All / New / Contacted / Qualified / Disqualified
2. Table: Name (Avatar), Email, Source (Badge), Score (Badge), Status, Actions
3. `UserCheck` icon on row → ConfirmDialog "Convert Lead?" → Confirm fires `POST /crm/leads/:id/convert` → on success navigates to `/crm/contacts/:newId`
4. Detail page: Convert button visible; ConfirmDialog on click

---

## 7. Deals `/crm/deals`

**Kanban (default)**

1. Navigate to `/crm/deals`
2. **Expected:** pipeline loads or empty columns — no crash if no deals
3. Toggle button (List icon) → switches to table view

**List view**

- Columns: Title, Value, Stage, Status, Close Date, Delete
- Status filter chips visible

**Create dialog**

1. Click "+ New Deal"
2. Fields: Title\*, Value, Currency (select), Stage\* (select — from pipeline), Close Date, Description
3. Stage select populated from `GET /crm/pipelines` → `GET /crm/pipelines/:id/stages`

**Move stage (Kanban)**

1. Deal card "Move stage" dropdown → shows other stage names
2. Select stage → card moves to new column (optimistic), `PATCH /crm/deals/:id/stage` fires

---

## 8. Activities `/crm/activities`

1. Type filter chips: All / Call / Email / Meeting / Note / Demo
2. Table: Activity (icon + subject), Type (Badge), Due Date, Status, Actions
3. `CheckCircle` on row → status → "done" (optimistic), `POST /crm/activities/:id/complete` fires
4. "+ Log Activity" → dialog: Subject\*, Type\* (Select), Due Date (datetime-local), Notes (textarea)
5. Submit disabled if Type not selected

---

## 9. Campaigns `/crm/campaigns`

1. Status chips: All / Draft / Active / Paused / Completed
2. Table: Name, Type (Badge), Status (StatusBadge), Sent, Opens, Scheduled, Delete
3. Row click → `/crm/campaigns/:id`
4. Create dialog: Name\*, Type (email/SMS/push — subject field appears for email only), Body, Schedule datetime

**Detail `/crm/campaigns/:id`**

1. 5 stat cards: Sent / Delivered / Opened / Clicked / Bounced (all 0)
2. "Send Now" button visible only when status = `draft`
3. Click "Send Now" → `POST /crm/campaigns/:id/send` → status updates to `active`, button disappears

---

## 10. Segments `/crm/segments`

1. Table: Name, Description, Contacts (count), Last Computed, Delete
2. Row click → `/crm/segments/:id`
3. Create dialog: Name\*, Description textarea

**Detail `/crm/segments/:id`**

1. Header: name, description, contact count, last updated
2. Contacts tab: table with Name (Avatar), Email, Score (Badge), Status — rows clickable → `/crm/contacts/:id`
3. Details tab: name, description, createdAt

---

## 11. Cross-Page Navigation

| Action | Expected |
|--------|----------|
| Contact detail → "Account" link | `/crm/accounts/:id` |
| Deals kanban → "Move stage" | stay on `/crm/deals` |
| Lead detail → convert | `/crm/contacts/:newId` |
| Segment detail → contact row | `/crm/contacts/:id` |
| All "← Back" buttons | correct parent list |

---

## 12. Error Boundary Verification

1. DevTools → Network → throttle to "Offline"
2. Navigate to `/crm/contacts`
3. **Expected:** no crash; empty state — the `?? []` guards prevent error boundary trigger
4. Re-enable network, reload → page recovers

---

## 13. Auth Token Edge Cases

1. DevTools → Application → Local Storage → delete `platform_token`
2. Navigate to `/crm/contacts`
3. **Expected:** AuthGuard detects missing token → redirect to `/login`

---

## Known Limitations

| Area | Status |
|------|--------|
| All CRM CRUD | Writes fire HTTP but server returns 500 — no data persistence until mediator handlers wired |
| Pipeline stages | Deals kanban empty until `crm.listPipelines` handler exists |
| Dashboard KPIs | Always 0 until `crm.getDashboardStats` handler exists |
| Lead conversion | `POST /crm/leads/:id/convert` fires but 500s |
| Campaign "Send Now" | `POST /crm/campaigns/:id/send` fires but 500s |
