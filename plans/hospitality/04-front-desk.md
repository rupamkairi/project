# Phase 4 — Front Desk

---

## 4.1 Front Desk Routes

```
GET    /hospitality/front-desk/arrivals     checkin:process
GET    /hospitality/front-desk/departures   checkout:process
GET    /hospitality/front-desk/in-house     checkin:process
POST   /hospitality/checkin/:reservationId  checkin:process
POST   /hospitality/checkout/:reservationId checkout:process
POST   /hospitality/walkin                  checkin:process
GET    /hospitality/rooms/status            room:read-status
PATCH  /hospitality/rooms/:id/status        room:update-status
POST   /hospitality/rooms/:id/block         room:block
POST   /hospitality/rooms/:id/unblock       room:block
```

---

## 4.2 Arrivals & Departures Lists

`GET /hospitality/front-desk/arrivals`

Query: `?date=YYYY-MM-DD` (defaults to today)

Returns: reservations with `checkInDate = date` and `status = 'confirmed'`. Includes:
- guest name, confirmation number
- room type, rate plan
- room assignment (if pre-assigned)
- housekeeping status of assigned room
- special requests
- VIP flag

`GET /hospitality/front-desk/departures`

Same but `checkOutDate = date` and `status = 'checked-in'`. Includes folio balance.

`GET /hospitality/front-desk/in-house`

All reservations with `status = 'checked-in'`. Paginated.

---

## 4.3 Check-In

`POST /hospitality/checkin/:reservationId`

Body:
```typescript
{
  roomId?: string;       // specific room assignment, or auto-assign
  earlyCheckIn?: boolean;
  idVerified?: boolean;
}
```

Guards (in order — fail fast):
1. Reservation `status = 'confirmed'`
2. Re-check availability (exact room must not be assigned to another active reservation)
3. If `roomId` provided: `room.housekeepingStatus = 'inspected'`
   If not provided: auto-select first `inspected` room of correct room type
4. If no inspected room available: throw `ROOM_NOT_READY` with list of rooms in `cleaning-in-progress`

On check-in:
```typescript
await db.transaction(async (tx) => {
  // 1. Assign room
  await tx.update(hspReservations).set({
    roomId,
    status: "checked-in",
    updatedAt: new Date(),
  }).where(eq(hspReservations.id, reservationId));

  // 2. Update room status
  await tx.update(hspRooms).set({
    status: "occupied",
    currentReservationId: reservationId,
  }).where(eq(hspRooms.id, roomId));

  // 3. Create folio if not exists
  if (!reservation.folioId) {
    const folio = await tx.insert(hspFolios).values({
      reservationId,
      guestId: reservation.guestId,
      status: "open",
      currency: orgConfig.currency,
    }).returning();
    await tx.update(hspReservations).set({ folioId: folio[0].id })
      .where(eq(hspReservations.id, reservationId));
  }

  // 4. If early check-in fee applies
  if (earlyCheckIn && orgConfig.earlyCheckInFee > 0) {
    await tx.insert(hspFolioCharges).values({
      folioId: reservation.folioId,
      type: "misc",
      description: "Early check-in fee",
      amount: orgConfig.earlyCheckInFee,
      postedBy: actorId,
      date: today(),
    });
  }
});
```

5. Emit `reservation.checked-in`
6. Trigger housekeeping departure task creation for prior guest room if applicable

---

## 4.4 Check-Out

`POST /hospitality/checkout/:reservationId`

Body: `{ paymentMethod: string; paymentAmount: number; paymentRef?: string; cityLedger?: boolean }`

Guards:
1. Reservation `status = 'checked-in'`
2. `folio.balance <= 0` — if balance > 0, reject with remaining amount
   Exception: `cityLedger = true` moves outstanding to city ledger instead

On check-out:
```typescript
await db.transaction(async (tx) => {
  // 1. If balance > 0 and cityLedger, transfer balance
  if (cityLedger && folio.balance > 0) {
    await tx.update(hspFolios).set({
      status: "city-ledger",
      settledAt: new Date(),
    }).where(eq(hspFolios.id, folio.id));
  } else {
    // Settle folio
    await tx.update(hspFolios).set({
      status: "settled",
      settledAt: new Date(),
    }).where(eq(hspFolios.id, folio.id));
  }

  // 2. Update reservation
  await tx.update(hspReservations).set({ status: "checked-out" })
    .where(eq(hspReservations.id, reservationId));

  // 3. Release room
  await tx.update(hspRooms).set({
    status: "available",
    housekeepingStatus: "dirty",
    currentReservationId: null,
  }).where(eq(hspRooms.id, reservation.roomId));

  // 4. Update guest profile stats
  await tx.update(hspGuestProfiles).set({
    totalStays: sql`total_stays + 1`,
    totalSpend: sql`total_spend + ${folio.totalCharges}`,
  }).where(eq(hspGuestProfiles.id, reservation.guestId));
});
```

5. Emit `reservation.checked-out`
6. Create `departure-clean` housekeeping task for the room
7. Emit tax invoice via accounting module if configured

---

## 4.5 Walk-In

`POST /hospitality/walkin`

Body:
```typescript
{
  guest: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    idType?: string;
    idNumber?: string;
  };
  roomTypeId: string;
  ratePlanId: string;
  checkOutDate: string;
  adults: number;
  roomId?: string;       // if specific room requested
  paymentMethod: string;
  depositAmount?: number;
}
```

Flow:
1. Upsert guest profile
2. Check availability for 1 room of roomTypeId
3. If `roomId` provided, validate it's `housekeepingStatus = 'inspected'`; else auto-assign
4. Create reservation with `source = 'walk-in'`, `status = 'confirmed'`
5. Immediately check-in (calls check-in logic from 4.3)
6. Create folio + process deposit payment if provided

---

## 4.6 Room Status Management

`PATCH /hospitality/rooms/:id/status`

Body: `{ housekeepingStatus: string }`

Allowed transitions (role-gated):
- `dirty` → `cleaning-in-progress` — housekeeping staff
- `cleaning-in-progress` → `done` — housekeeping staff
- `done` → `inspected` — hk-supervisor only
- `done` → `touch-up` — hk-supervisor (sends back for minor correction)
- `touch-up` → `inspected` — hk-supervisor

Invalid transitions throw `INVALID_STATUS_TRANSITION`.

`POST /hospitality/rooms/:id/block`

Body: `{ reason: string; until?: string }` — blocks room from new assignments.

Sets `isBlocked = true`, `blockReason`. Creates maintenance request if `reason` contains maintenance keywords.

`POST /hospitality/rooms/:id/unblock` — clears `isBlocked`.
