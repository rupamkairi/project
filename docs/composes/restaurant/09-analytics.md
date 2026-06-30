# Phase 9 — Analytics

---

## 9.1 Analytics Routes

```
GET    /restaurant/analytics/overview         rst:manager
GET    /restaurant/analytics/sales            rst:manager
GET    /restaurant/analytics/kitchen          rst:manager
GET    /restaurant/analytics/delivery         rst:manager
GET    /restaurant/analytics/menu             rst:manager
GET    /restaurant/analytics/inventory        rst:manager
```

---

## 9.2 Sales Overview

`GET /restaurant/analytics/overview`

Query: `?outletId=&dateFrom=&dateTo=`

```typescript
{
  revenue: {
    total: number;
    dineIn: number;
    delivery: number;
    takeaway: number;
    periodTotal: number;         // in date range
    mtdTotal: number;
    vsLastPeriod: number;        // % change
  };
  orders: {
    total: number;
    completed: number;
    rejected: number;
    avgOrderValue: number;
    peakHour: string;            // e.g. "19:00"
  };
  topItems: {
    menuItemId: string;
    name: string;
    qty: number;
    revenue: number;
  }[];
  channelMix: {
    channel: string;
    orders: number;
    revenue: number;
    pct: number;
  }[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
}
```

---

## 9.3 Kitchen Analytics (TAT)

`GET /restaurant/analytics/kitchen`

Query: `?outletId=&dateFrom=&dateTo=&station=`

Turnaround time (TAT) = `kot.readyAt - kot.sentAt`.

```typescript
{
  avgKitchenTatMinutes: number;
  avgKitchenTatByStation: {
    station: string;
    avgTat: number;
    p50Tat: number;     // median
    p90Tat: number;
    kotsProcessed: number;
  }[];
  avgKitchenTatByHour: { hour: number; avgTat: number }[];  // heat map data
  slaBreaches: number;     // KOTs where readyAt - sentAt > orgConfig.kitchenSlaMinutes
  slaBreach: number;       // as percentage
  acceptanceTime: {
    avg: number;           // sentAt to acceptedAt
    p90: number;
  };
}
```

---

## 9.4 Delivery Analytics

`GET /restaurant/analytics/delivery`

Query: `?outletId=&dateFrom=&dateTo=`

```typescript
{
  totalDeliveries: number;
  delivered: number;
  failed: number;
  returned: number;
  failureRate: number;             // failed / total
  avgDeliveryTimeMinutes: number;  // deliveredAt - placed order time
  avgPickupTimeMinutes: number;    // pickedUpAt - readyAt
  onTimeRate: number;              // delivered before estimatedDeliveryAt
  riderPerformance: {
    riderId: string;
    name: string;
    deliveries: number;
    avgTimeMinutes: number;
    onTimeRate: number;
  }[];
  byAggregator: {
    source: string;
    orders: number;
    rejectedOrders: number;
    avgDeliveryTime: number;
  }[];
}
```

---

## 9.5 Menu Performance

`GET /restaurant/analytics/menu`

Query: `?outletId=&dateFrom=&dateTo=`

```typescript
{
  items: {
    menuItemId: string;
    name: string;
    category: string;
    qtySold: number;
    revenue: number;
    avgRating?: number;     // from aggregator reviews if available
    returnRate: number;     // orders with this item that were rejected/voided
    contribution: number;  // % of total revenue
    trend: "up" | "down" | "stable";  // vs previous period
  }[];
  categories: {
    categoryId: string;
    name: string;
    qtySold: number;
    revenue: number;
    pct: number;
  }[];
  // ABC analysis
  aItems: string[];   // top 20% by revenue (A items)
  bItems: string[];   // middle 30%
  cItems: string[];   // bottom 50%
}
```

---

## 9.6 Inventory Analytics

`GET /restaurant/analytics/inventory`

Query: `?outletId=`

```typescript
{
  lowStock: {
    ingredientId: string;
    name: string;
    currentStock: number;
    reorderLevel: number;
    unit: string;
    daysRemaining: number;   // currentStock / avgDailyUsage
  }[];
  costOfGoodsSold: number;   // sum(recipe cost × qty sold) in period
  foodCostPct: number;       // COGS / revenue × 100
  wastageByType: {
    reason: string;
    cost: number;
  }[];
  topUsedIngredients: {
    name: string;
    unit: string;
    consumed: number;
    cost: number;
  }[];
}
```

**Average daily usage** = total deducted (from orders) / days in period.
**Days remaining** = `currentStock / avgDailyUsage`.

---

## 9.7 Shift Report

`GET /restaurant/analytics/shifts/:id`

Returns settled bills, payment method breakdown, cash variance, ordered items, refunds for a specific shift.

Used by manager to review end-of-day.
