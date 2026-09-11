# Restaurant DB Refactor — Implementation Handoff Plan

**Audience:** Implementation agent (e.g. DeepSeek)  
**Reviewer:** Composer (after you finish, user will ask Composer to review)  
**Repo root:** `/Users/rupamkairi/Projects/my-projects/projectx`

---

## 0. Read this first — hard rules

1. **Do NOT invent new features.** Only refactor DB access and schema. Keep all API routes, URLs, and response JSON shapes the same unless noted below.
2. **Do NOT write tests** unless explicitly asked.
3. **Do NOT run dev servers** (`bun dev`, etc.). The app is already running.
4. **Use Bun** for commands (not npm/pnpm/node).
5. **Follow existing compose patterns.** Read reference files in Section 2 before editing anything.
6. **One shared database.** All composes use the shell client at `apps/server/src/infra/db/client.ts` via the alias `@db/client`.
7. **Master + detail pattern:**
   - **Shared masters** live in `apps/server/src/infra/db/schema/` (`cat_items`, `cat_categories`, `transactions`, `persons`, `locations`, `activities`, …).
   - **Compose detail tables** live in `composes/restaurant/server/src/db/schema/restaurant.ts` with `rst_` prefix.
   - Link masters to detail with plain `text('..._id')` columns. **No Drizzle `.references()`** on kept tables (CRM convention).
8. **Schema migration is OK.** There is no production data. Generate migration with `bun run db:generate` from `apps/server`.
9. **Work in order.** Complete Task 1 fully before Task 2, etc. Do not skip verification steps.

---

## 1. Background — what is wrong today

Restaurant compose is the **only compose** that creates its own Drizzle DB client:

- **Bad file:** `composes/restaurant/server/src/lib/db.ts` — local Neon client scoped to restaurant schema only.
- **Good pattern:** `import { db } from '@db/client'` (used by CRM, LMS, hospitality, workplace).

Restaurant also **duplicates shared master tables** that already exist in the shell:

| Redundant restaurant table | Should use shared master |
|---------------------------|-------------------------|
| `rst_categories` | `cat_categories` |
| `rst_item_variants` | `cat_variants` |
| `rst_item_allergens` | `cat_items.meta.allergens` |
| `rst_order_history` | `activities` |
| `rst_bills` | `transactions` (type `'bill'`) |
| `rst_equipment` | `cat_items` (type `'asset'`) |

Restaurant **already correctly uses** shared masters via mediator for: outlets (`location.*`), menu items (`catalog.*`), orders (`commerce.*`), ingredients (`catalog.*`). Keep those mediator calls unless this plan says to add direct `@db/schema` imports.

---

## 2. Reference files — read before coding

Read these files to understand the target pattern. **Do not copy unrelated logic.**

| Purpose | File path |
|---------|-----------|
| Shared DB client | `apps/server/src/infra/db/client.ts` |
| Shared schema helpers (`baseColumns`) | `apps/server/src/infra/db/schema/helpers.ts` |
| Catalog masters | `apps/server/src/infra/db/schema/catalog.ts` |
| Commerce masters | `apps/server/src/infra/db/schema/commerce.ts` |
| Activity master | `apps/server/src/infra/db/schema/activity.ts` |
| Party master | `apps/server/src/infra/db/schema/party.ts` |
| CRM detail schema style | `composes/crm/server/src/db/schema/crm.ts` |
| LMS direct catalog usage | `composes/lms/server/src/routes/courses.ts` (categories + catItems inserts) |
| CRM route DB imports | `composes/crm/server/src/routes/leads.ts` |
| Hospitality reservations | `composes/hospitality/server/src/routes/reservations.ts` |
| Workplace employee + person | `composes/workplace/server/src/routes/people/employees.ts` |
| Shell schema barrel | `apps/server/src/infra/db/schema/index.ts` |
| Drizzle config | `apps/server/drizzle.config.ts` |
| Restaurant tsconfig paths | `composes/restaurant/server/tsconfig.json` |

---

## 3. Table disposition — final state

### 3A. DELETE these exports/tables entirely

Remove from `restaurant.ts` AND from route code:

- `rstCategories` / table `rst_categories`
- `rstItemVariants` / table `rst_item_variants`
- `rstItemAllergens` / table `rst_item_allergens`
- `rstOrderHistory` / table `rst_order_history`
- `rstBills` / table `rst_bills`
- `rstEquipment` / table `rst_equipment`

### 3B. RENAME columns on kept detail tables

| Table | Old column | New column |
|-------|------------|------------|
| `rst_bill_payments` | `bill_id` | `transaction_id` |
| `rst_bill_splits` | `bill_id` | `transaction_id` |
| `rst_equipment_logs` | `equipment_id` | `item_id` |

### 3C. KEEP these `rst_*` tables (compose-specific workflow)

- `rst_menu_periods`
- `rst_modifiers`, `rst_modifier_groups`
- `rst_kot`, `rst_kot_items`
- `rst_shifts`, `rst_shift_assignments`
- `rst_staff`
- `rst_reservations`, `rst_waitlist`
- `rst_recipes`, `rst_recipe_ingredients`
- `rst_stock_movements` (do NOT migrate to `inv_movements` in this task)
- `rst_partners`, `rst_aggregator_mappings`
- `rst_discounts`
- `rst_bill_payments`, `rst_bill_splits`, `rst_equipment_logs` (after column rename)

### 3D. Shared masters restaurant must use directly in routes

| Master | Import from | Used for |
|--------|-------------|----------|
| `catCategories` | `@db/schema/catalog` | Menu categories |
| `catItems` | `@db/schema/catalog` | Menu items (optional direct), equipment assets |
| `catVariants` | `@db/schema/catalog` | Menu item size/price variants |
| `transactions` | `@db/schema/commerce` | POS bills (`type: 'bill'`) |
| `activities` | `@db/schema/activity` | Order status history |
| `persons` | `@db/schema/party` | Staff guests on reservations |
| `locations` | `@db/schema/location` | Already used in `lib/utils.ts` |

---

## 4. Field mapping for migrated entities

### 4A. Menu category: `rst_categories` → `cat_categories`

When inserting/updating `cat_categories`:

```typescript
{
  id: generateId(),
  organizationId: session.orgId,
  name: input.name,
  slug: slugify(input.name) + '-' + shortId,  // cat_categories requires slug — see LMS courses.ts
  parentId: input.parentId ?? null,
  sortOrder: input.sortOrder ?? 0,
  status: 'active',  // replaces isActive: true
  meta: {
    mealPeriod: input.mealPeriod ?? 'all',
    outletId: input.outletId ?? null,
    imageUrl: input.imageUrl ?? null,
    description: input.description ?? null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
}
```

When reading categories for API response, **map back** so clients still see old field names:

```typescript
{
  id: c.id,
  organizationId: c.organizationId,
  name: c.name,
  description: (c.meta as any)?.description,
  sortOrder: c.sortOrder,
  parentId: c.parentId,
  isActive: c.status === 'active',
  mealPeriod: (c.meta as any)?.mealPeriod ?? 'all',
  imageUrl: (c.meta as any)?.imageUrl,
  outletId: (c.meta as any)?.outletId,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
}
```

Filter by outlet: `sql\`${catCategories.meta}->>'outletId' = ${outletId}\`` or filter in JS after fetch.

### 4B. Menu variant: `rst_item_variants` → `cat_variants`

```typescript
{
  id: generateId(),
  organizationId: session.orgId,
  itemId: menuItemId,
  sku: `${menuItemId}-${slugify(variantName)}`,  // required unique per org
  attributes: {
    name: variantName,
    priceAdjustment: variant.priceAdjustment ?? '0',
    isDefault: variant.isDefault ?? false,
    sortOrder: variant.sortOrder ?? 0,
  },
  stockTracked: false,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
}
```

API response mapping for variants:

```typescript
{
  id: v.id,
  organizationId: v.organizationId,
  itemId: v.itemId,
  name: (v.attributes as any)?.name,
  priceAdjustment: (v.attributes as any)?.priceAdjustment ?? '0',
  isDefault: (v.attributes as any)?.isDefault ?? false,
  isActive: v.status === 'active',
  sortOrder: (v.attributes as any)?.sortOrder ?? 0,
}
```

### 4C. Allergens: `rst_item_allergens` → `cat_items.meta.allergens`

Store as array on menu item meta when creating/updating items:

```typescript
meta: {
  ...existingMeta,
  allergens: [{ allergen: 'nuts', severity: 'contains' }, ...]
}
```

In GET `/menu/items`, read allergens from `item.meta.allergens ?? []` instead of querying `rst_item_allergens`.

POST `/menu/items/:id/allergens` should **update cat_items meta** (fetch item, append allergen to array, update via `catalog.updateItem` or direct `db.update(catItems)`).

### 4D. Order history: `rst_order_history` → `activities`

Replace `recordHistory()` in `orders.ts`:

```typescript
import { activities } from '@db/schema/activity'

await db.insert(activities).values({
  id: generateId(),
  organizationId: orgId,
  type: 'log',
  subject: `Order ${fromStatus ?? 'new'} → ${toStatus}`,
  body: note ?? null,
  status: 'done',
  actorId: actorId,
  entityId: orderId,
  entityType: 'rst.order',
  completedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  meta: { fromStatus, toStatus },
})
```

When reading history in GET order endpoints, query:

```typescript
db.select().from(activities).where(
  and(
    eq(activities.organizationId, session.orgId),
    eq(activities.entityType, 'rst.order'),
    eq(activities.entityId, orderId),
  )
).orderBy(asc(activities.createdAt))
```

Map to old response shape:

```typescript
{
  id: a.id,
  orderId: a.entityId,
  fromStatus: (a.meta as any)?.fromStatus,
  toStatus: (a.meta as any)?.toStatus,
  actorId: a.actorId,
  note: a.body,
  changedAt: a.createdAt,
}
```

### 4E. Bills: `rst_bills` → `transactions` (type `'bill'`)

`transactions` uses `moneyColumns('total')` → fields `totalAmount` (integer cents) and `totalCurrency` (text). Same for `taxAmount` / `taxCurrency`.

**Convert dollars to cents:** `Math.round(parseFloat(String(amount)) * 100)`

When creating a bill (POST `/billing/bills`):

```typescript
import { transactions } from '@db/schema/commerce'

const grandTotalNum = parseFloat(String(grandTotal))
const taxTotalNum = parseFloat(String(taxTotal))

const [bill] = await db.insert(transactions).values({
  id: generateId(),
  organizationId: session.orgId,
  type: 'bill',
  referenceNo: billNumber(outletCode),
  totalAmount: Math.round(grandTotalNum * 100),
  totalCurrency: 'USD',
  taxAmount: Math.round(taxTotalNum * 100),
  taxCurrency: 'USD',
  meta: {
    orderId: input.orderId,
    outletId: orderData.meta?.outletId,
    billNumber: billNumber(outletCode),
    subtotal,
    discountTotal,
    taxTotal,
    serviceCharge,
    tipAmount,
    roundOff,
    grandTotal,
    status: 'open',
    tableId: orderData.meta?.tableId,
    coverCount: orderData.meta?.coverCount,
    cashierId: session.actorId,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
}).returning()
```

For all billing routes, replace every `rstBills` reference with `transactions` filtered by `eq(transactions.type, 'bill')`.

**Bill list/get/settle/void:** read/write `meta.status`, `meta.grandTotal`, etc. Map response to old bill shape so API unchanged.

**Payments/splits:** use `transactionId` instead of `billId`:

```typescript
await db.insert(rstBillPayments).values({
  transactionId: params.id,  // was billId
  ...
})
```

**Relational queries:** After Task 1, define relations on kept tables:

```typescript
// In restaurant.ts
export const rstBillPaymentsRelations = relations(rstBillPayments, ({ one }) => ({
  bill: one(transactions, { fields: [rstBillPayments.transactionId], references: [transactions.id] }),
}))
```

For list bills with payments, either:
- use `with` after relations are defined, OR
- query payments separately with `eq(rstBillPayments.transactionId, bill.id)`

Domain events: keep publishing `'rst.bill'` entity type — only internal id changes to transaction id.

### 4F. Equipment: `rst_equipment` → `cat_items` (type `'asset'`)

POST `/equipment`:

```typescript
const [item] = await db.insert(catItems).values({
  id: generateId(),
  organizationId: session.orgId,
  name: input.name,
  slug: slugify(input.name) + '-' + generateId().slice(0, 6),
  type: 'asset',
  status: 'active',
  meta: {
    outletId: input.outletId,
    category: input.category,
    serialNumber: input.serialNumber,
    reference: input.reference,
    purchaseDate: input.purchaseDate,
    warrantyExpiry: input.warrantyExpiry,
    purchaseCost: input.purchaseCost,
    notes: input.notes,
    equipmentStatus: 'active',  // distinct from cat item status
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
}).returning()
```

Map GET responses to old equipment shape from `catItems` row + meta.

Equipment logs: `equipmentId` → `itemId` pointing to the asset's `cat_items.id`.

---

## 5. Task checklist — execute in order

### TASK 1: Switch to shared DB client

**Goal:** Every restaurant route uses `@db/client`. Delete local client.

#### 1.1 Replace import in these 12 files

In each file, change line 3 or 4 from:
```typescript
import { db } from '../lib/db.js'
```
to:
```typescript
import { db } from '@db/client'
```

Files (exact paths):

1. `composes/restaurant/server/src/hooks/index.ts`
2. `composes/restaurant/server/src/routes/analytics.ts`
3. `composes/restaurant/server/src/routes/aggregator.ts`
4. `composes/restaurant/server/src/routes/billing.ts`
5. `composes/restaurant/server/src/routes/equipment.ts`
6. `composes/restaurant/server/src/routes/inventory.ts`
7. `composes/restaurant/server/src/routes/kots.ts`
8. `composes/restaurant/server/src/routes/menu.ts`
9. `composes/restaurant/server/src/routes/orders.ts`
10. `composes/restaurant/server/src/routes/partners.ts`
11. `composes/restaurant/server/src/routes/reservations.ts`
12. `composes/restaurant/server/src/routes/staff.ts`

**Note:** `composes/restaurant/server/src/lib/utils.ts` already uses `@db/client` — leave it.

#### 1.2 Delete local DB file

Delete: `composes/restaurant/server/src/lib/db.ts`

#### 1.3 Update package.json

File: `composes/restaurant/server/package.json`

Remove from `dependencies`:
```json
"@neondatabase/serverless": "^0.10.4",
```

Keep `drizzle-orm` and `elysia`.

#### 1.4 Add Drizzle relations to restaurant schema

File: `composes/restaurant/server/src/db/schema/restaurant.ts`

At bottom of file, add (import `relations` from `drizzle-orm`):

```typescript
import { relations } from 'drizzle-orm'

export const rstKotRelations = relations(rstKot, ({ many }) => ({
  items: many(rstKotItems),
}))

export const rstKotItemsRelations = relations(rstKotItems, ({ one }) => ({
  kot: one(rstKot, { fields: [rstKotItems.kotId], references: [rstKot.id] }),
}))

export const rstRecipesRelations = relations(rstRecipes, ({ many }) => ({
  ingredients: many(rstRecipeIngredients),
}))

export const rstRecipeIngredientsRelations = relations(rstRecipeIngredients, ({ one }) => ({
  recipe: one(rstRecipes, { fields: [rstRecipeIngredients.recipeId], references: [rstRecipes.id] }),
}))

export const rstShiftAssignmentsRelations = relations(rstShiftAssignments, ({ one }) => ({
  shift: one(rstShifts, { fields: [rstShiftAssignments.shiftId], references: [rstShifts.id] }),
}))

export const rstShiftsRelations = relations(rstShifts, ({ many }) => ({
  assignments: many(rstShiftAssignments),
}))
```

After Task 2 renames bill payments, also add:

```typescript
import { transactions } from '@db/schema/commerce'

export const rstBillPaymentsRelations = relations(rstBillPayments, ({ one }) => ({
  bill: one(transactions, { fields: [rstBillPayments.transactionId], references: [transactions.id] }),
}))

export const rstBillSplitsRelations = relations(rstBillSplits, ({ one }) => ({
  bill: one(transactions, { fields: [rstBillSplits.transactionId], references: [transactions.id] }),
}))
```

#### 1.5 Verify Task 1

```bash
cd composes/restaurant/server && bun run typecheck
```

Fix any type errors before Task 2.

---

### TASK 2: Rewrite schema file

**Goal:** Remove dropped tables, rename columns, add CRM-style header, use `baseColumns` on kept tables.

File: `composes/restaurant/server/src/db/schema/restaurant.ts`

#### 2.1 Replace file header with CRM-style comment

Copy the pattern from `composes/crm/server/src/db/schema/crm.ts` lines 1–17. Adapt for restaurant:

- Masters used: `cat_items`, `cat_categories`, `cat_variants`, `transactions`, `locations`, `persons`, `activities`
- Master-backed entities with NO local table: outlets, tables, menu items, orders, ingredients, categories, variants, allergens, bills, equipment
- Detail tables listed in Section 3C

#### 2.2 Change imports

Replace:
```typescript
import { pgTable, text, ... } from 'drizzle-orm/pg-core'
```

With:
```typescript
import { pgTable, text, integer, boolean, numeric, timestamp, jsonb, date, time, index } from 'drizzle-orm/pg-core'
import { baseColumns } from '@db/schema/helpers'
import { relations } from 'drizzle-orm'
```

#### 2.3 Delete entire table definitions

Remove these exports completely from the file:

- `rstCategories` (lines ~15–28)
- `rstItemVariants` (lines ~46–55)
- `rstItemAllergens` (lines ~59–65)
- `rstOrderHistory` (lines ~133–143)
- `rstBills` (lines ~378–401)
- `rstEquipment` (lines ~306–321)

#### 2.4 Update kept tables to use `baseColumns`

For each kept table, spread `...baseColumns` instead of manual `id`, `organizationId`, `createdAt`, `updatedAt`.

Example for `rstModifiers`:

```typescript
export const rstModifiers = pgTable('rst_modifiers', {
  ...baseColumns,
  name: text('name').notNull(),
  priceAdjustment: numeric('price_adjustment', { precision: 8, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
})
```

Apply same pattern to all kept tables in Section 3C.

#### 2.5 Remove `.references()` calls

On `rstKotItems`, `rstShiftAssignments`, `rstRecipeIngredients`, `rstBillPayments`, `rstBillSplits`, `rstEquipmentLogs`:

Change:
```typescript
kotId: text('kot_id').notNull().references(() => rstKot.id),
```
To:
```typescript
kotId: text('kot_id').notNull(),
```

#### 2.6 Rename columns

In `rstBillPayments`: `billId` → `transactionId` (column `transaction_id`)

In `rstBillSplits`: `billId` → `transactionId`

In `rstEquipmentLogs`: `equipmentId` → `itemId` (column `item_id`)

#### 2.7 Keep relations from Task 1.4

---

### TASK 3: Update shell schema exports

#### 3.1 Update apps/server schema barrel

File: `apps/server/src/infra/db/schema/index.ts`

In the restaurant import block (~lines 158–213), **remove** these from import and export:

- `rstCategories`
- `rstItemVariants`
- `rstItemAllergens`
- `rstOrderHistory`
- `rstBills`
- `rstEquipment`

Keep all other `rst_*` exports.

#### 3.2 Update restaurant compose index exports

File: `composes/restaurant/server/src/index.ts`

In the export block (~lines 41–66), remove the same 6 symbols.

---

### TASK 4: Rewrite routes — menu

File: `composes/restaurant/server/src/routes/menu.ts`

#### 4.1 Update imports

```typescript
import { db } from '@db/client'
import { catCategories, catItems, catVariants } from '@db/schema/catalog'
import { eq, and, asc, isNull } from 'drizzle-orm'
import {
  rstMenuPeriods,
  rstModifiers,
  rstModifierGroups,
} from '../db/schema/restaurant.js'
```

Remove imports of `rstCategories`, `rstItemVariants`, `rstItemAllergens`.

Add helper at top of file:

```typescript
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
```

#### 4.2 Rewrite category endpoints (GET/POST/PATCH `/categories`)

Use `catCategories` per Section 4A. Always filter `isNull(catCategories.deletedAt)`.

#### 4.3 Rewrite item enrichment (GET `/items`)

Replace variant query:
```typescript
const variants = await db.select().from(catVariants).where(
  and(eq(catVariants.itemId, item.id), eq(catVariants.status, 'active'), isNull(catVariants.deletedAt))
)
```
Map variants per Section 4B.

Replace allergen query with `(item.meta?.allergens ?? [])`.

#### 4.4 Rewrite POST `/items` variant/allergen creation

- Variants → insert into `catVariants` (Section 4B)
- Allergens → include in `catalog.createItem` payload meta.allergens OR update after create

#### 4.5 Rewrite POST/PATCH variant endpoints

Use `catVariants` table instead of `rstItemVariants`.

#### 4.6 Rewrite POST allergen endpoint

Update `cat_items.meta.allergens` array instead of inserting into `rst_item_allergens`.

#### 4.7 Leave modifier and menu period endpoints unchanged (still `rst_*`)

---

### TASK 5: Rewrite routes — orders

File: `composes/restaurant/server/src/routes/orders.ts`

#### 5.1 Update imports

```typescript
import { db } from '@db/client'
import { activities } from '@db/schema/activity'
import { rstKot, rstKotItems } from '../db/schema/restaurant.js'
import { eq, and, asc } from 'drizzle-orm'
```

Remove `rstOrderHistory`.

#### 5.2 Replace `recordHistory()` function

Use Section 4D.

#### 5.3 Replace history reads

In GET `/:id` and GET `/:id/history`, query `activities` instead of `rstOrderHistory`. Map response per Section 4D.

Leave KOT logic unchanged (`rstKot`, `rstKotItems`).

---

### TASK 6: Rewrite routes — billing

File: `composes/restaurant/server/src/routes/billing.ts`

#### 6.1 Update imports

```typescript
import { db } from '@db/client'
import { transactions } from '@db/schema/commerce'
import {
  rstBillPayments,
  rstBillSplits,
  rstDiscounts,
  rstShifts,
} from '../db/schema/restaurant.js'
import { and, eq } from 'drizzle-orm'
```

Remove `rstBills`.

#### 6.2 Create helper functions

```typescript
function mapTransactionToBill(row: typeof transactions.$inferSelect) {
  const meta = (row.meta ?? {}) as Record<string, any>
  return {
    id: row.id,
    organizationId: row.organizationId,
    orderId: meta.orderId,
    outletId: meta.outletId,
    billNumber: meta.billNumber ?? row.referenceNo,
    subtotal: meta.subtotal ?? '0',
    discountTotal: meta.discountTotal ?? '0',
    taxTotal: meta.taxTotal ?? String((row.taxAmount ?? 0) / 100),
    serviceCharge: meta.serviceCharge ?? '0',
    tipAmount: meta.tipAmount ?? '0',
    roundOff: meta.roundOff ?? '0',
    grandTotal: meta.grandTotal ?? String((row.totalAmount ?? 0) / 100),
    status: meta.status ?? 'open',
    tableId: meta.tableId,
    coverCount: meta.coverCount,
    cashierId: meta.cashierId,
    shiftId: meta.shiftId,
    receiptNumber: meta.receiptNumber,
    createdAt: row.createdAt,
    settledAt: meta.settledAt ? new Date(meta.settledAt) : null,
    voidedAt: meta.voidedAt ? new Date(meta.voidedAt) : null,
    voidReason: meta.voidReason,
  }
}
```

#### 6.3 Replace every `rstBills` usage

- POST `/bills` → insert `transactions` (Section 4E)
- GET `/bills`, GET `/bills/:id` → select from `transactions` where `type='bill'`, map with helper, attach payments/splits via `transactionId`
- POST settle/void/split → update `transactions.meta` instead of `rstBills` columns
- All `rstBillPayments` / `rstBillSplits` inserts use `transactionId` not `billId`

Leave `rstDiscounts` and `rstShifts` endpoints unchanged.

---

### TASK 7: Rewrite routes — equipment

File: `composes/restaurant/server/src/routes/equipment.ts`

#### 7.1 Update imports

```typescript
import { db } from '@db/client'
import { catItems } from '@db/schema/catalog'
import { rstEquipmentLogs } from '../db/schema/restaurant.js'
import { and, eq, asc, isNull } from 'drizzle-orm'
```

Remove `rstEquipment`.

#### 7.2 Rewrite all equipment CRUD

Use `catItems` with `type: 'asset'` per Section 4F.

List filter:
```typescript
and(
  eq(catItems.organizationId, session.orgId),
  eq(catItems.type, 'asset'),
  isNull(catItems.deletedAt),
  // outlet filter: meta.outletId
)
```

#### 7.3 Update equipment logs

All log inserts: `itemId: params.id` instead of `equipmentId`.

Log queries: `eq(rstEquipmentLogs.itemId, params.id)`.

Status updates: update `catItems.meta.equipmentStatus` and/or `catItems.status`.

---

### TASK 8: Rewrite routes — analytics

File: `composes/restaurant/server/src/routes/analytics.ts`

#### 8.1 Update imports

Replace `rstBills` with `transactions` from `@db/schema/commerce`.

#### 8.2 Bill revenue queries

Query `transactions` where `type='bill'` and date range on `createdAt`. Use `mapTransactionToBill` helper or read `meta.grandTotal`.

Leave `rstShifts` and `rstStockMovements` queries as-is.

---

### TASK 9: Route alignment — staff, reservations, partners

#### 9.1 Staff — `composes/restaurant/server/src/routes/staff.ts`

On POST `/` when `input.personId` is missing, create person first (copy pattern from `composes/workplace/server/src/routes/people/employees.ts` lines 37–54):

```typescript
const result = await mediator.dispatch({
  type: 'person.createPerson',
  payload: {
    organizationId: session.orgId,
    type: 'vendor_contact',  // use until employee enum exists
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
  },
  actorId: session.actorId,
  orgId: session.orgId,
  correlationId: generateId(),
})
personId = (result as any)?.id ?? result
```

Then insert `rstStaff` with that `personId`.

#### 9.2 Reservations — `composes/restaurant/server/src/routes/reservations.ts`

On POST `/`, if no `personId` but guest contact info provided, create guest person:

```typescript
import { persons } from '@db/schema/party'

// via mediator person.createPerson with type: 'guest'
```

Keep `rst_reservations` table. Store `personId` on reservation row.

#### 9.3 Partners — `composes/restaurant/server/src/routes/partners.ts`

Add optional `partyId` column to `rst_partners` schema (text, nullable) following `hsp_partners` in `composes/hospitality/server/src/db/schema/hospitality.ts` line 289.

No route behavior change required beyond accepting optional `partyId` in POST/PATCH body.

---

### TASK 10: Generate database migration

```bash
cd apps/server
bun run db:generate
```

Review generated SQL in `apps/server/src/infra/db/migrations/`. It should:

- DROP tables: `rst_categories`, `rst_item_variants`, `rst_item_allergens`, `rst_order_history`, `rst_bills`, `rst_equipment`
- RENAME columns on `rst_bill_payments`, `rst_bill_splits`, `rst_equipment_logs`
- ADD `party_id` to `rst_partners` if added
- ADD `baseColumns` fields to kept rst tables (`deleted_at`, `version`, `meta`) if not present

If `db:generate` misses drops, manually edit the migration SQL — do not leave orphaned tables.

Apply migration (if user environment allows):

```bash
cd apps/server && bun run db:migrate
```

If migrate fails in your environment, still commit the migration file.

---

### TASK 11: Final verification

Run:

```bash
cd composes/restaurant/server && bun run typecheck
```

Grep checks — these should return **zero results**:

```bash
rg "rstCategories|rstItemVariants|rstItemAllergens|rstOrderHistory|rstBills|rstEquipment" composes/restaurant/
rg "from '../lib/db" composes/restaurant/
rg "lib/db.ts" composes/restaurant/
```

These should return **12+ results** (all routes using shared client):

```bash
rg "@db/client" composes/restaurant/server/src/
```

---

## 6. Files changed — complete list

| Action | Path |
|--------|------|
| DELETE | `composes/restaurant/server/src/lib/db.ts` |
| EDIT | `composes/restaurant/server/package.json` |
| EDIT | `composes/restaurant/server/src/db/schema/restaurant.ts` |
| EDIT | `composes/restaurant/server/src/index.ts` |
| EDIT | `apps/server/src/infra/db/schema/index.ts` |
| EDIT | `composes/restaurant/server/src/hooks/index.ts` |
| EDIT | `composes/restaurant/server/src/routes/menu.ts` |
| EDIT | `composes/restaurant/server/src/routes/orders.ts` |
| EDIT | `composes/restaurant/server/src/routes/billing.ts` |
| EDIT | `composes/restaurant/server/src/routes/equipment.ts` |
| EDIT | `composes/restaurant/server/src/routes/analytics.ts` |
| EDIT | `composes/restaurant/server/src/routes/staff.ts` |
| EDIT | `composes/restaurant/server/src/routes/reservations.ts` |
| EDIT | `composes/restaurant/server/src/routes/partners.ts` |
| EDIT | 7 other route files (Task 1 import swap only): aggregator, inventory, kots, partners (if not in task 9), reservations (task 9), staff (task 9), analytics (task 8) |
| ADD | `apps/server/src/infra/db/migrations/00XX_*.sql` (generated) |

**Do NOT edit:** `apps/server/src/infra/db/client.ts`, web compose, tests.

---

## 7. Review checklist (for Composer after your work)

Composer will verify:

- [ ] `lib/db.ts` deleted; no `../lib/db.js` imports remain
- [ ] All routes use `@db/client`
- [ ] Dropped 6 tables removed from schema + shell exports + index exports
- [ ] `menu.ts` uses `catCategories`, `catVariants`, meta allergens
- [ ] `orders.ts` uses `activities` for history
- [ ] `billing.ts` uses `transactions` type `bill`; payments use `transactionId`
- [ ] `equipment.ts` uses `catItems` type `asset`; logs use `itemId`
- [ ] Kept `rst_*` tables use `baseColumns` and no `.references()`
- [ ] Drizzle `relations()` defined for KOT, recipes, shifts, bill payments/splits
- [ ] `bun run typecheck` passes in restaurant server
- [ ] Migration file generated and drops old tables
- [ ] No new features added; API response shapes preserved via mapping helpers
- [ ] `@neondatabase/serverless` removed from restaurant package.json

---

## 8. Common mistakes — avoid these

1. **Forgetting to map API responses** — clients expect `mealPeriod`, `grandTotal`, `billNumber` etc. on responses even though data now lives in `meta`.
2. **Using string money on transactions** — `transactions.totalAmount` is integer cents, not `"12.50"` string.
3. **Forgetting `slug` on cat_categories / cat_items** — required fields with unique index per org.
4. **Leaving `.references()` on schema** — remove per CRM convention.
5. **Not updating shell `schema/index.ts`** — causes drizzle-kit and unified client to miss exports.
6. **Importing dropped symbols** — typecheck will fail if `rstBills` still imported anywhere.
7. **Changing route URLs or prefixes** — `/restaurants/menu/...` must stay the same.
8. **Running dev server** — do not.

---

## 9. Optional (only if time permits, not required)

- Remove duplicate restaurant path from `apps/server/drizzle.config.ts` line 11 (already in schema barrel)
- Switch menu item writes from mediator to direct `catItems` insert like LMS
- Add `isNull(deletedAt)` filters on all master table queries

---

**End of implementation plan. Execute Tasks 1–11 in order. Stop and fix typecheck errors between tasks.**
