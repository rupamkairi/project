# Phase 20 — Data Seeding

---

## 20.1 Seed Entry Point

**File:** `packages/hospitality/src/seed.ts`

Master tables (`cat_items`, `locations`, `persons`, `transactions`, `pipelines`) are seeded via their foundation module seeders. The hospitality seeder calls those first, then seeds hsp-owned detail tables.

```typescript
import { db } from "@projectx/core/db";
import { generateId } from "@projectx/core/id";
import { seedPipeline } from "apps/server/src/infra/db/seed";
import { catItems, locations, persons } from "@projectx/catalog/schema";  // foundation imports

export async function seedHospitality(orgId: string) {
  await seedOrgConfig(orgId);
  await seedReservationPipeline(orgId);
  const roomTypeIds = await seedRoomTypes(orgId);     // seeds cat_items type=room_type
  const locationIds = await seedProperty(orgId);       // seeds locations (property + floors + rooms)
  const roomIds = await seedRooms(orgId, locationIds.floorId, roomTypeIds);
  const ratePlanIds = await seedRatePlans(orgId, roomTypeIds);
  const guestIds = await seedGuests(orgId);            // seeds persons type=guest
  await seedReservations(orgId, guestIds, roomTypeIds, ratePlanIds, roomIds);
  console.log("[hospitality] seed complete");
}
```

---

## 20.2 Org Config

```typescript
async function seedOrgConfig(orgId: string) {
  await db.insert(hspOrgConfig).values({
    id: createId(), orgId,
    propertyName: "The Grand Hotel",
    currency: "USD",
    defaultCheckInTime: "14:00",
    defaultCheckOutTime: "11:00",
    earlyCheckInFee: "30.00",
    lateCheckOutFee: "30.00",
    taxRate: "12.00",
    cityTaxPerNight: "5.00",
    wifiPassword: "GrandHotel2026",
    cancellationGracePeriodHours: 24,
    noShowFeePercent: "50.00",
    reservationSequence: 1,
  }).onConflictDoNothing();
}
```

---

## 20.3 Reservation Pipeline

```typescript
async function seedReservationPipeline(orgId: string) {
  await seedPipeline(orgId, "hsp.reservation", [
    { name: "Inquiry" },
    { name: "Confirmed" },
    { name: "Checked In" },
    { name: "Checked Out" },
    { name: "Cancelled" },
    { name: "No Show" },
  ]);
}
```

---

## 20.4 Room Types (seeds cat_items, type=room_type)

```typescript
async function seedRoomTypes(orgId: string) {
  const types = [
    { name: "Standard Room", sku: "STD", capacity: 2, meta: { bedType: "queen", amenities: ["WiFi", "AC", "TV", "Mini Fridge"] } },
    { name: "Deluxe Room",   sku: "DLX", capacity: 2, meta: { bedType: "king",  amenities: ["WiFi", "AC", "TV", "Mini Bar", "Bathtub"] } },
    { name: "Suite",         sku: "STE", capacity: 4, meta: { bedType: "king",  amenities: ["WiFi", "AC", "TV", "Kitchen", "Jacuzzi", "Butler Service"] } },
  ];

  const ids: Record<string, string> = {};
  for (const t of types) {
    const id = generateId();
    await db.insert(catItems).values({
      id, organizationId: orgId,
      type: "room_type",
      name: t.name,
      sku: t.sku,
      capacity: t.capacity,
      version: 1,
      meta: t.meta,
    }).onConflictDoNothing();
    ids[t.sku] = id;
  }
  return ids;
}
```

---

## 20.5 Property and Rooms (seeds locations)

```typescript
async function seedProperty(orgId: string) {
  // Property (building)
  const propertyId = generateId();
  await db.insert(locations).values({
    id: propertyId, organizationId: orgId,
    type: "building", name: "The Grand Hotel", code: "PROP-001",
    status: "active", version: 1, meta: {},
  }).onConflictDoNothing();

  // Floors
  const floors: Record<number, string> = {};
  for (const floor of [1, 2, 3]) {
    const id = generateId();
    await db.insert(locations).values({
      id, organizationId: orgId,
      type: "floor", name: `Floor ${floor}`, code: `FL-${floor}`,
      parentId: propertyId, status: "active", version: 1, meta: {},
    }).onConflictDoNothing();
    floors[floor] = id;
  }
  return { propertyId, floorIds: floors };
}

async function seedRooms(orgId: string, floorIds: Record<number, string>, roomTypeIds: Record<string, string>) {
  const roomDefs = [
    // Standard rooms: 101-110, floor 1
    ...Array.from({ length: 10 }, (_, i) => ({ name: `${101 + i}`, floor: 1, typeCode: "STD" })),
    // Deluxe rooms: 201-206, floor 2
    ...Array.from({ length: 6 }, (_, i) => ({ name: `${201 + i}`, floor: 2, typeCode: "DLX" })),
    // Suites: 301-304, floor 3
    ...Array.from({ length: 4 }, (_, i) => ({ name: `${301 + i}`, floor: 3, typeCode: "STE" })),
  ];

  const ids: string[] = [];
  for (const r of roomDefs) {
    const id = generateId();
    await db.insert(locations).values({
      id, organizationId: orgId,
      type: "room", name: r.name, code: `RM-${r.name}`,
      parentId: floorIds[r.floor],
      capacity: r.typeCode === "STE" ? 4 : 2,
      status: "available",
      version: 1,
      meta: { floor: r.floor, roomTypeId: roomTypeIds[r.typeCode] },
    }).onConflictDoNothing();
    ids.push(id);
  }
  return ids;
}

---

## 20.6 Rate Plans with Seasons

```typescript
async function seedRatePlans(orgId: string, roomTypeIds: Record<string, string>) {
  const plans = [
    {
      name: "Bed & Breakfast",
      code: "BB",
      mealPlan: "breakfast",
      cancellationPolicy: { type: "moderate", freeCancellationHours: 48, penaltyPct: 100 },
      seasons: {
        STD: "120.00", DLX: "180.00", STE: "350.00",
      },
    },
    {
      name: "Room Only",
      code: "RO",
      mealPlan: "room_only",
      cancellationPolicy: { type: "flexible", freeCancellationHours: 24, penaltyPct: 50 },
      seasons: {
        STD: "99.00", DLX: "149.00", STE: "299.00",
      },
    },
  ];

  const ids: string[] = [];
  for (const plan of plans) {
    const planId = generateId();
    await db.insert(hspRatePlans).values({
      id: planId, organizationId: orgId,
      name: plan.name,
      code: plan.code,
      mealPlan: plan.mealPlan,
      cancellationPolicy: plan.cancellationPolicy,
      isActive: true,
    }).onConflictDoNothing();

    // Seed a year-round season per room type
    for (const [typeCode, price] of Object.entries(plan.seasons)) {
      await db.insert(hspRatePlanSeasons).values({
        id: generateId(), organizationId: orgId,
        ratePlanId: planId,
        roomTypeId: roomTypeIds[typeCode],  // cat_items.id where type = 'room_type'
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        pricePerNight: price,
        currency: "USD",
        minNights: 1,
      }).onConflictDoNothing();
    }
    ids.push(planId);
  }
  return ids;
}
```

---

## 20.7 Guest Profiles (seeds persons, type=guest)

```typescript
async function seedGuests(orgId: string) {
  const guests = [
    {
      firstName: "James", lastName: "Wilson",
      email: "james.wilson@example.com", phone: "+1-555-0101",
      meta: { nationality: "US", loyaltyTier: "gold", preferences: { pillowType: "soft" } },
    },
    {
      firstName: "Priya", lastName: "Sharma",
      email: "priya.sharma@example.com", phone: "+91-98765-43210",
      meta: { nationality: "IN", loyaltyTier: "standard", preferences: { pillowType: "firm" } },
    },
    {
      firstName: "Hans", lastName: "Mueller",
      email: "hans.mueller@example.com", phone: "+49-30-123456",
      meta: { nationality: "DE", loyaltyTier: "platinum", preferences: { pillowType: "soft" } },
    },
  ];

  const ids: string[] = [];
  for (const g of guests) {
    const id = generateId();
    await db.insert(persons).values({
      id, organizationId: orgId,
      type: "guest",
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      phone: g.phone,
      version: 1,
      meta: g.meta,
    }).onConflictDoNothing();
    ids.push(id);
  }
  return ids;
}
```

---

## 20.8 Reservations (seeds transactions, type=order)

```typescript
async function seedReservations(
  orgId: string,
  guestIds: string[],
  roomTypeIds: Record<string, string>,
  ratePlanIds: string[],
  roomIds: string[],
) {
  // Look up the pipeline stages for hsp.reservation
  const pipeline = await db.query.pipelines.findFirst({
    where: and(eq(pipelines.organizationId, orgId), eq(pipelines.entityType, "hsp.reservation")),
    with: { stages: true },
  });
  const stageMap = Object.fromEntries(pipeline!.stages.map(s => [s.name, s.id]));

  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const inThreeDays = new Date(today); inThreeDays.setDate(today.getDate() + 3);
  const inFiveDays = new Date(today); inFiveDays.setDate(today.getDate() + 5);

  const reservationDefs = [
    {
      personId: guestIds[0],
      stageId: stageMap["Checked In"],
      meta: { checkIn: today.toISOString().slice(0, 10), checkOut: inThreeDays.toISOString().slice(0, 10), roomId: roomIds[10], adults: 2, children: 0, ratePlanId: ratePlanIds[0], confirmationNumber: "HTL-2026-00001", source: "direct" },
      lineItemId: roomTypeIds["DLX"], nights: 3, rate: "180.00",
    },
    {
      personId: guestIds[1],
      stageId: stageMap["Confirmed"],
      meta: { checkIn: tomorrow.toISOString().slice(0, 10), checkOut: inFiveDays.toISOString().slice(0, 10), roomId: null, adults: 1, children: 0, ratePlanId: ratePlanIds[1], confirmationNumber: "HTL-2026-00002", source: "ota" },
      lineItemId: roomTypeIds["STD"], nights: 4, rate: "99.00",
    },
    {
      personId: guestIds[2],
      stageId: stageMap["Confirmed"],
      meta: { checkIn: inThreeDays.toISOString().slice(0, 10), checkOut: inFiveDays.toISOString().slice(0, 10), roomId: null, adults: 2, children: 0, ratePlanId: ratePlanIds[0], confirmationNumber: "HTL-2026-00003", source: "direct" },
      lineItemId: roomTypeIds["STE"], nights: 2, rate: "350.00",
    },
  ];

  for (const r of reservationDefs) {
    // Reservation = transaction type=order
    const reservationId = generateId();
    await db.insert(transactions).values({
      id: reservationId, organizationId: orgId,
      type: "order",
      personId: r.personId,
      stageId: r.stageId,
      version: 1,
      meta: r.meta,
    }).onConflictDoNothing();

    // Room charge line
    await db.insert(transactionLines).values({
      id: generateId(), organizationId: orgId,
      transactionId: reservationId,
      itemId: r.lineItemId,  // cat_items.id (room_type)
      qty: r.nights,
      unitPrice: r.rate,
    }).onConflictDoNothing();

    // Folio = transaction type=bill for checked-in reservations
    if (r.stageId === stageMap["Checked In"]) {
      await db.insert(transactions).values({
        id: generateId(), organizationId: orgId,
        type: "bill",
        personId: r.personId,
        version: 1,
        meta: { reservationId, status: "open", balance: "0.00", totalCharges: "0.00", totalPayments: "0.00" },
      }).onConflictDoNothing();
    }
  }
}
```

---

## 20.9 Run Script

```typescript
// packages/hospitality/src/seed-run.ts
import { seedHospitality } from "./seed";

const orgId = process.env.SEED_ORG_ID;
if (!orgId) throw new Error("SEED_ORG_ID required");

seedHospitality(orgId)
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
```

```bash
SEED_ORG_ID=org_xxx bun run packages/hospitality/src/seed-run.ts
```
