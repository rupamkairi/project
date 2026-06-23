# Phase 4 — Sales (O2C)

## Flow

```
Customer Master → Quotation → Sales Order → Delivery Note → Sales Invoice → Payment Receipt
```

---

## 4.1 Customer Routes

> **MTA note:** Customers are stored in the `parties` table with `type = "customer"`. There is no `erp_customers` table.
> - Read: `mediator.dispatch({ type: "party.listParties", filter: { type: "customer" } })`
> - Create: `mediator.dispatch({ type: "party.createParty", data: { type: "customer", ... } })` — `type: "customer"` is set automatically by the route handler.

```
GET    /erp/customers                erp:sales-order:read
POST   /erp/customers                erp:sales-order:create
GET    /erp/customers/:id            erp:sales-order:read
PATCH  /erp/customers/:id            erp:sales-order:create
GET    /erp/customers/:id/orders     erp:sales-order:read
GET    /erp/customers/:id/invoices   erp:invoice:read
GET    /erp/customers/:id/ledger     erp:ledger:read   ← customer outstanding + history
```

**Create customer body:**
```typescript
{
  name: string;
  code: string;
  gstin?: string;
  pan?: string;
  contactEmail?: string;
  contactPhone?: string;
  currency?: string;
  paymentTerms?: string;
  creditLimit?: number;
  billingAddress?: Address;
}
```

---

## 4.2 Quotation Routes

> **MTA note:** Quotations are stored in the `transactions` table with `type = "quote"`. Line items go in `transaction_lines`.

```
GET    /erp/quotations               erp:sales-order:read
POST   /erp/quotations               erp:sales-order:create
GET    /erp/quotations/:id           erp:sales-order:read
PATCH  /erp/quotations/:id           erp:sales-order:create
POST   /erp/quotations/:id/submit    erp:sales-order:create
POST   /erp/quotations/:id/convert   erp:sales-order:create  ← convert to SO
```

**Create quotation body:** same item structure as PO. Computes subtotal + GST.

Convert to SO: creates `erpSalesOrder` with items from quotation. Returns SO ID.

---

## 4.3 Sales Order Routes

> **MTA note:** Sales orders are stored in the `transactions` table with `type = "sales_order"`. Line items go in `transaction_lines`. SO approval pipeline: `pipelines` + `pipeline_stages` with `entityType = "erp.so"`.

```
GET    /erp/sales-orders             erp:sales-order:read
POST   /erp/sales-orders             erp:sales-order:create
GET    /erp/sales-orders/:id         erp:sales-order:read
PATCH  /erp/sales-orders/:id         erp:sales-order:create
POST   /erp/sales-orders/:id/confirm erp:sales-order:create
POST   /erp/sales-orders/:id/cancel  erp:sales-order:approve
GET    /erp/sales-orders/:id/delivery-notes  erp:sales-order:read
GET    /erp/sales-orders/:id/invoices        erp:invoice:read
```

On confirm:
1. Check customer credit limit — `outstandingBalance + SO.total <= creditLimit` or `creditLimit === 0` (unlimited)
2. If exceeded: reject with `"Credit limit exceeded"` or route to approval
3. Reserve inventory via `mediator.dispatch({ type: "inventory.reserve", ... })` per item

---

## 4.4 Delivery Note Routes

```
GET    /erp/delivery-notes             erp:goods-receipt:read  (reuse permission — warehouse access)
POST   /erp/delivery-notes             erp:goods-receipt:create
GET    /erp/delivery-notes/:id         erp:goods-receipt:read
POST   /erp/delivery-notes/:id/submit  erp:goods-receipt:approve
POST   /erp/delivery-notes/:id/cancel  erp:goods-receipt:approve
```

**Create DN body:**
```typescript
{
  soId: string;        // transactions.id of the sales_order
  locationId: string;  // locations.id with type="warehouse" (replaces warehouseId)
  date: string;
  shippingAddress?: Address;
  items: Array<{
    soItemId: string;
    itemId: string;
    qty: number;
    uom: string;
    batchNo?: string;
  }>;
}
```

Guard: sum of `qty` per `soItemId` must not exceed `soItem.qty - soItem.deliveredQty`.

On submit:
1. Create `erpStockEntry` (type: `issue`) per item
2. Call `mediator.dispatch({ type: "inventory.deduct", ... })`
3. Update `erpSoItem.deliveredQty` += qty per item
4. If all items fully delivered: advance SO FSM to `fully-delivered`
5. Emit `delivery.submitted` event

---

## 4.5 Sales Invoice Routes

> **MTA note:** Sales invoices are stored in the `transactions` table with `type = "invoice"` and `meta.direction = "outbound"`. Line items go in `transaction_lines`. There is no `erp_sales_invoices` table.

```
GET    /erp/sales-invoices                     erp:invoice:read
POST   /erp/sales-invoices                     erp:invoice:create
GET    /erp/sales-invoices/:id                 erp:invoice:read
POST   /erp/sales-invoices/:id/submit          erp:invoice:create
POST   /erp/sales-invoices/:id/generate-irn   erp:invoice:create  ← e-Invoice IRN (India)
POST   /erp/sales-invoices/:id/cancel          erp:invoice:approve
GET    /erp/sales-invoices/:id/pdf             erp:invoice:read
```

**Create SI body:**
```typescript
{
  customerId: string;
  soId?: string;
  dnId?: string;
  date: string;
  dueDate?: string;
  currency?: string;
  items: Array<{
    itemId: string;
    qty: number;
    uom: string;
    unitPrice: number;
    discount?: number;
    hsn: string;
    gstRate: number;  // total GST rate (e.g. 18 = 9% CGST + 9% SGST, or 18% IGST)
  }>;
}
```

**GST computation on submit:**
```typescript
function computeGst(orgGstin: string, customerGstin: string, lineTotal: number, gstRate: number) {
  const orgState = orgGstin.substring(0, 2);
  const customerState = customerGstin?.substring(0, 2);
  const isIntraState = orgState === customerState;

  if (isIntraState) {
    const half = (lineTotal * gstRate / 100) / 2;
    return { cgst: half, sgst: half, igst: 0 };
  } else {
    return { cgst: 0, sgst: 0, igst: lineTotal * gstRate / 100 };
  }
}
```

On submit:
1. Compute CGST/SGST/IGST per line item
2. Create `erpJournalEntry` — Dr: Accounts Receivable (customer), Cr: Revenue + CGST/SGST/IGST payable accounts
3. Update `erpSoItem.invoicedQty` per item
4. Update `erpCustomer.outstandingBalance` += SI total
5. Emit `sales-invoice.submitted`

**Generate IRN** (e-Invoice for B2B):
```typescript
async function generateIRN(siId: string) {
  const si = await fetchSalesInvoice(siId);
  const payload = buildIRNPayload(si);  // format per GST IRP spec
  const response = await fetch(process.env.GST_IRP_URL!, {
    method: "POST",
    headers: { "user_name": process.env.GST_USERNAME!, "password": process.env.GST_PASSWORD! },
    body: JSON.stringify(payload),
  });
  const { Irn, SignedQRCode } = await response.json();
  await db.update(erpSalesInvoice).set({ irn: Irn, signedQr: SignedQRCode }).where(eq(erpSalesInvoice.id, siId));
}
```

---

## 4.6 Payment Receipt Routes

```
POST   /erp/payment-vouchers        erp:invoice:pay  (shared with procurement — type: "receive")
```

**Create payment receipt body:**
```typescript
{
  type: "receive";
  partyType: "customer";
  partyId: string;    // customer ID
  invoiceId: string;  // sales invoice being paid
  amount: number;
  date: string;
  mode: string;
  reference?: string;
  bankAccountId: string;
}
```

On create:
1. Create `erpPaymentVoucher` (type: `receive`)
2. Create journal — Dr: Bank Account, Cr: Accounts Receivable
3. Update `erpSalesInvoice.paidAmount` += amount
4. Update `erpCustomer.outstandingBalance` -= amount
5. If fully paid: advance SI FSM to `paid`
