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

  // Check-in complete → create departure-clean task on checkout
  bus.on("hsp.reservation.checked-in", async ({ reservationId, roomId, guestId }) => {
    // Any welcome service requests auto-created here if guest has preferences
    const guest = await getGuest(guestId);
    if (guest.preferences?.pillowType) {
      await db.insert(hspServiceRequests).values({
        reservationId,
        guestId,
        roomId,
        type: "housekeeping",
        description: `Pillow preference: ${guest.preferences.pillowType}`,
        status: "pending",
      });
    }
  });

  // Check-out complete → departure-clean task + update guest stats
  bus.on("hsp.reservation.checked-out", async ({ reservationId, roomId }) => {
    // Check if same-day arrival on this room
    const sameDay = await db.query.hspReservations.findFirst({
      where: and(
        eq(hspReservations.roomTypeId, /* roomTypeId from reservation */ ""),
        eq(hspReservations.checkInDate, todayStr()),
        eq(hspReservations.status, "confirmed")
      ),
    });
    await db.insert(hspHousekeepingTasks).values({
      roomId,
      type: "departure-clean",
      status: "pending",
      priority: sameDay ? "rush" : "normal",
      scheduledFor: new Date(),
    });
    bus.emit("hsp.housekeeping.task-created", { roomId, type: "departure-clean" });
  });

  // Room inspected → alert front desk (may unblock arriving guest)
  bus.on("hsp.room.inspected", async ({ roomId }) => {
    // Check if there's a checked-in guest waiting for this room
    const waitingReservation = await db.query.hspReservations.findFirst({
      where: and(
        eq(hspReservations.roomId, roomId),  // pre-assigned
        eq(hspReservations.checkInDate, todayStr()),
        eq(hspReservations.status, "confirmed")
      ),
    });
    if (waitingReservation) {
      bus.emit("hsp.room.ready-for-arrival", { roomId, reservationId: waitingReservation.id });
      // Notify front desk
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

  // Maintenance request closed → unblock room if needed
  bus.on("hsp.maintenance.closed", async ({ requestId, roomId, roomBlockRequired }) => {
    if (roomBlockRequired && roomId) {
      await db.update(hspRooms).set({
        isBlocked: false,
        blockReason: null,
        housekeepingStatus: "dirty",
      }).where(eq(hspRooms.id, roomId));
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
  scheduler.register({
    name: "hsp.no-show-processing",
    cron: "0 2 * * *",
    fn: async () => {
      const yesterday = addDays(todayStr(), -1);
      const noShows = await db.query.hspReservations.findMany({
        where: and(
          eq(hspReservations.checkInDate, yesterday),
          eq(hspReservations.status, "confirmed")  // not checked in
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
