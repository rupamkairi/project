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

## 7.3 Rate Plan Prices

`POST /hospitality/admin/rate-plans/:id/prices`

Body:
```typescript
{
  roomTypeId: string;
  baseRate: number;
  extraAdultRate?: number;
  extraChildRate?: number;
  weekendSurcharge?: number;   // added Fri–Sat nights
}
```

One price row per room type per rate plan. `PATCH` to update existing row.

---

## 7.4 Date Overrides

`POST /hospitality/admin/rate-plans/:id/overrides`

Body:
```typescript
{
  roomTypeId: string;
  date: string;             // YYYY-MM-DD
  rate?: number;            // null = use base rate
  minStay?: number;
  stopSell?: boolean;       // block all new bookings for this date
  closeToArrival?: boolean; // block arrivals on this date (continuations allowed)
}
```

Use cases:
- Peak season rate: set higher `rate` for festival dates
- Minimum stay: `minStay = 3` for long weekend
- Stop sell: fully blocked out (maintenance, sold out)

---

## 7.5 Bulk Override

`POST /hospitality/admin/rate-plans/:id/bulk-overrides`

Body:
```typescript
{
  roomTypeId: string;
  dateFrom: string;    // YYYY-MM-DD
  dateTo: string;
  daysOfWeek?: number[];  // 0 = Sunday, 6 = Saturday; null = all days
  rate?: number;
  minStay?: number;
  stopSell?: boolean;
  closeToArrival?: boolean;
}
```

Generates individual override rows for each date in range matching `daysOfWeek` filter.
Used for: "Set rate to 8000 for all Fridays in July".

---

## 7.6 Rate Computation

```typescript
async function computeNightlyRates(
  ratePlanId: string,
  roomTypeId: string,
  checkInDate: string,    // YYYY-MM-DD
  nights: number,
  orgId: string,
  adults: number
): Promise<{ nightlyRates: number[]; total: number }> {
  const basePrice = await db.query.hspRatePlanPrices.findFirst({
    where: and(eq(hspRatePlanPrices.ratePlanId, ratePlanId), eq(hspRatePlanPrices.roomTypeId, roomTypeId))
  });
  if (!basePrice) throw new NotFoundError("RATE_NOT_CONFIGURED");

  const roomType = await db.query.hspRoomTypes.findFirst({ where: eq(hspRoomTypes.id, roomTypeId) });

  const nightlyRates: number[] = [];
  for (let i = 0; i < nights; i++) {
    const date = addDays(checkInDate, i);

    // Check override
    const override = await db.query.hspRateOverrides.findFirst({
      where: and(
        eq(hspRateOverrides.ratePlanId, ratePlanId),
        eq(hspRateOverrides.roomTypeId, roomTypeId),
        eq(hspRateOverrides.date, date)
      ),
    });

    if (override?.stopSell) throw new ConflictError("DATE_STOP_SELL", `No availability for ${date}`);
    if (override?.closeToArrival && i === 0) throw new ConflictError("CLOSE_TO_ARRIVAL", `Arrivals blocked for ${date}`);

    let rate = override?.rate ? parseFloat(override.rate) : parseFloat(basePrice.baseRate);

    // Weekend surcharge
    const dow = new Date(date).getDay();
    if ((dow === 5 || dow === 6) && basePrice.weekendSurcharge) {
      rate += parseFloat(basePrice.weekendSurcharge);
    }

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
