# Phase 15 — Web: Sales

> **MTA:** Customer data comes from `parties` table (`type="customer"`). Quotations, sales orders, and sales invoices come from `transactions` table with appropriate `type` values. The API routes (`/erp/customers`, `/erp/sales-orders`, etc.) are unchanged.

---

## 15.1 ErpCustomersPage

Columns: Customer Code | Name | GSTIN | Credit Limit | Outstanding | Status | Actions

Outstanding balance shown with color coding:
- Green if outstanding < 50% credit limit
- Yellow if 50-90%
- Red if > 90%

**CreateCustomerDialog fields:**
- Name (required)
- GSTIN (validated)
- PAN
- Email, Phone
- Address: street, city, state (dropdown), pincode
- Credit limit (INR)
- Payment terms (days)
- Default GST template

---

## 15.2 QuotationsPage

Columns: Quote No | Customer | Date | Valid Until | Total | Status | Actions

**CreateQuotationDialog:**
- Customer dropdown
- Valid until date
- Items: dynamic rows (item dropdown, qty, unit price, GST%)
- Terms and conditions textarea
- Live total computation

**QuotationDetailPage:**
- Header: quote details + validity indicator (days remaining)
- Items table with GST breakdown
- Actions: Convert to Sales Order | Mark Expired

---

## 15.3 SalesOrdersPage

Columns: SO No | Customer | Date | Delivery Date | Total | Credit Status | Status | Actions

**Credit Status indicator** (from SO confirm logic):
- Shows when SO is being confirmed
- `Credit OK` — within limit
- `Credit Warning: ₹X remaining` — near limit

**SalesOrderDetailPage** tabs: Items | Delivery Notes | Invoices | Activity

Header:
```
SO-2024-001                                    [Confirm] [Cancel]
Customer: RetailCo Ltd            Status: draft
Date: 15 Jun 2024   Delivery: 25 Jun 2024    Total: ₹ 89,500.00
```

Items tab: # | Item | Qty | UoM | Rate | GST% | Amount | GST | Total | Delivered Qty

Delivery Notes tab: list of DNs — DN No, date, qty shipped, status.

**CreateSODialog:**
- Customer dropdown (if from Quotation: pre-fill)
- "From Quote" optional selector
- Delivery date
- Items table with qty + price + GST%
- Computed subtotal / tax / total

---

## 15.4 DeliveryNotesPage

Columns: DN No | SO No | Customer | Date | Status | Actions

**CreateDNDialog:**
- Select SO (only `confirmed` + `partially-delivered` SOs)
- Auto-fills customer
- Items table:
  - SO qty (read-only)
  - Already delivered qty (read-only)
  - Remaining (read-only)
  - Deliver qty (input, max = remaining)
- Source warehouse selector
- Tracking reference (optional)

On submit DN: stock deducted from warehouse. SO status advances.

---

## 15.5 SalesInvoicesPage

Columns: SI No | Customer | Date | Due Date | GST | Total | IRN Status | Status | Actions

**IRN Status badge:**
- `not-required` — B2C or below threshold
- `pending` — not yet generated
- `generated` — IRN obtained, shows first 8 chars
- `failed` — last IRN attempt failed

**SalesInvoiceDetailPage** tabs: Items | GST Details | Payments | IRN

Items tab: line items with HSN code, qty, rate, CGST/SGST/IGST per line.

GST Details tab:
```
GST Type: Intra-State (Maharashtra → Maharashtra)

CGST (9%):  ₹ 4,050.00
SGST (9%):  ₹ 4,050.00
IGST:       ₹ 0.00
Total GST:  ₹ 8,100.00
```

Payments tab: list of payment receipts against this invoice.

IRN tab (B2B invoices):
- Shows IRN number
- Shows QR code (from `signedQrCode` field)
- "Generate IRN" button if not yet generated
- Shows AckNo, AckDt on success

Actions: Submit | Generate IRN | Record Payment | Print.

**CreateSIDialog:**
- Customer dropdown
- "From Sales Order" optional selector (pre-fills items)
- Date, due date
- Items table (item, qty, rate, GST template)
- Shows intra/inter-state detection based on GSTINs

---

## 15.6 Payment Receipt

Triggered from SI detail "Record Payment":

**CreatePaymentReceiptDialog:**
- Pre-fills: customer, invoice, outstanding amount
- Payment date
- Amount (max = outstanding)
- Method: bank transfer | UPI | cheque | cash
- Bank account (from org bank accounts)
- Reference no

On save: posts journal entry (Dr Bank/Cash, Cr AR). Updates `outstandingBalance` on customer.
