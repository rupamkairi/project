# Module Reference

Layer 2: Bounded domain units. Communicate only via EventBus and Command Mediator.

## Module Contract

```
- Declares: entities, commands, queries, events (emitted + reacted)
- Owns: DB namespace (table prefix/schema)
- Never: imports from another module's internals
```

## Anatomy

```
modules/{name}/
  manifest.ts          ← ModuleManifest
  entities/            ← EntitySchema definitions
  commands/            ← Command handlers
  queries/             ← Query handlers
  events/              ← Event emitters + listeners
  fsm/                 ← State machine definitions
  jobs/                ← Scheduled & queue-based jobs
```

---

## identity

**Owns:** Actor, Role, Permission, Organization, Session, APIKey, InviteToken

**FSMs:** `Actor: pending→active→suspended→deleted`, `Invite: pending→accepted→expired→revoked`

**Commands:** register, activate, login, logout, assignRole, revokeRole, createOrg, inviteActor, createAPIKey

**Queries:** getActor, resolveSession, resolveAPIKey, getPermissions, hasPermission, listActors

**Events:** actor.registered, actor.activated, actor.suspended, actor.login, actor.logout, role.assigned, org.created

**Jobs:** purge-expired-sessions (daily)

---

## catalog

**Owns:** Item, Category, Attribute, AttributeSet, PriceList, PriceRule, Variant, Tag

**FSMs:** `Item: draft→active→archived`, `PriceList: draft→active→expired`

**Commands:** createCategory, createItem, updateItem, publishItem, archiveItem, addVariant, createPriceList, setPriceRule

**Queries:** getItem, listItems, searchItems, resolvePrice, getVariants

**Events:** item.created, item.published, item.archived, item.updated, price.changed

---

## inventory

**Depends on:** catalog

**Owns:** Location, StockUnit, StockMovement, StockAdjustment, ReorderRule

**Computed:** `available = onHand - reserved`

**Commands:** reserve, release, fulfill, receive, transfer, adjust

**Queries:** getStock, checkAvailability, listLowStock, getMovements

**Events:** stock.reserved, stock.released, stock.fulfilled, stock.received, stock.adjusted, stock.low, stock.depleted

**Jobs:** check-reorder-points (hourly), snapshot-daily-stock (nightly)

---

## ledger

**Owns:** Account, JournalEntry, Transaction, Currency, ExchangeRate, TaxRate

**Model:** Double-entry. Every Transaction = 2 JournalEntries.

**Account Types:** asset | liability | revenue | expense | equity

**Commands:** createAccount, postTransaction, voidTransaction, recordPayment, issueRefund, runMonthClose

**Queries:** getBalance, getTransactions, getTrialBalance, getPnL, getCashFlow

**Events:** transaction.posted, transaction.voided, payment.received, refund.issued

**Jobs:** daily-balance-snapshot, fx-rate-sync (6h), overdue-invoice-check (daily)

---

## workflow

**Owns:** ProcessTemplate, ProcessInstance, Stage, Task, Assignment

**FSMs:** `ProcessInstance: pending→active→completed→cancelled`, `Task: open→in-progress→completed→failed→skipped`

**Commands:** startProcess, completeTask, skipTask, escalateTask, cancelProcess, advanceStage

**Queries:** getProcess, getMyTasks, getEntityProcess, getOverdueTasks

**Events:** process.started, stage.entered, stage.completed, task.assigned, task.completed, task.overdue

**Jobs:** check-overdue-tasks (15min), auto-escalate (hourly)

---

## scheduling

**Depends on:** identity, catalog

**Owns:** Calendar, Slot, Booking, Recurrence, BlockedPeriod

**FSMs:** `Slot: available→partially-booked→fully-booked→cancelled→expired`, `Booking: pending→confirmed→checked-in→completed→cancelled→no-show`

**Commands:** createCalendar, addSlot, addRecurrence, book, confirm, cancel, checkIn, block

**Queries:** getAvailableSlots, getBooking, getMyBookings, checkConflict

**Events:** slot.created, slot.booked, booking.confirmed, booking.cancelled, booking.no-show

**Jobs:** generate-recurring-slots (daily), expire-unconfirmed-bookings (5m), remind-upcoming (daily)

---

## document

**Owns:** Document, Folder, Version, Attachment, SignatureRequest

**FSMs:** `Document: draft→under-review→approved→archived`, `SignatureRequest: pending→partially-signed→completed→expired→rejected`

**Commands:** upload, newVersion, approve, attach, requestSignature, sign, delete

**Queries:** getDocument, getVersions, getAttachments, getSignedUrl, listFolder

**Events:** document.uploaded, document.approved, document.archived, signature.completed

---

## notification

**Depends on:** identity

**Owns:** NotificationTemplate, NotificationLog, NotificationPreference, NotificationTrigger

**Flow:** EventBus → trigger match → resolve recipient → check preference → render → queue → adapter.send → log

**Commands:** send, setPreference, createTemplate, createTrigger, markRead

**Queries:** getInbox, getLog, getPreferences

**Events:** notification.sent, notification.failed, notification.read

---

## geo

**Owns:** GeoEntity, Territory, Route, Address, GeoFence

**Commands:** attachLocation, updateLocation, createTerritory, optimizeRoute, checkTerritory

**Queries:** getLocation, getNearby, getTerritoriesContaining, getEntitiesInTerritory, getRoute

**Events:** entity.location-updated, entity.entered-territory, entity.left-territory, geofence.triggered

---

## analytics

**Read-only.** Consumes events to build materialized views, metrics, reports.

**Owns:** Metric, Dashboard, ReportDefinition, MaterializedView, Snapshot

**Commands:** runReport, createMetric, saveDashboard, exportData

**Queries:** getMetric, getDashboard, getSnapshot, getReportStatus, downloadReport

**Listeners:** order._, inventory._, ledger._, actor._, workflow.\*

**Jobs:** snapshot-metrics (hourly), generate-reports (nightly), rebuild-views (weekly)

---

## Communication Rules

```
✓ A emits Event → B listens
✓ A dispatches Command to B via Mediator
✓ A queries B via Mediator

✗ A imports B's internal functions
✗ A reads B's database table
✗ A calls B's repository
```
