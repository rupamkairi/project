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

Returns: `transactions` (type=order) where `meta.checkIn = date` and stageId = Confirmed stage. Includes:
- guest name, confirmation number
- room type, rate plan
- room assignment (if pre-assigned)
- housekeeping status of assigned room
- special requests
- VIP flag

`GET /hospitality/front-desk/departures`

Same but `meta.checkOut = date` and stageId = Checked In stage. Includes folio bill balance (from `transactions` type=bill `meta.balance`).

`GET /hospitality/front-desk/in-house`

All `transactions` (type=order) where stageId = Checked In stage. Paginated.

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
1. Reservation transaction stageId = Confirmed
2. Re-check availability (exact room must not be assigned to another active reservation)
3. If `locationId` provided: `location.status = 'available'` (inspected by housekeeping assignment marked complete)
   If not provided: auto-select first available room of correct roomTypeId from `locations`
4. If no available room: throw `ROOM_NOT_READY` with list of rooms in housekeeping

On check-in:
```typescript
await db.transaction(async (tx) => {
  // 1. Assign room — update reservation transaction meta
  await tx.update(transactions).set({
    stageId: checkedInStageId,  // hsp.reservation "Checked In" stage
    meta: sql`meta || '{"roomId": ${locationId}}'::jsonb`,
  }).where(eq(transactions.id, reservationId));

  // 2. Update room status (location)
  await tx.update(locations).set({
    status: "occupied",
  }).where(eq(locations.id, locationId));

  // 3. Create folio transaction (type=bill) if not exists
  const existingFolio = await tx.query.transactions.findFirst({
    where: and(eq(transactions.type, "bill"), sql`meta->>'reservationId' = ${reservationId}`),
  });
  if (!existingFolio) {
    await tx.insert(transactions).values({
      id: generateId(), organizationId: orgId,
      type: "bill",
      personId: reservation.personId,
      version: 1,
      meta: { reservationId, status: "open", balance: "0.00", totalCharges: "0.00", totalPayments: "0.00", currency: orgConfig.currency },
    });
  }

  // 4. If early check-in fee applies — add charge line to folio
  if (earlyCheckIn && orgConfig.earlyCheckInFee > 0) {
    const folio = await getFolioForReservation(reservationId);
    await tx.insert(transactionLines).values({
      id: generateId(), organizationId: orgId,
      transactionId: folio.id,
      qty: 1, unitPrice: orgConfig.earlyCheckInFee,
      meta: { type: "misc", description: "Early check-in fee", postedBy: actorId, date: todayStr() },
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
  // 1. If balance > 0 and cityLedger, update folio meta status
  if (cityLedger && parseFloat(folio.meta.balance) > 0) {
    await tx.update(transactions).set({
      meta: sql`meta || '{"status": "city-ledger", "settledAt": ${new Date().toISOString()}}'::jsonb`,
    }).where(eq(transactions.id, folio.id));
  } else {
    await tx.update(transactions).set({
      meta: sql`meta || '{"status": "settled", "settledAt": ${new Date().toISOString()}}'::jsonb`,
    }).where(eq(transactions.id, folio.id));
  }

  // 2. Move reservation to Checked Out stage
  await tx.update(transactions).set({ stageId: checkedOutStageId })
    .where(eq(transactions.id, reservationId));

  // 3. Release room (location) — status = available, housekeeping will pick up
  await tx.update(locations).set({ status: "available" })
    .where(eq(locations.id, reservation.meta.roomId));

  // 4. Update guest profile stats (persons.meta)
  await tx.update(persons).set({
    meta: sql`jsonb_set(jsonb_set(meta, '{totalStays}', to_jsonb(coalesce((meta->>'totalStays')::int, 0) + 1)), '{totalSpend}', to_jsonb(coalesce((meta->>'totalSpend')::numeric, 0) + ${folio.meta.totalCharges}))`,
  }).where(eq(persons.id, reservation.personId));
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
1. Upsert guest as `persons` (type=guest) via `party.upsertPerson`
2. Check availability for 1 room of roomTypeId (cat_items.id)
3. If `locationId` provided, validate it has status = 'available'; else auto-assign from locations
4. Create reservation via `commerce.createTransaction` (type=order, stage=Confirmed, meta.source='walk-in')
5. Immediately check-in (calls check-in logic from 4.3)
6. Create folio transaction (type=bill) + process deposit via `hsp_payment_records` if provided

---

## 4.6 Room Status Management

Rooms are `locations` (type=room). Status is tracked on `location.status`. Housekeeping assignment status tracked on `hsp_housekeeping_assignments`.

`PATCH /hospitality/rooms/:id/status`

Body: `{ status: string }` — updates `location.status`

Allowed transitions (role-gated):
- `available` → `housekeeping` — when departure clean starts
- `housekeeping` → `available` — when assignment marked complete + inspected
- `available` → `maintenance` — room block for maintenance
- `maintenance` → `available` — maintenance resolved
- `available` → `out_of_order` — long-term OOO

Invalid transitions throw `INVALID_STATUS_TRANSITION`.

`POST /hospitality/rooms/:id/block`

Body: `{ reason: string; until?: string }` — sets `location.status = 'maintenance'`, stores `blockReason` in `location.meta`. Creates `hsp_maintenance_requests` if reason indicates maintenance work.

`POST /hospitality/rooms/:id/unblock` — sets `location.status = 'available'`, clears `meta.blockReason`.
