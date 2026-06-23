# Phase 8 — Revenue Management

---

## 8.1 Revenue Routes

```
GET    /hospitality/revenue/metrics          analytics:read
GET    /hospitality/revenue/occupancy        analytics:read
GET    /hospitality/revenue/forecast         analytics:read
GET    /hospitality/revenue/channel-sync     rate-plan:manage
POST   /hospitality/revenue/channel-sync     rate-plan:manage
GET    /hospitality/revenue/competitor-rates analytics:read
```

---

## 8.2 Key Metrics

`GET /hospitality/revenue/metrics`

Query: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

Returns:
```typescript
{
  period: { from: string; to: string };
  occupancy: number;            // percentage
  revPAR: number;               // Revenue Per Available Room
  ADR: number;                  // Average Daily Rate
  totalRevenue: number;
  roomRevenue: number;
  ancillaryRevenue: number;     // fnb, spa, laundry etc.
  averageLengthOfStay: number;
  channelMix: {
    channel: string;
    reservations: number;
    revenue: number;
    pct: number;
  }[];
  topRoomTypes: {
    roomTypeId: string;
    name: string;
    occupancy: number;
    adr: number;
  }[];
}
```

**Occupancy** = (rooms sold / rooms available) × 100
**RevPAR** = ADR × occupancy rate (or total room revenue / available rooms)
**ADR** = total room revenue / rooms sold

---

## 8.3 Occupancy Report

`GET /hospitality/revenue/occupancy`

Query: `?dateFrom=&dateTo=&roomTypeId=&granularity=day|week|month`

Returns daily/weekly/monthly grid:
```typescript
{
  rows: {
    date: string;
    totalRooms: number;
    occupied: number;
    reserved: number;     // confirmed not yet checked-in
    available: number;
    outOfService: number;
    occupancyPct: number;
    adr: number;
  }[];
}
```

Computed from `transactions` (type=order) where stageId in Checked In / Checked Out stages for historical, and Confirmed stage for future. Room counts come from `locations` (type=room). Room type filter uses `cat_items.id` (type=room_type) matched via `meta.roomTypeId` on the transaction.

---

## 8.4 Forecast

`GET /hospitality/revenue/forecast`

Query: `?days=30` (defaults 30, max 90)

Returns next N days:
```typescript
{
  forecast: {
    date: string;
    confirmedArrivals: number;
    confirmedDepartures: number;
    confirmedOccupancy: number;    // from existing reservations
    projectedOccupancy: number;    // + historical fill rate model
    recommendedRate: number;       // dynamic pricing suggestion
    stopSell: boolean;             // from rate overrides
  }[];
}
```

**Recommended rate** (simple rule-based):
- Projected occupancy > 85%: `baseRate × 1.2`
- Projected occupancy > 70%: `baseRate × 1.1`
- Projected occupancy < 40%: `baseRate × 0.9`
- Otherwise: `baseRate`

Note: this is advisory — actual rates come from rate plan + overrides.

---

## 8.5 OTA Channel Inventory Sync

`POST /hospitality/revenue/channel-sync`

Body: `{ channels?: string[] }` — empty = all configured channels.

Syncs `hspChannelInventory` with each OTA:

```typescript
async function syncChannelInventory(orgId: string, channels: string[]): Promise<void> {
  // Room types are cat_items (type=room_type) — not an hsp table
  const roomTypes = await db.query.catItems.findMany({
    where: and(eq(catItems.organizationId, orgId), eq(catItems.type, "room_type")),
  });

  for (const channel of channels) {
    for (const roomType of roomTypes) {
      // Get actual availability for next 90 days
      const dates = generateDateRange(today(), addDays(today(), 90));

      for (const date of dates) {
        const available = await computeAvailability(roomType.id, date, date, orgId);

        await db
          .insert(hspChannelInventory)
          .values({
            roomTypeId: roomType.id,
            channel,
            date,
            allotment: available.roomsAvailable,
            booked: 0,
            available: available.roomsAvailable,
            lastSyncAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [hspChannelInventory.roomTypeId, hspChannelInventory.channel, hspChannelInventory.date],
            set: {
              available: available.roomsAvailable,
              lastSyncAt: new Date(),
            },
          });
      }

      // Push to OTA API (best-effort)
      await pushRatesToOta(channel, roomType.id, dates, orgId);
    }
  }
}
```

**Stale flag logic:**
```typescript
const staleThresholdMs = 30 * 60 * 1000;  // 30 minutes
const isStale = channelInventory.lastSyncAt
  ? Date.now() - channelInventory.lastSyncAt.getTime() > staleThresholdMs
  : true;
```

Revenue page shows stale indicators when last sync > 30 min.

---

## 8.6 Channel Sync Cron Job

Registered in `registerHospitalityJobs`:
```typescript
scheduler.register({
  name: "hsp.channel-sync",
  cron: "*/15 * * * *",   // every 15 min
  fn: async () => {
    const orgs = await getActiveOrgs();
    for (const orgId of orgs) {
      await syncChannelInventory(orgId, ["booking-com", "expedia"]);
    }
  },
});
```

---

## 8.7 Channel Revenue Breakdown

`GET /hospitality/revenue/metrics` `channelMix` array breaks down by:
- `direct-web`, `direct-phone`, `walk-in`
- `ota-booking`, `ota-expedia`, `ota-airbnb`
- `gds`, `corporate`, `group`

Revenue attribution comes from `transaction.meta.source` (reservation = transaction type=order).

---

## 8.8 Revenue Analytics Queries

Charges are `transaction_lines` on folio transactions (type=bill). Reservations are `transactions` (type=order).

```typescript
// ADR for a date range — sum room charge lines across all open/settled folios
const roomRevenue = await db
  .select({ total: sum(transactionLines.unitPrice) })
  .from(transactionLines)
  .innerJoin(transactions, eq(transactionLines.transactionId, transactions.id))
  .where(and(
    eq(transactions.organizationId, orgId),
    eq(transactions.type, "bill"),
    sql`${transactionLines}.meta->>'type' = 'room'`,
    sql`coalesce((${transactionLines}.meta->>'reversed')::boolean, false) = false`,
    sql`${transactionLines}.meta->>'date' >= ${dateFrom}`,
    sql`${transactionLines}.meta->>'date' <= ${dateTo}`,
  ));

const historicalStageIds = await getStageIds(orgId, "hsp.reservation", ["Checked In", "Checked Out"]);
const roomsSold = await db
  .select({ count: count() })
  .from(transactions)
  .where(and(
    eq(transactions.organizationId, orgId),
    eq(transactions.type, "order"),
    inArray(transactions.stageId, historicalStageIds),
    sql`meta->>'checkIn' <= ${dateTo}`,
    sql`meta->>'checkOut' >= ${dateFrom}`,
  ));

const adr = roomsSold[0].count > 0
  ? parseFloat(roomRevenue[0].total ?? "0") / roomsSold[0].count
  : 0;
```
