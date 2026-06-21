# Phase 20 — Data Seeding

---

## 20.1 Seed Entry Point

**File:** `packages/hospitality/src/seed.ts`

```typescript
import { db } from "@projectx/core/db";
import { createId } from "@paralleldrive/cuid2";

export async function seedHospitality(orgId: string) {
  await seedOrgConfig(orgId);
  const roomTypeIds = await seedRoomTypes(orgId);
  const roomIds = await seedRooms(orgId, roomTypeIds);
  const ratePlanIds = await seedRatePlans(orgId, roomTypeIds);
  const guestIds = await seedGuestProfiles(orgId);
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

## 20.3 Room Types

```typescript
async function seedRoomTypes(orgId: string) {
  const types = [
    {
      name: "Standard Room",
      code: "STD",
      description: "Comfortable standard room with city view.",
      maxOccupancy: 2,
      baseAdults: 2,
      totalRooms: 10,
      amenities: ["WiFi", "AC", "TV", "Mini Fridge"],
    },
    {
      name: "Deluxe Room",
      code: "DLX",
      description: "Spacious deluxe room with pool view.",
      maxOccupancy: 2,
      baseAdults: 2,
      totalRooms: 6,
      amenities: ["WiFi", "AC", "TV", "Mini Bar", "Bathtub"],
    },
    {
      name: "Suite",
      code: "STE",
      description: "Luxury suite with separate living area.",
      maxOccupancy: 4,
      baseAdults: 2,
      totalRooms: 4,
      amenities: ["WiFi", "AC", "TV", "Kitchen", "Jacuzzi", "Butler Service"],
    },
  ];

  const ids: Record<string, string> = {};
  for (const t of types) {
    const id = createId();
    await db.insert(hspRoomTypes).values({
      id, orgId,
      name: t.name,
      code: t.code,
      description: t.description,
      maxOccupancy: t.maxOccupancy,
      baseAdults: t.baseAdults,
      totalRooms: t.totalRooms,
      amenities: t.amenities,
      isActive: true,
    }).onConflictDoNothing();
    ids[t.code] = id;
  }
  return ids;
}
```

---

## 20.4 Rooms

```typescript
async function seedRooms(orgId: string, roomTypeIds: Record<string, string>) {
  const roomDefs = [
    // Standard rooms: 101-110
    ...Array.from({ length: 10 }, (_, i) => ({
      roomNumber: `${101 + i}`,
      floor: 1,
      typeCode: "STD",
    })),
    // Deluxe rooms: 201-206
    ...Array.from({ length: 6 }, (_, i) => ({
      roomNumber: `${201 + i}`,
      floor: 2,
      typeCode: "DLX",
    })),
    // Suites: 301-304
    ...Array.from({ length: 4 }, (_, i) => ({
      roomNumber: `${301 + i}`,
      floor: 3,
      typeCode: "STE",
    })),
  ];

  const ids: string[] = [];
  for (const r of roomDefs) {
    const id = createId();
    await db.insert(hspRooms).values({
      id, orgId,
      roomNumber: r.roomNumber,
      floor: r.floor,
      roomTypeId: roomTypeIds[r.typeCode],
      status: "available",
      housekeepingStatus: "inspected",
      isBlocked: false,
    }).onConflictDoNothing();
    ids.push(id);
  }
  return ids;
}
```

---

## 20.5 Rate Plans with Prices

```typescript
async function seedRatePlans(orgId: string, roomTypeIds: Record<string, string>) {
  const plans = [
    {
      name: "Bed & Breakfast",
      code: "BB",
      description: "Room with breakfast included.",
      mealPlan: "BB" as const,
      cancellationPolicy: { freeCancellationHours: 48, penaltyPct: 100 },
      prices: {
        STD: { baseRate: "120.00", extraAdult: "30.00", extraChild: "15.00", weekendSurcharge: "20.00" },
        DLX: { baseRate: "180.00", extraAdult: "40.00", extraChild: "20.00", weekendSurcharge: "30.00" },
        STE: { baseRate: "350.00", extraAdult: "60.00", extraChild: "30.00", weekendSurcharge: "50.00" },
      },
    },
    {
      name: "Room Only",
      code: "RO",
      description: "Room only, no meals.",
      mealPlan: "RO" as const,
      cancellationPolicy: { freeCancellationHours: 24, penaltyPct: 50 },
      prices: {
        STD: { baseRate: "99.00", extraAdult: "25.00", extraChild: "10.00", weekendSurcharge: "15.00" },
        DLX: { baseRate: "149.00", extraAdult: "35.00", extraChild: "15.00", weekendSurcharge: "25.00" },
        STE: { baseRate: "299.00", extraAdult: "50.00", extraChild: "25.00", weekendSurcharge: "40.00" },
      },
    },
  ];

  const ids: string[] = [];
  for (const plan of plans) {
    const planId = createId();
    await db.insert(hspRatePlans).values({
      id: planId, orgId,
      name: plan.name,
      code: plan.code,
      description: plan.description,
      mealPlan: plan.mealPlan,
      cancellationPolicy: plan.cancellationPolicy,
      isActive: true,
      isPublic: true,
      minStay: 1,
      maxStay: null,
      validFrom: null,
      validTo: null,
    }).onConflictDoNothing();

    for (const [typeCode, price] of Object.entries(plan.prices)) {
      await db.insert(hspRatePlanPrices).values({
        id: createId(), ratePlanId: planId,
        roomTypeId: roomTypeIds[typeCode],
        baseRate: price.baseRate,
        extraAdultRate: price.extraAdult,
        extraChildRate: price.extraChild,
        weekendSurcharge: price.weekendSurcharge,
      }).onConflictDoNothing();
    }
    ids.push(planId);
  }
  return ids;
}
```

---

## 20.6 Guest Profiles

```typescript
async function seedGuestProfiles(orgId: string) {
  const guests = [
    {
      firstName: "James",
      lastName: "Wilson",
      email: "james.wilson@example.com",
      phone: "+1-555-0101",
      nationality: "US",
      vipStatus: "gold" as const,
      preferences: { roomFloor: "high", pillowType: "soft", dietaryRestrictions: [] },
    },
    {
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya.sharma@example.com",
      phone: "+91-98765-43210",
      nationality: "IN",
      vipStatus: "standard" as const,
      preferences: { roomFloor: "any", pillowType: "firm", dietaryRestrictions: ["vegetarian"] },
    },
    {
      firstName: "Hans",
      lastName: "Mueller",
      email: "hans.mueller@example.com",
      phone: "+49-30-123456",
      nationality: "DE",
      vipStatus: "platinum" as const,
      preferences: { roomFloor: "high", pillowType: "soft", dietaryRestrictions: [] },
    },
  ];

  const ids: string[] = [];
  for (const g of guests) {
    const id = createId();
    await db.insert(hspGuestProfiles).values({
      id, orgId,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      phone: g.phone,
      nationality: g.nationality,
      vipStatus: g.vipStatus,
      preferences: g.preferences,
      totalStays: 0,
      totalSpend: "0.00",
    }).onConflictDoNothing();
    ids.push(id);
  }
  return ids;
}
```

---

## 20.7 Reservations

```typescript
async function seedReservations(
  orgId: string,
  guestIds: string[],
  roomTypeIds: Record<string, string>,
  ratePlanIds: string[],
  roomIds: string[],
) {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const inThreeDays = new Date(today); inThreeDays.setDate(today.getDate() + 3);
  const inFiveDays = new Date(today); inFiveDays.setDate(today.getDate() + 5);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const reservations = [
    {
      guestId: guestIds[0],
      roomTypeId: roomTypeIds["DLX"],
      ratePlanId: ratePlanIds[0],
      roomId: roomIds[11],  // room 201
      checkInDate: today.toISOString().slice(0, 10),
      checkOutDate: inThreeDays.toISOString().slice(0, 10),
      adults: 2,
      children: 0,
      status: "checked-in" as const,
      confirmationNumber: "HTL-2026-00001",
      totalAmount: "540.00",
      source: "direct" as const,
    },
    {
      guestId: guestIds[1],
      roomTypeId: roomTypeIds["STD"],
      ratePlanId: ratePlanIds[1],
      roomId: null,
      checkInDate: tomorrow.toISOString().slice(0, 10),
      checkOutDate: inFiveDays.toISOString().slice(0, 10),
      adults: 1,
      children: 0,
      status: "confirmed" as const,
      confirmationNumber: "HTL-2026-00002",
      totalAmount: "396.00",
      source: "ota" as const,
    },
    {
      guestId: guestIds[2],
      roomTypeId: roomTypeIds["STE"],
      ratePlanId: ratePlanIds[0],
      roomId: null,
      checkInDate: inThreeDays.toISOString().slice(0, 10),
      checkOutDate: inFiveDays.toISOString().slice(0, 10),
      adults: 2,
      children: 0,
      status: "confirmed" as const,
      confirmationNumber: "HTL-2026-00003",
      totalAmount: "700.00",
      source: "direct" as const,
    },
  ];

  for (const r of reservations) {
    const reservationId = createId();
    await db.insert(hspReservations).values({
      id: reservationId, orgId,
      guestProfileId: r.guestId,
      roomTypeId: r.roomTypeId,
      ratePlanId: r.ratePlanId,
      roomId: r.roomId,
      checkInDate: r.checkInDate,
      checkOutDate: r.checkOutDate,
      adults: r.adults,
      children: r.children,
      status: r.status,
      confirmationNumber: r.confirmationNumber,
      totalAmount: r.totalAmount,
      source: r.source,
    }).onConflictDoNothing();

    // Create folio for checked-in reservation
    if (r.status === "checked-in") {
      await db.insert(hspFolios).values({
        id: createId(), orgId,
        reservationId,
        guestProfileId: r.guestId,
        status: "open",
        balance: "0.00",
        totalCharges: "0.00",
        totalPayments: "0.00",
      }).onConflictDoNothing();
    }
  }
}
```

---

## 20.8 Run Script

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
