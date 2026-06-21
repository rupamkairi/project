# Phase 14 — Admin: Products & Categories

---

## Products List — `routes/products/index.tsx`

```
┌─ PageHeader "Products" ───────────────── [+ New Product] ─┐
├─ Filters: Status (All|Draft|Published|Archived) | Category ┤
├─ Search input ──────────────────────────────────────────────┤
├─ Table ─────────────────────────────────────────────────────┤
│  Title | Handle | Category | Status | Variants | Updated   │
│  ──────────────────────────────────────────────────────────│
│  Sneaker X   sneaker-x   Footwear   Published   3   2d ago  │
│  [Edit] [Archive] [Delete]                                   │
└─────────────────────────────────────────────────────────────┘
```

Data: `ecommerceAdminApi.getProducts({ status, categoryId, q, page })`

Status badge colors:
- `draft` → `bg-zinc-100 text-zinc-600`
- `published` → `bg-green-100 text-green-700`
- `archived` → `bg-red-100 text-red-600`

Row actions:
- Edit → opens Edit Product dialog (same as Create, pre-filled)
- Archive → `ecommerceAdminApi.archiveProduct(id)` → confirm dialog
- Delete → confirm dialog → `ecommerceAdminApi.deleteProduct(id)`

Pagination: `{ page, pageSize: 20, total }` from API response.

---

## Create / Edit Product Dialog

Fields:
```
title*          text input
handle*         text input (auto-generated from title, editable)
description     Textarea
categoryId      Select (loaded from getCategories())
status          Select: draft | published | archived
weight          number (grams)
tags            TagInput (comma-separated)
```

On submit: `ecommerceAdminApi.createProduct(body)` or `updateProduct(id, body)`

After create: redirect to product detail page to add variants.

---

## Product Detail — `routes/products/detail.tsx`

```
┌─ [← Products]  "Sneaker X"  [Published badge]  [Edit] [Archive] ─┐
│  handle: sneaker-x | Category: Footwear | Weight: 500g             │
├─ Tabs: Overview | Variants | Media ────────────────────────────────┤
│                                                                     │
│  Overview tab:                                                      │
│    Description block                                                │
│    Tags chips                                                       │
│    Category link                                                    │
│                                                                     │
│  Variants tab:                                                      │
│    [+ Add Variant]                                                  │
│    Table: SKU | Options | Price | Compare-at | Stock | Status      │
│    Row actions: Edit | Delete                                       │
│                                                                     │
│  Media tab (placeholder):                                           │
│    Image upload grid (P1 — requires storage plugin)                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Variants Tab — Inline

Data: `ecommerceAdminApi.getVariants(productId)`

### Variant table columns

| Column | Source |
|--------|--------|
| SKU | `variant.sku` |
| Options | JSON display: `{ color: "Red", size: "M" }` → `Red / M` |
| Price | `formatCurrency(variant.price)` |
| Compare-at | `formatCurrency(variant.compareAtPrice)` (strikethrough if set) |
| Stock | `variant.stockQty` with color: red if <5 |
| Status | `published | draft` badge |

### Create/Edit Variant Dialog

```
sku*            text
price*          number (cents, display as decimal)
compareAtPrice  number (optional)
stockQty*       number
options         key-value pairs (e.g. color=Red, size=M)
status          select: draft | published
```

On save: `ecommerceAdminApi.createVariant(productId, body)` or `updateVariant(productId, variantId, body)`

Stock warning: if `stockQty < 5`, show amber badge "Low stock". If `0`, show red badge "Out of stock".

---

## Categories — `routes/categories/index.tsx`

```
┌─ PageHeader "Categories" ────────────── [+ New Category] ─┐
├─ Table ────────────────────────────────────────────────────┤
│  Name | Slug | Parent | Products | Actions                  │
│  ────────────────────────────────────────────────────────  │
│  Footwear     footwear    —          12     [Edit][Delete]  │
│  ↳ Sneakers   sneakers    Footwear   5      [Edit][Delete]  │
└────────────────────────────────────────────────────────────┘
```

Data: `ecommerceAdminApi.getCategories()` — returns flat list, client renders tree via `parentId`.

Tree rendering: indent rows by depth (check if `parentId` exists in same response).
Max depth: 2 levels.

### Create/Edit Category Dialog

```
name*       text
slug*       text (auto-generated from name)
parentId    Select — shows top-level categories + "None" option
description Textarea (optional)
```

Delete: only allowed if no child categories and no products linked. Show error if blocked.

---

## Stores

**`stores/products.ts`** — Zustand for product list + filter state:
```typescript
interface ProductStore {
  products: EcoProduct[];
  filters: { status?: string; categoryId?: string; q?: string; page: number };
  total: number;
  loading: boolean;
  fetchProducts: (filters?: Partial<ProductStore["filters"]>) => Promise<void>;
  setFilter: (key: string, value: any) => void;
}
```

---

## Checks

- Products table renders with status badges
- Create product dialog validates required fields
- After create, detail page shows empty variants tab with "+ Add Variant" button
- Add variant dialog saves and variant appears in table
- Low stock badge shows red when stockQty < 5
- Categories table shows parent-child indentation
