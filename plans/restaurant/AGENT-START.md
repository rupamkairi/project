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

## DB Tables (20 total)

| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `rstOutlet` | `rst_outlets` | id, orgId, name, code, type, status, address, location (jsonb), operatingHours (jsonb), acceptsDelivery, deliveryRadius, preparationTimeMinutes, aggregatorIds (jsonb) |
| `rstTable` | `rst_tables` | id, outletId, tableNumber, section, capacity, status, currentOrderId, qrCode |
| `rstMenuItem` | `rst_menu_items` | id, outletId, categoryId, name, description, basePrice, type (veg/non-veg/vegan), station, isAvailable, sortOrder, thumbnailUrl |
| `rstMenuModifier` | `rst_menu_modifiers` | id, outletId, name, type (single/multi), required, minSelect, maxSelect, options (jsonb) |
| `rstMenuItemModifier` | `rst_menu_item_modifiers` | menuItemId, modifierId |
| `rstOrder` | `rst_orders` | id, orgId, outletId, orderNumber, type, status, source, tableId, waiterId, customerId, deliveryAddress (jsonb), riderId, subtotal, discount, tax, deliveryFee, total, paymentStatus, couponCode, aggregatorOrderId |
| `rstOrderItem` | `rst_order_items` | id, orderId, menuItemId, name, qty, unitPrice, modifiers (jsonb), note, status |
| `rstKot` | `rst_kots` | id, orderId, outletId, kotNumber, status, station, priority, sentAt, acceptedAt, prepStartAt, readyAt |
| `rstKotItem` | `rst_kot_items` | id, kotId, orderItemId, menuItemId, name, qty, modifiers (jsonb), status |
| `rstDelivery` | `rst_deliveries` | id, orderId, outletId, riderId, status, pickupAddress, dropAddress (jsonb), distance, estimatedDeliveryAt, pickedUpAt, deliveredAt, riderLocation (jsonb), failureReason |
| `rstRider` | `rst_riders` | id, actorId, outletId, name, phone, vehicleType, status (available/busy/offline), currentLocation (jsonb), activeDeliveryId |
| `rstBill` | `rst_bills` | id, orderId, outletId, billNumber, status, subtotal, discount, tax, serviceCharge, total, payments (jsonb), splitWith (jsonb), settledAt, ledgerTransactionId |
| `rstShift` | `rst_shifts` | id, outletId, cashierId, startedAt, endedAt, status, openingBalance, closingBalance, variance, approvedBy |
| `rstShiftTransaction` | `rst_shift_transactions` | id, shiftId, method, amount, reference |
| `rstIngredient` | `rst_ingredients` | id, outletId, name, unit, currentStock, reorderLevel, costPerUnit |
| `rstRecipe` | `rst_recipes` | id, menuItemId, ingredients (jsonb: [{ingredientId, qty}]) |
| `rstAggregatorOrder` | `rst_aggregator_orders` | id, outletId, source, aggregatorOrderId, rawPayload (jsonb), internalOrderId, status, receivedAt |
| `rstTableReservation` | `rst_table_reservations` | id, outletId, tableId, guestName, phone, partySize, reservedAt, status, notes |
| `rstCoupon` | `rst_coupons` | id, orgId, code, type, value, minOrderValue, maxDiscount, usedCount, maxUses, expiresAt, isActive |
| `rstCategory` | `rst_categories` | id, outletId, name, sortOrder, isActive, mealPeriod (breakfast/lunch/dinner/all) |

---

## Key FSMs

1. **Order FSM:** `draft → placed → accepted | rejected → preparing → ready → served (dine-in) | out-for-delivery (delivery) → completed | cancelled`
2. **KOT FSM:** `sent → accepted → preparing → ready | cancelled`
3. **Delivery FSM:** `pending-assignment → assigned → rider-heading-to-outlet → reached-outlet → picked-up → out-for-delivery → delivered | failed → returned`
4. **Bill FSM:** `open → printed → settled | voided`
5. **Shift FSM:** `open → closing → closed | variance-flagged`

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
