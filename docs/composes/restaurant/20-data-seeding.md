# Phase 20 — Data Seeding

---

## 20.0 MTA Seed Note

Restaurant seeding uses master tables from foundation modules. Outlets and tables are inserted into `locations`. Menu items and ingredients go into `cat_items`. Customers and riders go into `persons`. Orders go into `transactions`.

Pipelines must be seeded before restaurant data:

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

## 20.1 Seed Entry Point

**File:** `packages/restaurant/src/seed.ts`

```typescript
import { db } from "@projectx/core/db";
import { createId } from "@paralleldrive/cuid2";
import { seedPipeline } from "apps/server/src/infra/db/seed";
import { locations, catItems, persons, transactions, transactionLines } from "@projectx/foundation/schema";

export async function seedRestaurant(orgId: string) {
  await seedPipelines(orgId);
  const outletId = await seedOutlet(orgId);
  const categoryIds = await seedCategories(orgId, outletId);
  const menuItemIds = await seedMenuItems(orgId, outletId, categoryIds);
  await seedIngredients(orgId, outletId);
  await seedTables(orgId, outletId);
  await seedRiders(orgId);
  await seedSampleOrders(orgId, outletId, menuItemIds);
  console.log("[restaurant] seed complete");
}
```

---

## 20.2 Pipelines

```typescript
async function seedPipelines(orgId: string) {
  await seedPipeline(orgId, "rst.order", [
    { name: "Placed" }, { name: "Preparing" }, { name: "Ready" }, { name: "Served" }, { name: "Cancelled" },
  ]);
  await seedPipeline(orgId, "rst.delivery", [
    { name: "Assigned" }, { name: "Picked Up" }, { name: "On the Way" }, { name: "Delivered" }, { name: "Failed" },
  ]);
}
```

---

## 20.3 Outlet

Outlets are `locations` with `type = "outlet"`.

```typescript
async function seedOutlet(orgId: string) {
  const id = createId();
  await db.insert(locations).values({
    id,
    organizationId: orgId,
    type: "outlet",
    name: "Main Branch",
    code: "MAIN",
    status: "active",
    version: 1,
    meta: {
      address: "123 Food Street, City",
      phone: "+91-9876543210",
      acceptsDelivery: true,
      acceptsDineIn: true,
      acceptsTakeaway: true,
      deliveryRadius: 5,
      preparationTimeMinutes: 20,
      lastOrderSeq: 0,
      lastKotSeq: 0,
      lastBillSeq: 0,
      operatingHours: {
        mon: { open: "09:00", close: "22:00" },
        tue: { open: "09:00", close: "22:00" },
        wed: { open: "09:00", close: "22:00" },
        thu: { open: "09:00", close: "22:00" },
        fri: { open: "09:00", close: "23:00" },
        sat: { open: "09:00", close: "23:00" },
        sun: { open: "10:00", close: "21:00" },
      },
    },
  }).onConflictDoNothing();
  return id;
}
```

---

## 20.4 Categories

```typescript
async function seedCategories(orgId: string, outletId: string) {
  const cats = [
    { name: "Starters", sortOrder: 10 },
    { name: "Main Course", sortOrder: 20 },
    { name: "Breads", sortOrder: 30 },
    { name: "Beverages", sortOrder: 40 },
    { name: "Desserts", sortOrder: 50 },
  ];

  const ids: string[] = [];
  for (const c of cats) {
    const id = createId();
    await db.insert(rstCategories).values({
      id, orgId, outletId,
      name: c.name,
      sortOrder: c.sortOrder,
      isActive: true,
    }).onConflictDoNothing();
    ids.push(id);
  }
  return ids;
}
```

---

## 20.5 Menu Items

Menu items are `cat_items` with `type = "menu_item"`.

```typescript
async function seedMenuItems(orgId: string, outletId: string, categoryIds: string[]) {
  const items = [
    { name: "Veg Spring Roll", categoryIdx: 0, price: "120.00", station: "fry", prepTime: 10 },
    { name: "Paneer Butter Masala", categoryIdx: 1, price: "280.00", station: "main", prepTime: 20 },
    { name: "Butter Naan", categoryIdx: 2, price: "45.00", station: "tandoor", prepTime: 8 },
    { name: "Mango Lassi", categoryIdx: 3, price: "90.00", station: "bar", prepTime: 5 },
  ];

  const menuItemIds: string[] = [];
  for (const item of items) {
    const id = createId();
    await db.insert(catItems).values({
      id,
      organizationId: orgId,
      type: "menu_item",
      name: item.name,
      version: 1,
      meta: {
        outletId,
        categoryId: categoryIds[item.categoryIdx],
        station: item.station,
        isAvailable: true,
        preparationTimeMinutes: item.prepTime,
        foodType: "veg",
        tags: [],
        aggregatorIds: {},
      },
    }).onConflictDoNothing();
    menuItemIds.push(id);
  }
  return menuItemIds;
}
```

---

## 20.6 Ingredients and Stock

Ingredients are `cat_items` with `type = "stock_item"`.

```typescript
async function seedIngredients(orgId: string, outletId: string) {
  const ingredients = [
    { name: "Paneer", unit: "g", currentStock: 2000, reorderLevel: 500, costPerUnit: "0.30" },
    { name: "Tomato Puree", unit: "ml", currentStock: 5000, reorderLevel: 1000, costPerUnit: "0.05" },
    { name: "Butter", unit: "g", currentStock: 3000, reorderLevel: 500, costPerUnit: "0.08" },
    { name: "Maida", unit: "g", currentStock: 10000, reorderLevel: 2000, costPerUnit: "0.01" },
    { name: "Yogurt", unit: "ml", currentStock: 3000, reorderLevel: 500, costPerUnit: "0.04" },
    { name: "Mango Pulp", unit: "ml", currentStock: 2000, reorderLevel: 400, costPerUnit: "0.06" },
    { name: "Spring Roll Sheet", unit: "pc", currentStock: 200, reorderLevel: 50, costPerUnit: "2.00" },
    { name: "Cabbage", unit: "g", currentStock: 2000, reorderLevel: 300, costPerUnit: "0.01" },
    { name: "Carrot", unit: "g", currentStock: 1500, reorderLevel: 300, costPerUnit: "0.01" },
    { name: "Cream", unit: "ml", currentStock: 1000, reorderLevel: 200, costPerUnit: "0.10" },
    { name: "Sugar", unit: "g", currentStock: 5000, reorderLevel: 500, costPerUnit: "0.01" },
  ];

  for (const ing of ingredients) {
    await db.insert(catItems).values({
      id: createId(),
      organizationId: orgId,
      type: "stock_item",
      name: ing.name,
      version: 1,
      meta: {
        outletId,
        unit: ing.unit,
        currentStock: ing.currentStock.toString(),
        reorderLevel: ing.reorderLevel.toString(),
        costPerUnit: ing.costPerUnit,
      },
    }).onConflictDoNothing();
  }
}
```

---

## 20.7 Tables

Tables are `locations` with `type = "table"` and `parentId = outletId`.

```typescript
async function seedTables(orgId: string, outletId: string) {
  const tables = [
    { code: "T01", capacity: 2, section: "indoor" },
    { code: "T02", capacity: 4, section: "indoor" },
    { code: "T03", capacity: 4, section: "indoor" },
    { code: "T04", capacity: 6, section: "indoor" },
    { code: "T05", capacity: 4, section: "outdoor" },
    { code: "T06", capacity: 8, section: "outdoor" },
  ];

  for (const t of tables) {
    await db.insert(locations).values({
      id: createId(),
      organizationId: orgId,
      type: "table",
      name: `Table ${t.code}`,
      code: t.code,
      capacity: t.capacity,
      parentId: outletId,   // links table to its outlet
      status: "active",
      version: 1,
      meta: { section: t.section },
    }).onConflictDoNothing();
  }
}
```

---

## 20.8 Riders

Riders are `persons` with `type = "rider"`.

```typescript
async function seedRiders(orgId: string) {
  const riders = [
    { firstName: "Ravi", lastName: "Kumar", phone: "+91-9000000001" },
    { firstName: "Suresh", lastName: "Yadav", phone: "+91-9000000002" },
    { firstName: "Priya", lastName: "Nair", phone: "+91-9000000003" },
  ];

  return Promise.all(riders.map(async (r) => {
    const id = createId();
    await db.insert(persons).values({
      id,
      organizationId: orgId,
      type: "rider",
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      version: 1,
      meta: {
        status: "offline",
        vehicleType: "bike",
        currentLocation: null,
        activeDeliveryId: null,
      },
    }).onConflictDoNothing();
    return id;
  }));
}
```

---

## 20.9 Sample Orders

Orders are `transactions` with `type = "order"`. Line items go into `transaction_lines`.

```typescript
async function seedSampleOrders(orgId: string, outletId: string, menuItemIds: string[]) {
  // Get the "Served" stage id for rst.order pipeline
  const servedStage = await db.query.pipelineStages.findFirst({
    where: (s, { eq, and }) => and(
      eq(s.organizationId, orgId),
      eq(s.entityType, "rst.order"),
      eq(s.name, "Served"),
    ),
  });

  const txId = createId();
  await db.insert(transactions).values({
    id: txId,
    organizationId: orgId,
    type: "order",
    stageId: servedStage?.id,
    version: 1,
    meta: {
      outletId,
      orderType: "dine-in",
      source: "pos",
      orderNumber: "ORD-MAIN-2026-001",
    },
  }).onConflictDoNothing();

  await db.insert(transactionLines).values([
    { id: createId(), transactionId: txId, itemId: menuItemIds[1], qty: 1, unitPrice: "280.00", meta: { name: "Paneer Butter Masala" } },
    { id: createId(), transactionId: txId, itemId: menuItemIds[2], qty: 2, unitPrice: "45.00", meta: { name: "Butter Naan" } },
    { id: createId(), transactionId: txId, itemId: menuItemIds[3], qty: 1, unitPrice: "90.00", meta: { name: "Mango Lassi" } },
  ]).onConflictDoNothing();
}
```

---

## 20.10 Run Script

```typescript
// packages/restaurant/src/seed-run.ts
import { seedRestaurant } from "./seed";

const orgId = process.env.SEED_ORG_ID;
if (!orgId) throw new Error("SEED_ORG_ID required");

seedRestaurant(orgId)
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
```

```bash
SEED_ORG_ID=org_xxx bun run packages/restaurant/src/seed-run.ts
```
