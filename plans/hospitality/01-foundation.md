# Phase 1 — Foundation

---

## 1.1 Package Structure

```
composes/hospitality/
  server/
    src/
      index.ts
      routes/
        reservations/
        front-desk/
        housekeeping/
        folios/
        rate-plans/
        revenue/
        maintenance/
        guest/
      hooks/
      jobs/
      fsm/
      rules/
      schema/
    package.json

packages/hospitality-web/
  src/
    index.ts
    apps/
      front-desk/
      housekeeping/
      reservations/
      folios/
      revenue/
      guest/
    api/hospitality-client.ts
    stores/
    components/shared/
  package.json
```

---

## 1.2 Compose Factory Skeleton

**File:** `composes/hospitality/server/src/index.ts`

```typescript
import Elysia from "elysia";

export function createHospitalityCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerHospitalityHooks(bus, mediator);
  registerHospitalityJobs(scheduler, mediator);

  return new Elysia({ prefix: "/hospitality" })
    .use(reservationRoutes(mediator))
    .use(frontDeskRoutes(mediator))
    .use(housekeepingRoutes(mediator))
    .use(folioRoutes(mediator))
    .use(ratePlanRoutes(mediator))
    .use(revenueRoutes(mediator))
    .use(maintenanceRoutes(mediator))
    .use(guestRoutes(mediator));
}

export type HospitalityApp = ReturnType<typeof createHospitalityCompose>;
```

---

## 1.3 Permissions Matrix

| Permission | hotel-admin | front-desk | housekeeper | hk-supervisor | revenue-mgr | fnb | maintenance | guest |
|-----------|-------------|------------|-------------|--------------|------------|-----|-------------|-------|
| `reservation:create` | ✓ | ✓ | — | — | — | — | — | ✓ |
| `reservation:read` | ✓ | ✓ | — | — | ✓ | — | — | own |
| `reservation:modify` | ✓ | ✓ | — | — | ✓ | — | — | own |
| `reservation:cancel` | ✓ | ✓ | — | — | — | — | — | own |
| `checkin:process` | ✓ | ✓ | — | — | — | — | — | — |
| `checkout:process` | ✓ | ✓ | — | — | — | — | — | — |
| `room:read-status` | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — |
| `room:update-status` | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| `room:block` | ✓ | ✓ | — | — | ✓ | — | — | — |
| `housekeeping:read-tasks` | ✓ | — | ✓ | ✓ | — | — | — | — |
| `housekeeping:update-task` | ✓ | — | ✓ | ✓ | — | — | — | — |
| `housekeeping:assign` | ✓ | — | — | ✓ | — | — | — | — |
| `folio:read` | ✓ | ✓ | — | — | — | — | — | own |
| `folio:post-charge` | ✓ | ✓ | — | — | — | ✓ | — | — |
| `folio:settle` | ✓ | ✓ | — | — | — | — | — | — |
| `rate-plan:manage` | ✓ | — | — | — | ✓ | — | — | — |
| `maintenance:create` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — |
| `maintenance:update` | ✓ | — | — | ✓ | — | — | ✓ | — |
| `analytics:read` | ✓ | — | — | ✓ | ✓ | — | — | — |

---

## 1.4 ID Prefix Table

| Entity | Prefix | Example |
|--------|--------|---------|
| Room | `rom_` | `rom_01HX...` |
| RoomType | `rmt_` | `rmt_01HX...` |
| Reservation | `res_` | `res_01HX...` |
| GuestProfile | `gst_` | `gst_01HX...` |
| Folio | `fol_` | `fol_01HX...` |
| FolioCharge | `fch_` | `fch_01HX...` |
| RatePlan | `rtp_` | `rtp_01HX...` |
| HousekeepingTask | `hkt_` | `hkt_01HX...` |
| MaintenanceRequest | `mnt_` | `mnt_01HX...` |
| ServiceRequest | `svc_` | `svc_01HX...` |
| GroupBooking | `grp_` | `grp_01HX...` |

---

## 1.5 Confirmation Number Format

Human-readable: `HTL-{YYYY}-{SEQ5}`
Example: `HTL-2024-00123`

Sequential counter per org stored in `hsp_org_config.lastConfirmationSeq`.

Housekeeping task number: `HK-{ROOM}-{DATE}-{SEQ}`
Example: `HK-201-20240615-01`
