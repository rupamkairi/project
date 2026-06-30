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

## 1.4 MTA Provisioning

Before running hospitality migrations, ensure foundation modules are active for the org:

1. `cat_items`, `locations`, `persons`, `transactions`, `transaction_lines`, `pipelines`, `pipeline_stages`, `activities` — created by foundation modules, not by this compose
2. Seed the reservation pipeline:
   ```typescript
   import { seedPipeline } from "apps/server/src/infra/db/seed"
   await seedPipeline(orgId, "hsp.reservation", [
     { name: "Inquiry" }, { name: "Confirmed" }, { name: "Checked In" },
     { name: "Checked Out" }, { name: "Cancelled" }, { name: "No Show" },
   ])
   ```
3. Hospitality migrations only create hsp_ prefixed detail tables: `hsp_rate_plans`, `hsp_rate_plan_seasons`, `hsp_channel_inventory`, `hsp_payment_records`, `hsp_housekeeping_assignments`, `hsp_maintenance_requests`, `hsp_packages`, `hsp_package_inclusions`, `hsp_org_config`

## 1.5 ID Prefix Table

Prefixes are used for hsp-owned detail table records only. Master table IDs follow their own module conventions.

| Entity | Prefix | Example |
|--------|--------|---------|
| RatePlan | `rtp_` | `rtp_01HX...` |
| RatePlanSeason | `rps_` | `rps_01HX...` |
| ChannelInventory | `civ_` | `civ_01HX...` |
| PaymentRecord | `pay_` | `pay_01HX...` |
| HousekeepingAssignment | `hka_` | `hka_01HX...` |
| MaintenanceRequest | `mnt_` | `mnt_01HX...` |
| Package | `pkg_` | `pkg_01HX...` |
| PackageInclusion | `pki_` | `pki_01HX...` |

---

## 1.6 Confirmation Number Format

Human-readable: `HTL-{YYYY}-{SEQ5}`
Example: `HTL-2024-00123`

Sequential counter per org stored in `hsp_org_config` (Hospitality-owned config table).
Stored in `meta.confirmationNumber` on the reservation `transaction` record.

Housekeeping assignment reference: `HK-{ROOM}-{DATE}-{SEQ}`
Example: `HK-201-20240615-01`
