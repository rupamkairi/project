# Module — Deep Dive Reference

## Layer 2 of Core → Module → Compose

---

## What is a Module?

A **Module** is the bounded domain unit of the architecture. It owns a single concern, declares everything it needs (entities, commands, events, FSMs), and communicates with the outside world exclusively through the Core EventBus and Command Mediator.

A Module is **not** a microservice, a library, or a folder. It is a runtime unit with a declared manifest, a lifecycle, and strict communication boundaries.

```
Module Contract:
  - Declares what entities it owns
  - Declares what commands it accepts
  - Declares what queries it handles
  - Declares what events it emits
  - Declares what events it reacts to
  - Owns its own DB namespace (table prefix or schema)
  - Never imports from another module's internals
```

---

## Module Anatomy

```
modules/
  {name}/
    manifest.ts          ← ModuleManifest (id, version, deps, declarations)
    entities/            ← EntitySchema definitions
    commands/            ← Command handlers (write path)
    queries/             ← Query handlers (read path)
    events/              ← Event emitters + listeners
    fsm/                 ← State machine definitions
    jobs/                ← Scheduled & queue-based jobs
    adapters/            ← External service bindings (this module's usage)
    index.ts             ← exports the Module object
```

---

## Standard Module Catalog

---

### `identity` Module

**Owns:** Actor, Role, Permission, Organization, Session, APIKey, InviteToken

**Entity Schemas:**

| Entity       | Key Fields                                             |
| ------------ | ------------------------------------------------------ |
| Organization | name, slug, plan, settings, status                     |
| Actor        | email, passwordHash, orgId, status, type(human/system) |
| Role         | name, orgId, permissions[], isDefault                  |
| Permission   | resource, action, scope(own/org/global)                |
| Session      | actorId, token, expiresAt, device, ip                  |
| APIKey       | name, keyHash, actorId, scopes[], expiresAt            |

**FSMs:**

```
Actor:       pending → active → suspended → deleted
             (verify)   (suspend)  (reactivate)

Invite:      pending → accepted → expired → revoked
```

**Commands:**

```
identity.register          → creates Actor + sends verification
identity.activate          → moves Actor pending → active
identity.login             → creates Session
identity.logout            → invalidates Session
identity.assignRole        → adds Role to Actor
identity.revokeRole
identity.createOrg
identity.inviteActor
identity.createAPIKey
identity.rotateAPIKey
```

**Queries:**

```
identity.getActor(id)
identity.resolveSession(token)
identity.resolveAPIKey(key)
identity.getPermissions(actorId)
identity.hasPermission(actorId, resource, action)
identity.listActors(orgId, filter)
```

**Events Emitted:**

```
actor.registered     actor.activated     actor.suspended
actor.login          actor.logout        role.assigned
org.created          apikey.created      invite.sent
```

**Real-Time Channels:** `org:{orgId}:actors` (admin view of actor activity)

**Scheduled Jobs:** `identity.purge-expired-sessions` (daily)

---

### `catalog` Module

**Owns:** Item, Category, Attribute, AttributeSet, PriceList, PriceRule, Variant, Tag

```
Item = anything that can be listed and acted upon:
       product, service, room-type, menu-item, job-position,
       course, seat-type, insurance-plan, asset-class
```

**Entity Schemas:**

| Entity       | Key Fields                                                  |
| ------------ | ----------------------------------------------------------- |
| Category     | name, slug, parentId, attributeSetId                        |
| AttributeSet | name, fields: FieldSchema[]                                 |
| Item         | name, slug, categoryId, attributeValues, status             |
| Variant      | itemId, sku, attributes(size/color/etc), stockTracked       |
| PriceList    | name, currency, audience(segment/role), validFrom, validTo  |
| PriceRule    | priceListId, variantId, price, minQty, conditions: RuleExpr |

**FSMs:**

```
Item: draft → active → archived
             (publish) (archive)

PriceList: draft → active → expired
```

**Commands:**

```
catalog.createCategory      catalog.updateCategory
catalog.createItem          catalog.updateItem
catalog.publishItem         catalog.archiveItem
catalog.addVariant          catalog.updateVariant
catalog.createPriceList     catalog.setPriceRule
catalog.getEffectivePrice   → resolves best PriceRule for actor+qty+date
```

**Queries:**

```
catalog.getItem(id)
catalog.listItems(categoryId, filter, page)
catalog.searchItems(query, filters)         → delegates to SearchAdapter
catalog.resolvePrice(variantId, actorId, qty, date)
catalog.getVariants(itemId)
```

**Events Emitted:**

```
item.created    item.published    item.archived
item.updated    price.changed     variant.added
```

**Real-Time Channels:** `org:{orgId}:catalog` (for admin live edits)

---

### `inventory` Module

**Depends on:** `catalog`
**Owns:** Location, StockUnit, StockMovement, StockAdjustment, ReorderRule

**Entity Schemas:**

| Entity          | Key Fields                                                        |
| --------------- | ----------------------------------------------------------------- |
| Location        | name, type(warehouse/shelf/store), address, orgId                 |
| StockUnit       | variantId, locationId, onHand, reserved, available (virtual)      |
| StockMovement   | fromLocationId, toLocationId, variantId, qty, reason, triggeredBy |
| StockAdjustment | stockUnitId, delta, reason, actorId                               |
| ReorderRule     | variantId, locationId, reorderPoint, reorderQty, supplierId       |

**Computed field:** `available = onHand - reserved`

**Commands:**

```
inventory.reserve(variantId, qty, orderId)       → increments reserved
inventory.release(variantId, qty, orderId)        → decrements reserved
inventory.fulfill(variantId, qty, orderId)        → decrements onHand + reserved
inventory.receive(variantId, locationId, qty)     → increments onHand
inventory.transfer(variantId, from, to, qty)
inventory.adjust(stockUnitId, delta, reason)
```

**Queries:**

```
inventory.getStock(variantId, locationId?)
inventory.checkAvailability(variantId, qty, locationId?)
inventory.listLowStock(orgId, threshold?)
inventory.getMovements(variantId, from, to)
```

**Events Emitted:**

```
stock.reserved      stock.released     stock.fulfilled
stock.received      stock.adjusted     stock.low          ← triggers reorder workflow
stock.depleted
```

**Scheduled Jobs:**

```
inventory.check-reorder-points   (hourly)    → fires reorder if below threshold
inventory.snapshot-daily-stock   (nightly)   → materialized view for analytics
```

**Real-Time Channels:** `org:{orgId}:inventory:{locationId}` (warehouse live view)

---

### `ledger` Module

**Owns:** Account, JournalEntry, Transaction, Currency, ExchangeRate, TaxRate

**Accounting model:** Double-entry. Every Transaction creates exactly 2 JournalEntries.

**Account Types:** `asset | liability | revenue | expense | equity`

**Entity Schemas:**

| Entity       | Key Fields                                                    |
| ------------ | ------------------------------------------------------------- |
| Account      | code, name, type, currency, parentId, orgId                   |
| Transaction  | reference, description, currency, amount, entries[], postedAt |
| JournalEntry | transactionId, accountId, debit, credit                       |
| ExchangeRate | fromCurrency, toCurrency, rate, validAt                       |
| TaxRate      | name, rate, applicableTo: RuleExpr, jurisdiction              |

**Commands:**

```
ledger.createAccount
ledger.postTransaction(debitAccountId, creditAccountId, amount, currency, reference)
ledger.voidTransaction(transactionId, reason)
ledger.recordPayment(invoiceId, amount, gateway, gatewayRef)
ledger.issueRefund(transactionId, amount)
ledger.runMonthClose(month)                → locks period, generates P&L snapshot
```

**Queries:**

```
ledger.getBalance(accountId, asOf?)
ledger.getTransactions(accountId, from, to, page)
ledger.getTrialBalance(orgId, asOf)
ledger.getPnL(orgId, from, to)
ledger.getCashFlow(orgId, from, to)
```

**Events Emitted:**

```
transaction.posted    transaction.voided    payment.received
refund.issued         account.overdrawn     period.closed
```

**Scheduled Jobs:**

```
ledger.daily-balance-snapshot   (nightly)
ledger.fx-rate-sync             (every 6h)    → fetches from FX rate provider
ledger.overdue-invoice-check    (daily)        → emits invoice.overdue
```

---

### `workflow` Module

**Owns:** ProcessTemplate, ProcessInstance, Stage, Task, Assignment, Checklist

```
ProcessTemplate = reusable workflow blueprint (e.g. "Order Fulfillment")
ProcessInstance = a live run of a template for a specific entity
Stage           = a named step with entry conditions
Task            = a unit of work within a Stage
Assignment      = binds a Task to an Actor with deadline
```

**Entity Schemas:**

| Entity          | Key Fields                                               |
| --------------- | -------------------------------------------------------- |
| ProcessTemplate | name, stages[], orgId, entityType                        |
| ProcessInstance | templateId, entityId, entityType, currentStageId, status |
| Stage           | templateId, name, order, entryGuard: RuleExpr, tasks[]   |
| Task            | stageId, title, description, assigneeRole, dueOffset     |
| Assignment      | taskId, actorId, instanceId, status, dueAt, completedAt  |

**FSMs:**

```
ProcessInstance: pending → active → completed → cancelled
Task/Assignment: open → in-progress → completed → failed → skipped
```

**Commands:**

```
workflow.startProcess(templateId, entityId, entityType, context)
workflow.completeTask(assignmentId, outcome, attachments?)
workflow.skipTask(assignmentId, reason)
workflow.escalateTask(assignmentId)
workflow.cancelProcess(instanceId, reason)
workflow.advanceStage(instanceId)           → internal, evaluates entry guards
```

**Queries:**

```
workflow.getProcess(instanceId)
workflow.getMyTasks(actorId, orgId, filter)
workflow.getEntityProcess(entityId, entityType)
workflow.getOverdueTasks(orgId)
```

**Events Emitted:**

```
process.started      stage.entered        stage.completed
task.assigned        task.completed       task.overdue
task.escalated       process.completed    process.cancelled
```

**Scheduled Jobs:**

```
workflow.check-overdue-tasks     (every 15min)   → emits task.overdue
workflow.auto-escalate           (hourly)         → based on SLA rules
```

**Real-Time Channels:** `org:{orgId}:workflow` (live task board updates)

---

### `scheduling` Module

**Depends on:** `identity`, `catalog`
**Owns:** Calendar, Slot, Booking, Recurrence, BlockedPeriod

**Entity Schemas:**

| Entity        | Key Fields                                                             |
| ------------- | ---------------------------------------------------------------------- |
| Calendar      | ownerId, ownerType(actor/item), timezone, workingHours                 |
| Slot          | calendarId, resourceId, resourceType, startAt, endAt, capacity, status |
| Booking       | slotId, actorId, status, notes, confirmedAt, cancelledAt               |
| Recurrence    | calendarId, rrule, slotTemplate                                        |
| BlockedPeriod | calendarId, from, to, reason                                           |

**FSMs:**

```
Slot:    available → partially-booked → fully-booked → cancelled → expired
Booking: pending → confirmed → checked-in → completed → cancelled → no-show
```

**Commands:**

```
scheduling.createCalendar
scheduling.addSlot(calendarId, startAt, endAt, capacity)
scheduling.addRecurrence(calendarId, rrule, template)      → generates slots
scheduling.book(slotId, actorId, notes?)
scheduling.confirm(bookingId)
scheduling.cancel(bookingId, reason)
scheduling.checkIn(bookingId)
scheduling.block(calendarId, from, to, reason)
```

**Queries:**

```
scheduling.getAvailableSlots(calendarId, from, to)
scheduling.getBooking(bookingId)
scheduling.getMyBookings(actorId)
scheduling.checkConflict(calendarId, startAt, endAt)
```

**Events Emitted:**

```
slot.created      slot.booked       slot.cancelled
booking.confirmed booking.cancelled booking.no-show
booking.completed
```

**Scheduled Jobs:**

```
scheduling.generate-recurring-slots    (daily)    → expands RRULE for next 30 days
scheduling.expire-unconfirmed-bookings (every 5m) → TTL-based expiry
scheduling.remind-upcoming-bookings    (daily)    → fires notification events
```

---

### `document` Module

**Owns:** Document, Folder, Version, Attachment, SignatureRequest

**Entity Schemas:**

| Entity           | Key Fields                                                     |
| ---------------- | -------------------------------------------------------------- |
| Folder           | name, parentId, ownerEntityId, ownerEntityType, orgId          |
| Document         | folderId, name, mimeType, latestVersionId, status, tags[]      |
| Version          | documentId, storageKey, size, uploadedBy, uploadedAt, checksum |
| Attachment       | entityId, entityType, documentId, label                        |
| SignatureRequest | documentId, signers[], status, dueAt                           |

**FSMs:**

```
Document: draft → under-review → approved → archived
SignatureRequest: pending → partially-signed → completed → expired → rejected
```

**Commands:**

```
document.upload(folderId, file, meta)          → uses StorageAdapter
document.newVersion(documentId, file)
document.approve(documentId, actorId)
document.attach(entityId, entityType, documentId, label)
document.requestSignature(documentId, signers[], dueAt)
document.sign(signatureRequestId, actorId, signatureData)
document.delete(documentId)                    → soft delete + storage cleanup
```

**Queries:**

```
document.getDocument(id)
document.getVersions(documentId)
document.getAttachments(entityId, entityType)
document.getSignedUrl(documentId, expiresIn?)  → CDN signed URL
document.listFolder(folderId)
```

**Events Emitted:**

```
document.uploaded    document.approved    document.archived
document.attached    signature.completed  signature.expired
```

---

### `notification` Module

**Depends on:** `identity`
**Owns:** NotificationTemplate, NotificationLog, NotificationPreference, NotificationTrigger

**Entity Schemas:**

| Entity                 | Key Fields                                                               |
| ---------------------- | ------------------------------------------------------------------------ |
| NotificationTemplate   | key, channel, subject, bodyTemplate(Handlebars), locale                  |
| NotificationTrigger    | eventPattern, templateKey, recipientExpr: RuleExpr, conditions: RuleExpr |
| NotificationLog        | templateKey, channel, to, status, sentAt, metadata                       |
| NotificationPreference | actorId, channel, enabled, muteUntil                                     |

**Flow:**

```
EventBus event
  → notification module listener matches NotificationTrigger
  → resolves recipient(s) via recipientExpr
  → checks NotificationPreference
  → renders template with event payload
  → pushes to Queue (standard priority)
  → Queue worker → NotificationAdapter.send()
  → writes NotificationLog
  → emits notification.sent (or notification.failed → retry)
```

**Commands:**

```
notification.send(templateKey, to, variables, channel?)   → direct send
notification.setPreference(actorId, channel, enabled)
notification.createTemplate
notification.createTrigger(eventPattern, templateKey, conditions)
notification.markRead(notificationId)
```

**Queries:**

```
notification.getInbox(actorId, page)
notification.getLog(orgId, filter)
notification.getPreferences(actorId)
```

**Events Emitted:**

```
notification.sent    notification.failed    notification.read
```

**Real-Time Channels:** `org:{orgId}:actor:{actorId}:inbox` (in-app notification badge)

---

### `geo` Module

**Owns:** GeoEntity, Territory, Route, Address, GeoFence

**Entity Schemas:**

| Entity    | Key Fields                                                           |
| --------- | -------------------------------------------------------------------- |
| GeoEntity | entityId, entityType, geometry(PostGIS), properties                  |
| Territory | name, type, geometry(Polygon), orgId                                 |
| Route     | name, waypoints: GeoEntity[], distance, duration                     |
| Address   | entityId, entityType, street, city, state, country, postcode, coords |
| GeoFence  | territoryId, monitoredEntityType, entryEvent, exitEvent              |

**Commands:**

```
geo.attachLocation(entityId, entityType, coords, address?)
geo.updateLocation(entityId, coords)                  → real-time asset tracking
geo.createTerritory(name, polygon)
geo.optimizeRoute(waypoints[], mode)                   → uses GeoAdapter
geo.checkTerritory(entityId, territoryId)
```

**Queries:**

```
geo.getLocation(entityId, entityType)
geo.getNearby(coords, radius, entityType)              → PostGIS ST_DWithin
geo.getTerritoriesContaining(coords)
geo.getEntitiesInTerritory(territoryId, entityType)
geo.getRoute(routeId)
```

**Events Emitted:**

```
entity.location-updated     entity.entered-territory     entity.left-territory
route.optimized             geofence.triggered
```

**Real-Time Channels:** `org:{orgId}:geo:tracking` (live map of moving entities)

---

### `analytics` Module

**Read-only.** Consumes events from all modules to build materialized views, metrics, and reports.

**Owns:** Metric, Dashboard, ReportDefinition, MaterializedView, Snapshot

**Entity Schemas:**

| Entity           | Key Fields                                          |
| ---------------- | --------------------------------------------------- |
| Metric           | key, label, aggregation, query, filters, unit       |
| Dashboard        | name, actorId, metrics[], layout                    |
| ReportDefinition | name, baseQuery, parameters[], format(csv/pdf/json) |
| Snapshot         | metricKey, value, capturedAt, dimensions            |

**Commands:**

```
analytics.runReport(reportId, parameters)       → queued, returns jobId
analytics.createMetric(definition)
analytics.saveDashboard(actorId, widgets[])
analytics.exportData(query, format)             → queued
```

**Queries:**

```
analytics.getMetric(key, from, to, dimensions?)
analytics.getDashboard(dashboardId)
analytics.getSnapshot(metricKey, from, to)
analytics.getReportStatus(jobId)
analytics.downloadReport(jobId)                 → signed CDN URL
```

**Event Listeners (read-only, builds read models):**

```
order.*        → updates order funnel metrics
inventory.*    → maintains stock level time-series
ledger.*       → maintains financial aggregates
actor.*        → maintains user activity metrics
workflow.*     → maintains task completion rates
```

**Scheduled Jobs:**

```
analytics.snapshot-metrics    (hourly)     → persists point-in-time metric values
analytics.generate-reports    (nightly)    → pre-builds scheduled reports
analytics.rebuild-views       (weekly)     → full materialized view refresh
```

---

## Module Communication Rules

```
✓ Module A emits an Event  → Module B listens and reacts
✓ Module A dispatches a Command to Module B via Mediator
✓ Module A queries Module B via Mediator

✗ Module A imports Module B's internal functions directly
✗ Module A reads Module B's database table directly
✗ Module A calls Module B's repository directly
```

Any violation of the above rules is a **hard architectural boundary violation** and must be refactored.

---

## How to Create a Custom Module

```typescript
// 1. Define your manifest
const myModuleManifest: ModuleManifest = {
  id: "loyalty",
  version: "1.0.0",
  dependsOn: ["identity", "ledger"],
  entities: [PointAccountSchema, RedemptionSchema, TierSchema],
  events: ["points.earned", "points.redeemed", "tier.upgraded"],
  commands: ["loyalty.earnPoints", "loyalty.redeemPoints"],
  queries: ["loyalty.getBalance", "loyalty.getTier"],
};

// 2. Register command handlers
mediator.register("loyalty.earnPoints", async (cmd, ctx) => {
  const account = await ctx.repo.findOne({ actorId: cmd.payload.actorId });
  account.balance += cmd.payload.points;
  await ctx.repo.save(account);
  ctx.bus.publish({
    type: "points.earned",
    payload: { actorId: cmd.payload.actorId, points: cmd.payload.points },
  });
});

// 3. Listen to events from other modules
bus.subscribe("order.completed", async (event) => {
  await mediator.dispatch({
    type: "loyalty.earnPoints",
    payload: {
      actorId: event.payload.customerId,
      points: Math.floor(event.payload.total / 10),
      ref: event.aggregateId,
    },
  });
});

// 4. Export the module
export const LoyaltyModule: AppModule = {
  manifest: myModuleManifest,
  boot: (registry) => {
    /* register handlers, listeners, jobs */
  },
};
```
