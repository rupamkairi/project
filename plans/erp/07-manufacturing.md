# Phase 7 — Manufacturing

---

## 7.1 BOM Routes

```
GET    /erp/boms                    erp:inventory:read
POST   /erp/boms                    erp:operations-manager (permission: erp:inventory:adjust)
GET    /erp/boms/:id                erp:inventory:read
PATCH  /erp/boms/:id                erp:inventory:adjust
POST   /erp/boms/:id/activate       erp:inventory:adjust   ← set as default BOM for item
GET    /erp/boms/by-item/:itemId    erp:inventory:read
```

**Create BOM body:**
```typescript
{
  itemId: string;           // finished good item ID
  version?: number;         // auto-increments if not provided
  quantity: number;         // output quantity this BOM produces
  uom: string;
  operatingCost?: number;
  items: Array<{
    itemId: string;         // raw material
    qty: number;
    uom: string;
    warehouseId?: string;   // source warehouse
    scrapPct?: number;      // waste factor (e.g. 5 = 5% extra consumed)
  }>;
}
```

BOM explosion: `GET /erp/boms/:id/explode?quantity=N` — returns full material requirement list including sub-BOM items (recursive, max depth 5). Useful for production planning.

---

## 7.2 Work Order Routes

```
GET    /erp/work-orders             erp:inventory:read
POST   /erp/work-orders             erp:inventory:adjust
GET    /erp/work-orders/:id         erp:inventory:read
POST   /erp/work-orders/:id/start   erp:inventory:adjust
POST   /erp/work-orders/:id/complete erp:inventory:adjust
POST   /erp/work-orders/:id/cancel  erp:inventory:adjust
```

**Create Work Order body:**
```typescript
{
  bomId: string;
  quantity: number;
  warehouseId: string;    // target warehouse for finished goods
  plannedStart?: string;  // ISO date
}
```

Auto-sets `itemId` from BOM. Auto-generates `woNumber`: `WO-{YYYY}-{seq}`.

---

## 7.3 Work Order Lifecycle

**Start (`/start`):**
1. Validate status is `submitted`
2. Check all raw materials available in source warehouses (BOM items × quantity)
3. Create `erpStockEntry` (type: `manufacture`, direction: raw material issue)
4. Deduct each raw material from source warehouse
5. Set `actualStart = now`, status → `in-process`

**Complete (`/complete`):**

Body: `{ producedQty: number }`

1. Validate `producedQty <= workOrder.quantity`
2. Create `erpStockEntry` (type: `manufacture`, direction: finished good receipt)
3. Receive `producedQty` units of finished item into target warehouse
4. Valuation rate of finished good = (total raw material cost + operatingCost) / producedQty
5. Post journal entry: Dr Finished Goods Inventory, Cr WIP/Raw Material accounts
6. Set `actualEnd = now`, `producedQty`, status → `completed`
7. Emit `work-order.completed`

If `producedQty < quantity`: partial completion — mark `completed` with actual produced. Remainder either re-queued as new WO or written off.

---

## 7.4 Production Dashboard Data

```
GET    /erp/manufacturing/dashboard   erp:inventory:read
returns:
{
  openWorkOrders: number,
  inProcessWorkOrders: number,
  completedThisMonth: number,
  overdueWorkOrders: number,    // plannedStart passed but not started
  topItems: [{ itemName, orderedQty, completedQty }],
  materialShortages: [{ itemId, itemName, required, available, shortage }]
}
```

Material shortages: for all `in-process` WOs, calculate what's needed vs current stock.
