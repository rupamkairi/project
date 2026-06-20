# CRM — Phase 8: Frontend Components

## Goal

Spec every reusable CRM-specific component. These are not in `@projectx/ui`
because they're CRM-domain-specific. They live in `composes/crm/web/src/components/`.

---

## 8.1 `<ContactCard />`

Used in: dashboard recent contacts, search results, deal detail linked contacts.

```tsx
interface ContactCardProps {
  contact: ContactSummary;
  showAccount?: boolean;
  showScore?: boolean;
  onClick?: (id: string) => void;
  compact?: boolean;
}
```

**Layout:** Avatar (initials) | Name + title | Email (truncated) | Lead score badge | Account name

**States:** Normal, selected (checkbox), compact (no email row).

---

## 8.2 `<DealCard />`

Used in: Kanban board, dashboard recent deals.

```tsx
interface DealCardProps {
  deal: DealSummary;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  showRottingWarning?: boolean;
}
```

**Layout:**
- Title (bold)
- Contact avatar + name
- Value badge (green)
- Expected close date
- Owner avatar (initials, small, bottom right)
- Rotting indicator (orange clock icon if rottingAt < now)

**Draggable variant:** Wraps in `<Draggable>` (dnd-kit). Visual drag shadow.

---

## 8.3 `<KanbanBoard />`

Used in: `/crm/deals/pipeline`

```tsx
interface KanbanBoardProps {
  pipeline: Pipeline;
  stages: PipelineStage[];
  deals: Deal[];
  onDealMoved: (dealId: string, newStageId: string) => void;
}
```

**Implementation:** Uses `@dnd-kit/core` + `@dnd-kit/sortable`.

**Layout:** Horizontal flex. Each column = `<KanbanColumn>`. Horizontal scroll on overflow.

Drag-over highlight: column background changes on hover during drag.

**Column header:** Stage name | Deal count | Total value.

`onDealMoved` → optimistic update (move card in state) → call `POST /crm/deals/:id/move` → on error: revert.

---

## 8.4 `<KanbanColumn />`

Used within `<KanbanBoard />`.

```tsx
interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  onAddDeal?: () => void;
}
```

**Layout:** Fixed-width (280px), full height, vertical scroll.
DealCards stacked vertically with 8px gap.
"Add deal" button at bottom of column.
Column shows warning if rot period is set: "Deals rot after {n} days".

---

## 8.5 `<ActivityTimeline />`

Used in: contact detail, deal detail, account detail.

```tsx
interface ActivityTimelineProps {
  activities: Activity[];
  onAddActivity?: () => void;
  onCompleteTask?: (activityId: string) => void;
  isLoading?: boolean;
}
```

**Layout:** Vertical timeline with left line.

Each item:
- Type icon circle (left): call=phone, email=mail, meeting=calendar, note=sticky-note, task=check-square, demo=presentation
- Subject (bold) + body preview (collapsed, expand on click)
- Meta: actor name, relative time (e.g. "2 hours ago"), linked deal badge
- For tasks: status badge (pending/done) + complete button

**Grouped by date:** Today / Yesterday / date header.

**Empty state:** "No activities yet. Log the first interaction."

---

## 8.6 `<LeadScoreBadge />`

Used across contacts list, contact detail, lead detail.

```tsx
interface LeadScoreBadgeProps {
  score: number;
  showLabel?: boolean;
}
```

Score → color mapping:
- 0–20: gray ("Cold")
- 21–40: blue ("Warm")
- 41–65: yellow ("Hot")
- 66–100: green ("Qualified")

Visual: colored pill with number. Optional text label.

---

## 8.7 `<SegmentFilterBuilder />`

Used in: segment create/edit form.

```tsx
interface SegmentFilterBuilderProps {
  value: RuleExpr;
  onChange: (expr: RuleExpr) => void;
}
```

**Layout:** Add filter button → each filter = row of [Field dropdown] [Operator dropdown] [Value input].
AND/OR toggle between filters.
Nested groups supported (click "Add group").

**Field options:** first_name, last_name, email, title, lead_score, status, source, tags, account_name, last_contacted_at, created_at.

**Operator options per type:**
- String: equals, contains, starts_with, is_empty
- Number: equals, greater_than, less_than, between
- Date: before, after, in_last_n_days
- Enum: is_one_of, is_not_one_of

**Live preview:** Shows matching contact count (debounced call to `POST /crm/segments/:id/preview`).

---

## 8.8 `<CampaignStats />`

Used in: campaign detail.

```tsx
interface CampaignStatsProps {
  campaign: Campaign;
}
```

**Layout:** Row of metric cards.

| Card | Value | Subtext |
|------|-------|---------|
| Recipients | N | Target segment |
| Delivered | N (N%) | Of recipients |
| Opened | N (N%) | Open rate |
| Clicked | N (N%) | CTR |
| Bounced | N (N%) | Hard + soft |

Bar chart showing delivery funnel: recipients → delivered → opened → clicked.

---

## 8.9 `<ActivityForm />`

Used in: "Log Activity" button on any record detail page.

```tsx
interface ActivityFormProps {
  defaultContactId?: string;
  defaultDealId?: string;
  defaultLeadId?: string;
  onSuccess?: (activity: Activity) => void;
}
```

Renders in a `<Sheet>` (side panel).

**Fields:**
- Type (tabs: Call / Email / Meeting / Note / Task / Demo)
- Subject (text)
- Body / Notes (textarea, expandable)
- Contact / Deal / Lead (autocomplete, pre-filled from context)
- Status (Done / Pending) — for tasks
- Due at (date+time picker) — shown for tasks/meetings
- Duration (minutes) — for calls/meetings

---

## 8.10 `<DealForm />`

Used in: create deal dialog, deal edit sheet.

**Fields:** Title, Pipeline (select), Stage (select, filtered by pipeline), Contact (autocomplete), Account (autocomplete, auto-fills from contact), Owner (user select), Value + Currency, Expected close date, Notes.

Validation: title required, pipeline required, stage required.
On submit: `POST /crm/deals` or `PATCH /crm/deals/:id`.

---

## 8.11 `<ContactForm />`

**Fields:** First/Last name (required), Email, Phone, Mobile, Title, Department, Account (autocomplete), Owner, Tags, Source, Lead score (readonly — calculated).

---

## 8.12 `<ImportModal />`

Used in: Contacts list, accessible via "Import" button.

**Steps (wizard):**
1. **Upload**: Drag-and-drop CSV file. Show file name + size.
2. **Map**: Table showing CSV headers mapped to CRM fields. Auto-detect by header name. Dropdowns to override mapping.
3. **Preview**: First 5 rows rendered as contact cards. Validation errors highlighted in red.
4. **Import**: Submit → progress bar → "Importing 847 contacts..." → completion summary.

**Error report:** After import, collapsible error list (row number + error message). Downloadable as CSV.

---

## 8.13 `<GlobalSearch />`

CMD+K shortcut opens Command dialog (shadcn `<Command>`).

**Behavior:**
- Debounced search: 300ms after typing → `GET /crm/search?q=...`
- Shows grouped results: Contacts, Deals, Accounts
- Each result shows icon, name, subtext (email / stage / domain)
- Press Enter or click → navigate to detail page

**Recent searches:** Last 5 searches shown before typing.
