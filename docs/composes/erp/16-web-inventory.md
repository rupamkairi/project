# Phase 16 — Web: Inventory

> **MTA:** Items come from `cat_items` table (type in `product`, `stock_item`, `asset`). Warehouses come from `locations` table (`type="warehouse"`). The API routes (`/erp/items`, `/erp/warehouses`) are unchanged on the client side.

---

## 16.1 ItemsPage

Columns: Item Code | Name | Type | UoM | Valuation | Reorder Level | Actions

Filter: item type (raw material / finished / service / consumable), search by name/code.

**CreateItemDialog fields:**
- Item code (auto-generated or manual)
- Name (required)
- Description
- Item type: raw-material | finished-good | service | consumable
- UoM (unit of measure): Nos / Kg / L / Box / Pcs / m
- HSN code (6-digit)
- Valuation method: FIFO | moving-average
- Standard rate (purchase)
- Selling rate
- Reorder level, reorder qty
- Lead time (days)
- Default warehouse
- GST template (purchase), GST template (sales)
- Is serialized (toggle)

**ItemDetailPage** tabs: Overview | Stock Ledger | BOM | Transactions

Overview tab: item card with all fields, current stock summary by warehouse.

Stock Ledger tab: table of all stock movements for this item.
Columns: Date | Reference | Type | Qty In | Qty Out | Balance | Warehouse | Valuation Rate

---

## 16.2 WarehousesPage

Columns: Code | Name | Type | Location | Is Default | Status | Actions

**CreateWarehouseDialog:**
- Code (e.g. WH-MAIN, WH-QC)
- Name
- Type: store | transit | virtual
- Location (address)
- Is default (toggle)
- Parent warehouse (for nested structure)

---

## 16.3 StockSummaryPage

**File:** `pages/inventory/StockSummaryPage.tsx`

Top section: filter by warehouse, item group.

Table:
```
Item Code | Item Name | Warehouse | Qty | UoM | Valuation Rate | Total Value
----------|-----------|-----------|-----|-----|----------------|------------
ITM-001   | Steel Rod | WH-MAIN   | 500 | Kg  | ₹ 85.00        | ₹ 42,500
```

Bottom: total inventory value card.

Reorder alerts: tab showing items below reorder level with suggested order qty.

---

## 16.4 StockEntryPage

**File:** `pages/inventory/StockEntryPage.tsx`

Form to create a manual stock entry.

```typescript
// Entry types:
// receipt     — purchase receipt (no PO)
// issue       — material issue for consumption
// transfer    — move between warehouses
// adjustment  — physical count correction
```

Fields:
- Entry type (dropdown)
- Date
- Reference (optional)
- Items table:
  - Item dropdown
  - For transfer: Source warehouse + Target warehouse
  - For receipt/adjustment: Warehouse
  - Qty
  - Valuation rate (auto-filled from item, editable)
  - Remarks per row

For `transfer` type: shows "From" + "To" warehouse columns.
For `adjustment`: shows "New Balance" column, computes difference.

Preview before submit: shows net stock impact per item per warehouse.

---

## 16.5 StockMovementsPage

Date range filter + item filter + warehouse filter.

Timeline view: each stock entry as a card.

Export button: exports as CSV (date, item, type, qty, warehouse, ref).
