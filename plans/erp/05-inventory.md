# Phase 5 — Inventory

---

## 5.1 Item Routes

> **MTA note:** Items are in the `cat_items` table with `type` in `('product', 'stock_item', 'asset')`. There is no `erp_items` table.
> - Read: `mediator.dispatch({ type: "catalog.getItem", itemId })` or direct Drizzle on `cat_items` filtered by type.

```
GET    /erp/items                   erp:inventory:read
POST   /erp/items                   erp:inventory:read (any ERP user can create items)
GET    /erp/items/:id               erp:inventory:read
PATCH  /erp/items/:id               erp:inventory:read
GET    /erp/items/:id/stock         erp:inventory:read   ← stock by warehouse
GET    /erp/items/reorder           erp:inventory:read   ← items below reorder qty
```

**Create item body:**
```typescript
{
  code: string;
  name: string;
  description?: string;
  type: "stock" | "service" | "asset";
  uom: string;
  valuationMethod?: "FIFO" | "moving-average";
  hsn?: string;
  gstRate?: number;
  reorderQty?: number;
  leadTimeDays?: number;
}
```

---

## 5.2 Warehouse Routes

> **MTA note:** Warehouses are in the `locations` table with `type = "warehouse"`. There is no `erp_warehouses` table.
> - Read: direct Drizzle on `locations` filtered by `type = "warehouse"`.

```
GET    /erp/warehouses              erp:inventory:read
POST   /erp/warehouses              erp:warehouse-manager (permission: erp:inventory:transfer)
GET    /erp/warehouses/:id          erp:inventory:read
GET    /erp/warehouses/:id/stock    erp:inventory:read   ← all items in this warehouse
```

---

## 5.3 Stock Entry Routes

```
GET    /erp/stock-entries           erp:inventory:read
POST   /erp/stock-entries           erp:inventory:adjust  (manual entries only — GRN/DN create auto)
GET    /erp/stock-entries/:id       erp:inventory:read
```

Manual stock entry types:
- `transfer` — move items between warehouses
- `adjustment` — correct discrepancies (requires erp:inventory:adjust)

GRN creates `receipt` entries (Phase 3). DN creates `issue` entries (Phase 4). WO creates `manufacture` entries (Phase 7).

---

## 5.4 Stock Summary

```
GET    /erp/inventory/stock-summary         erp:inventory:read
  query: ?warehouseId=&itemId=&belowReorder=true
  returns: [{ itemId, itemName, warehouseId, warehouseName, balance, valuationRate, stockValue }]

GET    /erp/inventory/movements             erp:inventory:read
  query: ?itemId=&warehouseId=&from=&to=&page=
  returns: stock ledger entries with running balance
```

---

## 5.5 Valuation Methods

**FIFO (First In, First Out):**
- Each `receipt` entry creates a cost layer: `{ qty, rate, date }`
- `issue` entries consume layers in order of receipt date
- `valuationRate` of an issue = weighted average of consumed layers

**Moving Average:**
- `valuationRate` after receipt = `(oldStock * oldRate + receivedQty * receivedRate) / (oldStock + receivedQty)`
- All subsequent issues use the updated moving average rate

Both methods write to `erpStockLedger` with `valuationRate` per entry.

---

## 5.6 Stock Ledger Logic

On every stock movement, insert an `erpStockLedger` row:

```typescript
async function postStockLedger(db: DB, {
  itemId, locationId, date, qty, valuationRate, entryId
  // itemId = cat_items.id; locationId = locations.id (type="warehouse")
}: StockLedgerPost) {
  // Get previous balance
  const prev = await db.select({ balance: erpStockLedger.balance })
    .from(erpStockLedger)
    .where(and(
      eq(erpStockLedger.itemId, itemId),
      eq(erpStockLedger.locationId, locationId),
    ))
    .orderBy(desc(erpStockLedger.date))
    .limit(1);

  const prevBalance = prev[0]?.balance ?? 0;
  const newBalance = Number(prevBalance) + qty;  // qty is negative for issues

  if (newBalance < 0 && !ALLOW_NEGATIVE_STOCK) {
    throw new BusinessError(`Insufficient stock for item ${itemId} in location ${locationId}`);
  }

  await db.insert(erpStockLedger).values({
    itemId, locationId, date, qty,
    valuationRate, stockValue: qty * valuationRate,
    balance: newBalance,
    entryId,
  });
}
```

---

## 5.7 Reorder Alert

Scheduled job (every 6h): query items where `balance < reorderQty` across all warehouses. For each:
1. Check if an open PR already exists for this item
2. If not: emit `inventory.reorder-alert` event
3. If `autoCreatePr` config enabled: auto-create a draft PR
