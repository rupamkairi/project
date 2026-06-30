# CRM — Phase 7: Frontend Pages

## Goal

Specify every page/view in the CRM compose web app — layout, data requirements,
key interactions, and notable UX decisions.

---

## 7.1 Dashboard — `/crm`

**Purpose:** High-level CRM overview for the signed-in rep or manager.

**Layout:** 2-column grid of metric cards + pipeline summary + upcoming activities.

**Sections:**

1. **KPI Cards (row of 4)**
   - Open deals count + total pipeline value
   - Deals won this month
   - New leads this week
   - Activities due today

2. **Pipeline Summary**
   - Horizontal bar chart: deal count + value per stage for default pipeline
   - Clickable → navigates to `/crm/deals/pipeline`

3. **Upcoming Activities (next 7 days)**
   - List of tasks/meetings due, sorted by dueAt
   - Each item: type icon, subject, linked contact/deal, relative time
   - Quick-complete button

4. **Recent Deals (last 5 modified)**
   - DealCard component in list form

**Data fetching (all via `useState + useEffect`, no TanStack Query):**
- `crmApi.getAnalytics()` → `GET /crm/analytics/summary` — KPI counts + pipeline value
- `crmApi.getActivities({ limit: 8 })` → `GET /crm/activities` — upcoming tasks
- `crmApi.getDeals({ sort: "updatedAt:desc", limit: 5 })` → `GET /crm/deals` — recent deals

---

## 7.2 Contacts List — `/crm/contacts`

**Layout:** Full-width DataTable with filter sidebar or top filter bar.

**Columns:** Avatar+Name | Email | Account | Lead Score | Owner | Last Contacted | Status | Actions

**Filters (top bar):**
- Status (active / inactive / unsubscribed)
- Owner (multi-select, sales-manager sees all, rep sees own)
- Account
- Tags (multi-tag filter)
- Lead score range (slider)

**Actions:**
- Row click → `/crm/contacts/:id`
- "New Contact" button → opens `<ContactForm>` dialog or navigates to `/crm/contacts/new`
- Bulk actions (select rows): Add tag, Assign owner, Export selected, Delete

**Search:** Uses `/crm/search?q=...&collection=Contact` — real-time as user types.

---

## 7.3 Contact Detail — `/crm/contacts/:id`

**Layout:** Two-column. Left: contact info + action buttons. Right: activity timeline + deals.

**Left panel:**
- Avatar (initials) + name + title + company (linked to Account)
- Contact info: email, phone, mobile with click-to-copy
- Tags with inline add/remove
- Lead score badge (color-coded: 0-30=gray, 31-60=yellow, 61-100=green)
- Owner selector (dropdown, manager can reassign)
- "Log Activity" button (opens ActivityForm sheet)
- "Edit" button (opens ContactForm sheet)

**Right panel (tabs):**
1. **Timeline** — ActivityTimeline component. All activities sorted newest first.
   - Each item: type icon, subject, body preview, timestamp, actor
   - Task items show status (pending/done) with complete button
2. **Deals** — list of deals linked to this contact. DealCard component.
3. **Emails (P1)** — email threads. EmailThreadList component.

---

## 7.4 Leads List — `/crm/leads`

**Layout:** DataTable with kanban-style status columns toggle.

**Columns:** Name | Company | Source | Score | Owner | Status | Est. Value | Last Activity | Actions

**Filters:** Status, Owner, Source, Score range.

**Actions:**
- Quick qualify/disqualify from row (popover with status options)
- "Convert" button on qualified leads → opens confirm dialog → creates deal
- "New Lead" button

---

## 7.5 Deals — `/crm/deals` (List) + `/crm/deals/pipeline` (Kanban)

**View Toggle:** List ↔ Kanban toggle button in top bar. State persisted in Zustand store.

### List View

DataTable. Columns: Title | Contact | Account | Stage | Value | Probability | Owner | Expected Close | Rotting | Actions

"Rotting" column: red warning icon if past rotPeriodDays.

### Kanban View — `/crm/deals/pipeline`

**Layout:** Horizontal columns per stage. Scrollable within columns.

**Pipeline selector:** Dropdown to switch between pipelines (if multiple). Pipelines loaded
from `crmApi.getPipelines()` — server reads from `pipelines` master (entityType=`crm.deal`).

**Stages loaded dynamically:** `crmApi.getPipelineStages(pipelineId)` → `GET /crm/pipelines/:id/stages`.
Columns are rendered from this response — never hardcoded.

**Column:** Stage name + deal count + total value.

**DealCard:** Title, contact avatar, value, expected close date, owner initials, rotting indicator.

**Drag-and-drop:** Drag card between columns → calls `crmApi.moveDeal(id, stageId)` → `POST /crm/deals/:id/move`.

**Deal actions on card:** Quick win/lose buttons, open detail.

---

## 7.6 Deal Detail — `/crm/deals/:id`

**Layout:** Two-column — deal header + info left, timeline + notes right.

**Left panel:**
- Deal title (inline editable)
- Pipeline stage indicator (breadcrumb: Stage 1 → Stage 2 → Stage 3 [current])
- Value + currency
- Contact + Account with links
- Owner + expected close date
- Approval status badge (if high-value)
- Win / Lose / Abandon action buttons (guarded by FSM state)

**Right panel (tabs):**
1. **Timeline** — activities, stage changes, comments
2. **Activities** — filtered view of activities for this deal
3. **Documents** — attached documents (via document module)

---

## 7.7 Accounts List — `/crm/accounts`

**Layout:** DataTable.

**Columns:** Logo + Name | Domain | Industry | Employees | Pipeline Value | Owner | Status

**Actions:** Row click → account detail. "New Account" button.

---

## 7.8 Account Detail — `/crm/accounts/:id`

**Layout:** Two-column.

**Left:** Account info + stats (total deal value, contacts count, open deals count).

**Right (tabs):**
1. **Contacts** — contact list for this account
2. **Deals** — all deals for this account
3. **Activities** — timeline

---

## 7.9 Activities — `/crm/activities`

**Layout:** Feed view sorted by date.

**Filters:** Type (call/email/meeting/note/task), Status (done/pending), Actor, Date range.

**Tab: Upcoming** — tasks and meetings with future dueAt. Shows relative time ("Due in 2 hours").

Each activity row: icon for type, subject, linked record (contact/deal), actor, time.
Click → expands inline to show body/notes, or opens detail sheet.

---

## 7.10 Campaigns — `/crm/campaigns`

**Layout:** DataTable with status-based tabs (All / Draft / Scheduled / Sending / Sent).

**Columns:** Name | Type | Status | Segment | Scheduled At | Recipients | Open Rate

**Actions:**
- Row click → campaign detail
- "New Campaign" button

### Campaign Detail — `/crm/campaigns/:id`

**Sections:**
1. Campaign config (name, type, segment, template, from details)
2. Stats cards: Recipients / Delivered / Opened / Clicked / Bounced
3. Status + schedule management (schedule button, send now, pause, cancel)
4. Per-contact delivery table

---

## 7.11 Segments — `/crm/segments`

**Layout:** List of segment cards showing name, contact count, last computed.

**Segment Builder:** Visual filter builder for creating/editing segment filters.

Filter builder UI: dropdown (field) + operator (equals/contains/greater than) + value.
Fields: email, title, tags, leadScore, status, source, accountId, lastContactedAt.
Supports AND/OR logic.

**Preview button:** Shows matching contacts count + first 10 results in a modal.

---

## 7.12 Analytics — `/crm/analytics`

Access: `crm:admin`, `crm:sales-manager` only.

**Sub-pages:**

### Overview `/crm/analytics`
- Pipeline value by stage (stacked bar)
- Win rate trend over 12 months (line)
- Activity volume by type (donut)
- Lead source breakdown (horizontal bar)

### Pipeline Detail `/crm/analytics/pipeline`
- Per-pipeline view: stage funnel, avg time in stage, conversion rate per stage
- Date range picker

### Rep Performance `/crm/analytics/reps`
- Table: Rep | Deals Won | Total Value | Avg Deal Size | Activities | Win Rate
- Top performer highlight

---

## 7.13 Import Modal

Global component accessible from Contacts list.

**Steps:**
1. Upload CSV file (drag-and-drop zone)
2. Column mapping (auto-detect headers, manual override)
3. Validation preview (first 5 rows, errors highlighted)
4. Submit → `POST /crm/import/contacts` → get `jobId`
5. Progress polling → show completion + error count

---

## Page Loading States

- Skeleton loaders (not spinners) for all list pages
- Optimistic updates for drag-and-drop stage moves
- Toast notifications for mutations (create/update/delete success/error)
- Error boundaries at route level with retry button
