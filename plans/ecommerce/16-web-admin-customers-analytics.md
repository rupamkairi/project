# Phase 16 — Admin: Customers, Analytics & Settings

---

## Customers List — `routes/customers/index.tsx`

```
┌─ PageHeader "Customers" ───────────────────────────────────────┐
├─ Search: name or email ─────────────────────────────────────── ┤
├─ Table ────────────────────────────────────────────────────────┤
│  Name | Email | Orders | Total Spend | Joined | Actions        │
│  ─────────────────────────────────────────────────────────────│
│  John Doe  john@e.com  5  $249.95  3w ago  [View]             │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceAdminApi.getCustomers({ q, page })`

No create/edit from admin — customers self-register via storefront. Admin is read-only.

---

## Customer Detail — `routes/customers/detail.tsx`

```
┌─ [← Customers]  "John Doe"  john@example.com ─────────────────┐
│  Joined: 3 weeks ago | Orders: 5 | Total Spend: $249.95         │
│  Phone: +1-555-0100                                             │
├─ Tabs: Orders | Addresses ──────────────────────────────────── ┤
│                                                                  │
│  Orders tab:                                                     │
│    Table: Order # | Status | Total | Date | [View link]         │
│                                                                  │
│  Addresses tab:                                                  │
│    Card per saved address: name, street, city, country          │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceAdminApi.getCustomer(id)` — returns customer + embedded orders + addresses.

---

## Analytics Dashboard — `routes/analytics/index.tsx`

```
┌─ PageHeader "Analytics" ─────────── Date range picker ─────────┐
├─ KPI row ──────────────────────────────────────────────────────┤
│  GMV           Orders       AOV          Return Rate            │
│  $12,450       183          $68.03       4.2%                   │
│  ↑ +18%        ↑ +12%       ↑ +5%       ↓ -1%                  │
├─ Revenue over time (line chart) ───────────────────────────────┤
│  recharts LineChart, data by day/week/month selector            │
├─ Top Products ──────────────── Top Categories ─────────────────┤
│  Table: Product | Revenue | Units     Table: Name | Revenue    │
│  Sorted by revenue desc, top 5        Top 5                    │
├─ Order Status breakdown (pie chart) ───────────────────────────┤
│  recharts PieChart: Fulfilled / Pending / Cancelled / Refunded  │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceAdminApi.getAnalytics({ startDate, endDate, groupBy })`

Date range: Last 7 days (default) | Last 30 days | Last 90 days | Custom.

**KPI cards:**
```typescript
interface KpiCard {
  label: string;
  value: string;
  delta: string;      // "+18%" or "-1%"
  deltaPositive: boolean; // true = green, false = red
}
```

Return rate: `returns.count / orders.count * 100`. Red if >5%.

**Revenue line chart:**
```typescript
<LineChart data={revenueData}>
  <XAxis dataKey="date" />
  <YAxis tickFormatter={(v) => `$${(v/100).toFixed(0)}`} />
  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" />
  <Tooltip formatter={(v) => formatCurrency(v)} />
</LineChart>
```

---

## Settings — `routes/settings/index.tsx`

Settings page uses vertical tabs (left nav within page):

```
┌─ PageHeader "Settings" ────────────────────────────────────────┐
├─ [Regions] [Shipping] [Tax] [Coupons] ─────────────────────────┤
│                                                                  │
│  Regions tab:                                                    │
│    Table: Name | Currency | Countries | Tax Included | Actions  │
│    [+ New Region] button                                        │
│    Create/Edit Region dialog                                     │
│                                                                  │
│  Shipping Options tab:                                           │
│    Filter by region                                              │
│    Table: Name | Type | Rate | Estimated Days | Region          │
│    [+ New Shipping Option] button                               │
│                                                                  │
│  Tax Profiles tab:                                               │
│    Table: Profile Name | Provider | Rates                       │
│    Tax Rates sub-table per profile                              │
│                                                                  │
│  Coupons tab:                                                   │
│    Table: Code | Type | Value | Usage | Expires | Active        │
│    [+ New Coupon] button                                        │
└────────────────────────────────────────────────────────────────┘
```

### Region Dialog

```
name*           text
currency*       Select (USD/EUR/GBP/INR/etc)
countries       Multi-select (ISO 3166 codes)
taxIncluded     Toggle switch
taxProfileId    Select (from getTaxProfiles())
```

### Shipping Option Dialog

```
name*           text (e.g. "Standard Shipping")
regionId*       Select
type*           Select: flat | weight-based | free
rate            number (cents, 0 for free)
estimatedDays   number (e.g. 5)
```

### Coupon Dialog

```
code*           text (uppercase enforced)
type*           Select: percentage | fixed
value*          number (% or cents)
minOrderValue   number (optional minimum cart total)
usageLimit      number (optional, blank = unlimited)
expiresAt       date picker (optional)
```

---

## Checks

- Analytics KPIs show correct delta colors (green/red)
- Revenue chart renders with recharts, x-axis shows dates
- Top Products table sorted by revenue
- Settings Regions tab lists default USD region (from seed)
- Create Shipping Option saves and appears in list
- Coupon code field auto-uppercases input
