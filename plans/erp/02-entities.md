# Phase 2 — Entities

All Drizzle table definitions. File: `composes/erp/server/src/db/schema/erp.ts`.

Import pattern:
```typescript
import { pgTable, text, integer, numeric, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { generatePrefixedId } from "@core";
```

---

## Procurement Tables

```typescript
export const erpVendor = pgTable("erp_vendors", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("vnd")),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),                     // VND-001
  type: text("type").notNull(),                     // supplier | contractor | service-provider
  status: text("status").notNull().default("pending-approval"),
  gstin: text("gstin"),                             // India GSTIN (15 chars)
  pan: text("pan"),                                 // India PAN (10 chars)
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  currency: text("currency").notNull().default("INR"),
  paymentTerms: text("payment_terms").default("NET30"),
  bankDetails: jsonb("bank_details"),               // { accountNo, bankName, ifsc }
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  addressId: text("address_id"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const erpPurchaseRequisition = pgTable("erp_purchase_requisitions", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pr")),
  orgId: text("org_id").notNull(),
  refNo: text("ref_no").notNull(),                  // PR-2024-001
  requestedBy: text("requested_by").notNull(),
  department: text("department"),
  status: text("status").notNull().default("draft"), // draft|submitted|approved|rejected|converted
  justification: text("justification"),
  requiredBy: timestamp("required_by"),
  approvedBy: text("approved_by"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const erpPrItem = pgTable("erp_pr_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pri")),
  prId: text("pr_id").notNull().references(() => erpPurchaseRequisition.id),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  estimatedUnitPrice: numeric("estimated_unit_price", { precision: 15, scale: 2 }),
});

export const erpPurchaseOrder = pgTable("erp_purchase_orders", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("po")),
  orgId: text("org_id").notNull(),
  poNumber: text("po_number").notNull(),             // PO-2024-001
  vendorId: text("vendor_id").notNull().references(() => erpVendor.id),
  prId: text("pr_id"),                              // source PR (optional)
  status: text("status").notNull().default("draft"),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  paymentTerms: text("payment_terms"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("INR"),
  billingAddress: jsonb("billing_address"),
  deliveryAddress: jsonb("delivery_address"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const erpPoItem = pgTable("erp_po_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("poi")),
  poId: text("po_id").notNull().references(() => erpPurchaseOrder.id),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  receivedQty: numeric("received_qty", { precision: 12, scale: 3 }).default("0"),
  uom: text("uom").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  hsn: text("hsn"),                                // HSN/SAC code
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
});

export const erpGoodsReceipt = pgTable("erp_goods_receipts", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("grn")),
  orgId: text("org_id").notNull(),
  grnNumber: text("grn_number").notNull(),           // GRN-2024-001
  poId: text("po_id").notNull().references(() => erpPurchaseOrder.id),
  vendorId: text("vendor_id").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  receivedBy: text("received_by").notNull(),
  status: text("status").notNull().default("draft"),  // draft|confirmed|quality-passed|quality-failed
  qualityNotes: text("quality_notes"),
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpGrItem = pgTable("erp_gr_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("gri")),
  grnId: text("grn_id").notNull().references(() => erpGoodsReceipt.id),
  poItemId: text("po_item_id").notNull(),
  itemId: text("item_id").notNull(),
  orderedQty: numeric("ordered_qty", { precision: 12, scale: 3 }).notNull(),
  receivedQty: numeric("received_qty", { precision: 12, scale: 3 }).notNull(),
  acceptedQty: numeric("accepted_qty", { precision: 12, scale: 3 }).notNull(),
  rejectedQty: numeric("rejected_qty", { precision: 12, scale: 3 }).default("0"),
  rejectionReason: text("rejection_reason"),
  batchNo: text("batch_no"),
  expiryDate: timestamp("expiry_date"),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
});

export const erpVendorInvoice = pgTable("erp_vendor_invoices", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("vbi")),
  orgId: text("org_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  vendorId: text("vendor_id").notNull(),
  poId: text("po_id"),
  grnId: text("grn_id"),
  status: text("status").notNull().default("received"),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  cgst: numeric("cgst", { precision: 15, scale: 2 }).default("0"),
  sgst: numeric("sgst", { precision: 15, scale: 2 }).default("0"),
  igst: numeric("igst", { precision: 15, scale: 2 }).default("0"),
  tdsAmount: numeric("tds_amount", { precision: 15, scale: 2 }).default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("INR"),
  journalEntryId: text("journal_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const erpVendorInvoiceItem = pgTable("erp_vendor_invoice_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("vii")),
  invoiceId: text("invoice_id").notNull().references(() => erpVendorInvoice.id),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  hsn: text("hsn"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
});

export const erpPaymentVoucher = pgTable("erp_payment_vouchers", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pmt")),
  orgId: text("org_id").notNull(),
  type: text("type").notNull(),                     // pay | receive
  partyType: text("party_type").notNull(),           // vendor | customer
  partyId: text("party_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").default("INR"),
  date: timestamp("date").notNull(),
  mode: text("mode"),                               // bank | cash | cheque | upi
  reference: text("reference"),                     // cheque/UTR number
  bankAccountId: text("bank_account_id"),
  status: text("status").notNull().default("draft"),
  journalEntryId: text("journal_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Sales Tables

```typescript
export const erpCustomer = pgTable("erp_customers", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("cst")),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),                     // CST-001
  gstin: text("gstin"),
  pan: text("pan"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  currency: text("currency").default("INR"),
  paymentTerms: text("payment_terms").default("NET30"),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }).default("0"),
  outstandingBalance: numeric("outstanding_balance", { precision: 15, scale: 2 }).default("0"),
  billingAddress: jsonb("billing_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpQuotation = pgTable("erp_quotations", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("qtn")),
  orgId: text("org_id").notNull(),
  quotationNo: text("quotation_no").notNull(),
  customerId: text("customer_id").notNull().references(() => erpCustomer.id),
  date: timestamp("date").notNull(),
  validUntil: timestamp("valid_until"),
  status: text("status").notNull().default("draft"),  // draft|submitted|accepted|rejected|expired
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("INR"),
  terms: text("terms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpQuotationItem = pgTable("erp_quotation_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("qti")),
  quotationId: text("quotation_id").notNull().references(() => erpQuotation.id),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  hsn: text("hsn"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
});

export const erpSalesOrder = pgTable("erp_sales_orders", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("sod")),
  orgId: text("org_id").notNull(),
  soNumber: text("so_number").notNull(),
  customerId: text("customer_id").notNull().references(() => erpCustomer.id),
  quotationId: text("quotation_id"),
  date: timestamp("date").notNull(),
  deliveryDate: timestamp("delivery_date"),
  status: text("status").notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).default("0"),
  invoicedAmount: numeric("invoiced_amount", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("INR"),
  shippingAddress: jsonb("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const erpSoItem = pgTable("erp_so_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("soi")),
  soId: text("so_id").notNull().references(() => erpSalesOrder.id),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  deliveredQty: numeric("delivered_qty", { precision: 12, scale: 3 }).default("0"),
  invoicedQty: numeric("invoiced_qty", { precision: 12, scale: 3 }).default("0"),
  uom: text("uom").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  hsn: text("hsn"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
});

export const erpDeliveryNote = pgTable("erp_delivery_notes", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dn")),
  orgId: text("org_id").notNull(),
  dnNumber: text("dn_number").notNull(),
  soId: text("so_id").notNull().references(() => erpSalesOrder.id),
  customerId: text("customer_id").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("draft"),
  shippingAddress: jsonb("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpDnItem = pgTable("erp_dn_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dni")),
  dnId: text("dn_id").notNull().references(() => erpDeliveryNote.id),
  soItemId: text("so_item_id").notNull(),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  batchNo: text("batch_no"),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
});

export const erpSalesInvoice = pgTable("erp_sales_invoices", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("si")),
  orgId: text("org_id").notNull(),
  siNumber: text("si_number").notNull(),
  customerId: text("customer_id").notNull().references(() => erpCustomer.id),
  soId: text("so_id"),
  dnId: text("dn_id"),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  cgst: numeric("cgst", { precision: 15, scale: 2 }).default("0"),
  sgst: numeric("sgst", { precision: 15, scale: 2 }).default("0"),
  igst: numeric("igst", { precision: 15, scale: 2 }).default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("INR"),
  irn: text("irn"),                               // e-Invoice Reference Number
  eWayBillNo: text("e_way_bill_no"),
  journalEntryId: text("journal_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const erpSiItem = pgTable("erp_si_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("sii")),
  siId: text("si_id").notNull().references(() => erpSalesInvoice.id),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  hsn: text("hsn"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
  cgst: numeric("cgst", { precision: 15, scale: 2 }).default("0"),
  sgst: numeric("sgst", { precision: 15, scale: 2 }).default("0"),
  igst: numeric("igst", { precision: 15, scale: 2 }).default("0"),
});
```

---

## Inventory Tables

```typescript
export const erpItem = pgTable("erp_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("itm")),
  orgId: text("org_id").notNull(),
  code: text("code").notNull(),                     // ITEM-001
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),                     // stock | service | asset
  uom: text("uom").notNull().default("Nos"),        // unit of measure
  valuationMethod: text("valuation_method").default("FIFO"), // FIFO | moving-average
  hsn: text("hsn"),                               // HSN/SAC code for GST
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
  reorderQty: numeric("reorder_qty", { precision: 12, scale: 3 }).default("0"),
  leadTimeDays: integer("lead_time_days").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpWarehouse = pgTable("erp_warehouses", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("wh")),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  type: text("type").default("store"),              // store | transit | virtual
  parentId: text("parent_id"),
  address: jsonb("address"),
  isActive: boolean("is_active").default(true),
});

export const erpStockEntry = pgTable("erp_stock_entries", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ste")),
  orgId: text("org_id").notNull(),
  type: text("type").notNull(),                     // receipt|issue|transfer|manufacture|adjustment
  date: timestamp("date").notNull(),
  reference: text("reference"),                     // GRN ID, WO ID, etc.
  referenceType: text("reference_type"),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpStockEntryItem = pgTable("erp_stock_entry_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("sei")),
  entryId: text("entry_id").notNull().references(() => erpStockEntry.id),
  itemId: text("item_id").notNull(),
  warehouseFrom: text("warehouse_from"),
  warehouseTo: text("warehouse_to"),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
  lineValue: numeric("line_value", { precision: 15, scale: 2 }),
  batchNo: text("batch_no"),
});

export const erpStockLedger = pgTable("erp_stock_ledger", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("slg")),
  itemId: text("item_id").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  date: timestamp("date").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),  // + in, - out
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
  stockValue: numeric("stock_value", { precision: 15, scale: 2 }),
  balance: numeric("balance", { precision: 12, scale: 3 }),    // running balance
  entryId: text("entry_id").notNull(),
}, (t) => [
  index("slg_item_wh_date_idx").on(t.itemId, t.warehouseId, t.date),
]);
```

---

## Finance Tables

```typescript
export const erpAccount = pgTable("erp_accounts", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("acc")),
  orgId: text("org_id").notNull(),
  code: text("code").notNull(),                     // 1-1000 assets, 2-2000 liab, etc.
  name: text("name").notNull(),
  type: text("type").notNull(),                     // asset|liability|equity|income|expense
  subType: text("sub_type"),                        // current-asset|fixed-asset|current-liability|etc.
  parentId: text("parent_id"),
  currency: text("currency").default("INR"),
  isGroup: boolean("is_group").default(false),      // group account (no direct postings)
  isFrozen: boolean("is_frozen").default(false),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0"),
});

export const erpFiscalYear = pgTable("erp_fiscal_years", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("fy")),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),                     // "FY 2024-25"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isClosed: boolean("is_closed").default(false),
});

export const erpJournalEntry = pgTable("erp_journal_entries", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("je")),
  orgId: text("org_id").notNull(),
  date: timestamp("date").notNull(),
  reference: text("reference"),
  referenceType: text("reference_type"),
  narration: text("narration"),
  status: text("status").notNull().default("draft"),  // draft|posted|cancelled
  totalDebit: numeric("total_debit", { precision: 15, scale: 2 }).default("0"),
  totalCredit: numeric("total_credit", { precision: 15, scale: 2 }).default("0"),
  fiscalYearId: text("fiscal_year_id"),
  postedBy: text("posted_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpJournalLine = pgTable("erp_journal_lines", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("jln")),
  journalId: text("journal_id").notNull().references(() => erpJournalEntry.id),
  accountId: text("account_id").notNull().references(() => erpAccount.id),
  debit: numeric("debit", { precision: 15, scale: 2 }).default("0"),
  credit: numeric("credit", { precision: 15, scale: 2 }).default("0"),
  partyType: text("party_type"),                    // vendor | customer | employee
  partyId: text("party_id"),
  costCenter: text("cost_center"),
  description: text("description"),
});

export const erpBankAccount = pgTable("erp_bank_accounts", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("bka")),
  orgId: text("org_id").notNull(),
  accountName: text("account_name").notNull(),
  accountNo: text("account_no").notNull(),
  bankName: text("bank_name").notNull(),
  ifsc: text("ifsc"),
  currency: text("currency").default("INR"),
  glAccountId: text("gl_account_id"),              // linked CoA account
  isActive: boolean("is_active").default(true),
});

export const erpBankTransaction = pgTable("erp_bank_transactions", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("btx")),
  bankAccountId: text("bank_account_id").notNull().references(() => erpBankAccount.id),
  date: timestamp("date").notNull(),
  description: text("description"),
  debit: numeric("debit", { precision: 15, scale: 2 }).default("0"),
  credit: numeric("credit", { precision: 15, scale: 2 }).default("0"),
  balance: numeric("balance", { precision: 15, scale: 2 }),
  status: text("status").default("unmatched"),     // unmatched | matched
  matchedVoucherId: text("matched_voucher_id"),
});
```

---

## Manufacturing Tables

```typescript
export const erpBom = pgTable("erp_boms", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("bom")),
  orgId: text("org_id").notNull(),
  itemId: text("item_id").notNull(),               // finished good
  version: integer("version").default(1),
  isDefault: boolean("is_default").default(false),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).default("1"),
  uom: text("uom").notNull(),
  operatingCost: numeric("operating_cost", { precision: 15, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
});

export const erpBomItem = pgTable("erp_bom_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("bmi")),
  bomId: text("bom_id").notNull().references(() => erpBom.id),
  itemId: text("item_id").notNull(),               // raw material
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  warehouseId: text("warehouse_id"),               // source warehouse
  scrapPct: numeric("scrap_pct", { precision: 5, scale: 2 }).default("0"),
});

export const erpWorkOrder = pgTable("erp_work_orders", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("wo")),
  orgId: text("org_id").notNull(),
  woNumber: text("wo_number").notNull(),
  bomId: text("bom_id").notNull().references(() => erpBom.id),
  itemId: text("item_id").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  producedQty: numeric("produced_qty", { precision: 12, scale: 3 }).default("0"),
  warehouseId: text("warehouse_id").notNull(),
  status: text("status").notNull().default("draft"),
  plannedStart: timestamp("planned_start"),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## HR Tables

```typescript
export const erpDepartment = pgTable("erp_departments", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dep")),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  parentId: text("parent_id"),
  headId: text("head_id"),                         // employee ID of dept head
});

export const erpEmployee = pgTable("erp_employees", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("emp")),
  orgId: text("org_id").notNull(),
  empNo: text("emp_no").notNull(),                 // EMP-001
  actorId: text("actor_id"),                       // linked platform actor (optional)
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  departmentId: text("department_id").references(() => erpDepartment.id),
  designation: text("designation"),
  employmentType: text("employment_type").default("permanent"), // permanent|contract|intern
  joinDate: timestamp("join_date"),
  exitDate: timestamp("exit_date"),
  pan: text("pan"),
  aadhaar: text("aadhaar"),                        // India Aadhaar (masked)
  bankAccount: jsonb("bank_account"),              // { accountNo, bankName, ifsc }
  pfNo: text("pf_no"),                            // PF account number
  esiNo: text("esi_no"),                           // ESI number
  status: text("status").default("active"),        // active|resigned|terminated
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpLeaveType = pgTable("erp_leave_types", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("lt")),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),                    // Annual Leave, Sick Leave, etc.
  maxDays: integer("max_days").default(0),
  isPaid: boolean("is_paid").default(true),
  isCarryForward: boolean("is_carry_forward").default(false),
  maxCarryForward: integer("max_carry_forward").default(0),
});

export const erpLeaveAllocation = pgTable("erp_leave_allocations", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("la")),
  employeeId: text("employee_id").notNull().references(() => erpEmployee.id),
  leaveTypeId: text("leave_type_id").notNull().references(() => erpLeaveType.id),
  year: integer("year").notNull(),
  allocated: numeric("allocated", { precision: 5, scale: 1 }).notNull(),
  used: numeric("used", { precision: 5, scale: 1 }).default("0"),
  balance: numeric("balance", { precision: 5, scale: 1 }),
});

export const erpLeaveApplication = pgTable("erp_leave_applications", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("lav")),
  employeeId: text("employee_id").notNull().references(() => erpEmployee.id),
  leaveTypeId: text("leave_type_id").notNull(),
  fromDate: timestamp("from_date").notNull(),
  toDate: timestamp("to_date").notNull(),
  days: numeric("days", { precision: 5, scale: 1 }).notNull(),
  status: text("status").notNull().default("draft"),
  reason: text("reason"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpAttendance = pgTable("erp_attendance", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("att")),
  employeeId: text("employee_id").notNull().references(() => erpEmployee.id),
  date: timestamp("date").notNull(),
  status: text("status").notNull(),               // present|absent|half-day|leave|holiday
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  workHours: numeric("work_hours", { precision: 4, scale: 2 }),
}, (t) => [
  index("att_emp_date_idx").on(t.employeeId, t.date),
]);
```

---

## Payroll + Asset + Tax Tables

```typescript
export const erpSalaryStructure = pgTable("erp_salary_structures", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("sal")),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  components: jsonb("components").notNull(),
  // components shape:
  // { earnings: [{ name, type: "fixed|formula", value, formula? }],
  //   deductions: [{ name, type: "fixed|formula|percentage", value, formula? }] }
  // examples:
  //   { name: "Basic", type: "formula", formula: "gross * 0.5" }
  //   { name: "PF", type: "percentage", value: 12, basis: "basic" }
  //   { name: "TDS", type: "formula", formula: "annual_income_tax / 12" }
});

export const erpSalarySlip = pgTable("erp_salary_slips", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ss")),
  employeeId: text("employee_id").notNull().references(() => erpEmployee.id),
  month: integer("month").notNull(),               // 1-12
  year: integer("year").notNull(),
  structureId: text("structure_id").references(() => erpSalaryStructure.id),
  workingDays: integer("working_days").notNull(),
  presentDays: integer("present_days").notNull(),
  earnings: jsonb("earnings").notNull(),           // [{ name, amount }]
  deductions: jsonb("deductions").notNull(),       // [{ name, amount }]
  grossPay: numeric("gross_pay", { precision: 15, scale: 2 }).notNull(),
  netPay: numeric("net_pay", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  payrollEntryId: text("payroll_entry_id"),
  journalEntryId: text("journal_entry_id"),
});

export const erpPayrollEntry = pgTable("erp_payroll_entries", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pe")),
  orgId: text("org_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: text("status").notNull().default("draft"),
  employeeCount: integer("employee_count").default(0),
  totalGross: numeric("total_gross", { precision: 15, scale: 2 }).default("0"),
  totalDeductions: numeric("total_deductions", { precision: 15, scale: 2 }).default("0"),
  totalNet: numeric("total_net", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpAsset = pgTable("erp_assets", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ast")),
  orgId: text("org_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),            // machinery|vehicle|furniture|IT-equipment
  status: text("status").default("active"),        // active|under-maintenance|disposed
  purchaseDate: timestamp("purchase_date").notNull(),
  purchaseCost: numeric("purchase_cost", { precision: 15, scale: 2 }).notNull(),
  usefulLifeYears: integer("useful_life_years").notNull(),
  depreciationMethod: text("depreciation_method").default("straight-line"),
  accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 15, scale: 2 }).default("0"),
  bookValue: numeric("book_value", { precision: 15, scale: 2 }),
  warehouseId: text("warehouse_id"),
  assignedToId: text("assigned_to_id"),            // employee ID
});

export const erpGstTemplate = pgTable("erp_gst_templates", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("gst")),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),                    // "GST 18%", "GST 5%", "GST 12% (Exempt)"
  type: text("type").notNull(),                    // sales | purchase
  cgstRate: numeric("cgst_rate", { precision: 5, scale: 2 }).default("0"),
  sgstRate: numeric("sgst_rate", { precision: 5, scale: 2 }).default("0"),
  igstRate: numeric("igst_rate", { precision: 5, scale: 2 }).default("0"),
  cessRate: numeric("cess_rate", { precision: 5, scale: 2 }).default("0"),
});

export const erpGstReturn = pgTable("erp_gst_returns", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("grt")),
  orgId: text("org_id").notNull(),
  type: text("type").notNull(),                    // GSTR1 | GSTR3B
  period: text("period").notNull(),                // "2024-06" (YYYY-MM)
  status: text("status").default("draft"),         // draft | filed
  data: jsonb("data"),                             // serialized return data
  filedAt: timestamp("filed_at"),
});
```
