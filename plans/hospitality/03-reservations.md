# Phase 3 — Reservations

---

## 3.1 Reservation Routes

```
GET    /hospitality/reservations                   reservation:read
GET    /hospitality/reservations/:id               reservation:read (own)
POST   /hospitality/reservations                   reservation:create
PATCH  /hospitality/reservations/:id               reservation:modify (own)
POST   /hospitality/reservations/:id/confirm       reservation:modify
POST   /hospitality/reservations/:id/cancel        reservation:cancel (own)
POST   /hospitality/reservations/:id/no-show       checkin:process
GET    /hospitality/availability                   public
GET    /hospitality/guest/reservations             guest (own)
```

---

## 3.2 Availability Check

Called before every reservation confirm. Must also be re-checked at check-in.

Rooms are `locations` (type=room). Reservations are `transactions` (type=order) with `meta.checkIn`, `meta.checkOut`, `meta.roomTypeId`.

```typescript
async function checkAvailability(
  roomTypeId: string,   // cat_items.id where type = 'room_type'
  checkInDate: string,  // YYYY-MM-DD
  checkOutDate: string,
  orgId: string
): Promise<{ available: boolean; roomsAvailable: number }> {
  // Count rooms of this type (locations where type=room and meta.roomTypeId matches)
  const totalRooms = await db
    .select({ count: count() })
    .from(locations)
    .where(and(
      eq(locations.organizationId, orgId),
      eq(locations.type, "room"),
      sql`meta->>'roomTypeId' = ${roomTypeId}`,
      notInArray(locations.status, ["maintenance", "out_of_order"])
    ));

  // Count confirmed/checked-in reservations overlapping date range
  // Active stages = Confirmed + Checked In stage IDs for hsp.reservation pipeline
  const activeStageIds = await getStageIds(orgId, "hsp.reservation", ["Confirmed", "Checked In"]);
  const overlapping = await db
    .select({ count: count() })
    .from(transactions)
    .where(and(
      eq(transactions.organizationId, orgId),
      eq(transactions.type, "order"),
      sql`meta->>'roomTypeId' = ${roomTypeId}`,
      inArray(transactions.stageId, activeStageIds),
      sql`meta->>'checkIn' < ${checkOutDate}`,
      sql`meta->>'checkOut' > ${checkInDate}`
    ));

  const available = totalRooms[0].count - overlapping[0].count;
  return { available: available > 0, roomsAvailable: available };
}
```

Called via: `mediator.dispatch({ type: "scheduling.checkAvailability", ... })` if scheduling module is present. Otherwise direct DB call.

---

## 3.3 Create Reservation

Body:
```typescript
{
  guestId?: string;                // omit if new guest
  guest?: {                        // new guest data
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    nationality?: string;
    idType?: string;
    idNumber?: string;
  };
  roomTypeId: string;
  ratePlanId: string;
  checkInDate: string;             // YYYY-MM-DD
  checkOutDate: string;
  adults: number;
  children?: number;
  source?: string;
  specialRequests?: string;
  arrivalTime?: string;
  groupId?: string;
  channelReference?: string;       // OTA booking ref
}
```

On create:
MTA flow — reservations are created as `transactions` (type=order) via mediator:

```typescript
// 1. Check availability
const avail = await checkAvailability(roomTypeId, checkInDate, checkOutDate, orgId);
if (!avail.available) throw new Error("ROOM_NOT_AVAILABLE");

// 2. Upsert guest (persons, type=guest) if new
let personId = body.guestId;
if (!personId && body.guest) {
  const result = await mediator.send({ type: "party.upsertPerson", organizationId: orgId,
    payload: { type: "guest", ...body.guest } });
  personId = result.id;
}

// 3. Look up nightly rate from hsp_rate_plan_seasons
const rate = await getNightlyRate(ratePlanId, roomTypeId, checkInDate, checkOutDate);

// 4. Generate confirmation number
const confirmationNumber = await nextConfirmationNumber(orgId);

// 5. Create reservation transaction
const reservation = await mediator.send({
  type: "commerce.createTransaction", organizationId: orgId,
  payload: {
    type: "order",
    personId,
    stageId: inquiryStageId,  // from hsp.reservation pipeline
    meta: { checkIn: checkInDate, checkOut: checkOutDate, roomTypeId, adults, children, ratePlanId, confirmationNumber, source },
  }
});

// 6. Add room charge line (nights × nightly rate)
await mediator.send({ type: "commerce.addLine", organizationId: orgId,
  payload: { transactionId: reservation.id, itemId: roomTypeId, qty: nights, unitPrice: rate.pricePerNight } });

// 7. Emit event
bus.emit("hsp.reservation.created", { reservationId: reservation.id, personId, confirmationNumber });
```

---

## 3.4 Confirm Reservation

`POST /hospitality/reservations/:id/confirm`

Body: `{ depositAmount?: number; paymentMethod?: string; paymentRef?: string }`

Guards:
1. Status must be `tentative`
2. Re-check availability (idempotent guard — not just at create)
3. If rate plan has `minStay`, validate `nights >= ratePlan.minStay`
4. If advance booking limit: `checkInDate <= today + maxAdvanceBookingDays`

On confirm:
1. Move transaction `stageId` → Confirmed stage (pipeline stage transition)
2. Re-check availability (idempotent guard)
3. If deposit: insert `hsp_payment_records` record + create folio transaction (type=bill)
4. Emit `hsp.reservation.confirmed`
5. `mediator.send({ type: "notification.send", ... })`

---

## 3.5 Cancel Reservation

`POST /hospitality/reservations/:id/cancel`

Body: `{ reason?: string }`

Guards:
1. Status must be `tentative` or `confirmed` (cannot cancel checked-in)

Cancellation penalty (always server-computed, never trust client):
```typescript
function computeCancellationPenalty(reservation: Reservation, ratePlan: RatePlan, now: Date): number {
  const policy = ratePlan.cancellationPolicy;
  const hoursUntilCheckIn = (new Date(reservation.checkInDate).getTime() - now.getTime()) / 3600000;

  if (hoursUntilCheckIn >= policy.freeCancellationHours) {
    return 0;  // within free window
  }

  const penaltyBase = parseFloat(reservation.ratePerNight);
  return penaltyBase * (policy.penaltyPct / 100);
}
```

On cancel:
1. `penalty = computeCancellationPenalty(...)`
2. Status → `cancelled`
3. If folio exists and penalty > 0: post charge to folio `type = 'cancellation-fee'`
4. Emit `reservation.cancelled`
5. Update `hspChannelInventory` to free up allotment

---

## 3.6 No-Show

`POST /hospitality/reservations/:id/no-show`
Only callable by `checkin:process` role. Typically triggered via 2AM cron job or manual override.

Body: `{ chargeNight?: boolean }` — defaults to org config `noShowPolicy.chargeNights`

On no-show:
1. Status → `no-show`
2. If `chargeNight = true`: post 1 night room-rate charge to folio
3. Emit `reservation.no-show`
4. Free room for reassignment

---

## 3.7 Reservation FSM

```
tentative ──[reservation.confirm]──► confirmed
  guard: available rooms > 0, rate plan valid
  entry: create folio, notify guest

confirmed ──[reservation.check-in]──► checked-in
  guard: room.housekeepingStatus = 'inspected', checkin:process role
  entry: assign room, set room.status = 'occupied', folio.status = 'open'

confirmed ──[reservation.no-show]──► no-show
  guard: after checkInDate 2AM, checkin:process role
  entry: post no-show charge if policy applies

checked-in ──[reservation.check-out]──► checked-out
  guard: folio.balance <= 0, checkout:process role
  entry: set room.status = 'available', room.housekeepingStatus = 'dirty', settle folio, update guest totalStays

tentative ──[reservation.cancel]──► cancelled
confirmed ──[reservation.cancel]──► cancelled
  entry: compute + post cancellation penalty, free channel inventory
```

---

## 3.8 Group Booking Routes

```
GET    /hospitality/group-bookings           reservation:read
POST   /hospitality/group-bookings           reservation:create
PATCH  /hospitality/group-bookings/:id       reservation:modify
POST   /hospitality/group-bookings/:id/link-reservation  reservation:modify
```

Group bookings are managed via a lightweight hsp-owned table or as a tagged set of transactions. Individual reservations (transactions) reference `meta.groupId`. Group coordination is organizational only — each reservation has its own folio.

---

## 3.9 Guest Profile Routes

Guest profiles are `persons` (type=guest) from the party foundation module. Hospitality routes proxy to `party.*` mediator commands.

```
GET    /hospitality/guests           reservation:read    → party.listPersons type=guest
GET    /hospitality/guests/:id       reservation:read    → party.getPerson
POST   /hospitality/guests           reservation:create  → party.upsertPerson type=guest
PATCH  /hospitality/guests/:id       reservation:modify  → party.updatePerson
GET    /hospitality/guests/:id/history  reservation:read → lists transactions where personId=id, type=order
```

Guest history: previous reservations sorted by checkInDate desc, with folio total spent.

`idNumber` stored encrypted at rest via platform KMS module if available.
