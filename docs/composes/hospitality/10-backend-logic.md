# Phase 10 — Backend Logic (FSMs, Hooks, Jobs, Rules)

---

## 10.1 All FSMs Summary

| Entity | States |
|--------|--------|
| Reservation | `tentative → confirmed → checked-in → checked-out / no-show / cancelled` |
| Room Housekeeping | `clean → dirty → cleaning-in-progress → done → inspected / touch-up` |
| HousekeepingTask | `pending → assigned → in-progress → done → inspected / failed` |
| Folio | `open → settled / city-ledger` |
| MaintenanceRequest | `open → assigned → in-progress → resolved → closed` |

---

## 10.2 `registerHospitalityHooks(bus, mediator)`

```typescript
export function registerHospitalityHooks(bus: EventBus, mediator: Mediator): void {

  // Check-in complete → create welcome service activity if guest has preferences
  // guest is now persons (type=guest), preferences stored in meta
  bus.on("hsp.reservation.checked-in", async ({ reservationId, locationId, personId }) => {
    const guest = await db.query.persons.findFirst({ where: eq(persons.id, personId) });
    if (guest?.meta?.preferences?.pillowType) {
      await db.insert(activities).values({
        id: generateId(), organizationId: guest.organizationId,
        type: "service_request",
        entityId: reservationId,
        entityType: "hsp.reservation",
        actorId: null,  // unassigned initially
        meta: { description: `Pillow preference: ${guest.meta.preferences.pillowType}` },
        status: "pending",
        version: 1,
      });
    }
  });

  // Check-out complete → departure-clean assignment + update guest stats
  // rooms are now locations (type=room), housekeeping tasks are hsp_housekeeping_assignments
  bus.on("hsp.reservation.checked-out", async ({ reservationId, locationId }) => {
    // Check if same-day arrival on this room type
    const reservation = await db.query.transactions.findFirst({
      where: eq(transactions.id, reservationId),
    });
    const sameDay = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.organizationId, reservation!.organizationId),
        eq(transactions.type, "order"),
        // same roomTypeId in meta, checking in today
        sql`meta->>'checkIn' = ${todayStr()}`,
        sql`meta->>'roomTypeId' = ${reservation!.meta?.roomTypeId}`,
      ),
    });
    await db.insert(hspHousekeepingAssignments).values({
      id: generateId(), organizationId: reservation!.organizationId,
      locationId,  // locations.id (room)
      actorId: null,  // to be assigned by supervisor
      date: todayStr(),
      taskType: "departure-clean",
      status: "pending",
      priority: sameDay ? "rush" : "normal",
    });
    bus.emit("hsp.housekeeping.task-created", { locationId, type: "departure-clean" });
  });

  // Room inspected → alert front desk (may unblock arriving guest)
  // rooms are locations; status tracked on location.status
  bus.on("hsp.room.inspected", async ({ locationId }) => {
    const waitingReservation = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.type, "order"),
        sql`meta->>'roomId' = ${locationId}`,
        sql`meta->>'checkIn' = ${todayStr()}`,
      ),
    });
    if (waitingReservation) {
      bus.emit("hsp.room.ready-for-arrival", { locationId, reservationId: waitingReservation.id });
    }
  });

  // Folio settled → post revenue to accounting
  bus.on("hsp.folio.settled", async ({ folioId, reservationId }) => {
    const folio = await getFolioWithCharges(folioId);
    await mediator.dispatch({
      type: "accounting.postHotelRevenue",
      roomRevenue: getChargesByType(folio.charges, "room"),
      ancillaryRevenue: getTotalAncillaryRevenue(folio.charges),
      taxCollected: getTotalTax(folio.charges),
      referenceId: reservationId,
    });
    // Generate tax invoice
    await mediator.dispatch({
      type: "document.generateTaxInvoice",
      template: "hotel-invoice",
      folioId,
    });
  });

  // Maintenance request closed → unblock room (location) if needed
  // Rooms are now locations (type=room); status updated on the location record
  bus.on("hsp.maintenance.closed", async ({ requestId, locationId, roomBlockRequired }) => {
    if (roomBlockRequired && locationId) {
      await db.update(locations).set({
        status: "available",  // or "housekeeping" if needs clean
        meta: sql`meta - 'blockReason'`,
      }).where(eq(locations.id, locationId));
    }
  });

  // Channel inventory changed → trigger sync to OTAs
  bus.on("hsp.availability.changed", async ({ roomTypeId, orgId }) => {
    await syncChannelInventory(orgId, ["booking-com", "expedia"]);
  });
}
```

---

## 10.3 `registerHospitalityJobs(scheduler, mediator)`

```typescript
export function registerHospitalityJobs(scheduler: Scheduler, mediator: Mediator): void {

  // Nightly room charge — 11PM daily
  scheduler.register({
    name: "hsp.nightly-room-charge",
    cron: "0 23 * * *",
    fn: async () => {
      const orgs = await getActiveOrgs();
      for (const orgId of orgs) {
        await postNightlyRoomCharges(orgId);
      }
    },
  });

  // No-show processing — 2AM daily
  // Reservations are now transactions (type=order); stage = "Confirmed" means not yet checked in
  scheduler.register({
    name: "hsp.no-show-processing",
    cron: "0 2 * * *",
    fn: async () => {
      const yesterday = addDays(todayStr(), -1);
      const noShows = await db.query.transactions.findMany({
        where: and(
          eq(transactions.type, "order"),
          sql`meta->>'checkIn' = ${yesterday}`,
          // stageId = "Confirmed" stage id (not checked in)
          inArray(transactions.stageId, await getStageIds("hsp.reservation", ["Confirmed"])),
        ),
      });
      for (const res of noShows) {
        await processNoShow(res.id, { chargeNight: true });
      }
    },
  });

  // Channel sync every 15 min
  scheduler.register({
    name: "hsp.channel-sync",
    cron: "*/15 * * * *",
    fn: async () => {
      const orgs = await getActiveOrgs();
      for (const orgId of orgs) {
        await syncChannelInventory(orgId, ["booking-com", "expedia"]);
      }
    },
  });

  // Stay-over housekeeping tasks — 7AM daily
  scheduler.register({
    name: "hsp.stayover-tasks",
    cron: "0 7 * * *",
    fn: async () => {
      await createStayoverTasks();
    },
  });

  // Turndown tasks — 5PM daily (if org config enables turndown)
  scheduler.register({
    name: "hsp.turndown-tasks",
    cron: "0 17 * * *",
    fn: async () => {
      const orgs = await getOrgsWithTurndown();
      for (const orgId of orgs) {
        await createTurndownTasks(orgId);
      }
    },
  });

  // Preventive maintenance — 1st of each month, 9AM
  scheduler.register({
    name: "hsp.preventive-maintenance",
    cron: "0 9 1 * *",
    fn: async () => {
      await createPreventiveMaintenanceTasks();
    },
  });

  // Analytics aggregation — 2AM daily
  scheduler.register({
    name: "hsp.analytics-aggregate",
    cron: "0 2 * * *",
    fn: async () => {
      await aggregateDailyHospitalityMetrics();
    },
  });
}
```

---

## 10.4 Hospitality Business Rules

```typescript
export const HOSPITALITY_RULES = [
  {
    id: "nightly-charge-idempotency",
    rule: "Before posting room charge: check if charge already exists for that folio + date + type=room + reversed=false. Skip if found.",
  },
  {
    id: "availability-double-check",
    rule: "Check availability at BOTH reservation create AND confirm. Race condition possible between tentative and confirm.",
  },
  {
    id: "room-inspected-before-checkin",
    rule: "room.housekeepingStatus must = 'inspected' before check-in allowed. 'done' is not enough — supervisor must inspect.",
  },
  {
    id: "folio-balance-before-checkout",
    rule: "folio.balance must be <= 0 before checkout. Exception: cityLedger = true for corporate accounts.",
  },
  {
    id: "cancellation-penalty-server-computed",
    rule: "Cancellation penalty always computed server-side from ratePlan.cancellationPolicy. Never accept amount from client.",
  },
  {
    id: "no-show-2am",
    rule: "No-show processing runs at 2AM via cron, not immediately at checkInDate midnight. Gives guests arrival buffer.",
  },
  {
    id: "ooo-blocks-occupied-rooms",
    rule: "Cannot block an occupied room via maintenance OOO. Must relocate guest first.",
  },
  {
    id: "oota-sync-staleness",
    rule: "Channel inventory lastSyncAt > 30min = stale. UI shows warning. Sync runs every 15min — stale = sync failed.",
  },
  {
    id: "group-booking-individual-folios",
    rule: "Each reservation in a group booking has its own folio. Group booking is organizational only.",
  },
  {
    id: "id-number-encrypted",
    rule: "Guest idNumber stored encrypted via platform KMS. Never log raw value. Decrypt only for display to authorized roles.",
  },
] as const;
```
