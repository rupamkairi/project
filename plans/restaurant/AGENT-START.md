# Restaurant Compose — Agent Start

**Read first:** `plans/AGENT-START.md` (universal bootstrap: path aliases, layer rules, existing modules, compose pattern).

Then return here for Restaurant-specific context.

---

## Goal

Implement Restaurant compose covering full food service operations:
- **Menu & Outlets:** multi-outlet menu management, item 86 (toggle unavailable), modifier groups
- **Dine-in POS:** table management, waiter ordering, KOT splitting by station
- **Kitchen Display System (KDS):** real-time KOT queue, station-specific view, timer tracking
- **Delivery:** rider assignment, live GPS tracking, delivery status lifecycle
- **Billing & Settlement:** split bills, multiple payment methods, daily shift close
- **Aggregator Bridge:** Swiggy / Zomato / UberEats webhook normalization → internal order flow
- **Inventory:** recipe-based ingredient deduction per order

Five front-end apps: POSApp, KDSApp, DeliveryApp (dispatcher + rider), CustomerApp, AdminApp.

---

## Phase Execution Order

### Backend + Shell

1. `01-foundation.md` — package structure, compose factory, permissions, roles. **Start here.**
2. `02-entities.md` — all DB tables (outlets, tables, menu items, modifiers, orders, KOTs, deliveries, bills, riders, shifts).
3. `03-menu-outlets.md` — menu CRUD, modifier groups, 86 toggle, outlet status, operating hours.
4. `04-orders-kots.md` — order FSM, KOT creation + station routing, KDS queue endpoint.
5. `05-delivery.md` — delivery FSM, rider pool, nearest-rider algorithm, live location ping.
6. `06-billing-settlement.md` — bill creation, split bill, payment methods, shift close.
7. `07-aggregator-bridge.md` — Swiggy/Zomato/UberEats webhook ingestion, order normalization.
8. `08-inventory-recipes.md` — ingredient tracking, recipe definitions, deduction on order placed.
9. `09-analytics.md` — daily sales, bestsellers, kitchen TAT, delivery metrics, aggregator split.
10. `10-backend-logic.md` — FSMs (5 entities), hooks (7), jobs (6), rules, shift workflows.
11. `11-shell-integration.md` — server + web wiring, schema export, migration, seed.

### Web UI Detail (read after Phase 11)

12. `12-web-overview.md` — 5 apps, pain points, real-time requirements, design rules, file manifest.
13. `13-web-foundation.md` — `RestaurantApiClient`, auth stores, real-time socket setup, shared layout.
14. `14-web-pos.md` — table floor plan, order builder, modifier selection, send-to-kitchen flow.
15. `15-web-kds.md` — real-time KOT queue, station filter, timer, item-by-item done, complete KOT.
16. `16-web-delivery.md` — dispatcher dashboard, rider assignment, live map, delivery status board.
17. `17-web-billing.md` — bill view, split bill UI, payment collection, settlement dialog.
18. `18-web-admin.md` — menu management, outlet config, shift management, analytics dashboard.
19. `19-web-customer.md` — customer ordering app, cart, checkout, live order tracking.

### Operations Reference (read before starting)

**Read `22-missed-integrations.md` before Phase 1.**

20. `20-data-seeding.md` — sample outlet, menu items, tables, riders, shift templates.
21. `21-compose-credentials-integration.md` — ports, env vars, Swiggy/Zomato API keys, maps API, printer config.
22. `22-missed-integrations.md` — all pitfalls + 20-item checklist.

---

## Compose Identity

| Property | Value |
|----------|-------|
| Compose name | `restaurant` |
| Server package | `@projectx/restaurant-compose` |
| Web package | `@projectx/restaurant-web` |
| Elysia prefix | `/restaurant` |
| Export fn | `createRestaurantCompose(mediator, bus, scheduler)` |
| Export type | `RestaurantApp` |
| DB table prefix | `rst_` |
| Drizzle object prefix | `rst` (e.g. `rstOrder`, `rstKot`) |

---

## Master Table Architecture

Restaurant compose uses the Master Table Architecture (MTA). Foundation modules own shared generic tables. The compose filters master tables by `type` + `organizationId` and adds rst-prefixed detail tables for restaurant-specific data.

See `docs/master-tables.md` for full MTA reference.

### Master Tables (read/filter only — already exist, do not create)

| Master Table | Filter | Restaurant use |
|-------------|--------|----------------|
| `locations` | `type = "outlet"` | Outlets (branches) |
| `locations` | `type = "table"`, `parentId = outletId` | Dine-in tables within an outlet |
| `cat_items` | `type = "menu_item"` | Menu items (food + drinks) |
| `cat_items` | `type = "stock_item"` | Raw ingredients / stock |
| `persons` | `type = "customer"` | Dine-in and delivery customers |
| `persons` | `type = "rider"` | Delivery riders |
| `transactions` | `type = "order"` | Orders (dine-in, takeaway, delivery) |
| `transaction_lines` | — | Order line items |
| `transactions` | `type = "bill"` | Bills (settlement records) |
| `pipelines` + `pipeline_stages` | `entityType = "rst.order"` | Order status pipeline |
| `pipelines` + `pipeline_stages` | `entityType = "rst.delivery"` | Delivery status pipeline |

### Detail Tables (rst-owned, create these)

| Drizzle | SQL | Purpose |
|---------|-----|---------|
| `rstCategories` | `rst_categories` | Menu categories (starters, mains, etc.) |
| `rstKot` | `rst_kot` | Kitchen order tickets |
| `rstKotItems` | `rst_kot_items` | Line items per KOT |
| `rstDeliveries` | `rst_deliveries` | Delivery tracking detail per order |
| `rstShifts` | `rst_shifts` | Staff shifts per outlet |
| `rstShiftAssignments` | `rst_shift_assignments` | Who worked which shift |
| `rstRecipes` | `rst_recipes` | Ingredient breakdown per menu item |
| `rstRecipeIngredients` | `rst_recipe_ingredients` | Ingredient rows per recipe |
| `rstReservations` | `rst_reservations` | Table reservation records |
| `rstModifiers` | `rst_modifiers` | Add-on modifiers (extra cheese, etc.) |
| `rstModifierGroups` | `rst_modifier_groups` | Modifier group config per menu item |

---

## Key FSMs

1. **Order FSM:** `draft → placed → accepted | rejected → preparing → ready → served (dine-in) | out-for-delivery (delivery) → completed | cancelled`
2. **KOT FSM:** `sent → accepted → preparing → ready | cancelled`
3. **Delivery FSM:** `pending-assignment → assigned → rider-heading-to-outlet → reached-outlet → picked-up → out-for-delivery → delivered | failed → returned`
4. **Bill FSM:** `open → printed → settled | voided`
5. **Shift FSM:** `open → closing → closed | variance-flagged`

---

## Mediator Route Patterns

```typescript
// Outlets — locations filtered by type=outlet
const outlets = await mediator.query({ type: "location.listLocations", ..., payload: { type: "outlet", organizationId: orgId } })

// Tables for an outlet — locations filtered by type=table and parentId=outletId
const tables = await mediator.query({ type: "location.listLocations", ..., payload: { type: "table", parentId: outletId } })

// Menu items
const menu = await mediator.query({ type: "catalog.listItems", ..., payload: { type: "menu_item", organizationId: orgId } })

// Create order
const tx = await mediator.send({ type: "commerce.createTransaction", ..., payload: { type: "order", personId: customerId, stageId: placedStageId } })
// Then add lines
await mediator.send({ type: "commerce.addLine", ..., payload: { transactionId: tx.id, itemId: menuItemId, qty: 2, unitPrice: item.price } })
```

KOT creation: direct Drizzle on `rst_kot`.
Delivery assignment: direct Drizzle on `rst_deliveries`.

## Pipeline Seeding

Use `seedPipeline` from `apps/server/src/infra/db/seed.ts`:

```typescript
import { seedPipeline } from "apps/server/src/infra/db/seed"
await seedPipeline(orgId, "rst.order", [
  { name: "Placed" }, { name: "Preparing" }, { name: "Ready" }, { name: "Served" }, { name: "Cancelled" },
])
await seedPipeline(orgId, "rst.delivery", [
  { name: "Assigned" }, { name: "Picked Up" }, { name: "On the Way" }, { name: "Delivered" }, { name: "Failed" },
])
```

---

## Modules via Mediator

| Need | Mediator type prefix |
|------|---------------------|
| Actor/org | `identity.*` |
| Menu catalog | `catalog.*` (read + search) |
| Ingredient stock | `inventory.*` |
| Revenue posting | `ledger.postTransaction` |
| Aggregator reconciliation | `ledger.reconcile` |
| Rider location | `geo.updateLocation`, `geo.getDistance` |
| Delivery zone check | `geo.checkZone` |
| Notifications (SMS, push) | `notification.send` |
| Order analytics | `analytics.track` |
| Real-time KDS | `realtime.publish` |

---

## Critical Real-Time Channels

| Channel | Subscribers | Events |
|---------|-------------|--------|
| `org:{orgId}:rst:{outletId}:kds` | Kitchen staff | `kot.*` |
| `org:{orgId}:rst:{outletId}:tables` | Waiters, cashier | `table.*`, `order.*` |
| `org:{orgId}:rst:delivery` | Dispatcher | `delivery.*`, `order.ready` |
| `org:{orgId}:delivery:{orderId}:tracking` | Customer | `delivery.location-updated` |
| `org:{orgId}:actor:{riderId}:inbox` | Rider | `delivery.assigned` |

Real-time is critical for KDS — KOTs must appear on kitchen screen within 1s of order placement.
