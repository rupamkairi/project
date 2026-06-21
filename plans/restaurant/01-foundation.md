# Phase 1 — Foundation

---

## 1.1 Package Structure

```
composes/restaurant/
  server/
    src/
      index.ts
      routes/
        menu/
        outlets/
        tables/
        orders/
        kds/
        delivery/
        billing/
        aggregator/
        inventory/
        analytics/
      hooks/
      jobs/
      fsm/
      rules/
      schema/
    package.json

packages/restaurant-web/
  src/
    index.ts
    apps/
      pos/
      kds/
      delivery/
      billing/
      admin/
      customer/
    api/restaurant-client.ts
    stores/
    realtime/
    components/shared/
  package.json
```

---

## 1.2 Compose Factory Skeleton

**File:** `composes/restaurant/server/src/index.ts`

```typescript
import Elysia from "elysia";

export function createRestaurantCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerRestaurantHooks(bus, mediator);
  registerRestaurantJobs(scheduler, mediator);

  return new Elysia({ prefix: "/restaurant" })
    .use(menuRoutes(mediator))
    .use(outletRoutes(mediator))
    .use(tableRoutes(mediator))
    .use(orderRoutes(mediator))
    .use(kdsRoutes(mediator))
    .use(deliveryRoutes(mediator))
    .use(billingRoutes(mediator))
    .use(aggregatorRoutes(mediator))
    .use(inventoryRoutes(mediator))
    .use(analyticsRoutes(mediator));
}

export type RestaurantApp = ReturnType<typeof createRestaurantCompose>;
```

---

## 1.3 Permissions Matrix

| Permission | restaurant-admin | outlet-manager | cashier | waiter | kitchen | rider | dispatcher | customer |
|-----------|-----------------|----------------|---------|--------|---------|-------|-----------|---------|
| `menu:read` | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| `menu:manage` | ✓ | ✓ | — | — | — | — | — | — |
| `table:read` | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| `table:assign` | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| `order:create` | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |
| `order:read` | ✓ | ✓ | ✓ | ✓ | ✓ | own | ✓ | own |
| `order:modify` | ✓ | ✓ | ✓ | ✓ | — | — | — | own(pending) |
| `order:cancel` | ✓ | ✓ | ✓ | — | — | — | — | own(pending) |
| `kot:read` | ✓ | ✓ | — | ✓ | ✓ | — | — | — |
| `kot:accept` | ✓ | — | — | — | ✓ | — | — | — |
| `kot:complete` | ✓ | — | — | — | ✓ | — | — | — |
| `delivery:assign-rider` | ✓ | ✓ | — | — | — | — | ✓ | — |
| `delivery:update-status` | ✓ | — | — | — | — | ✓ | ✓ | — |
| `billing:create` | ✓ | ✓ | ✓ | — | — | — | — | — |
| `billing:settle` | ✓ | ✓ | ✓ | — | — | — | — | own(online) |
| `billing:void` | ✓ | ✓ | — | — | — | — | — | — |
| `shift:manage` | ✓ | ✓ | ✓ | — | — | — | — | — |
| `analytics:read` | ✓ | ✓ | — | — | — | — | ✓ | — |

---

## 1.4 ID Prefix Table

| Entity | Prefix | Example |
|--------|--------|---------|
| Outlet | `out_` | `out_01HX...` |
| Table | `tbl_` | `tbl_01HX...` |
| MenuItem | `mni_` | `mni_01HX...` |
| Order | `ord_` | `ord_01HX...` |
| KOT | `kot_` | `kot_01HX...` |
| Delivery | `dlv_` | `dlv_01HX...` |
| Rider | `rdr_` | `rdr_01HX...` |
| Bill | `bil_` | `bil_01HX...` |
| Shift | `shf_` | `shf_01HX...` |
| Coupon | `cpn_` | `cpn_01HX...` |

---

## 1.5 Order Number Format

Human-readable: `ORD-{OUTLET_CODE}-{YYYY}-{SEQ}`
Example: `ORD-BLR01-2024-001234`

KOT Number: `KOT-{OUTLET_CODE}-{SHIFT_SEQ}`
Example: `KOT-BLR01-0042`

Bill Number: `BILL-{OUTLET_CODE}-{YYYY}-{SEQ}`
Example: `BILL-BLR01-2024-000789`

Sequential counters stored per outlet in `rst_outlets.lastOrderSeq`, `lastKotSeq`, `lastBillSeq`.
