# Hospitality Compose — Agent Start

**Read first:** `plans/AGENT-START.md` (universal bootstrap: path aliases, layer rules, existing modules, compose pattern).

Then return here for Hospitality-specific context.

---

## Goal

Implement Hotel PMS (Property Management System) compose:
- **Reservations:** direct booking, OTA sync, channel management, group bookings
- **Front Desk:** check-in/out, room assignment, walk-in handling, early/late checkout
- **Housekeeping:** task queue, room status board, inspection workflow
- **Guest Folio:** running ledger per stay — room charges, F&B, minibar, services
- **Billing:** folio settlement, split folios, city ledger (corporate accounts), tax invoices
- **Rate Plans:** rack rate, corporate, OTA-net, packages, seasonal pricing
- **Revenue Management:** occupancy, RevPAR, ADR, OTA channel sync
- **Maintenance:** maintenance request lifecycle, OOO room blocking

Six front-end apps: FrontDeskApp, HousekeepingApp, ReservationApp, RevenueApp, GuestApp, AdminApp.

---

## Phase Execution Order

### Backend + Shell

1. `01-foundation.md` — package structure, compose factory, permissions, roles. **Start here.**
2. `02-entities.md` — all DB tables (rooms, room types, reservations, folios, charges, rate plans, housekeeping tasks, maintenance, channel inventory).
3. `03-reservations.md` — reservation CRUD + FSM, availability check, confirmation number gen, group booking.
4. `04-front-desk.md` — check-in/out flow, room assignment, walk-in, early/late checkout, no-show.
5. `05-housekeeping.md` — task creation, assignment, completion, inspection workflow, room status board.
6. `06-folios-billing.md` — folio charge posting, payment collection, folio settlement, tax invoice generation.
7. `07-rate-plans.md` — rate plan CRUD, room type pricing, cancellation policy, seasonal overrides.
8. `08-revenue-management.md` — occupancy stats, RevPAR/ADR, channel inventory sync, forecasting.
9. `09-maintenance.md` — maintenance request lifecycle, OOO blocking, parts tracking.
10. `10-backend-logic.md` — FSMs (5 entities), hooks (6), jobs (8), rules, nightly charge posting.
11. `11-shell-integration.md` — server + web wiring, schema export, migration, seed.

### Web UI Detail (read after Phase 11)

12. `12-web-overview.md` — 6 apps, pain points, design rules, real-time requirements, file manifest.
13. `13-web-foundation.md` — `HospitalityApiClient`, auth stores, layout, permission guard.
14. `14-web-front-desk.md` — arrivals list, check-in flow, room grid, departures, walk-in.
15. `15-web-housekeeping.md` — task queue (mobile-first), room status board, inspector view.
16. `16-web-reservations.md` — reservation list, create/edit, room calendar grid.
17. `17-web-folios.md` — folio detail, post charges, payment collection, invoice view.
18. `18-web-revenue.md` — occupancy dashboard, rate plan management, channel sync status.
19. `19-web-guest.md` — guest self-service portal, booking, folio view, service requests.

### Operations Reference (read before starting)

**Read `22-missed-integrations.md` before Phase 1.**

20. `20-data-seeding.md` — room types, rooms, rate plans, OTA config, dev users, sample reservations.
21. `21-compose-credentials-integration.md` — ports, env vars, OTA channel manager API, payment gateway, Vite aliases.
22. `22-missed-integrations.md` — all pitfalls + 20-item checklist.

---

## Compose Identity

| Property | Value |
|----------|-------|
| Compose name | `hospitality` |
| Server package | `@projectx/hospitality-compose` |
| Web package | `@projectx/hospitality-web` |
| Elysia prefix | `/hospitality` |
| Export fn | `createHospitalityCompose(mediator, bus, scheduler)` |
| Export type | `HospitalityApp` |
| DB table prefix | `hsp_` |
| Drizzle object prefix | `hsp` (e.g. `hspRoom`, `hspReservation`) |

---

## Master Table Architecture

**Rooms are `locations`, room types are `cat_items`, guests are `persons`.** See `docs/master-tables.md`.

Use `seedPipeline(orgId, 'hsp.reservation', stages)` from `apps/server/src/infra/db/seed.ts` to provision the reservation pipeline.

### Master tables (read/filter only — already exist)

| Table | type / entityType | Purpose |
|-------|------------------|---------|
| `cat_items` | `type = "room_type"` | Room types (Deluxe, Suite, etc.) |
| `locations` | `type = "room"` | Individual rooms; `parentId` → floor/wing location |
| `persons` | `type = "guest"` | Guest profiles |
| `transactions` | `type = "order"` | Reservations; `stageId` → hsp.reservation pipeline |
| `transaction_lines` | — | Reservation lines (nights × rate) and folio charge lines |
| `transactions` | `type = "bill"` | Folios; linked to reservation via `meta.reservationId` |
| `pipelines` + `pipeline_stages` | `entityType = "hsp.reservation"` | Inquiry → Confirmed → Checked In → Checked Out / Cancelled / No Show |
| `activities` | `type = "service_request"` | Housekeeping requests, amenity requests, guest service requests |
| `activities` | `type = "log"` | Maintenance logs, incident reports |

### Detail tables (hsp-owned, create these)

| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `hspRatePlans` | `hsp_rate_plans` | id, organizationId, name, code, mealPlan, cancellationPolicy (jsonb), isActive |
| `hspRatePlanSeasons` | `hsp_rate_plan_seasons` | id, ratePlanId, roomTypeId (cat_items.id), startDate, endDate, pricePerNight, minNights |
| `hspChannelInventory` | `hsp_channel_inventory` | id, organizationId, channelId, roomTypeId (cat_items.id), date, totalRooms, allocatedRooms, blockedRooms, rate, lastSyncAt |
| `hspPaymentRecords` | `hsp_payment_records` | id, organizationId, transactionId (transactions.id), method, gateway, gatewayRef, amount, currency, paidAt, status |
| `hspHousekeepingAssignments` | `hsp_housekeeping_assignments` | id, organizationId, locationId (locations.id), actorId, date, shift, taskType, status, checklistResults (jsonb), inspectedBy, inspectionPassed |
| `hspMaintenanceRequests` | `hsp_maintenance_requests` | id, organizationId, locationId (locations.id), reportedById, category, priority, description, status, assignedTo, resolvedAt, partsUsed (jsonb), roomBlockRequired |
| `hspPackages` | `hsp_packages` | id, organizationId, name, roomTypeId (cat_items.id), ratePlanId, isActive, inclusions (jsonb) |
| `hspPackageInclusions` | `hsp_package_inclusions` | id, organizationId, packageId, inclusionType, name, qty, value |
| `hspOrgConfig` | `hsp_org_config` | orgId, propertyName, defaultCheckInTime, defaultCheckOutTime, earlyCheckInFee, lateCheckOutFee, noShowPolicy (jsonb), taxRate, cityTaxPerNight, currency |

---

## Key FSMs

1. **Reservation FSM:** `tentative → confirmed → checked-in → checked-out | no-show | cancelled`
2. **Room (housekeeping) FSM:** `clean → dirty → cleaning-in-progress → inspected | touch-up`
3. **HousekeepingTask FSM:** `pending → assigned → in-progress → done → inspected | failed`
4. **MaintenanceRequest FSM:** `open → assigned → in-progress → resolved → closed`
5. **Folio FSM:** `open → settled | city-ledger`

---

## Modules via Mediator

| Need | Mediator type prefix |
|------|---------------------|
| Actor/org/guest profiles | `identity.*` |
| Room types (cat_items) | `catalog.listItems` with `payload: { type: "room_type" }` |
| Rooms (locations) | `location.listLocations` with `payload: { type: "room" }` |
| Guests (persons) | `party.listPersons` with `payload: { type: "guest" }` |
| Create reservation | `commerce.createTransaction` with `payload: { type: "order" }` |
| Add reservation line | `commerce.addLine` |
| Revenue posting | `ledger.postTransaction` |
| Availability / booking slots | `scheduling.checkAvailability`, `scheduling.book` |
| Invoice generation | `document.generatePDF` |
| Notifications | `notification.send` |
| Analytics | `analytics.track` |

---

## Critical Data Rules

- **Nightly charge posting:** runs every night at 11PM — posts one room-rate charge per occupied folio
- **Availability check:** reservation create must check `scheduling` module — no double-booking
- **Folio balance:** must be ≤ 0 (zero or credit) before checkout can complete
- **Room must be inspected** (housekeepingStatus = `inspected`) before check-in can proceed
- **No-show auto-trigger:** scheduler checks at 2AM — confirmed reservations past checkInDate + 24h
- **OOO room:** `isBlocked = true` prevents assignment to any reservation
- **Cancellation penalty:** computed from rate plan policy + hours until check-in
