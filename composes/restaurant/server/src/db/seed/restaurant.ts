import { db } from "@db/client";
import { generateId } from "@core";
import { locations } from "@db/schema/location";
import { catItems } from "@db/schema/catalog";
import { persons } from "@db/schema/party";
import { transactions, transactionLines } from "@db/schema/commerce";
import { pipelines, pipelineStages } from "@db/schema/pipeline";
import { rstCategories } from "../schema/restaurant";

async function seedPipeline(
  orgId: string,
  entityType: string,
  stages: { name: string }[],
): Promise<void> {
  // Check if already exists
  const existing = await db.query.pipelines.findFirst({
    where: (p, { eq, and }) =>
      and(eq(p.organizationId, orgId), eq(p.entityType, entityType)),
  }).catch(() => null);

  if (existing) return;

  const pipelineId = generateId();
  await db
    .insert(pipelines)
    .values({
      id: pipelineId,
      organizationId: orgId,
      name: entityType,
      entityType,
      isDefault: true,
      version: 1,
      meta: {},
    })
    .onConflictDoNothing();

  for (let i = 0; i < stages.length; i++) {
    await db
      .insert(pipelineStages)
      .values({
        id: generateId(),
        organizationId: orgId,
        pipelineId,
        name: stages[i].name,
        position: i,
        version: 1,
        meta: {},
      })
      .onConflictDoNothing();
  }
}

async function seedPipelines(orgId: string): Promise<void> {
  await seedPipeline(orgId, "rst.order", [
    { name: "Placed" },
    { name: "Preparing" },
    { name: "Ready" },
    { name: "Served" },
    { name: "Cancelled" },
  ]);

  await seedPipeline(orgId, "rst.delivery", [
    { name: "Assigned" },
    { name: "Picked Up" },
    { name: "On the Way" },
    { name: "Delivered" },
    { name: "Failed" },
  ]);
}

async function seedOutlet(orgId: string): Promise<string> {
  const id = generateId();

  await db
    .insert(locations)
    .values({
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
        timezone: "Asia/Kolkata",
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
        aggregatorIds: {},
      },
    })
    .onConflictDoNothing();

  return id;
}

async function seedCategories(orgId: string): Promise<string[]> {
  const cats = [
    { name: "Starters", sortOrder: 10 },
    { name: "Main Course", sortOrder: 20 },
    { name: "Breads", sortOrder: 30 },
    { name: "Beverages", sortOrder: 40 },
    { name: "Desserts", sortOrder: 50 },
  ];

  const ids: string[] = [];
  for (const c of cats) {
    const id = generateId();
    await db
      .insert(rstCategories)
      .values({
        id,
        organizationId: orgId,
        name: c.name,
        sortOrder: c.sortOrder,
        isActive: true,
      })
      .onConflictDoNothing();
    ids.push(id);
  }
  return ids;
}

async function seedMenuItems(
  orgId: string,
  outletId: string,
  categoryIds: string[],
): Promise<string[]> {
  const items = [
    { name: "Veg Spring Roll", categoryIdx: 0, price: "120.00", station: "fry", prepTime: 10 },
    { name: "Paneer Butter Masala", categoryIdx: 1, price: "280.00", station: "main", prepTime: 20 },
    { name: "Butter Naan", categoryIdx: 2, price: "45.00", station: "tandoor", prepTime: 8 },
    { name: "Mango Lassi", categoryIdx: 3, price: "90.00", station: "bar", prepTime: 5 },
    { name: "Gulab Jamun", categoryIdx: 4, price: "60.00", station: "dessert", prepTime: 3 },
  ];

  const menuItemIds: string[] = [];
  for (const item of items) {
    const id = generateId();
    await db
      .insert(catItems)
      .values({
        id,
        organizationId: orgId,
        type: "menu_item",
        name: item.name,
        slug: `menu-${item.name.toLowerCase().replace(/\s+/g, "-")}-${id.slice(-6)}`,
        status: "active",
        version: 1,
        meta: {
          outletId,
          categoryId: categoryIds[item.categoryIdx] ?? categoryIds[0],
          station: item.station,
          basePrice: item.price,
          deliveryPrice: item.price,
          isAvailable: true,
          isPopular: false,
          preparationTimeMinutes: item.prepTime,
          taxPct: 5,
          foodType: "veg",
          tags: [],
          aggregatorIds: {},
          sortOrder: 0,
        },
      })
      .onConflictDoNothing();
    menuItemIds.push(id);
  }
  return menuItemIds;
}

async function seedIngredients(orgId: string, outletId: string): Promise<void> {
  const ingredients = [
    { name: "Paneer", unit: "g", currentStock: 2000, reorderLevel: 500, costPerUnit: "0.30" },
    { name: "Tomato Puree", unit: "ml", currentStock: 5000, reorderLevel: 1000, costPerUnit: "0.05" },
    { name: "Butter", unit: "g", currentStock: 3000, reorderLevel: 500, costPerUnit: "0.08" },
    { name: "Maida", unit: "g", currentStock: 10000, reorderLevel: 2000, costPerUnit: "0.01" },
    { name: "Yogurt", unit: "ml", currentStock: 3000, reorderLevel: 500, costPerUnit: "0.04" },
    { name: "Mango Pulp", unit: "ml", currentStock: 2000, reorderLevel: 400, costPerUnit: "0.06" },
  ];

  for (const ing of ingredients) {
    const ingId = generateId();
    await db
      .insert(catItems)
      .values({
        id: ingId,
        organizationId: orgId,
        type: "stock_item",
        name: ing.name,
        slug: `ing-${ing.name.toLowerCase().replace(/\s+/g, "-")}-${ingId.slice(-6)}`,
        status: "active",
        version: 1,
        meta: {
          outletId,
          unit: ing.unit,
          currentStock: String(ing.currentStock),
          reorderLevel: String(ing.reorderLevel),
          costPerUnit: ing.costPerUnit,
        },
      })
      .onConflictDoNothing();
  }
}

async function seedTables(orgId: string, outletId: string): Promise<void> {
  const tables = [
    { code: "T01", capacity: 2, section: "indoor" },
    { code: "T02", capacity: 4, section: "indoor" },
    { code: "T03", capacity: 4, section: "indoor" },
    { code: "T04", capacity: 6, section: "indoor" },
    { code: "T05", capacity: 4, section: "outdoor" },
    { code: "T06", capacity: 8, section: "outdoor" },
  ];

  for (const t of tables) {
    await db
      .insert(locations)
      .values({
        id: generateId(),
        organizationId: orgId,
        type: "table",
        name: `Table ${t.code}`,
        code: t.code,
        capacity: t.capacity,
        parentId: outletId,
        status: "active",
        version: 1,
        meta: { section: t.section },
      })
      .onConflictDoNothing();
  }
}

async function seedRiders(orgId: string): Promise<string[]> {
  const riders = [
    { firstName: "Ravi", lastName: "Kumar", phone: "+91-9000000001" },
    { firstName: "Suresh", lastName: "Yadav", phone: "+91-9000000002" },
    { firstName: "Priya", lastName: "Nair", phone: "+91-9000000003" },
  ];

  return Promise.all(
    riders.map(async (r) => {
      const id = generateId();
      await db
        .insert(persons)
        .values({
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
        })
        .onConflictDoNothing();
      return id;
    }),
  );
}

export async function seedRestaurant(orgId: string): Promise<void> {
  await seedPipelines(orgId);
  const outletId = await seedOutlet(orgId);
  const categoryIds = await seedCategories(orgId);
  await seedMenuItems(orgId, outletId, categoryIds);
  await seedIngredients(orgId, outletId);
  await seedTables(orgId, outletId);
  await seedRiders(orgId);
  console.log("[restaurant] seed complete");
}
