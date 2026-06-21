# Phase 12 — Web Overview

---

## 12.1 Six Web Apps

| App | Path prefix | Users |
|-----|-------------|-------|
| FrontDeskApp | `/front-desk` | Front desk agents |
| HousekeepingApp | `/housekeeping` | Housekeepers, supervisors |
| ReservationsApp | `/reservations` | Reservation agents, revenue manager |
| RevenueApp | `/revenue` | Revenue manager |
| GuestApp | `/guest` | Hotel guests (self-service) |
| AdminApp | `/hospitality-admin` | Hotel administrators |

---

## 12.2 Pain Points This UI Solves

| Pain | Solution |
|------|---------|
| Front desk can't see which rooms are ready | Room status board with housekeeping status inline |
| Nightly charge posted twice | Idempotency on server; UI shows posted charges by date |
| Check-in attempt to dirty room | Guard shown in UI + server-side reject |
| Guest ID stored in plain text | Encrypted at rest, shown masked in UI with reveal button |
| OTA inventory out of date | Stale indicator + last-sync timestamp on revenue page |
| Cancellation fee computed wrongly by agent | Server always computes; UI shows fee before confirming cancel |

---

## 12.3 Role → App Access

| Role | App | Notes |
|------|-----|-------|
| `front-desk` | FrontDeskApp | Check-in/out, folios |
| `housekeeper` | HousekeepingApp | Own tasks |
| `hk-supervisor` | HousekeepingApp (full) | Inspect, assign, staff view |
| `revenue-mgr` | ReservationsApp + RevenueApp | Rate plans, analytics |
| `maintenance` | Maintenance board (in AdminApp) | Own requests |
| `hotel-admin` | All apps | Full access |
| `guest` | GuestApp | Own reservation, service requests |

---

## 12.4 Design Rules

- Shadcn zinc, compact
- Room status color codes:

| Status | Color |
|--------|-------|
| `available` + `inspected` | green |
| `available` + `dirty` | red |
| `cleaning-in-progress` | amber |
| `done` (awaiting inspect) | blue |
| `occupied` | zinc/dark |
| `blocked` / `out-of-service` | slate |

- Reservation status:

| Status | Color |
|--------|-------|
| `confirmed` | green |
| `tentative` | amber |
| `checked-in` | blue |
| `checked-out` | zinc |
| `cancelled` | red |
| `no-show` | orange |

- Dates: `DD MMM YYYY` (21 Jun 2026)
- Money: property currency, 2 decimals
- VIP badge: gold star for `gold` / `platinum` guests

---

## 12.5 File Tree

```
packages/hospitality-web/src/
  index.ts
  api/
    hospitality-client.ts
  stores/
    auth-store.ts
    property-store.ts
  components/shared/
    StatusBadge.tsx
    RoomStatusCard.tsx
    FolioSummary.tsx
    GuestBadge.tsx
    AmountDisplay.tsx
    ConfirmDialog.tsx
    HospitalityLayout.tsx
    HospitalitySidebar.tsx
  apps/
    front-desk/
      index.ts
      routes.tsx
      pages/
        arrivals/
        departures/
        in-house/
        checkin/
        checkout/
        rooms/
        walkin/
    housekeeping/
      index.ts
      routes.tsx
      pages/
        board/
        tasks/
        staff/
    reservations/
      index.ts
      routes.tsx
      pages/
        search/
        new/
        detail/
        group/
    revenue/
      index.ts
      routes.tsx
      pages/
        dashboard/
        rate-plans/
        channel-sync/
        forecast/
    guest/
      index.ts
      routes.tsx
      pages/
        my-reservation/
        folio/
        service-requests/
        check-out/
    admin/
      index.ts
      routes.tsx
      pages/
        rooms/
        analytics/
        maintenance/
        config/
```
