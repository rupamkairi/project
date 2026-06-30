# Phase 14 — Web: Procurement

> **MTA:** Vendor data comes from `parties` table (`type="vendor"`). The `/erp/vendors` route is unchanged — only the server-side data source differs. PO data comes from `transactions` table (`type="purchase_order"`).

---

## 14.1 VendorsPage

**File:** `pages/procurement/VendorsPage.tsx`

Columns: Vendor Code | Name | GSTIN | Type | Rating | Status | Actions

```typescript
const columns: ColumnDef<Vendor>[] = [
  { accessorKey: "refNo", header: "Code", cell: ({ row }) => (
    <Link to={`/erp/procurement/vendors/${row.original.id}`} className="font-mono text-sm">
      {row.original.refNo}
    </Link>
  )},
  { accessorKey: "name", header: "Name" },
  { accessorKey: "gstin", header: "GSTIN", cell: ({ getValue }) => (
    <span className="font-mono text-xs">{getValue() as string ?? "—"}</span>
  )},
  { accessorKey: "vendorType", header: "Type" }, // from parties.type or parties.meta.vendorType
  { accessorKey: "rating", header: "Rating", cell: ({ getValue }) => (
    <span>{getValue() ? `${getValue()}/5` : "—"}</span>
  )},
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => (
    <StatusBadge status={getValue() as string} />
  )},
];
```

Actions bar: "Add Vendor" button (opens CreateVendorDialog).

**CreateVendorDialog fields:**
- Name (required)
- GSTIN (validated on input)
- PAN
- Type: individual | company
- Email, Phone
- Address: street, city, state (dropdown), pincode
- Payment terms (days)
- Bank details (account no, bank name, IFSC)
- TDS section (optional dropdown)

On GSTIN input: call `/erp/vendors/validate-gstin?gstin=X` → show state name beside field.

---

## 14.2 PurchaseRequisitionsPage

Columns: PR No | Date | Requested By | Department | Total | Status | Actions

Filter: status dropdown, date range.

**CreatePRDialog:**
- Title
- Department
- Needed by date
- Items: dynamic rows (item name, description, qty, uom, estimated unit price)
  - `+Add Item` button
  - Delete row button per item
- Auto-computes total

On submit: PR auto-transitions to `submitted` FSM state.

For PRs in `submitted` with user having `erp:purchase-req:approve`: show **Approve / Reject** buttons in row Actions.

---

## 14.3 PurchaseOrdersPage

Columns: PO No | Vendor | Date | Delivery Date | Total | Status | Actions

**PurchaseOrderDetailPage** tabs: Items | Approvals | GRNs | Invoices | Activity

Detail header:
```
PO-2024-001                                         [Approve] [Reject] [Send to Vendor]
Vendor: Acme Supplies                  Status: pending-approval
Date: 15 Jun 2024   Delivery Due: 30 Jun 2024    Total: ₹ 2,45,000.00
```

Items tab columns: # | Item | Qty | UoM | Unit Price | GST% | Line Total | GST Amt | Total

GRNs tab: list of GRNs linked to this PO — each row shows GRN No, date, qty received, status.

Approval timeline: shows each approval step with user, timestamp, action taken.

**CreatePODialog** (from PR or standalone):
- If from PR: pre-fill items from PR, show "From PR: PR-2024-001"
- Vendor dropdown (only `active` vendors)
- Payment terms, delivery date
- Items table with GST% column
- Shows computed subtotal / tax / total at bottom

GST computation (live as items are entered):
```
Subtotal: ₹ 2,07,627.12
CGST (9%): ₹ 18,686.44
SGST (9%): ₹ 18,686.44
Total: ₹ 2,45,000.00
```

---

## 14.4 GRNsPage

Columns: GRN No | PO No | Vendor | Date | Status | Actions

**CreateGRNDialog:**
- Select PO (dropdown — only `sent` + `partially-received` POs)
- Auto-fills vendor from PO
- Items table showing PO items with:
  - Ordered qty (read-only)
  - Previously received qty (read-only)
  - Remaining qty (read-only)
  - Accepted qty (input, max = remaining)
  - Rejected qty (input)
  - Rejection notes (if rejected qty > 0, required)
- Warehouse selector (target warehouse)

On confirm GRN: shows warning "Stock will be posted. Confirm?" → ConfirmDialog.

---

## 14.5 VendorInvoicesPage

Columns: Invoice No | Vendor | PO No | Date | Due Date | Total | 3-Way Match | Status | Actions

Status badges include: `received`, `under-review`, `3way-matched`, `approved`, `disputed`, `partially-paid`, `paid`.

**3-Way Match indicator:**
- Green check if matched
- Orange warning if price variance > 5%
- Red X if qty mismatch

**VendorInvoiceDetailPage:**
- Header: invoice details + status
- Match Summary card:
  ```
  PO Amount:      ₹ 2,45,000.00
  GRN Amount:     ₹ 2,45,000.00
  Invoice Amount: ₹ 2,47,500.00
  Variance:       ₹ 2,500.00 (1.02%) ← within 5% tolerance
  ```
- Tabs: Items | Match Details | Payments | TDS

TDS tab: shows TDS section, threshold, computed TDS amount, net payable.

Actions: Review | Match | Approve | Dispute | Create Payment.

---

## 14.6 PaymentsPage

Columns: Voucher No | Vendor | Invoice No | Amount | TDS | Net Paid | Date | Method | Status

**CreatePaymentDialog:**
- Select vendor invoice (only `approved` status)
- Shows: invoice total, TDS deduction, net payable
- Payment date
- Payment method: bank transfer | cheque | RTGS | NEFT
- Bank account selector
- Reference no (UTR / cheque no)
- Notes

On save: posts payment voucher + journal entry (Dr AP → Cr Bank).
