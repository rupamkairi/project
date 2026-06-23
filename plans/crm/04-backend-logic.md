# CRM — Phase 4: Backend Logic

## Goal

Implement all event-driven hooks, scheduled jobs, FSM registrations, and rule engine
configurations that make the CRM compose behave like a real CRM. This is the
"intelligence layer" — the parts that automate, enforce, and connect the data.

---

## 4.1 FSM Registrations

File: `composes/crm/server/src/index.ts` — registered at compose boot via `bootRegistry.fsms`.

### Lead FSM

```
Machine ID: crm.lead
States: new | contacted | qualified | disqualified | converted

Transitions:
  new → contacted        guard: none            action: updateLastContactedAt
  contacted → qualified  guard: none            action: setQualifiedAt
  contacted → disqualified guard: none          action: setDisqualifiedAt
  qualified → converted  guard: hasEstimatedValue  action: setConvertedAt; createDeal
  qualified → disqualified guard: none
  any → contacted        (re-open contact)
```

### Deal FSM

```
Machine ID: crm.deal
States: open | won | lost | abandoned

Transitions:
  open → won       guard: hasCloseDate, !needsApproval or isApproved   action: setActualCloseDate
  open → lost      guard: hasLostReason                                 action: setActualCloseDate
  open → abandoned guard: none                                          action: none
```

### Campaign FSM

```
Machine ID: crm.campaign
States: draft | scheduled | sending | sent | paused | cancelled

Transitions:
  draft → scheduled      guard: hasScheduledAt, hasSegment, hasTemplate
  draft → sending        guard: hasSegment, hasTemplate   (immediate send)
  scheduled → sending    action: resolveSegment; queueBatch
  sending → sent         action: updateStats (when all contacts dispatched)
  sending → paused       guard: none
  paused → sending       guard: none (resume)
  any → cancelled        guard: not sent
```

---

## 4.2 Event Hooks

File: `composes/crm/server/src/hooks/index.ts`

Hooks subscribe to EventBus events and dispatch commands via Mediator.

### `activity.created`

```typescript
bus.on("activity.created", async (event) => {
  const { actorId, entityId, entityType, type } = event.payload;
  // entityType = "person" means a contact; entityType = "crm_deal" means a deal

  // 1. Update contact.lastContactedAt — contact is a person in master table
  if (entityType === "person") {
    await mediator.dispatch({
      type: "party.updatePerson",
      orgId: event.orgId, actorId,
      payload: { id: entityId, meta: { lastContactedAt: event.occurredAt } }
    });
  }

  // 2. Lead score increase on meaningful activity — stored in persons.meta
  const scoreDeltas: Record<string, number> = {
    call: 10, meeting: 15, demo: 20, email: 5, note: 2,
  };
  const delta = scoreDeltas[type] ?? 0;
  if (delta > 0 && entityType === "person") {
    await mediator.dispatch({ type: "party.incrementPersonMeta", orgId: event.orgId, actorId,
      payload: { id: entityId, field: "leadScore", delta } });
  }

  // 3. Auto-log as Activity on Deal if entityType = crm_deal
  // (already done — activity row carries entityId + entityType)
});
```

### `deal.stage-changed`

```typescript
bus.on("crm.deal.stageChanged", async (event) => {
  const { dealId, stageId } = event.payload;
  // Reset rottingAt: now + stage.meta.rotPeriodDays (from pipeline_stages master table)
  const stage = await mediator.query({ type: "pipeline.getStage", payload: { stageId } });
  if (stage?.meta?.rotPeriodDays) {
    const rottingAt = addDays(new Date(), stage.meta.rotPeriodDays);
    // crm_deals is CRM-owned — update directly via Drizzle
    await db.update(crmDeals).set({ rottingAt }).where(eq(crmDeals.id, dealId));
  }
});
```

### `deal.won`

```typescript
bus.on("crm.deal.won", async (event) => {
  const { dealId, ownerId, value, organizationId } = event.payload;

  // 1. Analytics snapshot
  await mediator.send({ type: "analytics.captureEvent", name: "deal.won", props: { dealId, value, ownerId } });

  // 2. Notify sales manager
  await mediator.send({
    type: "notification.send",
    templateId: "deal-won",
    recipientId: await getSalesManagerId(organizationId),
    context: { dealId, value, ownerId },
  });
});
```

### `campaign.email.opened` (P1 — webhook from notification provider)

```typescript
bus.on("campaign.email.opened", async (event) => {
  const { campaignId, contactId } = event.payload;

  // 1. Update campaign_contacts status
  await mediator.send({ type: "crm.updateCampaignContact", campaignId, contactId, status: "opened" });

  // 2. Increment campaign openedCount
  await mediator.send({ type: "crm.incrementCampaignStat", campaignId, field: "openedCount" });

  // 3. Lead score: email open = +5
  await mediator.send({ type: "crm.incrementLeadScore", contactId, delta: 5 });
});
```

---

## 4.3 Scheduled Jobs

File: `composes/crm/server/src/jobs/index.ts`

### `crm.check-deal-rotting` — daily at 08:00

```typescript
// Find deals where rottingAt < now AND status = 'open'
// For each: emit crm.deal.rotting event
// Notification: "Deal {title} has been in {stage} for too long"
// Target: deal owner
```

### `crm.lead-score-decay` — weekly Sunday midnight

```typescript
// For all contacts with leadScore > 0 and lastContactedAt > 30 days ago:
// leadScore = max(0, leadScore - 5)
// Update contact.leadScore in DB
```

### `crm.refresh-segment-counts` — every 4 hours

```typescript
// For each Segment in org: evaluate filters against contacts → update contactCount + lastComputedAt
```

### `crm.send-scheduled-campaigns` — every 5 minutes

```typescript
// Query campaigns where status='scheduled' AND scheduledAt <= now
// For each: transition FSM to 'sending' → resolve segment → queue notification batch
```

### `crm.follow-up-reminders` — every 30 minutes

```typescript
// Query activities where type='task' AND status='pending' AND dueAt BETWEEN now AND now+2h
// Send in-app notification to activity.actorId: "Task due soon: {subject}"
```

---

## 4.4 Rule Engine Registrations

File: `composes/crm/server/src/index.ts` — registered at compose boot.

### `crm.high-value-deal-approval`

```typescript
bootRegistry.rules.register({
  id: "crm.high-value-deal-approval",
  name: "High-value deal requires approval",
  condition: { op: ">=", field: "deal.value.amount", value: 5000000 }, // 50,000 USD
  action: { type: "setField", field: "deal.approvalStatus", value: "pending" },
});
```

Enforced in `deals.ts` route: before `deal.won` transition, check if `approvalStatus` is required + approved.

### `crm.contact-unsubscribe-guard`

```typescript
bootRegistry.rules.register({
  id: "crm.contact-unsubscribe-guard",
  name: "Cannot send campaign to unsubscribed contacts",
  condition: { op: "eq", field: "contact.status", value: "unsubscribed" },
  action: { type: "exclude" }, // filter from campaign resolve
});
```

### `crm.campaign-schedule-validation`

```typescript
bootRegistry.rules.register({
  id: "crm.campaign-schedule-validation",
  name: "Campaign must have a segment and template before scheduling",
  condition: {
    op: "and",
    conditions: [
      { op: "null", field: "campaign.segmentId" },
      // OR
      { op: "null", field: "campaign.templateId" },
    ],
  },
  action: { type: "reject", message: "Campaign requires a segment and template" },
});
```

---

## 4.5 Campaign Dispatch Logic

File: `composes/crm/server/src/hooks/campaign-dispatch.ts`

When campaign transitions to `sending`:

```typescript
async function dispatchCampaign(campaignId: string) {
  const campaign = await getCampaign(campaignId);
  const segment = await getSegment(campaign.segmentId);

  // 1. Resolve contacts matching segment filters (paginated, batches of 100)
  const contacts = await resolveSegment(segment, campaign.organizationId);

  // 2. Upsert crm_campaign_contacts rows (status=pending)
  // 3. Update campaign.recipientCount

  // 4. Queue notification job per batch
  for (const batch of chunk(contacts, 100)) {
    await bootRegistry.queue.enqueue("crm.campaign.batch", {
      campaignId,
      contactIds: batch.map(c => c.id),
    });
  }
}

// Worker: processes each batch
async function processCampaignBatch({ campaignId, contactIds }) {
  const campaign = await getCampaign(campaignId);
  for (const contactId of contactIds) {
    const contact = await getContact(contactId);
    // Evaluate unsubscribe guard
    if (contact.status === "unsubscribed") { skipContact(); continue; }

    await mediator.send({
      type: "notification.send",
      templateId: campaign.templateId,
      recipient: { email: contact.email, phone: contact.phone },
      context: { contactId, campaignId, firstName: contact.firstName },
    });

    await updateCampaignContact(campaignId, contactId, "sent");
  }
}
```

---

## 4.6 Lead Conversion Logic

File: `composes/crm/server/src/hooks/lead-convert.ts`

When `POST /crm/leads/:id/convert` is called:

1. Fetch `crm_leads` detail row (to get `person_id`, `party_id`, `estimatedValue`, etc.)
2. Validate `crm_leads.status === "qualified"` (FSM guard)
3. Look up default `crm.deal` pipeline via `mediator.query({ type: "pipeline.getDefault", payload: { entityType: "crm.deal", orgId } })`
4. Create Deal in `crm_deals`: `{ title: lead.interest || "New Deal", person_id: lead.person_id, party_id: lead.party_id, pipelineId: pipeline.id, stage_id: pipeline.stages[0].id, value: lead.estimatedValue }`
5. FSM: update `crm_leads.status = "converted"`, set `crm_leads.dealId = deal.id`, `crm_leads.convertedAt = now`
6. Flip the `persons` row type from `lead` → `contact` via `mediator.dispatch({ type: "party.updatePerson", payload: { id: lead.person_id, type: "contact" } })`
7. Emit `crm.lead.converted` event
8. Return `{ lead, deal }`

---

## 4.7 Search Index Registration

At compose boot, register search sync. Contacts and accounts are master-table-backed — listen to
`party.*` events from the party module. Deals are CRM-owned — listen to `crm.deal.*` events.

```typescript
// Contacts (persons type=contact) — emitted by party module
bus.on("party.person.created", e => { if (e.payload.type === "contact") searchAdapter.sync("Contact", e); });
bus.on("party.person.updated", e => { if (e.payload.type === "contact") searchAdapter.sync("Contact", e); });
bus.on("party.person.deleted", e => { if (e.payload.type === "contact") searchAdapter.sync("Contact", e); });

// Accounts (parties type=company) — emitted by party module
bus.on("party.party.created", e => { if (e.payload.type === "company") searchAdapter.sync("Account", e); });
bus.on("party.party.updated", e => { if (e.payload.type === "company") searchAdapter.sync("Account", e); });

// Deals — CRM-owned, emitted by CRM compose
bus.on("crm.deal.created", e => searchAdapter.sync("Deal", e));
bus.on("crm.deal.updated", e => searchAdapter.sync("Deal", e));
bus.on("crm.deal.deleted", e => searchAdapter.sync("Deal", e));
```
