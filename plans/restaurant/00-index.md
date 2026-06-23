# Restaurant Compose — Plan Index

---

## Plan Files

### Backend (Phases 1–11)

| Phase | File | Description |
|-------|------|-------------|
| 01 | [01-foundation.md](01-foundation.md) | Package structure, compose factory, permissions, roles, ID prefixes. Master tables already exist — rst compose creates detail tables only. |
| 02 | [02-entities.md](02-entities.md) | MTA table mapping: master tables (read/filter) + rst_ detail table definitions |
| 03 | [03-menu-outlets.md](03-menu-outlets.md) | Menu CRUD, modifier groups, 86-toggle, outlet status, operating hours |
| 04 | [04-orders-kots.md](04-orders-kots.md) | Order FSM, KOT creation + station routing, KDS queue endpoint |
| 05 | [05-delivery.md](05-delivery.md) | Delivery FSM, rider pool, nearest-rider algorithm, live location ping |
| 06 | [06-billing-settlement.md](06-billing-settlement.md) | Bill FSM, split bill, multi-payment, shift close, daily ledger post |
| 07 | [07-aggregator-bridge.md](07-aggregator-bridge.md) | Swiggy/Zomato/UberEats webhook normalization, order ingestion, SLA ack |
| 08 | [08-inventory-recipes.md](08-inventory-recipes.md) | Ingredient tracking, recipe definitions, deduction on order.placed |
| 09 | [09-analytics.md](09-analytics.md) | Daily sales, bestsellers, kitchen TAT, delivery metrics, aggregator split |
| 10 | [10-backend-logic.md](10-backend-logic.md) | FSMs (5), hooks (7), jobs (6), rules, shift workflows |
| 11 | [11-shell-integration.md](11-shell-integration.md) | Server + web shell wiring, schema export, migration, seed |

### Web UI (Phases 12–19)

| Phase | File | Description |
|-------|------|-------------|
| 12 | [12-web-overview.md](12-web-overview.md) | 5 apps overview, real-time requirements, design rules, file manifest |
| 13 | [13-web-pos.md](13-web-pos.md) | POS orders page, new order builder, bill settle dialog, table card |
| 14 | [14-web-kds.md](14-web-kds.md) | KDS dark board, KotCard with elapsed timer + color escalation, station selector |
| 15 | [15-web-delivery.md](15-web-delivery.md) | Dispatcher 3-col view, rider mobile page, geolocation updater hook |
| 16 | [16-web-admin.md](16-web-admin.md) | Admin dashboard, menu 86-toggle, aggregator mapping, inventory, analytics |
| 17 | [17-web-customer.md](17-web-customer.md) | Customer menu (QR scan), cart, order status stepper, useOrderSSE hook |
| 18 | [18-web-reports.md](18-web-reports.md) | Sales report (BarChart), kitchen TAT report, shift report, table reservations |
| 19 | [19-web-foundation.md](19-web-foundation.md) | Auth store, outlet store, cart store, OrderCard, KotStatusCard, ApiClient |

### Operations (Phases 20–22)

| Phase | File | Description |
|-------|------|-------------|
| 20 | [20-data-seeding.md](20-data-seeding.md) | Sample outlet, menu items, tables, riders, shift templates, categories |
| 21 | [21-compose-credentials-integration.md](21-compose-credentials-integration.md) | Ports, env vars, aggregator API keys, maps API, printer config, Vite aliases |
| 22 | [22-missed-integrations.md](22-missed-integrations.md) | Pitfalls + 20-item integration checklist |

---

## Architecture Diagram

```
apps/server (Shell)
  └── .use(restaurantCompose)    prefix: /restaurant
  └── POST /webhooks/swiggy      ← aggregator webhook
  └── POST /webhooks/zomato
  └── POST /webhooks/ubereats

composes/restaurant/
  server/src/
    index.ts                     ← createRestaurantCompose(mediator, bus, scheduler)
    routes/
      menu/                      ← Phase 3
      orders/                    ← Phase 4
      kds/                       ← Phase 4
      delivery/                  ← Phase 5
      billing/                   ← Phase 6
      aggregator/                ← Phase 7
      inventory/                 ← Phase 8
      analytics/                 ← Phase 9
    hooks/
    jobs/
    fsm/
    schema/

packages/restaurant-web/src/
  apps/
    pos/                         ← Phase 14
    kds/                         ← Phase 15
    delivery/                    ← Phase 16
    billing/                     ← Phase 17
    admin/                       ← Phase 18
    customer/                    ← Phase 19
  components/shared/
  api/restaurant-client.ts
  stores/
  realtime/
```

---

## P0 Blockers

- Master tables already exist — rst compose creates detail tables only
- Foundation modules (`locations`, `cat_items`, `persons`, `transactions`, `pipelines`) must be provisioned before running restaurant migrations
- Run `seedPipeline(orgId, "rst.order", [...])` and `seedPipeline(orgId, "rst.delivery", [...])` before seeding restaurant data

---

## Risks

| Risk | Mitigation |
|------|-----------|
| KOT delay > 1s | Real-time via EventBus → WebSocket broadcast, not polling |
| Aggregator double-ingestion | Idempotency on `aggregatorOrderId` — unique constraint |
| Order placed to closed outlet | `outlet-must-be-open` rule enforced server-side |
| Ingredient deduction race condition | Stock deduction in DB transaction |
| Shift close with open orders | Validate all orders settled before closing shift |
| Split bill rounding | Always round to 2 decimal, final item takes remainder |
| Aggregator SLA breach | Ack within 90s — auto-reject if outlet closed |
| Rider location battery drain | Client sends location every 30s only when delivery active |
