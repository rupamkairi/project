# Phase 18 — Web: Manufacturing

---

## 18.1 BomsPage

Columns: BOM ID | Item | Version | Output Qty | UoM | Status | Actions

Filter: by item (search).

**CreateBOMDialog:**
- Finished good item selector
- Version (auto-incremented)
- Output quantity + UoM
- Operating cost (labor + overhead)
- Raw materials table:
  - Item dropdown (raw material / consumable only)
  - Qty
  - UoM
  - Source warehouse
  - Scrap % (waste factor)
  - `+Add Material` button

---

## 18.2 BomDetailPage

Tabs: Materials | BOM Explosion | Work Orders

**Materials tab:** raw materials list with qty per output unit.

**BOM Explosion tab:**

Input: quantity to produce.
Shows full recursive material requirement:

```
BOM Explosion for: Finished Widget × 100 units

Item            | Level | Required Qty | On Hand | Shortfall | Warehouse
Steel Tube      |   1   |   50 Kg      |  80 Kg  |    —      | WH-MAIN
Assembly Kit    |   1   |  100 Nos     |  60 Nos | 40 Nos    | WH-MAIN
  Bolt M8       |   2   | 400 Nos      | 600 Nos |    —      | WH-MAIN
  Bracket       |   2   | 100 Nos      |  30 Nos | 70 Nos    | WH-MAIN
```

Red highlight on shortfall rows.

**Work Orders tab:** list of work orders using this BOM.

---

## 18.3 WorkOrdersPage

Columns: WO No | Item | BOM | Qty | Planned Start | Status | Actions

Status badges: draft | submitted | in-process | completed | cancelled.

Filter: status, date range.

**CreateWODialog:**
- BOM selector (shows item auto-filled)
- Quantity to produce
- Target warehouse
- Planned start date
- Notes

---

## 18.4 WorkOrderDetailPage

Header:
```
WO-2024-001                              [Start] [Complete] [Cancel]
Item: Finished Widget            Status: submitted
BOM: v2 (100 units)    Qty: 50   Planned: 20 Jun 2024
```

Tabs: Materials | Progress | Journal Entries

**Materials tab:**

Shows what will be consumed:
```
Raw Material  | Required Qty | Available | Status
Steel Tube    |   25 Kg      |  80 Kg    | ✅ Available
Assembly Kit  |   50 Nos     |  60 Nos   | ✅ Available
Bracket       |   50 Nos     |  30 Nos   | ❌ Shortfall: 20 Nos
```

"Start" button disabled if any material has shortfall (unless override with manager perm).

**Progress tab:**
- Actual start time
- Produced qty input (on complete)
- Completion notes

**Journal Entries tab:** linked JEs posted when started / completed.

---

## 18.5 ProductionDashboardPage

KPI cards row:
```
Open WOs: 12     In-Process: 5     Completed This Month: 28     Overdue: 3
```

Material Shortages table (items needed but not available):
```
WO-2024-045 | Bracket M10 | Required: 100 | Available: 30 | Shortage: 70
```
"Create PR" quick action button per shortfall row — pre-fills PR with item + qty.

Top Items Produced chart (recharts BarChart): item name on X, qty completed on Y.

Work Order timeline (gantt-style): planned vs actual dates for open WOs.
