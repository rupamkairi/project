# Compose — Hotel & Hospitality Management

## Property Operations, Reservations & Guest Experience

---

## 1. Compose Overview

```
Compose ID:   hotel
Version:      1.0.0
Purpose:      Manage full property operations — reservations, front desk,
              housekeeping, F&B, revenue management, and guest experience
              across single or multi-property hotel groups.
Apps Served:  FrontDeskApp     → check-in/out, folio, walk-ins
              HousekeepingApp  → room status, task queue (mobile)
              ReservationApp   → booking engine, channel manager sync
              RevenueApp       → rate plans, occupancy, forecasting
              GuestApp         → self-service — booking, requests, bills
              AdminApp         → property config, staff, analytics
```

---

## 2. Module Selection & Configuration

```typescript
const HotelCompose: ComposeDefinition = {
  id: "hotel",
  name: "Hotel & Hospitality Management",
  modules: [
    "identity",
    "catalog", // Room types, amenities, F&B items, service packages
    "inventory", // Minibar items, F&B stock, amenity supplies
    "ledger", // Guest folios, revenue posting, city ledger
    "workflow", // Housekeeping tasks, maintenance, guest requests
    "scheduling", // Room availability slots, banquet/event space bookings
    "document", // Registration cards, invoices, contracts (corporate)
    "notification", // Booking confirmation, check-in reminder, bill ready
    "analytics", // RevPAR, ADR, occupancy, channel performance
  ],

  moduleConfig: {
    catalog: {
      itemLabel: "Room Type / Service",
      enableVariants: false,
      enablePriceLists: true, // rate plans: rack, corporate, OTA, package
    },
    scheduling: {
      resourceLabel: "Room",
      slotLabel: "Stay Night",
      capacityMode: "per-room", // each room is an independent calendar
    },
    ledger: {
      baseCurrency: "USD",
      enableFolios: true, // guest-level running ledger
    },
  },
};
```

---

## 3. Actor Roles & Permission Matrix

| Role                      | Who                                            |
| ------------------------- | ---------------------------------------------- |
| `hotel-admin`             | Property manager — full access                 |
| `front-desk`              | Reception — check-in/out, folios, walk-ins     |
| `housekeeper`             | Room cleaning, status updates (mobile)         |
| `housekeeping-supervisor` | Assign tasks, inspect rooms                    |
| `revenue-manager`         | Rate plans, channel inventory, forecasting     |
| `fnb-staff`               | F&B orders, room service                       |
| `maintenance`             | Maintenance tasks and asset upkeep             |
| `guest`                   | Self-service — own reservation, requests, bill |

```
                         hotel-admin  front-desk  housekeeper  hk-supervisor  revenue  fnb  maintenance  guest
────────────────────────────────────────────────────────────────────────────────────────────────────────────────
reservation:create           ✓            ✓           —             —           —       —       —           ✓
reservation:read             ✓            ✓           —             —           ✓       —       —           ◑(own)
reservation:modify           ✓            ✓           —             —           ✓       —       —           ◑(own)
reservation:cancel           ✓            ✓           —             —           —       —       —           ◑(own)

checkin:process              ✓            ✓           —             —           —       —       —           —
checkout:process             ✓            ✓           —             —           —       —       —           —

room:read-status             ✓            ✓           ✓             ✓           ✓       —       ✓           —
room:update-status           ✓            ✓           ✓             ✓           —       —       —           —
room:block                   ✓            ✓           —             —           ✓       —       —           —

housekeeping:read-tasks      ✓            —           ✓             ✓           —       —       —           —
housekeeping:update-task     ✓            —           ✓             ✓           —       —       —           —
housekeeping:assign          ✓            —           —             ✓           —       —       —           —

folio:read                   ✓            ✓           —             —           —       —       —           ◑(own)
folio:post-charge            ✓            ✓           —             —           —       ✓       —           —
folio:settle                 ✓            ✓           —             —           —       —       —           —

rate-plan:manage             ✓            —           —             —           ✓       —       —           —
inventory:read               ✓            ✓           —             —           ✓       ✓       —           —
inventory:update             ✓            —           —             —           —       ✓       ✓           —

maintenance:create           ✓            ✓           ✓             ✓           —       —       ✓           —
maintenance:update           ✓            —           —             ✓           —       —       ✓           —

analytics:read               ✓            —           —             ✓           ✓       —       —           —
```

---

## 4. Hotel Entity Extensions

### Room

```typescript
interface Room extends Entity {
  roomNumber: string; // '101', '512', 'PENT-01'
  roomTypeId: ID; // cat_items.id (room type definition)
  floor: number;
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  isBlocked: boolean;
  blockReason?: string;
  currentReservationId?: ID;
  lastCleanedAt?: Timestamp;
  lastInspectedAt?: Timestamp;
  features: string[]; // ['sea-view', 'balcony', 'smoking']
  maintenanceNotes?: string;
}

type RoomStatus =
  | "available"
  | "occupied"
  | "reserved" // booked but not yet checked in
  | "blocked" // OOO — out of order
  | "out-of-service"; // OOS — temporarily unavailable

type HousekeepingStatus =
  | "clean"
  | "dirty"
  | "cleaning-in-progress"
  | "inspected"
  | "touch-up";
```

### Reservation

```typescript
interface Reservation extends Entity {
  confirmationNumber: string; // 'HTL-2024-00123'
  guestId: ID; // identity actor or guest profile
  roomId?: ID; // assigned room (null until check-in)
  roomTypeId: ID; // requested room type
  ratePlanId: ID; // cat_price_lists.id
  status: ReservationStatus;
  source: ReservationSource; // 'direct', 'booking.com', 'expedia', 'phone', 'walk-in'
  checkInDate: string; // 'YYYY-MM-DD'
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  totalRate: Money;
  depositPaid: Money;
  specialRequests?: string;
  arrivalTime?: string;
  corporateId?: ID; // for corporate accounts
  groupId?: ID; // for group bookings
  folioId?: ID; // ledger folio
  channelReference?: string; // OTA booking reference
}

type ReservationStatus =
  | "tentative" // provisional — not yet confirmed
  | "confirmed"
  | "checked-in"
  | "checked-out"
  | "no-show"
  | "cancelled";

type ReservationSource =
  | "direct-web"
  | "direct-phone"
  | "walk-in"
  | "ota-booking"
  | "ota-expedia"
  | "ota-airbnb"
  | "gds"
  | "corporate"
  | "group";
```

**Reservation FSM:**

```
tentative → confirmed        [on: reservation.confirm]   guard: deposit received or waived
confirmed → checked-in       [on: checkin.process]       guard: room assigned + clean
                             entry: [emit 'guest.arrived', assign folio, mark room occupied]
          → no-show          [on: reservation.no-show]   after: checkInDate + 24h
          → cancelled        [on: reservation.cancel]    entry: [emit 'reservation.cancelled']
checked-in → checked-out     [on: checkout.process]      entry: [emit 'guest.departed',
                                                                  mark room dirty,
                                                                  generate final folio]
```

### Guest Folio

```typescript
interface GuestFolio extends Entity {
  reservationId: ID;
  guestId: ID;
  status: "open" | "settled" | "city-ledger";
  charges: FolioCharge[];
  payments: FolioPayment[];
  totalCharges: Money;
  totalPayments: Money;
  balance: Money; // totalCharges - totalPayments
  settledAt?: Timestamp;
  ledgerTransactionId?: ID;
}

interface FolioCharge {
  id: string;
  type: ChargeType; // 'room', 'fnb', 'minibar', 'laundry', 'spa', 'tax', 'misc'
  description: string;
  amount: Money;
  postedAt: Timestamp;
  postedBy: ID;
  referenceId?: string; // order id, service request id
  reversed?: boolean;
}

interface FolioPayment {
  id: string;
  method: "cash" | "card" | "upi" | "corporate" | "city-ledger";
  amount: Money;
  receivedAt: Timestamp;
  gatewayRef?: string;
}
```

### Rate Plan

```typescript
interface RatePlan extends Entity {
  name: string; // 'Rack Rate', 'Corporate - TCS', 'OTA-Net'
  code: string; // 'RACK', 'CORP-TCS', 'OTA'
  type: "public" | "corporate" | "package" | "ota" | "promotion";
  roomTypeRates: RoomTypeRate[];
  mealPlan: "ep" | "cp" | "map" | "ap"; // European, Continental, Half, Full board
  minStay?: number;
  maxAdvanceBookingDays?: number;
  cancellationPolicy: CancellationPolicy;
  validFrom: Timestamp;
  validTo?: Timestamp;
  isActive: boolean;
}

interface RoomTypeRate {
  roomTypeId: ID;
  baseRate: Money; // per night
  extraAdultRate: Money;
  extraChildRate: Money;
  weekendSurcharge?: Money;
}

interface CancellationPolicy {
  type: "flexible" | "moderate" | "strict" | "non-refundable";
  freeCancellationHours: number; // hours before check-in
  penaltyPct: number; // % of total charged if cancelled after free window
}
```

### Housekeeping Task

```typescript
interface HousekeepingTask extends Entity {
  roomId: ID;
  type:
    | "departure-clean"
    | "stay-over"
    | "turndown"
    | "deep-clean"
    | "inspection"
    | "touch-up";
  status:
    | "pending"
    | "assigned"
    | "in-progress"
    | "done"
    | "inspected"
    | "failed";
  assignedTo?: ID; // housekeeper actor
  assignedBy?: ID;
  priority: "normal" | "rush" | "vip";
  scheduledFor?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  inspectedBy?: ID;
  inspectionNotes?: string;
  inspectionPassed?: boolean;
  checklistResults: Record<string, boolean>; // configurable per task type
}
```

### Maintenance Request

```typescript
interface MaintenanceRequest extends Entity {
  roomId?: ID; // null for common areas
  location: string; // 'Room 201', 'Lobby Restroom', 'Pool Area'
  category: string; // 'plumbing', 'electrical', 'hvac', 'furniture', 'it'
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "assigned" | "in-progress" | "resolved" | "closed";
  reportedBy: ID;
  assignedTo?: ID;
  resolvedAt?: Timestamp;
  resolution?: string;
  partsUsed?: { itemId: ID; qty: number }[];
  roomBlockRequired: boolean; // if true, room goes OOO during repair
}
```

---

## 5. Hotel Hooks

### Hook: Guest Check-In

```typescript
compose.hook({
  on: "checkin.process",
  handler: async (event, ctx) => {
    const { reservationId, roomId, guestId } = event.payload;
    const reservation = await ctx.query("hotel.getReservation", {
      id: reservationId,
    });

    // 1. Assign room + update status
    await ctx.dispatch("hotel.updateRoomStatus", {
      roomId,
      status: "occupied",
      currentReservationId: reservationId,
    });

    // 2. Create guest folio
    const folio = await ctx.dispatch("hotel.createFolio", {
      reservationId,
      guestId,
    });

    // 3. Post first night room charge to folio
    await ctx.dispatch("hotel.postFolioCharge", {
      folioId: folio.id,
      type: "room",
      description: `Room ${event.payload.roomNumber} - Night 1`,
      amount: reservation.ratePerNight,
    });

    // 4. Create housekeeping stay-over tasks for each subsequent night
    await ctx.queue.add("hotel.schedule-stayover-tasks", {
      roomId,
      reservationId,
      checkOutDate: reservation.checkOutDate,
    });

    // 5. Welcome notification to guest
    await ctx.dispatch("notification.send", {
      templateKey: "guest.checked-in",
      to: guestId,
      variables: {
        roomNumber: event.payload.roomNumber,
        checkOutDate: reservation.checkOutDate,
        wifiPassword: ctx.config.wifiPassword,
      },
      channels: ["sms", "email"],
    });
  },
});
```

### Hook: Guest Check-Out

```typescript
compose.hook({
  on: "checkout.process",
  handler: async (event, ctx) => {
    const { reservationId, roomId, folioId } = event.payload;

    // 1. Mark room dirty — triggers housekeeping task
    await ctx.dispatch("hotel.updateRoomStatus", {
      roomId,
      status: "available",
      housekeepingStatus: "dirty",
      currentReservationId: null,
    });

    // 2. Auto-create departure clean task
    await ctx.dispatch("hotel.createHousekeepingTask", {
      roomId,
      type: "departure-clean",
      priority: "normal",
    });

    // 3. Generate final folio + post taxes
    await ctx.dispatch("hotel.finalizeFolio", { folioId });

    // 4. Post ledger revenue entry
    const folio = await ctx.query("hotel.getFolio", { id: folioId });
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-GUEST-LEDGER",
      credit: "ACC-ROOM-REVENUE",
      amount: folio.totalCharges,
      reference: reservationId,
      referenceType: "Reservation",
    });

    // 5. Send bill to guest
    await ctx.dispatch("notification.send", {
      templateKey: "guest.checked-out",
      to: event.payload.guestId,
      variables: { folioId, total: folio.totalCharges },
      channels: ["email"],
    });

    // 6. Schedule review request after 2 hours
    await ctx.queue.add(
      "hotel.send-review-request",
      {
        guestId: event.payload.guestId,
        reservationId,
      },
      { delay: hours(2) },
    );
  },
});
```

### Hook: Housekeeping Task Completed

```typescript
compose.hook({
  on: "housekeeping.task.done",
  handler: async (event, ctx) => {
    const { taskId, roomId, type } = event.payload;

    if (type !== "inspection") {
      // Auto-create inspection task for supervisor
      await ctx.dispatch("hotel.createHousekeepingTask", {
        roomId,
        type: "inspection",
        priority: event.payload.priority,
        assignedBy: event.payload.supervisorId,
      });
    } else {
      // Inspection passed — room is clean and ready
      if (event.payload.inspectionPassed) {
        await ctx.dispatch("hotel.updateRoomStatus", {
          roomId,
          housekeepingStatus: "inspected",
        });
        // Notify front desk room is ready
        await ctx.publish({
          type: "room.ready",
          aggregateId: roomId,
          aggregateType: "Room",
          payload: { roomId },
          source: "hotel",
        });
      } else {
        // Inspection failed — reassign for re-clean
        await ctx.dispatch("hotel.createHousekeepingTask", {
          roomId,
          type: "touch-up",
          priority: "rush",
          notes: event.payload.inspectionNotes,
        });
      }
    }
  },
});
```

### Hook: Reservation Cancelled

```typescript
compose.hook({
  on: "reservation.cancelled",
  handler: async (event, ctx) => {
    const { reservationId, guestId, ratePlanId, totalRate, checkInDate } =
      event.payload;
    const ratePlan = await ctx.query("hotel.getRatePlan", { id: ratePlanId });

    // 1. Calculate cancellation penalty
    const hoursUntilCheckIn = (checkInDate - Date.now()) / (1000 * 60 * 60);
    const penalty =
      hoursUntilCheckIn < ratePlan.cancellationPolicy.freeCancellationHours
        ? totalRate.amount * (ratePlan.cancellationPolicy.penaltyPct / 100)
        : 0;

    // 2. Release room slot back to inventory
    await ctx.dispatch("scheduling.cancel", {
      bookingId: event.payload.bookingId,
    });

    // 3. Process refund if deposit paid and no penalty
    if (event.payload.depositPaid > 0) {
      const refundAmount = event.payload.depositPaid - penalty;
      if (refundAmount > 0) {
        await ctx.queue.add("hotel.process-refund", {
          reservationId,
          amount: refundAmount,
          guestId,
        });
      }
    }

    // 4. Notify guest
    await ctx.dispatch("notification.send", {
      templateKey: "reservation.cancelled",
      to: guestId,
      variables: {
        confirmationNumber: event.payload.confirmationNumber,
        penalty,
      },
      channels: ["email"],
    });
  },
});
```

### Hook: No-Show

```typescript
compose.hook({
  on: "reservation.no-show",
  handler: async (event, ctx) => {
    const { reservationId, guestId, ratePlanId, depositPaid } = event.payload;

    // 1. Update reservation status
    await ctx.dispatch("hotel.advanceReservation", {
      reservationId,
      event: "reservation.no-show",
    });

    // 2. Release room for resale
    await ctx.dispatch("hotel.updateRoomStatus", {
      roomId: event.payload.roomId,
      status: "available",
    });

    // 3. Charge no-show fee per policy (usually 1 night)
    if (depositPaid > 0) {
      await ctx.dispatch("ledger.postTransaction", {
        debit: "ACC-GUEST-LEDGER",
        credit: "ACC-NOSHOW-REVENUE",
        amount: event.payload.firstNightRate,
        reference: reservationId,
        referenceType: "Reservation",
      });
    }
  },
});
```

---

## 6. Business Rules

```typescript
compose.rules([
  // Room must be clean and inspected before check-in
  {
    id: "checkin-requires-clean-room",
    scope: "checkin:process",
    guard: { field: "room.housekeepingStatus", op: "eq", value: "inspected" },
  },

  // Reservation cannot be modified after check-in
  {
    id: "no-modify-after-checkin",
    scope: "reservation:modify",
    guard: { field: "reservation.status", op: "neq", value: "checked-in" },
  },

  // Rate plan dates must be valid at time of reservation
  {
    id: "rate-plan-validity",
    scope: "reservation:create",
    guard: {
      and: [
        {
          field: "ratePlan.validFrom",
          op: "lte",
          value: { ref: "reservation.checkInDate" },
        },
        {
          or: [
            { field: "ratePlan.validTo", op: "exists", value: false },
            {
              field: "ratePlan.validTo",
              op: "gte",
              value: { ref: "reservation.checkOutDate" },
            },
          ],
        },
      ],
    },
  },

  // Folio cannot be settled with outstanding balance
  {
    id: "folio-settle-requires-zero-balance",
    scope: "folio:settle",
    guard: { field: "folio.balance.amount", op: "lte", value: 0 },
  },

  // OOO rooms cannot be assigned to reservations
  {
    id: "no-blocked-room-assignment",
    scope: "checkin:process",
    guard: { field: "room.isBlocked", op: "eq", value: false },
  },
]);
```

---

## 7. Key Workflow Templates

```
GUEST_STAY
  1. pre-arrival       → send pre-arrival email + upsell opportunities
  2. check-in          → front desk processes check-in, assigns room
  3. daily-housekeeping → stay-over clean each morning (repeating)
  4. pre-checkout      → send folio preview 1 day before checkout
  5. check-out         → settle folio, collect payment
  6. post-stay         → request review, handle any disputes

MAINTENANCE_RESOLUTION
  1. reported          → assign to maintenance staff
  2. assessment        → staff assesses and estimates resolution time
  3. resolution        → staff resolves and documents
  4. room-reinstatement → supervisor approves room back to service

CORPORATE_ACCOUNT_ONBOARDING
  1. proposal          → rate negotiation
  2. contract          → contract signed, rates loaded
  3. billing-setup     → city ledger account created
  4. activation        → account active, front desk notified
```

---

## 8. API Surface

```
── Reservations ──────────────────────────────────────────────
GET    /hotel/reservations                 reservation:read
POST   /hotel/reservations                 reservation:create
GET    /hotel/reservations/:id             reservation:read
PATCH  /hotel/reservations/:id             reservation:modify
POST   /hotel/reservations/:id/confirm     reservation:modify
POST   /hotel/reservations/:id/cancel      reservation:cancel
POST   /hotel/reservations/:id/no-show     front-desk only
GET    /hotel/reservations/arrivals        reservation:read  ← today's arrivals
GET    /hotel/reservations/departures      reservation:read  ← today's departures

── Front Desk ────────────────────────────────────────────────
POST   /hotel/checkin                      checkin:process
POST   /hotel/checkout                     checkout:process
GET    /hotel/rooms/availability           reservation:read  ← room grid view

── Rooms ─────────────────────────────────────────────────────
GET    /hotel/rooms                        room:read-status
GET    /hotel/rooms/:id                    room:read-status
PATCH  /hotel/rooms/:id/status             room:update-status
POST   /hotel/rooms/:id/block              room:block
POST   /hotel/rooms/:id/unblock            room:block

── Folios ────────────────────────────────────────────────────
GET    /hotel/folios/:id                   folio:read
POST   /hotel/folios/:id/charges           folio:post-charge
POST   /hotel/folios/:id/payment           folio:settle
POST   /hotel/folios/:id/settle            folio:settle
GET    /hotel/folios/:id/invoice           folio:read

── Housekeeping ──────────────────────────────────────────────
GET    /hotel/housekeeping/tasks           housekeeping:read-tasks
PATCH  /hotel/housekeeping/tasks/:id       housekeeping:update-task
POST   /hotel/housekeeping/tasks/:id/start housekeeping:update-task
POST   /hotel/housekeeping/tasks/:id/complete housekeeping:update-task
POST   /hotel/housekeeping/tasks/:id/inspect  housekeeping:assign
GET    /hotel/housekeeping/room-status     housekeeping:read-tasks  ← floor view

── Rate Plans ────────────────────────────────────────────────
GET    /hotel/rate-plans                   rate-plan:manage
POST   /hotel/rate-plans                   rate-plan:manage
PATCH  /hotel/rate-plans/:id               rate-plan:manage
POST   /hotel/rate-plans/:id/activate      rate-plan:manage

── Maintenance ───────────────────────────────────────────────
GET    /hotel/maintenance                  maintenance:create
POST   /hotel/maintenance                  maintenance:create
PATCH  /hotel/maintenance/:id              maintenance:update
POST   /hotel/maintenance/:id/resolve      maintenance:update

── Analytics ─────────────────────────────────────────────────
GET    /hotel/analytics/occupancy          analytics:read
GET    /hotel/analytics/revpar             analytics:read
GET    /hotel/analytics/adr               analytics:read
GET    /hotel/analytics/channel-mix        analytics:read
GET    /hotel/analytics/housekeeping       analytics:read
GET    /hotel/analytics/forecast           analytics:read
```

**Guest Portal (`/hotel/guest/*`):**

```
POST   /hotel/guest/reservations           guest own
GET    /hotel/guest/reservations/:id       guest own
POST   /hotel/guest/reservations/:id/cancel guest own
GET    /hotel/guest/folio                  guest own
POST   /hotel/guest/requests               guest own  ← service requests
```

---

## 9. Real-Time Channels

| Channel                          | Subscribers               | Events                        |
| -------------------------------- | ------------------------- | ----------------------------- |
| `org:{orgId}:hotel:front-desk`   | Front desk staff          | `reservation.*`, `room.ready` |
| `org:{orgId}:hotel:housekeeping` | Housekeepers, supervisors | `housekeeping.*`, `room.*`    |
| `org:{orgId}:hotel:maintenance`  | Maintenance staff         | `maintenance.*`               |
| `org:{orgId}:hotel:rooms`        | All ops staff             | `room.*` (status grid)        |

---

## 10. Scheduled Jobs

```
hotel.post-nightly-room-charges    nightly (11PM)
  → Post room rate charge to each open folio for occupied rooms

hotel.check-arrivals-today         daily (7AM)
  → Send pre-arrival SMS to all guests checking in today

hotel.check-departures-today       daily (7AM)
  → Create departure-clean housekeeping tasks for today's checkouts

hotel.no-show-check                daily (2AM)
  → Mark confirmed reservations past checkInDate + 24h with no check-in as no-show

hotel.rate-plan-activation         every 5min
  → Activate/deactivate rate plans based on validFrom/validTo

hotel.channel-sync                 every 15min
  → Sync room availability to OTA channels (Booking.com, Expedia)

hotel.analytics-snapshot           nightly
  → Snapshot occupancy %, RevPAR, ADR for the day
```

---

## 11. Integrations

```typescript
HotelCompose.integrations = {
  payment:    [StripeAdapter, RazorpayAdapter, CashAdapter],
  storage:    [S3Adapter],
  email:      [ResendAdapter],
  sms:        [TwilioAdapter],
  channelManager: [Siteminder, ChannelManagerAdapter],  // OTA sync
  doorLock:   [VingCardAdapter, DormakabaAdapter],      // keycard provisioning
  pos:        [OraclePOSAdapter],                       // F&B POS integration
  gds:        [SabreAdapter, AmadeusAdapter],           // GDS connectivity
}

// Inbound Webhooks
POST /webhooks/booking-com    → new/modified/cancelled OTA reservations
POST /webhooks/expedia        → OTA reservation events
POST /webhooks/payment        → payment gateway confirmations
```
