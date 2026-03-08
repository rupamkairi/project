# Module Contracts Reference

Quick-reference for all 10 standard modules — commands, queries, events.
Use this when writing specs to verify exact command names and payload shapes.

---

## `identity` Module

**Commands:**
```
identity.register(email, password, orgId?)         → Actor(pending) + sends verification
identity.activate(actorId, token)                  → Actor(active)
identity.login(email, password)                    → Session
identity.logout(sessionToken)                      → invalidates Session
identity.assignRole(actorId, roleId)
identity.revokeRole(actorId, roleId)
identity.createOrg(name, slug, plan)
identity.inviteActor(email, roleId, orgId)
identity.createAPIKey(name, scopes[], expiresAt?)
identity.rotateAPIKey(keyId)
```

**Queries:**
```
identity.getActor(id)                              → Actor
identity.resolveSession(token)                     → { actor, org }
identity.resolveAPIKey(key)                        → { actor, scopes }
identity.getPermissions(actorId)                   → Permission[]
identity.hasPermission(actorId, resource, action)  → boolean
identity.listActors(filter, page)                  → PaginatedResult<Actor>
```

**Events:**
```
actor.registered    { actorId, email, orgId }
actor.activated     { actorId }
actor.suspended     { actorId, reason }
actor.login         { actorId, sessionId, ip }
actor.logout        { actorId, sessionId }
role.assigned       { actorId, roleId }
org.created         { orgId, slug }
apikey.created      { keyId, actorId }
invite.sent         { email, orgId, roleId }
```

---

## `catalog` Module

**Commands:**
```
catalog.createCategory(name, slug, parentId?, attributeSetId?)
catalog.updateCategory(id, fields)
catalog.createItem(name, slug, categoryId, attributeValues, status?)
catalog.updateItem(id, fields)
catalog.publishItem(id)                            → Item(active)
catalog.archiveItem(id)                            → Item(archived)
catalog.addVariant(itemId, sku, attributes, stockTracked?)
catalog.updateVariant(variantId, fields)
catalog.createPriceList(name, currency, audience, validFrom, validTo?)
catalog.setPriceRule(priceListId, variantId, price, minQty?, conditions?)
```

**Queries:**
```
catalog.getItem(id)                                → Item + Variants
catalog.listItems(categoryId?, filter, page)       → PaginatedResult<Item>
catalog.searchItems(query, filters)                → PaginatedResult<Item> via SearchAdapter
catalog.resolvePrice(variantId, actorId, qty, date) → Money (best matching PriceRule)
catalog.getVariants(itemId)                        → Variant[]
```

**Events:**
```
item.created      { itemId, categoryId }
item.published    { itemId }
item.archived     { itemId }
item.updated      { itemId, changedFields }
price.changed     { variantId, priceListId, newPrice }
variant.added     { variantId, itemId, sku }
```

---

## `inventory` Module

**Depends on:** catalog

**Commands:**
```
inventory.reserve(variantId, qty, orderId)         → increments reserved
inventory.release(variantId, qty, orderId)         → decrements reserved
inventory.fulfill(variantId, qty, orderId)         → decrements onHand + reserved
inventory.receive(variantId, locationId, qty)      → increments onHand
inventory.transfer(variantId, fromLocationId, toLocationId, qty)
inventory.adjust(stockUnitId, delta, reason)
```

**Queries:**
```
inventory.getStock(variantId, locationId?)         → StockUnit
inventory.checkAvailability(variantId, qty, locationId?) → boolean
inventory.listLowStock(threshold?)                 → StockUnit[]
inventory.getMovements(variantId, from, to)        → StockMovement[]
```

**Events:**
```
stock.reserved    { variantId, qty, orderId, locationId }
stock.released    { variantId, qty, orderId }
stock.fulfilled   { variantId, qty, orderId }
stock.received    { variantId, qty, locationId }
stock.adjusted    { stockUnitId, delta, reason, actorId }
stock.low         { variantId, locationId, available, threshold }
stock.depleted    { variantId, locationId }
```

---

## `ledger` Module

**Commands:**
```
ledger.createAccount(code, name, type, currency, parentId?)
ledger.postTransaction(debitAccountId, creditAccountId, amount, currency, reference, description?)
ledger.voidTransaction(transactionId, reason)
ledger.recordPayment(invoiceId, amount, gateway, gatewayRef)
ledger.issueRefund(transactionId, amount)
ledger.runMonthClose(month)                        → locks period, generates P&L snapshot
```

**Queries:**
```
ledger.getAccount(id)                              → Account + balance
ledger.getBalance(accountId, asOf?)                → Money
ledger.getTransactions(accountId, from, to, page)  → PaginatedResult<Transaction>
ledger.getProfitLoss(from, to)                     → P&L report
ledger.getTrialBalance(asOf?)                      → TrialBalance
ledger.resolveExchangeRate(from, to, date?)        → number
```

**Events:**
```
transaction.posted    { transactionId, debitAccountId, creditAccountId, amount }
transaction.voided    { transactionId, reason }
payment.recorded      { invoiceId, amount, gateway, gatewayRef }
refund.issued         { transactionId, amount }
period.closed         { month, orgId }
```

---

## `workflow` Module

**Commands:**
```
workflow.createTemplate(name, entityType, stages[])
workflow.startProcess(templateId, entityId, entityType, variables?)
workflow.completeTask(taskId, actorId, outcome?, attachments?)
workflow.assignTask(taskId, actorId)
workflow.skipTask(taskId, actorId, reason)
workflow.cancelProcess(processId, reason)
```

**Queries:**
```
workflow.getProcess(id)                            → Process + Tasks
workflow.getTasksForActor(actorId, status?, page)  → PaginatedResult<Task>
workflow.getProcessForEntity(entityId, entityType) → Process[]
```

**Events:**
```
workflow.process.started    { processId, templateId, entityId, entityType }
workflow.task.assigned      { taskId, processId, actorId }
workflow.task.completed     { taskId, processId, outcome }
workflow.task.skipped       { taskId, processId, reason }
workflow.process.completed  { processId, entityId }
workflow.process.cancelled  { processId, reason }
```

---

## `scheduling` Module

**Commands:**
```
scheduling.createResource(name, type, availabilityRules[])
scheduling.setAvailability(resourceId, rules[])
scheduling.book(resourceId, actorId, slotStart, slotEnd, meta?)
scheduling.cancel(bookingId, reason)
scheduling.reschedule(bookingId, newSlotStart, newSlotEnd)
scheduling.complete(bookingId)
scheduling.noShow(bookingId)
```

**Queries:**
```
scheduling.getAvailableSlots(resourceId, date, duration)  → Slot[]
scheduling.getBooking(id)                                  → Booking
scheduling.listBookings(resourceId?, actorId?, from, to)  → PaginatedResult<Booking>
```

**Events:**
```
scheduling.booking.created    { bookingId, resourceId, actorId, slotStart, slotEnd }
scheduling.booking.cancelled  { bookingId, reason }
scheduling.booking.completed  { bookingId }
scheduling.booking.no-show    { bookingId, actorId }
```

---

## `document` Module

**Commands:**
```
document.upload(folderId, file, meta)              → Document (via StorageAdapter)
document.newVersion(documentId, file)
document.approve(documentId, actorId)
document.attach(entityId, entityType, documentId, label)
document.requestSignature(documentId, signers[], dueAt)
document.sign(signatureRequestId, actorId, signatureData)
document.delete(documentId)                        → soft delete + storage cleanup
```

**Queries:**
```
document.getDocument(id)                           → Document + versions
document.getVersions(documentId)                   → DocumentVersion[]
document.getAttachments(entityId, entityType)      → Document[]
document.getSignedUrl(documentId, expiresIn?)      → CDN signed URL
document.listFolder(folderId)                      → Document[]
```

**Events:**
```
document.uploaded     { documentId, folderId, actorId }
document.approved     { documentId, actorId }
document.archived     { documentId }
document.attached     { documentId, entityId, entityType, label }
signature.completed   { signatureRequestId, documentId }
signature.expired     { signatureRequestId, documentId }
```

---

## `notification` Module

**Commands:**
```
notification.send(templateKey, to, variables, channel?)     → direct send
notification.setPreference(actorId, channel, enabled)
notification.createTemplate(key, channel, subject, bodyTemplate, locale?)
notification.createTrigger(eventPattern, templateKey, recipientExpr, conditions?)
notification.markRead(notificationId)
```

**Queries:**
```
notification.getInbox(actorId, page)               → PaginatedResult<NotificationLog>
notification.getLog(filter, page)                  → PaginatedResult<NotificationLog>
notification.getPreferences(actorId)               → NotificationPreference[]
```

**Events:**
```
notification.sent     { templateKey, channel, to }
notification.failed   { templateKey, channel, to, error }
notification.read     { notificationId, actorId }
```

**Real-Time:** `org:{orgId}:actor:{actorId}:inbox`

---

## `geo` Module

**Commands:**
```
geo.attachLocation(entityId, entityType, coords, address?)
geo.updateLocation(entityId, coords)               → real-time asset tracking
geo.createTerritory(name, polygon)
geo.optimizeRoute(waypoints[], mode)               → uses GeoAdapter
geo.checkTerritory(entityId, territoryId)
```

**Queries:**
```
geo.getLocation(entityId, entityType)              → GeoEntity
geo.getNearby(coords, radius, entityType)          → GeoEntity[] via PostGIS ST_DWithin
geo.getTerritoriesContaining(coords)               → Territory[]
geo.getEntitiesInTerritory(territoryId, entityType) → GeoEntity[]
geo.getRoute(routeId)                              → Route
```

**Events:**
```
entity.location-updated     { entityId, entityType, coords }
entity.entered-territory    { entityId, entityType, territoryId }
entity.left-territory       { entityId, entityType, territoryId }
route.optimized             { routeId, waypoints, distance, duration }
geofence.triggered          { entityId, territoryId, direction }
```

**Real-Time:** `org:{orgId}:geo:tracking`

---

## `analytics` Module

**Commands:**
```
analytics.runReport(reportId, parameters)          → queued → returns jobId
analytics.createMetric(definition)
analytics.saveDashboard(actorId, widgets[])
analytics.exportData(query, format)                → queued → returns jobId
```

**Queries:**
```
analytics.getMetric(key, from, to, dimensions?)    → Snapshot[]
analytics.getDashboard(dashboardId)                → Dashboard + resolved metrics
analytics.getSnapshot(metricKey, from, to)         → Snapshot[]
analytics.getReportStatus(jobId)                   → 'queued'|'running'|'done'|'failed'
analytics.downloadReport(jobId)                    → signed CDN URL
```

**Event Listeners (read-only, no side effects):**
```
order.*         → order funnel metrics
inventory.*     → stock level time-series
ledger.*        → financial aggregates
actor.*         → user activity metrics
workflow.*      → task completion rates
```

---

## Module Dependency Graph

```
identity     ←  (no deps)
catalog      ←  (no deps)
inventory    ←  catalog
ledger       ←  (no deps)
workflow     ←  identity
scheduling   ←  identity
document     ←  identity
notification ←  identity
geo          ←  (no deps)
analytics    ←  all modules (read-only event listeners)
```
