# Phase 3 — Procurement (P2P)

## Flow

```
Vendor Registration → PR → PO → GRN → 3-Way Match → Vendor Invoice → Payment
```

---

## 3.1 Vendor Routes

**File:** `composes/erp/server/src/routes/procurement/vendors.ts`

> **MTA note:** Vendors are stored in the `parties` table with `type = "vendor"`. There is no `erp_vendors` table.
> - Read: `mediator.dispatch({ type: "party.listParties", filter: { type: "vendor", organizationId } })`
> - Create: `mediator.dispatch({ type: "party.createParty", data: { type: "vendor", ... } })` — `type: "vendor"` is set automatically by the route handler.

```
GET    /erp/vendors                    erp:vendor:read
POST   /erp/vendors                    erp:vendor:create
GET    /erp/vendors/:id                erp:vendor:read
PATCH  /erp/vendors/:id                erp:vendor:create
POST   /erp/vendors/:id/approve        erp:vendor:approve
POST   /erp/vendors/:id/blacklist      erp:vendor:approve
GET    /erp/vendors/:id/pos            erp:purchase-order:read
GET    /erp/vendors/:id/invoices       erp:invoice:read
```

**Create vendor body:**
```typescript
{
  name: string;
  // no code field — parties use slug derived from name
  type: "supplier" | "contractor" | "service-provider";  // stored in parties.meta.subType
  gstin?: string;        // validated: 15-char regex /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  pan?: string;          // 10-char regex
  contactEmail?: string;
  contactPhone?: string;
  currency?: string;
  paymentTerms?: string;
  bankDetails?: { accountNo: string; bankName: string; ifsc: string };
}
```

Approve: changes `status` → `active` via FSM. Guard: actor must have `erp:vendor:approve` permission.

---

## 3.2 Purchase Requisition Routes

**File:** `composes/erp/server/src/routes/procurement/purchase-requisitions.ts`

```
GET    /erp/purchase-requisitions              erp:purchase-req:read (own + team)
POST   /erp/purchase-requisitions              erp:purchase-req:create
GET    /erp/purchase-requisitions/:id          erp:purchase-req:read
PATCH  /erp/purchase-requisitions/:id          erp:purchase-req:create (draft only)
POST   /erp/purchase-requisitions/:id/submit   erp:purchase-req:create
POST   /erp/purchase-requisitions/:id/approve  erp:purchase-req:approve
POST   /erp/purchase-requisitions/:id/reject   erp:purchase-req:approve
POST   /erp/purchase-requisitions/:id/convert  erp:purchase-req:approve  ← converts to PO
```

**Create PR body:**
```typescript
{
  department: string;
  justification: string;
  requiredBy: string;  // ISO date
  items: Array<{
    itemId: string;
    qty: number;
    uom: string;
    estimatedUnitPrice?: number;
  }>;
}
```

Auto-generates `refNo`: `PR-{YYYY}-{seq}`.

Convert to PO: creates `erpPurchaseOrder` with items copied from PR, status `draft`. Returns new PO ID.

---

## 3.3 Purchase Order Routes

**File:** `composes/erp/server/src/routes/procurement/purchase-orders.ts`

> **MTA note:** POs are stored in the `transactions` table with `type = "purchase_order"`. PO line items are stored in `transaction_lines`. There is no `erp_purchase_orders` or `erp_purchase_order_items` table.
> - Create PO: `mediator.dispatch({ type: "commerce.createTransaction", data: { type: "purchase_order", partyId: vendorId, ... } })`
> - PO approval pipeline: `pipelines` + `pipeline_stages` with `entityType = "erp.po"`

```
GET    /erp/purchase-orders                     erp:purchase-order:read
POST   /erp/purchase-orders                     erp:purchase-order:create
GET    /erp/purchase-orders/:id                 erp:purchase-order:read
PATCH  /erp/purchase-orders/:id                 erp:purchase-order:create
POST   /erp/purchase-orders/:id/submit          erp:purchase-order:create
POST   /erp/purchase-orders/:id/approve         erp:purchase-order:approve
POST   /erp/purchase-orders/:id/reject          erp:purchase-order:approve
POST   /erp/purchase-orders/:id/send            erp:purchase-order:approve
POST   /erp/purchase-orders/:id/cancel          erp:purchase-order:approve
GET    /erp/purchase-orders/:id/grns            erp:goods-receipt:read
```

**Create PO body:**
```typescript
{
  vendorId: string;   // parties.id with type="vendor"
  prId?: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  currency?: string;
  deliveryAddress?: Address;
  items: Array<{
    itemId: string;
    qty: number;
    uom: string;
    unitPrice: number;
    discount?: number;
    hsn?: string;
    gstRate?: number;
  }>;
}
```

Server computes: `lineTotal = qty * unitPrice * (1 - discount/100)`. `subtotal` = sum of lineTotals. `taxAmount` = sum of (lineTotal * gstRate/100). `total = subtotal + taxAmount`.

Guard on approve: vendor must have `status = "active"`. Check `parties.status` (via `party.getParty`) before advancing FSM.

---

## 3.4 Goods Receipt Routes

**File:** `composes/erp/server/src/routes/procurement/goods-receipts.ts`

```
GET    /erp/goods-receipts             erp:goods-receipt:read
POST   /erp/goods-receipts             erp:goods-receipt:create
GET    /erp/goods-receipts/:id         erp:goods-receipt:read
POST   /erp/goods-receipts/:id/confirm erp:goods-receipt:approve
POST   /erp/goods-receipts/:id/quality erp:goods-receipt:approve
```

**Create GRN body:**
```typescript
{
  transactionId: string;  // transactions.id of the purchase_order
  locationId: string;     // locations.id with type="warehouse"
  items: Array<{
    poItemId: string;
    itemId: string;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty?: number;
    rejectionReason?: string;
    batchNo?: string;
    expiryDate?: string;
  }>;
}
```

Guard: `receivedQty` must not exceed `PO item qty - already received qty` (no over-receipt rule).

On confirm:
1. Create `erpStockEntry` (type: `receipt`) + `erpStockEntryItem` for each accepted item
2. Call `mediator.dispatch({ type: "inventory.receive", ... })` per item
3. Create `erpStockLedger` entries
4. Emit `grn.confirmed` event → triggers Phase 10 hook

---

## 3.5 Vendor Invoice Routes

**File:** `composes/erp/server/src/routes/procurement/vendor-invoices.ts`

> **MTA note:** Vendor invoices are stored in the `transactions` table with `type = "invoice"` and `meta.subType = "vendor_invoice"` and `meta.direction = "inbound"`. Line items go in `transaction_lines`. There is no `erp_vendor_invoices` table.

```
GET    /erp/vendor-invoices                       erp:invoice:read
POST   /erp/vendor-invoices                       erp:invoice:create
GET    /erp/vendor-invoices/:id                   erp:invoice:read
POST   /erp/vendor-invoices/:id/approve           erp:invoice:approve
POST   /erp/vendor-invoices/:id/dispute           erp:invoice:approve
POST   /erp/vendor-invoices/:id/match             erp:invoice:approve  ← trigger 3-way match
```

**3-Way Match logic** (run on `/match`):
```typescript
async function perform3WayMatch(invoiceId: string, db: DB): Promise<MatchResult> {
  // invoice, po = transactions rows; grn = erp_grns row
  const invoice = await db.select().from(transactions).where(eq(transactions.id, invoiceId));
  const po = await db.select().from(transactions).where(eq(transactions.id, invoice.meta.poTransactionId));
  const grn = await db.select().from(erpGoodsReceipt).where(eq(erpGoodsReceipt.id, invoice.grnId));

  const checks = {
    priceMatch: Math.abs(invoice.total - po.total) / po.total <= INVOICE_TOLERANCE_PCT,
    qtyMatch: grn.items.every(i => i.acceptedQty >= invoice.items.find(ii => ii.itemId === i.itemId)?.qty),
    vendorMatch: invoice.vendorId === po.vendorId,
  };

  if (Object.values(checks).every(Boolean)) {
    await updateInvoiceStatus(invoiceId, "3way-matched");
    emit("invoice.3way-matched", { invoiceId });
  }
  return checks;
}
```

---

## 3.6 Payment Voucher Routes

**File:** `composes/erp/server/src/routes/procurement/payments.ts`

> **MTA note:** Payments are stored in the `transactions` table. Outgoing payments (to vendors) use `type = "payment"`. Incoming receipts (from customers) use `type = "receipt"`.

```
GET    /erp/payment-vouchers           erp:invoice:read
POST   /erp/payment-vouchers           erp:invoice:pay
GET    /erp/payment-vouchers/:id       erp:invoice:read
```

**Create payment body:**
```typescript
{
  type: "pay";
  partyType: "vendor";
  partyId: string;     // vendor ID
  invoiceId: string;   // vendor invoice being paid
  amount: number;
  currency: string;
  date: string;
  mode: "bank" | "cash" | "cheque" | "upi";
  reference?: string;  // UTR / cheque number
  bankAccountId: string;
}
```

On create (approved):
1. Create `erpPaymentVoucher`
2. Create `erpJournalEntry` — Dr: Accounts Payable, Cr: Bank Account
3. Update `erpVendorInvoice.paidAmount` += amount
4. If fully paid: advance invoice FSM to `paid`
5. Emit `invoice.paid` event

---

## 3.7 Vendor Portal Routes (P1)

```
GET    /erp/vendor/pos              ← POs issued to authenticated vendor
POST   /erp/vendor/invoices         ← vendor submits invoice
GET    /erp/vendor/invoices         ← vendor's own invoices
GET    /erp/vendor/payments         ← payment history
```

Vendor auth: separate token issued at `/erp/vendor/auth/login` (vendor email + password). Stored in `erp_vendors.contactEmail` + bcrypt hash.
