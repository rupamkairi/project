# Phase 3 — Deals Pipeline

The most complex page. Kanban view is primary, list view is secondary toggle.

---

## Data model

```
Pipeline (default — from pipelines master, entityType="crm.deal")
  └─ Stage[] (from pipeline_stages master, ordered by position)
        └─ Deal[] (from crm_deals, filtered by stage_id)
```

Load sequence (all `useState + useEffect`, no TanStack Query):
1. `crmApi.getPipelines()` → pick `isDefault: true` pipeline (server reads `pipelines` master where `entityType = "crm.deal"`)
2. `crmApi.getPipelineStages(pipelineId)` → ordered stages array (server reads `pipeline_stages` master)
3. `crmApi.getDeals({ pipelineId })` → all deals for this pipeline (server reads `crm_deals`)
4. Group deals client-side by `stage_id`

Stages are always dynamic — never hardcoded column labels.

---

## View Toggle

Top-right: `[Kanban] [List]` toggle buttons (outline/default variant swap).
State: `const [view, setView] = useState<"kanban" | "list">("kanban")`

---

## Kanban View

```
┌─ PageHeader "Deals Pipeline" ────────────── [Add Deal] [Kanban][List] ─┐
├─ Pipeline selector (if multiple pipelines exist) ──────────────────────┤
├─ Horizontal scroll ────────────────────────────────────────────────────┤
│  ┌─ Stage: Lead In (3) ─────┐  ┌─ Meeting (1) ──────┐  ┌─ Proposal ─┐ │
│  │  ┌─ Deal Card ─────────┐ │  │  ┌─ Deal Card ────┐ │  │  ...        │ │
│  │  │ Title               │ │  │  │ Title          │ │  └────────────┘ │
│  │  │ $value | Contact    │ │  │  │ $value         │ │                 │
│  │  │ [→ Move stage btn]  │ │  │  └───────────────┘ │                 │
│  │  └─────────────────────┘ │  └────────────────────┘                 │
│  └──────────────────────────┘                                          │
└────────────────────────────────────────────────────────────────────────┘
```

### Deal Card component (inline, not a new shared component)

```typescript
function DealCard({ deal, stages, onMove, onEdit, onDelete }) {
  const nextStages = stages.filter(s => s.id !== deal.stageId);
  return (
    <Card className="mb-2 cursor-pointer hover:shadow-sm">
      <CardContent className="p-3 space-y-1">
        <p className="text-sm font-medium">{deal.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(deal.value)} · {deal.contactName ?? "No contact"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs w-full">
              Move stage
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {nextStages.map(s => (
              <DropdownMenuItem key={s.id} onClick={() => onMove(deal.id, s.id)}>
                {s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}
```

Move: `crmApi.moveDeal(dealId, stageId)` → `PATCH /crm/deals/:id/stage` → update local state optimistically.

Stage column header shows stage name + deal count + total value.

---

## List View

Table: Title | Value | Stage | Contact | Account | Owner | Status | Actions

Status filters: All | Open | Won | Lost

Same Create/Edit dialog as kanban.

---

## Create/Edit Deal Dialog

Fields:
- title* (text)
- value (number) + currency (select: USD/EUR/etc)
- pipelineId (auto-set to default)
- stageId* (select — loaded from stages)
- contactId (search-select or simple text input)
- accountId (optional)
- expectedCloseDate (date input)
- description (textarea)

---

## Detail Page — `routes/deals/detail.tsx`

```
┌─ [← Back]  Deal Title  Stage badge  Status badge  [Edit] [Delete] ─┐
│  $value  |  Expected close: date  |  Owner                           │
├─ Tabs: Overview | Activities | Contacts                              │
│                                                                       │
│  Overview: description, account link, pipeline stage progress bar     │
│  Activities: timeline (from crmApi.getActivities({ dealId }))        │
│  Contacts: list of linked contacts                                    │
└──────────────────────────────────────────────────────────────────────┘
```

Stage progress bar: visual indicator showing which stage the deal is in.

---

## Server endpoint needed

`crmApi.getPipelineStages(pipelineId)` → `GET /crm/pipelines/:id/stages`

Add to `composes/crm/server/src/routes/pipelines.ts`:
```typescript
.get("/:id/stages", async (ctx) => {
  const { params } = ctx as any;
  const actor = (ctx as any).actor;
  // Reads from pipeline_stages master table via pipeline module query
  const result = await mediator.query({
    type: "pipeline.listStages",
    orgId: actor?.orgId, actorId: actor?.id,
    payload: { pipelineId: params.id }
  });
  return result;
})
```

---

## Checks

- Kanban columns render one per stage from default pipeline
- "Move stage" dropdown updates the deal's column without page reload
- List view toggle shows same deals in table format
- Add Deal opens dialog, selecting stage from dropdown works
