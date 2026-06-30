# Phase 6 — Billing & Settlement

---

## 6.1 Billing Routes

```
POST   /restaurant/bills                         rst:cashier
GET    /restaurant/bills/:id                     rst:cashier
POST   /restaurant/bills/:id/print               rst:cashier
POST   /restaurant/bills/:id/settle              rst:cashier
POST   /restaurant/bills/:id/void                rst:manager
POST   /restaurant/bills/split                   rst:cashier
GET    /restaurant/shifts                        rst:manager
POST   /restaurant/shifts                        rst:cashier
POST   /restaurant/shifts/:id/close              rst:cashier
POST   /restaurant/shifts/:id/approve            rst:manager
```

---

## 6.2 Create Bill

`POST /restaurant/bills`

Body: `{ orderId: string }`

Guards:
1. Order `status = 'ready' | 'served' | 'completed'`
2. No existing non-voided bill for this order

Bill number: `BILL-{OUTLET_CODE}-{SHIFT_SEQ}` — sequential within shift.

On create:
```typescript
const order = await getOrderWithItems(orderId);

const subtotal = order.items.reduce((sum, i) => sum + (parseFloat(i.unitPrice) * i.qty), 0);
const discount = parseFloat(order.discount);
const taxableAmount = subtotal - discount;

// Per-item tax computation (items may have different taxPct)
const tax = order.items.reduce((sum, i) => {
  const itemSubtotal = parseFloat(i.unitPrice) * i.qty;
  const menuItem = await getMenuItem(i.menuItemId);
  return sum + (itemSubtotal * parseFloat(menuItem.taxPct) / 100);
}, 0);

const serviceCharge = orgConfig.serviceChargePct
  ? taxableAmount * (orgConfig.serviceChargePct / 100)
  : 0;

const total = taxableAmount + tax + serviceCharge + parseFloat(order.deliveryFee);

// Bills are transactions (type="bill") linked to the order transaction
const openStage = await getStageByName(orgId, "rst.order", "Placed");  // use appropriate bill open stage
await mediator.send({
  type: "commerce.createTransaction",
  payload: {
    type: "bill",
    organizationId: orgId,
    stageId: openStage.id,
    meta: {
      orderId,
      outletId: order.meta?.outletId,
      billNumber,
      subtotal: subtotal.toString(),
      discount: discount.toString(),
      tax: tax.toString(),
      serviceCharge: serviceCharge.toString(),
      total: total.toString(),
      payments: [],
    },
  },
});
```

---

## 6.3 Settle Bill

`POST /restaurant/bills/:id/settle`

Body:
```typescript
{
  payments: {
    method: "cash" | "card" | "upi" | "voucher" | "wallet";
    amount: number;
    reference?: string;
  }[];
  roundOff?: number;  // for cash rounding
}
```

**Split-payment validation:**
```typescript
const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + (roundOff ?? 0);
const tolerance = 0.01;  // 1 paisa tolerance
if (Math.abs(totalPaid - parseFloat(bill.total)) > tolerance) {
  throw new ConflictError("PAYMENT_MISMATCH", `Payments total ${totalPaid} does not match bill ${bill.total}`);
}
```

On settle:
1. `bill.payments = payments`
2. `bill.status → 'settled'`, `settledAt = now()`
3. `order.paymentStatus → 'paid'`, `order.paymentMethod = payments[0].method`
4. If dine-in: `table.status → 'dirty'`
5. Emit `rst.order.settled`
6. `mediator.dispatch({ type: "accounting.postRevenue", amount: bill.subtotal, tax: bill.tax, outletId })` if accounting enabled
7. Update shift: `shift.cashSales += cash payment amounts`

---

## 6.4 Split Bill

`POST /restaurant/bills/split`

Body:
```typescript
{
  orderId: string;
  splits: {
    guestLabel: string;   // "Guest 1", "Seat 3", etc.
    itemIds: string[];    // order item ids for this split
  }[];
}
```

Guards:
1. Order not yet settled
2. Every order item appears in exactly one split (no item left unassigned, no duplicates)
3. No item appears in multiple splits

```typescript
// Validate all items assigned exactly once
const allItemIds = splits.flatMap(s => s.itemIds);
const uniqueItemIds = new Set(allItemIds);
if (uniqueItemIds.size !== allItemIds.length) {
  throw new ConflictError("DUPLICATE_ITEM_IN_SPLIT", "Item appears in multiple splits");
}
const orderItemIds = order.items.map(i => i.id);
const unassigned = orderItemIds.filter(id => !uniqueItemIds.has(id));
if (unassigned.length > 0) {
  throw new ConflictError("UNASSIGNED_ITEMS", `Items not assigned to any split: ${unassigned.join(", ")}`);
}
```

Creates one bill per split. Sets `bill.splitWith = [otherBillIds]` on each.

---

## 6.5 Void Bill

`POST /restaurant/bills/:id/void`

Body: `{ reason: string }` — required.

Guard:
1. Role = `rst:manager`
2. Bill `status = 'open' | 'printed'` (cannot void settled bill)

If order has no other bills: order reverts to `serving` status.

---

## 6.6 Bill FSM

```
open ──[bill.print]──► printed
  entry: printedAt = now()

printed ──[bill.settle]──► settled
  guard: payments total = bill.total ± 0.01
  entry: table → dirty, order → settled

open ──[bill.void]──► voided      (manager only)
printed ──[bill.void]──► voided   (manager only)
```

---

## 6.7 Shift Management

**Open shift:**

`POST /restaurant/shifts`

Body: `{ outletId: string; openingBalance: number }`

Guard: no existing open shift for this cashier + outlet.

**Close shift:**

`POST /restaurant/shifts/:id/close`

Body:
```typescript
{
  closingBalance: number;  // physical cash count
}
```

Guards:
1. No open bills for this shift
2. No pending orders without bills

```typescript
// Compute expected balance
const cashOrders = await getCashSettlementsForShift(shiftId);
const expectedBalance = parseFloat(shift.openingBalance) + cashOrders;
const variance = closingBalance - expectedBalance;

await db.update(rstShifts).set({
  endedAt: new Date(),
  closingBalance: closingBalance.toString(),
  expectedBalance: expectedBalance.toString(),
  variance: variance.toString(),
  status: Math.abs(variance) > orgConfig.varianceThreshold ? "variance-flagged" : "closing",
}).where(eq(rstShifts.id, shiftId));
```

**Approve shift** (manager):

`POST /restaurant/shifts/:id/approve`

Guard: shift `status = 'closing' | 'variance-flagged'`

Sets `status = 'closed'`, `approvedBy = actorId`.

---

## 6.8 Shift FSM

```
open ──[shift.close]──► closing | variance-flagged
  guard: no open bills, no pending orders
  side-effect: compute variance

closing ──[shift.approve]──► closed
variance-flagged ──[shift.approve]──► closed  (manager acknowledges variance)
```
