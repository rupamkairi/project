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

## DB Tables (20 total)

| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `hspRoomType` | `hsp_room_types` | id, orgId, name, code, description, maxOccupancy, bedType, amenities (jsonb), baseRate, thumbnailUrl |
| `hspRoom` | `hsp_rooms` | id, orgId, roomNumber, roomTypeId, floor, status, housekeepingStatus, isBlocked, blockReason, currentReservationId, features (jsonb) |
| `hspReservation` | `hsp_reservations` | id, orgId, confirmationNumber, guestId, roomId, roomTypeId, ratePlanId, status, source, checkInDate, checkOutDate, nights, adults, children, totalRate, depositPaid, specialRequests, corporateId, groupId, folioId, channelReference |
| `hspGuestProfile` | `hsp_guest_profiles` | id, orgId, actorId, firstName, lastName, email, phone, nationality, idType, idNumber, preferences (jsonb), totalStays, totalSpend, vipStatus |
| `hspFolio` | `hsp_folios` | id, reservationId, guestId, status, totalCharges, totalPayments, balance, settledAt, ledgerTransactionId |
| `hspFolioCharge` | `hsp_folio_charges` | id, folioId, type, description, amount, currency, postedAt, postedBy, referenceId, reversed, taxAmount |
| `hspFolioPayment` | `hsp_folio_payments` | id, folioId, method, amount, receivedAt, gatewayRef, processedBy |
| `hspRatePlan` | `hsp_rate_plans` | id, orgId, name, code, type, mealPlan, minStay, cancellationPolicy (jsonb), validFrom, validTo, isActive |
| `hspRatePlanPrice` | `hsp_rate_plan_prices` | id, ratePlanId, roomTypeId, baseRate, extraAdultRate, extraChildRate, weekendSurcharge |
| `hspRateOverride` | `hsp_rate_overrides` | id, ratePlanId, roomTypeId, date, rate, minStay, stopSell, closeToArrival |
| `hspHousekeepingTask` | `hsp_housekeeping_tasks` | id, roomId, type, status, assignedTo, assignedBy, priority, scheduledFor, startedAt, completedAt, inspectedBy, inspectionNotes, inspectionPassed, checklistResults (jsonb) |
| `hspMaintenanceRequest` | `hsp_maintenance_requests` | id, roomId, location, category, description, priority, status, reportedBy, assignedTo, resolvedAt, resolution, partsUsed (jsonb), roomBlockRequired |
| `hspChannelInventory` | `hsp_channel_inventory` | id, roomTypeId, channel, date, allotment, booked, available, rate, lastSyncAt |
| `hspGroupBooking` | `hsp_group_bookings` | id, orgId, name, companyName, contactId, checkInDate, checkOutDate, roomCount, status, contractDocId, notes |
| `hspServiceRequest` | `hsp_service_requests` | id, reservationId, guestId, roomId, type (housekeeping/fnb/concierge/maintenance/other), description, status, priority, requestedAt, completedAt, assignedTo |
| `hspMealPlan` | `hsp_meal_plans` | id, orgId, code, name, includes (jsonb: breakfast/lunch/dinner), pricePerNightAdult, pricePerNightChild |
| `hspBlockedDate` | `hsp_blocked_dates` | id, roomTypeId, date, reason, blockedBy |
| `hspOrgConfig` | `hsp_org_config` | orgId, defaultCheckInTime, defaultCheckOutTime, earlyCheckInFee, lateCheckOutFee, noShowPolicy (jsonb), taxRate, cityTaxPerNight |

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
| Room catalog / room types | `catalog.*` |
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
