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

```typescript
async function checkAvailability(
  roomTypeId: string,
  checkInDate: string,  // YYYY-MM-DD
  checkOutDate: string,
  orgId: string
): Promise<{ available: boolean; roomsAvailable: number }> {
  // Count rooms of this type
  const totalRooms = await db
    .select({ count: count() })
    .from(hspRooms)
    .where(and(
      eq(hspRooms.orgId, orgId),
      eq(hspRooms.roomTypeId, roomTypeId),
      eq(hspRooms.isBlocked, false)
    ));

  // Count confirmed/checked-in reservations overlapping date range
  const overlapping = await db
    .select({ count: count() })
    .from(hspReservations)
    .where(and(
      eq(hspReservations.orgId, orgId),
      eq(hspReservations.roomTypeId, roomTypeId),
      inArray(hspReservations.status, ["confirmed", "checked-in"]),
      lt(hspReservations.checkInDate, checkOutDate),
      gt(hspReservations.checkOutDate, checkInDate)
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
1. Validate `checkOutDate > checkInDate`
2. `nights = daysBetween(checkInDate, checkOutDate)`
3. Check availability — throw `ROOM_NOT_AVAILABLE` if none
4. If `guest` provided and no `guestId`: upsert guest profile by email or phone
5. Lookup rate: `ratePlanPrices[ratePlanId][roomTypeId].baseRate`
6. Check rate override for each night — use override rate if `stopSell = false`
7. `totalRate = sum of nightly rates`
8. Generate confirmation number: `HTL-{YYYY}-{SEQ5}` — atomic increment on `hspOrgConfig.lastConfirmationSeq`
9. Insert reservation with `status = 'tentative'`
10. Emit `reservation.created`

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
1. Status → `confirmed`
2. If deposit: create folio + add deposit payment record
3. Emit `reservation.confirmed`
4. `mediator.dispatch({ type: "notify.sendEmail", to: guest.email, template: "reservation-confirmed", data: { confirmationNumber, checkInDate, ... } })`

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

Group booking creates a `hspGroupBookings` record. Individual reservations reference `groupId`.

`/link-reservation` body: `{ reservationId: string }`. Sets `reservations.groupId = groupBooking.id`.

---

## 3.9 Guest Profile Routes

```
GET    /hospitality/guest-profiles           reservation:read
GET    /hospitality/guest-profiles/:id       reservation:read
POST   /hospitality/guest-profiles           reservation:create
PATCH  /hospitality/guest-profiles/:id       reservation:modify
GET    /hospitality/guest-profiles/:id/history  reservation:read
```

Guest history: previous reservations sorted by checkInDate desc, with folio total spent.

`idNumber` stored encrypted at rest via platform KMS module if available.
