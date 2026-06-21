# Phase 8 — Inventory & Recipes

---

## 8.1 Inventory Routes

```
GET    /restaurant/admin/ingredients            rst:manager
POST   /restaurant/admin/ingredients            rst:manager
PATCH  /restaurant/admin/ingredients/:id        rst:manager
POST   /restaurant/admin/ingredients/:id/adjust rst:manager
GET    /restaurant/admin/ingredients/alerts     rst:manager
GET    /restaurant/admin/recipes                rst:manager
POST   /restaurant/admin/menu/:id/recipe        rst:manager
PATCH  /restaurant/admin/menu/:id/recipe        rst:manager
DELETE /restaurant/admin/menu/:id/recipe        rst:manager
POST   /restaurant/admin/ingredients/purchase   rst:manager
```

---

## 8.2 Ingredient Management

**Create ingredient:**
```typescript
{
  outletId: string;
  name: string;
  unit: "g" | "ml" | "pcs" | "kg" | "L";
  currentStock: number;
  reorderLevel: number;
  costPerUnit: number;
}
```

**Manual stock adjustment:**

`POST /restaurant/admin/ingredients/:id/adjust`

Body: `{ qty: number; reason: "purchase" | "waste" | "count-correction" | "spoilage"; notes?: string }`

`qty` can be negative (e.g. waste). Guard: resulting `currentStock >= 0` (cannot go negative via manual adjust — use `force: true` for override).

```typescript
const newStock = parseFloat(ingredient.currentStock) + qty;
if (newStock < 0 && !force) {
  throw new ConflictError("STOCK_BELOW_ZERO", `Adjustment would result in negative stock: ${newStock}`);
}

await db.update(rstIngredients)
  .set({ currentStock: newStock.toString(), updatedAt: new Date() })
  .where(eq(rstIngredients.id, ingredientId));
```

---

## 8.3 Recipe Management

**Upsert recipe:**

`POST /restaurant/admin/menu/:id/recipe`

Body:
```typescript
{
  ingredients: {
    ingredientId: string;
    qty: number;       // per 1 unit of menu item
    unit: string;
  }[];
}
```

Replaces existing recipe for this menu item. Use PATCH for partial update.

Guard: each `ingredientId` must belong to same `outletId` as menu item.

`DELETE /restaurant/admin/menu/:id/recipe` — removes recipe entirely (menu item becomes non-tracked).

---

## 8.4 Reorder Alerts

`GET /restaurant/admin/ingredients/alerts`

Returns ingredients where `currentStock <= reorderLevel`:

```typescript
const alerts = await db.query.rstIngredients.findMany({
  where: and(
    eq(rstIngredients.outletId, outletId),
    lte(rstIngredients.currentStock, rstIngredients.reorderLevel)
  ),
  orderBy: [asc(sql`current_stock / NULLIF(reorder_level, 0)`)],  // most critical first
});
```

Response includes:
```typescript
{
  alerts: {
    ingredientId: string;
    name: string;
    unit: string;
    currentStock: number;
    reorderLevel: number;
    percentageRemaining: number;   // currentStock / reorderLevel * 100
    affectedMenuItems: { id, name }[];  // items that use this ingredient
  }[];
}
```

---

## 8.5 Stock Impact Preview

`GET /restaurant/admin/menu/:id/stock-impact?qty=1`

Returns how much stock would be deducted per 1 (or N) units of this item ordered:

```typescript
const recipe = await db.query.rstRecipes.findFirst({ where: eq(rstRecipes.menuItemId, menuItemId) });
if (!recipe) return { impact: [] };

const impact = await Promise.all(recipe.ingredients.map(async (ing) => {
  const ingredient = await db.query.rstIngredients.findFirst({ where: eq(rstIngredients.id, ing.ingredientId) });
  return {
    ingredientId: ing.ingredientId,
    name: ingredient.name,
    unit: ing.unit,
    perUnit: ing.qty,
    total: ing.qty * qty,
    currentStock: parseFloat(ingredient.currentStock),
    afterDeduction: parseFloat(ingredient.currentStock) - (ing.qty * qty),
    willCauseStockout: parseFloat(ingredient.currentStock) < (ing.qty * qty),
  };
}));

return { impact };
```

---

## 8.6 Purchase Entry

`POST /restaurant/admin/ingredients/purchase`

Body:
```typescript
{
  outletId: string;
  items: {
    ingredientId: string;
    qty: number;
    unitCost?: number;  // updates costPerUnit if provided
  }[];
  vendorName?: string;
  invoiceRef?: string;
}
```

Adds stock for each item. Optionally updates `costPerUnit` (moving average or latest cost).

```typescript
for (const item of items) {
  await db.update(rstIngredients)
    .set({
      currentStock: sql`current_stock + ${item.qty}`,
      costPerUnit: item.unitCost ? item.unitCost.toString() : rstIngredients.costPerUnit,
      updatedAt: new Date(),
    })
    .where(eq(rstIngredients.id, item.ingredientId));
}
```

If ERP compose active: dispatch to procurement module for invoice matching.

---

## 8.7 Wastage Report

`GET /restaurant/admin/ingredients/wastage`

Query: `?outletId=&dateFrom=&dateTo=`

Returns: all manual adjustments with `reason = 'waste' | 'spoilage'` in the period.

Aggregated:
- Total waste by ingredient
- Waste cost (qty × costPerUnit at time of waste)
- Top 5 wasted items

Note: waste adjustments are logged as a separate table `rst_stock_adjustments` (add to schema if needed — not in base entities, but recommended for audit).
