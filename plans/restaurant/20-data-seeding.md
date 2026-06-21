# Phase 20 — Data Seeding

---

## 20.1 Seed Entry Point

**File:** `packages/restaurant/src/seed.ts`

```typescript
import { db } from "@projectx/core/db";
import { createId } from "@paralleldrive/cuid2";

export async function seedRestaurant(orgId: string) {
  await seedOrgConfig(orgId);
  const outletId = await seedOutlet(orgId);
  const categoryIds = await seedCategories(orgId, outletId);
  const menuItemIds = await seedMenuItems(orgId, outletId, categoryIds);
  await seedIngredients(orgId, outletId, menuItemIds);
  await seedTables(orgId, outletId);
  const riderIds = await seedRiders(orgId, outletId);
  await seedSampleOrders(orgId, outletId, menuItemIds);
  console.log("[restaurant] seed complete");
}
```

---

## 20.2 Org Config

```typescript
async function seedOrgConfig(orgId: string) {
  await db.insert(rstOrgConfig).values({
    id: createId(), orgId,
    currency: "INR",
    taxRate: "5.00",
    packagingCharge: "10.00",
    deliveryRadius: 5,
    minDeliveryOrder: "100.00",
    kitchenSlaMinutes: 20,
    shiftVarianceThreshold: "200.00",
    defaultPreparationTime: 15,
    enableTableOrdering: true,
    enableDelivery: true,
    enableTakeaway: true,
  }).onConflictDoNothing();
}
```

---

## 20.3 Outlet

```typescript
async function seedOutlet(orgId: string) {
  const id = createId();
  await db.insert(rstOutlets).values({
    id, orgId,
    name: "Main Branch",
    outletCode: "MAIN",
    address: "123 Food Street, City",
    latitude: "12.9716",
    longitude: "77.5946",
    phone: "+91-9876543210",
    status: "open",
    type: "both",
    operatingHours: {
      mon: { open: "09:00", close: "22:00" },
      tue: { open: "09:00", close: "22:00" },
      wed: { open: "09:00", close: "22:00" },
      thu: { open: "09:00", close: "22:00" },
      fri: { open: "09:00", close: "23:00" },
      sat: { open: "09:00", close: "23:00" },
      sun: { open: "10:00", close: "21:00" },
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

## 20.5 Menu Items with Recipes

```typescript
async function seedMenuItems(orgId: string, outletId: string, categoryIds: string[]) {
  const items = [
    {
      name: "Veg Spring Roll",
      categoryIdx: 0,  // Starters
      price: "120.00",
      station: "fry",
      preparationTime: 10,
      ingredients: [
        { name: "Spring Roll Sheet", qty: 2, unit: "pc" },
        { name: "Cabbage", qty: 50, unit: "g" },
        { name: "Carrot", qty: 30, unit: "g" },
      ],
    },
    {
      name: "Paneer Butter Masala",
      categoryIdx: 1,  // Main Course
      price: "280.00",
      station: "main",
      preparationTime: 20,
      ingredients: [
        { name: "Paneer", qty: 150, unit: "g" },
        { name: "Tomato Puree", qty: 100, unit: "ml" },
        { name: "Cream", qty: 50, unit: "ml" },
        { name: "Butter", qty: 30, unit: "g" },
      ],
    },
    {
      name: "Butter Naan",
      categoryIdx: 2,  // Breads
      price: "45.00",
      station: "tandoor",
      preparationTime: 8,
      ingredients: [
        { name: "Maida", qty: 100, unit: "g" },
        { name: "Butter", qty: 15, unit: "g" },
      ],
    },
    {
      name: "Mango Lassi",
      categoryIdx: 3,  // Beverages
      price: "90.00",
      station: "bar",
      preparationTime: 5,
      ingredients: [
        { name: "Yogurt", qty: 150, unit: "ml" },
        { name: "Mango Pulp", qty: 100, unit: "ml" },
        { name: "Sugar", qty: 20, unit: "g" },
      ],
    },
  ];

  const menuItemIds: string[] = [];
  for (const item of items) {
    const menuItemId = createId();
    await db.insert(rstMenuItems).values({
      id: menuItemId, orgId, outletId,
      categoryId: categoryIds[item.categoryIdx],
      name: item.name,
      price: item.price,
      station: item.station,
      preparationTime: item.preparationTime,
      isVeg: true,
      status: "active",
      is86d: false,
      aggregatorIds: {},
    }).onConflictDoNothing();
    menuItemIds.push(menuItemId);
  }
  return menuItemIds;
}
```

---

## 20.6 Ingredients and Stock

```typescript
async function seedIngredients(orgId: string, outletId: string, menuItemIds: string[]) {
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
    await db.insert(rstIngredients).values({
      id: createId(), orgId, outletId,
      name: ing.name,
      unit: ing.unit,
      currentStock: ing.currentStock.toString(),
      reorderLevel: ing.reorderLevel.toString(),
      costPerUnit: ing.costPerUnit,
    }).onConflictDoNothing();
  }
}
```

---

## 20.7 Tables

```typescript
async function seedTables(orgId: string, outletId: string) {
  const tables = [
    { tableNumber: "T01", capacity: 2, section: "indoor" },
    { tableNumber: "T02", capacity: 4, section: "indoor" },
    { tableNumber: "T03", capacity: 4, section: "indoor" },
    { tableNumber: "T04", capacity: 6, section: "indoor" },
    { tableNumber: "T05", capacity: 4, section: "outdoor" },
    { tableNumber: "T06", capacity: 8, section: "outdoor" },
  ];

  for (const t of tables) {
    await db.insert(rstTables).values({
      id: createId(), orgId, outletId,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      section: t.section,
      status: "available",
    }).onConflictDoNothing();
  }
}
```

---

## 20.8 Riders

```typescript
async function seedRiders(orgId: string, outletId: string) {
  const riders = [
    { name: "Ravi Kumar", phone: "+91-9000000001" },
    { name: "Suresh Yadav", phone: "+91-9000000002" },
    { name: "Priya Nair", phone: "+91-9000000003" },
  ];

  return Promise.all(riders.map(async (r) => {
    const id = createId();
    await db.insert(rstRiders).values({
      id, orgId, outletId,
      name: r.name,
      phone: r.phone,
      status: "active",
      isBusy: false,
      latitude: null,
      longitude: null,
    }).onConflictDoNothing();
    return id;
  }));
}
```

---

## 20.9 Sample Orders

```typescript
async function seedSampleOrders(orgId: string, outletId: string, menuItemIds: string[]) {
  // One completed dine-in order
  const orderId = createId();
  await db.insert(rstOrders).values({
    id: orderId, orgId, outletId,
    orderNumber: "ORD-MAIN-2026-001",
    type: "dine-in",
    status: "completed",
    total: "470.00",
    subtotal: "448.00",
    taxAmount: "22.00",
    channel: "pos",
  }).onConflictDoNothing();

  await db.insert(rstOrderItems).values([
    { id: createId(), orderId, menuItemId: menuItemIds[1], name: "Paneer Butter Masala", qty: 1, unitPrice: "280.00", totalPrice: "280.00" },
    { id: createId(), orderId, menuItemId: menuItemIds[2], name: "Butter Naan", qty: 2, unitPrice: "45.00", totalPrice: "90.00" },
    { id: createId(), orderId, menuItemId: menuItemIds[3], name: "Mango Lassi", qty: 1, unitPrice: "90.00", totalPrice: "90.00" },
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
