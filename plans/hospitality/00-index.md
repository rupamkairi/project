# Hospitality Compose — Plan Index

---

## Plan Files

### Backend (Phases 1–11)

| Phase | File | Description |
|-------|------|-------------|
| 01 | [01-foundation.md](01-foundation.md) | Package structure, compose factory, permissions, roles, ID prefixes |
| 02 | [02-entities.md](02-entities.md) | All 18 Drizzle table definitions |
| 03 | [03-reservations.md](03-reservations.md) | Reservation CRUD + FSM, availability check, confirmation number, group booking |
| 04 | [04-front-desk.md](04-front-desk.md) | Check-in/out flow, room assignment, walk-in, early/late checkout, no-show |
| 05 | [05-housekeeping.md](05-housekeeping.md) | Task CRUD, assignment, completion, inspection workflow, room status |
| 06 | [06-folios-billing.md](06-folios-billing.md) | Folio charge posting, payment collection, settlement, tax invoice |
| 07 | [07-rate-plans.md](07-rate-plans.md) | Rate plan CRUD, room type pricing, seasonal overrides, cancellation policy |
| 08 | [08-revenue-management.md](08-revenue-management.md) | Occupancy stats, RevPAR/ADR, channel inventory sync, forecasting |
| 09 | [09-maintenance.md](09-maintenance.md) | Maintenance request lifecycle, OOO room blocking, parts tracking |
| 10 | [10-backend-logic.md](10-backend-logic.md) | FSMs (5), hooks (6), jobs (8), rules, nightly charge posting |
| 11 | [11-shell-integration.md](11-shell-integration.md) | Server + web shell wiring, schema export, migration, seed |

### Web UI (Phases 12–19)

| Phase | File | Description |
|-------|------|-------------|
| 12 | [12-web-overview.md](12-web-overview.md) | 6 apps overview, pain points, design rules, real-time requirements, file manifest |
| 13 | [13-web-front-desk.md](13-web-front-desk.md) | Arrivals list, check-in page, departures, room status board, folio page |
| 14 | [14-web-housekeeping.md](14-web-housekeeping.md) | Supervisor board (3-tab), TaskCard, MyTasksPage, checklist, inspect dialog |
| 15 | [15-web-reservations.md](15-web-reservations.md) | Reservations list, 4-step new reservation wizard, detail page, cancel dialog |
| 16 | [16-web-revenue.md](16-web-revenue.md) | Revenue dashboard, rate plans, RatePlanDetailPage, RateCalendar, channel sync |
| 17 | [17-web-guest.md](17-web-guest.md) | Token-auth guest portal, service request, folio view, express checkout |
| 18 | [18-web-admin.md](18-web-admin.md) | Admin dashboard, room management, maintenance board kanban, config, guest profiles |
| 19 | [19-web-foundation.md](19-web-foundation.md) | Auth store, property store, HospitalityApiClient, RoomStatusCard, FolioSummary |

### Operations (Phases 20–22)

| Phase | File | Description |
|-------|------|-------------|
| 20 | [20-data-seeding.md](20-data-seeding.md) | Room types, rooms, rate plans, OTA config, dev users, sample reservations |
| 21 | [21-compose-credentials-integration.md](21-compose-credentials-integration.md) | Ports, env vars, OTA channel manager API, payment gateway, Vite aliases |
| 22 | [22-missed-integrations.md](22-missed-integrations.md) | Pitfalls + 20-item integration checklist |

---

## Architecture Diagram

```
apps/server (Shell)
  └── .use(hospitalityCompose)   prefix: /hospitality
  └── POST /webhooks/booking-com ← OTA webhooks
  └── POST /webhooks/expedia

composes/hospitality/
  server/src/
    index.ts                     ← createHospitalityCompose(mediator, bus, scheduler)
    routes/
      reservations/              ← Phase 3
      front-desk/                ← Phase 4
      housekeeping/              ← Phase 5
      folios/                    ← Phase 6
      rate-plans/                ← Phase 7
      revenue/                   ← Phase 8
      maintenance/               ← Phase 9
      guest/                     ← guest portal routes
    hooks/
    jobs/
    fsm/
    schema/

packages/hospitality-web/src/
  apps/
    front-desk/                  ← Phase 14
    housekeeping/                ← Phase 15
    reservations/                ← Phase 16
    folios/                      ← Phase 17
    revenue/                     ← Phase 18
    guest/                       ← Phase 19
  components/shared/
  api/hospitality-client.ts
  stores/
```

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Double-booking same room | `scheduling.checkAvailability` before reservation confirm — unique constraint on (roomId, date) |
| Nightly charge not posted | Idempotent job: check if charge for date already exists before posting |
| Check-in to dirty room | `checkin-requires-clean-room` rule: `housekeepingStatus = 'inspected'` |
| Folio settled with balance | `folio-settle-requires-zero-balance` rule |
| OTA sync lag | Channel inventory job runs every 15min — flag stale if > 30min |
| Cancellation penalty miscalculation | Server computes penalty from rate plan policy — never trust frontend value |
| No-show charges | Only charge 1 night from deposit — never charge more than deposited |
| Group booking coordination | Group FSM ensures all room blocks confirmed before group status = confirmed |
