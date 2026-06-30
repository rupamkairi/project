# Phase 7 — Rate Plans

---

## 7.1 Rate Plan Routes

```
GET    /hospitality/rate-plans               public (for booking widget)
GET    /hospitality/rate-plans/:id           reservation:read
POST   /hospitality/admin/rate-plans         rate-plan:manage
PATCH  /hospitality/admin/rate-plans/:id     rate-plan:manage
DELETE /hospitality/admin/rate-plans/:id     rate-plan:manage
POST   /hospitality/admin/rate-plans/:id/prices        rate-plan:manage
PATCH  /hospitality/admin/rate-plans/:id/prices/:priceId   rate-plan:manage
POST   /hospitality/admin/rate-plans/:id/overrides         rate-plan:manage
PATCH  /hospitality/admin/rate-overrides/:id               rate-plan:manage
DELETE /hospitality/admin/rate-overrides/:id               rate-plan:manage
POST   /hospitality/admin/rate-plans/:id/bulk-overrides    rate-plan:manage
```

---

## 7.2 Create Rate Plan

Body:
```typescript
{
  name: string;
  code: string;            // unique per org e.g. "BAR", "CORP-TATA", "SUMMER-PKG"
  type: "public" | "corporate" | "package" | "ota" | "promotion";
  mealPlan: "ep" | "cp" | "map" | "ap";
  minStay?: number;
  maxAdvanceBookingDays?: number;
  cancellationPolicy: {
    type: "flexible" | "non-refundable" | "moderate" | "strict";
    freeCancellationHours: number;  // 0 = non-refundable
    penaltyPct: number;             // 0–100
  };
  validFrom: string;               // ISO datetime
  validTo?: string;
}
```

After creating plan, add prices per room type via `/prices`.

---

## 7.3 Rate Plan Seasons

Rate plans use `hsp_rate_plan_seasons` (date-range pricing per room type). `roomTypeId` references `cat_items.id` (type=room_type), not an hsp table.

`POST /hospitality/admin/rate-plans/:id/seasons`

Body:
```typescript
{
  roomTypeId: string;     // cat_items.id where type = 'room_type'
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  pricePerNight: number;
  currency?: string;
  minNights?: number;
  maxNights?: number;
  conditions?: Record<string, unknown>;   // RuleExpr for advanced restrictions
}
```

Multiple season rows per rate plan per room type (one per date range / season period). Use overlapping ranges sparingly — the most specific date range wins.

---

## 7.4 Bulk Season Override

`POST /hospitality/admin/rate-plans/:id/bulk-seasons`

Body:
```typescript
{
  roomTypeId: string;
  dateFrom: string;    // YYYY-MM-DD
  dateTo: string;
  pricePerNight: number;
  minNights?: number;
  conditions?: { stopSell?: boolean; closeToArrival?: boolean };
}
```

Used for: "Set rate to 8000 for July peak season".

---

## 7.5 Rate Computation

Room type is looked up from `cat_items` (type=room_type). Season pricing from `hsp_rate_plan_seasons`.

```typescript
async function computeNightlyRates(
  ratePlanId: string,
  roomTypeId: string,     // cat_items.id (room_type)
  checkInDate: string,    // YYYY-MM-DD
  nights: number,
  orgId: string,
): Promise<{ nightlyRates: number[]; total: number }> {
  // Find season covering checkInDate
  const season = await db.query.hspRatePlanSeasons.findFirst({
    where: and(
      eq(hspRatePlanSeasons.ratePlanId, ratePlanId),
      eq(hspRatePlanSeasons.roomTypeId, roomTypeId),   // cat_items.id
      lte(hspRatePlanSeasons.startDate, checkInDate),
      gte(hspRatePlanSeasons.endDate, checkInDate),
    )
  });
  if (!season) throw new NotFoundError("RATE_NOT_CONFIGURED");

  // Room type is from cat_items (type=room_type) — no hspRoomTypes table
  const roomType = await db.query.catItems.findFirst({
    where: and(eq(catItems.id, roomTypeId), eq(catItems.type, "room_type")),
  });

  const nightlyRates: number[] = [];
  for (let i = 0; i < nights; i++) {
    const date = addDays(checkInDate, i);

    // Find season covering this date (hsp_rate_plan_seasons)
    const season = await db.query.hspRatePlanSeasons.findFirst({
      where: and(
        eq(hspRatePlanSeasons.ratePlanId, ratePlanId),
        eq(hspRatePlanSeasons.roomTypeId, roomTypeId),  // cat_items.id
        lte(hspRatePlanSeasons.startDate, date),
        gte(hspRatePlanSeasons.endDate, date),
      ),
    });
    if (!season) throw new NotFoundError("RATE_NOT_CONFIGURED", `No season configured for ${date}`);

    // Check conditions for stop_sell / close_to_arrival
    const conditions = season.conditions as Record<string, boolean> | null;
    if (conditions?.stopSell) throw new ConflictError("DATE_STOP_SELL", `No availability for ${date}`);
    if (conditions?.closeToArrival && i === 0) throw new ConflictError("CLOSE_TO_ARRIVAL", `Arrivals blocked for ${date}`);

    let rate = parseFloat(season.pricePerNight as string);

    // Extra adult charge
    const extraAdults = Math.max(0, adults - roomType.maxOccupancy);
    if (extraAdults > 0 && basePrice.extraAdultRate) {
      rate += extraAdults * parseFloat(basePrice.extraAdultRate);
    }

    nightlyRates.push(rate);
  }

  return { nightlyRates, total: nightlyRates.reduce((a, b) => a + b, 0) };
}
```

---

## 7.7 Rate Plan Availability for Booking Widget

`GET /hospitality/rate-plans`

Query: `?checkInDate=YYYY-MM-DD&checkOutDate=YYYY-MM-DD&roomTypeId=&adults=`

Returns: list of available rate plans with:
- Total computed rate
- Per-night breakdown
- Cancellation policy summary
- Meal plan description
- Any restrictions (min stay, advance booking)

Filters out:
- `isActive = false` plans
- Plans with `validTo < checkInDate` or `validFrom > checkOutDate`
- `type = 'corporate'` plans without explicit corporate code
- Plans with `stopSell` override on any night in the range
