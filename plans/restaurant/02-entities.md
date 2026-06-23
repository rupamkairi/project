# Phase 2 — Entities (Master Table Architecture)

Restaurant compose uses the Master Table Architecture. Foundation modules own shared tables. The compose reads and filters master tables by `type` + `organizationId`, and creates rst-prefixed detail tables for restaurant-specific data.

---

## Master Tables (reused — do not define in Restaurant compose)

### locations (outlets and tables)

- `type`: `"outlet"` | `"table"`
- `name`, `code`, `capacity`
- `parentId`: for tables, points to the outlet `locations.id` (hierarchy)
- `status`: `active` | `inactive` | `reserved` | `occupied`
- `meta`: jsonb — holds outlet-specific fields (operatingHours, acceptsDelivery, deliveryRadius, aggregatorIds, preparationTimeMinutes, lastOrderSeq, lastKotSeq, lastBillSeq)

**Restaurant reads outlets:**
```typescript
where type = 'outlet' and organizationId = orgId
```

**Restaurant reads tables for outlet X:**
```typescript
where type = 'table' and parentId = outletId
```

---

### cat_items (menu items and ingredients)

- `type`: `"menu_item"` | `"stock_item"`
- `name`, `sku`, `description`
- `meta`: jsonb — holds item-specific fields
  - For `menu_item`: `categoryId`, `station`, `isAvailable`, `isPopular`, `sortOrder`, `thumbnailUrl`, `taxPct`, `preparationTimeMinutes`, `foodType` (veg/non-veg/vegan/egg), `tags`, `aggregatorIds`
  - For `stock_item`: `unit` (kg/g/ml/pcs), `currentStock`, `reorderLevel`, `costPerUnit`
- Price for menu items is managed via `cat_price_lists`

**Restaurant reads menu:**
```typescript
where type = 'menu_item' and organizationId = orgId
```

**Restaurant reads stock:**
```typescript
where type = 'stock_item' and organizationId = orgId
```

---

### persons (customers and riders)

- `type`: `"customer"` | `"rider"`
- `firstName`, `lastName`, `email`, `phone`
- `meta`: jsonb
  - For `rider`: `licenseNo`, `vehicleType`, `status` (available/busy/offline), `currentLocation` (lat/lng), `activeDeliveryId`
  - For `customer`: loyalty points, preferences

---

### transactions + transaction_lines (orders and bills)

- `type`: `"order"` | `"bill"`
- For `order`:
  - `personId` → customer `persons.id`
  - `stageId` → stage in the `rst.order` pipeline
  - `meta`: jsonb — holds `tableId` (locations.id), `orderType` (dine-in/takeaway/delivery), `source` (pos/qr/swiggy/zomato), `coverCount`, `waiterId`, `deliveryAddress`, `couponCode`, `aggregatorOrderId`, `specialInstructions`
- `transaction_lines`:
  - `itemId` → `cat_items.id` (menu_item)
  - `qty`, `unitPrice`
  - `meta`: modifiers (jsonb array), note, station

**Create order:**
```typescript
const tx = await mediator.send({ type: "commerce.createTransaction", ..., payload: { type: "order", personId: customerId, stageId: placedStageId } })
await mediator.send({ type: "commerce.addLine", ..., payload: { transactionId: tx.id, itemId: menuItemId, qty: 2, unitPrice: item.price } })
```

---

### pipelines + pipeline_stages

- `rst.order` entityType stages: `Placed → Preparing → Ready → Served | Cancelled`
- `rst.delivery` entityType stages: `Assigned → Picked Up → On the Way → Delivered | Failed`

Seed with:
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

## Detail Tables (Restaurant-owned, rst_ prefixed)

These are the only tables the restaurant compose creates in migrations.

### rst_categories

Menu categories (starters, main course, beverages, desserts, etc.).

```typescript
export const rstCategories = pgTable("rst_categories", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  parentId: text("parent_id"),  // self-ref for sub-categories
  isActive: boolean("is_active").default(true),
  mealPeriod: text("meal_period").default("all"),  // breakfast | lunch | dinner | all
});
```

---

### rst_kot (Kitchen Order Tickets)

One KOT per station per order. Created when an order is placed.

```typescript
export const rstKot = pgTable("rst_kot", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  transactionId: text("transaction_id").notNull(),   // transactions.id — the order
  locationId: text("location_id"),                   // locations.id — kitchen location
  kotNumber: text("kot_number").notNull(),
  station: text("station").notNull(),  // grill | cold | bar | tandoor
  priority: text("priority").default("normal"),
  printedAt: timestamp("printed_at"),
  status: text("status").notNull().default("pending"),
  // pending | preparing | ready | cancelled
  sentAt: timestamp("sent_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  prepStartAt: timestamp("prep_start_at"),
  readyAt: timestamp("ready_at"),
});
```

---

### rst_kot_items

Line items within a KOT.

```typescript
export const rstKotItems = pgTable("rst_kot_items", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  kotId: text("kot_id").notNull().references(() => rstKot.id),
  transactionLineId: text("transaction_line_id").notNull(),  // transaction_lines.id
  qty: integer("qty").notNull(),
  notes: text("notes"),
  status: text("status").default("pending"),
  // pending | preparing | done | voided
});
```

---

### rst_deliveries

Delivery tracking detail per order.

```typescript
export const rstDeliveries = pgTable("rst_deliveries", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  transactionId: text("transaction_id").notNull(),  // transactions.id — the order
  personId: text("person_id"),                      // persons.id — rider (type=rider)
  stageId: text("stage_id"),                        // rst.delivery pipeline stage
  pickupAt: timestamp("pickup_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryAddress: text("delivery_address"),        // text or addressId
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
  estimatedDeliveryAt: timestamp("estimated_delivery_at"),
  riderLocation: jsonb("rider_location").$type<{ lat: number; lng: number; updatedAt: string }>(),
  proofOfDelivery: text("proof_of_delivery"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

### rst_shifts

Staff shifts per outlet.

```typescript
export const rstShifts = pgTable("rst_shifts", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  locationId: text("location_id").notNull(),  // locations.id — outlet
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  shiftType: text("shift_type"),  // morning | afternoon | evening | night
  status: text("status").default("open"),
  // open | closing | closed | variance-flagged
  openingBalance: numeric("opening_balance", { precision: 10, scale: 2 }).default("0"),
  closingBalance: numeric("closing_balance", { precision: 10, scale: 2 }),
  variance: numeric("variance", { precision: 10, scale: 2 }),
  approvedBy: text("approved_by"),
  notes: text("notes"),
});
```

---

### rst_shift_assignments

Which staff member worked which shift.

```typescript
export const rstShiftAssignments = pgTable("rst_shift_assignments", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  shiftId: text("shift_id").notNull().references(() => rstShifts.id),
  personId: text("person_id").notNull(),  // persons.id — staff member
  role: text("role").notNull(),  // cashier | waiter | kitchen | dispatcher
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
});
```

---

### rst_recipes

Ingredient breakdown per menu item version.

```typescript
export const rstRecipes = pgTable("rst_recipes", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id").notNull(),  // cat_items.id — type=menu_item
  version: integer("version").default(1),
  yield: numeric("yield", { precision: 6, scale: 2 }),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

---

### rst_recipe_ingredients

```typescript
export const rstRecipeIngredients = pgTable("rst_recipe_ingredients", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  recipeId: text("recipe_id").notNull().references(() => rstRecipes.id),
  itemId: text("item_id").notNull(),  // cat_items.id — type=stock_item
  qty: numeric("qty", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(),  // g | ml | pcs | kg
});
```

---

### rst_reservations

Table reservation records.

```typescript
export const rstReservations = pgTable("rst_reservations", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  locationId: text("location_id").notNull(),  // locations.id — table (type=table)
  personId: text("person_id"),                // persons.id — customer
  partySize: integer("party_size").notNull(),
  reservedAt: timestamp("reserved_at").notNull(),
  notes: text("notes"),
  status: text("status").default("pending"),
  // pending | confirmed | seated | no_show | cancelled
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

### rst_modifiers

Add-on modifiers (extra cheese, no onion, spice level, etc.).

```typescript
export const rstModifiers = pgTable("rst_modifiers", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),  // 'Extra Cheese', 'No Onion', 'Medium Spice'
  priceAdjustment: numeric("price_adjustment", { precision: 8, scale: 2 }).default("0"),
  // positive = add-on cost, negative = discount, 0 = free
});
```

---

### rst_modifier_groups

Groups of modifiers linked to menu items.

```typescript
export const rstModifierGroups = pgTable("rst_modifier_groups", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),  // 'Spice Level', 'Add-ons', 'Size'
  selectionType: text("selection_type").notNull(),  // single | multiple
  required: boolean("required").default(false),
  itemIds: jsonb("item_ids").$type<string[]>().default([]),
  // array of cat_items.id (type=menu_item) this group applies to
});
```

---

## Key FSMs

These remain unchanged. The pipeline stages replace the old inline status enums for order and delivery.

1. **Order pipeline (rst.order):** `Placed → Preparing → Ready → Served | Cancelled`
2. **KOT FSM (rst_kot.status):** `pending → preparing → ready | cancelled`
3. **Delivery pipeline (rst.delivery):** `Assigned → Picked Up → On the Way → Delivered | Failed`
4. **Bill FSM (transaction type=bill, stageId):** `open → printed → settled | voided`
5. **Shift FSM (rst_shifts.status):** `open → closing → closed | variance-flagged`
