# Phase 4 — Activities, Campaigns, Segments

---

## 4.1 Activities

### List — `routes/activities/index.tsx`

**Columns:** Type icon | Subject | Contact | Deal | Due Date | Status | Actions

Type filter chips: All | Call | Meeting | Email | Note | Demo

```typescript
const TYPE_ICONS: Record<string, LucideIcon> = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  note: FileText,
  demo: Monitor,
}
```

Status filters: All | Pending | Done | Cancelled

**Create Activity dialog fields:**
- subject* (text)
- type* (select: call / meeting / email / note / demo)
- contactId (select — search contacts)
- dealId (select — optional)
- dueAt (datetime-local input)
- notes (textarea)

No edit after creation (activities are a log). Only delete.

**Row render:** Show type icon in a small colored badge, subject as the main text, contact name as a link to `/crm/contacts/:id`, due date formatted.

---

## 4.2 Campaigns

### List — `routes/campaigns/index.tsx`

**Columns:** Name | Type | Status | Sent | Opens | Clicks | Start Date | Actions

Status filters: All | Draft | Active | Paused | Completed

Type filters: All | Email | SMS | Push

Create dialog fields:
- name* (text)
- type* (select: email / sms / push)
- subject (text — email only)
- body (textarea)
- scheduledAt (datetime-local)

### Detail — `routes/campaigns/detail.tsx`

```
┌─ Campaign Name  Type badge  Status badge  ────── [Edit] [Delete] ─┐
│  Scheduled: date  |  Sent to: X contacts                            │
├─ Stats row: Sent | Delivered | Opened | Clicked | Bounced            │
├─ Tabs: Overview | Contacts                                           │
│                                                                       │
│  Overview: subject, body preview, segment used                        │
│  Contacts: table of campaign_contacts with status per contact         │
└──────────────────────────────────────────────────────────────────────┘
```

Stats shown as large number cards (like dashboard KPIs).

---

## 4.3 Segments

### List — `routes/segments/index.tsx`

**Columns:** Name | Description | Contact Count | Last Computed | Actions

No status filter needed (segments are active or archived).

Create dialog fields:
- name* (text)
- description (textarea)
- rules (for MVP: just name + description; rule builder is out of scope)

### Detail — `routes/segments/detail.tsx`

```
┌─ Segment Name  ─────────────────── [Edit] [Delete] ─┐
│  Description  |  Contact Count  |  Last computed       │
├─ Tabs: Details | Contacts                              │
│                                                         │
│  Details: rule summary (if rules exist)                 │
│  Contacts: paginated list of contacts in this segment   │
└──────────────────────────────────────────────────────── ┘
```

Contacts tab loads: `crmApi.getSegmentContacts(segmentId)` → `GET /crm/segments/:id/contacts`

Add to `composes/crm/server/src/routes/segments.ts`:
```typescript
.get("/:id/contacts", async (ctx) => {
  const actor = (ctx as any).actor;
  const { params } = ctx as any;
  // Evaluates segment.filters against persons master (type=contact)
  // Returns matching persons rows
  const result = await mediator.query({
    type: "crm.getSegmentContacts",
    orgId: actor?.orgId, actorId: actor?.id,
    payload: { segmentId: params.id }
  });
  return result;
})
```

---

## Checks

- Activities list shows type icons, clicking type filter updates list
- Create activity dialog requires subject + type
- Campaigns list shows stats columns (zeroed out until data exists)
- Campaign detail shows stats cards
- Segment detail shows contacts tab
