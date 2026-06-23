# Phase 2 — Entities (Master Table Architecture)

All Drizzle table definitions for ERP-owned detail tables.
File: `composes/erp/server/src/db/schema/erp.ts`.

> **MTA Rule:** Do not define `erp_vendors`, `erp_customers`, `erp_employees`, `erp_items`, `erp_warehouses`, `erp_purchase_orders`, `erp_sales_orders`, `erp_quotations`, `erp_vendor_invoices`, `erp_sales_invoices`, or `erp_payment_vouchers` here. These are served from foundation master tables. Define only the tables below.

Import pattern:
```typescript
import { pgTable, text, integer, numeric, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { generatePrefixedId } from "@core";
```

---

## Master Tables (reused — do not define in ERP compose)

These tables are owned by foundation modules. ERP reads them via mediator or direct Drizzle with type filters.

### parties (vendor / customer)
- `type: "vendor" | "customer" | "ngo" | "corporate"`
- Fields: name, domain, industry, employeeCount, meta (jsonb for GSTIN, PAN, paymentTerms, bankDetails, creditLimit, rating)
- ERP reads: `where type in ('vendor','customer') and organizationId = orgId`
- Vendor create: `mediator.dispatch({ type: "party.createParty", data: { type: "vendor", organizationId, name, meta: { gstin, pan, currency, paymentTerms } } })`

### persons (employee / vendor_contact)
- `type: "employee" | "vendor_contact"`
- Fields: firstName, lastName, email, phone, partyId (their company/employer)
- Employee-specific fields in `meta` jsonb: `{ empNo, designation, departmentId, pfNo, esiNo, aadhaar, bankAccount, employmentType, joinDate }`
- ERP reads: `where type = 'employee' and organizationId = orgId`

### cat_items (products / materials / assets)
- `type: "product" | "stock_item" | "asset" | "service"`
- Fields: name, sku, unit, price, meta (jsonb for hsn, gstRate, valuationMethod, reorderQty, leadTimeDays)
- ERP reads items filtered by type

### locations (warehouses)
- `type: "warehouse"`
- Fields: name, code, capacity, parentId (for zones within warehouse)
- Meta: `{ locationType: "store" | "transit" | "virtual", address }`

### transactions + transaction_lines (PO / SO / invoice / quote / receipt)
- `type: "purchase_order" | "sales_order" | "invoice" | "quote" | "receipt" | "payment"`
- Fields: organizationId, refNo, partyId (parties.id — vendor/customer), personId (persons.id — contact), stageId (pipeline_stages.id), status, subtotal, taxAmount, total, currency, meta (jsonb)
- `transaction_lines`: transactionId, itemId (cat_items.id), qty, unitPrice, taxRate, lineTotal, meta (jsonb for hsn, gstRate, cgst, sgst, igst)
- Vendor invoices: `type = "invoice"`, `meta.direction = "inbound"`
- Sales invoices: `type = "invoice"`, `meta.direction = "outbound"`

### pipelines + pipeline_stages
- `entityType: "erp.po" | "erp.so" | "erp.pr"`
- Seed before use with `seedPipeline(orgId, "erp.po", [{ name: "Draft" }, ...])`
- PO stages: Draft → Submitted → Approved → Issued → Received → Cancelled
- SO stages: Draft → Confirmed → Fulfilling → Invoiced → Paid → Cancelled
- PR stages: Draft → Submitted → Approved → Rejected

### activities
- `type: "log" | "task" | "note"`
- Linked to vendors/employees/POs via entityId + entityType

---

## Detail Tables (ERP-owned, erp_ prefixed)

### erp_purchase_requisitions

```typescript
export const erpPurchaseRequisition = pgTable("erp_purchase_requisitions", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pr")),
  organizationId: text("organization_id").notNull(),
  refNo: text("ref_no").notNull(),                   // PR-2024-001
  requestedById: text("requested_by_id").notNull(),  // persons.id (employee)
  departmentId: text("department_id"),               // erp_departments.id
  urgency: text("urgency").default("normal"),        // low | normal | high | urgent
  justification: text("justification"),
  requiredBy: timestamp("required_by"),
  stageId: text("stage_id"),                        // pipeline_stages.id (erp.pr pipeline)
  status: text("status").notNull().default("draft"), // draft|submitted|approved|rejected|converted
  approvedBy: text("approved_by"),                  // persons.id
  rejectedReason: text("rejected_reason"),
  meta: jsonb("meta").default({}),                  // { budgetCode, projectCode }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### erp_pr_items

```typescript
export const erpPrItem = pgTable("erp_pr_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pri")),
  requisitionId: text("requisition_id").notNull().references(() => erpPurchaseRequisition.id),
  itemId: text("item_id").notNull(),                 // cat_items.id
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  estimatedUnitCost: numeric("estimated_unit_cost", { precision: 15, scale: 2 }),
  preferredVendorId: text("preferred_vendor_id"),    // parties.id (type=vendor)
  notes: text("notes"),
});
```

### erp_grns (Goods Receipt Notes)

```typescript
export const erpGrn = pgTable("erp_grns", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("grn")),
  organizationId: text("organization_id").notNull(),
  grnNumber: text("grn_number").notNull(),           // GRN-2024-001
  transactionId: text("transaction_id").notNull(),   // transactions.id (the PO)
  locationId: text("location_id").notNull(),         // locations.id (warehouse)
  receivedById: text("received_by_id").notNull(),    // persons.id (employee)
  status: text("status").notNull().default("draft"), // draft|confirmed|quality-passed|quality-failed
  qualityNotes: text("quality_notes"),
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### erp_grn_items

```typescript
export const erpGrnItem = pgTable("erp_grn_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("gri")),
  grnId: text("grn_id").notNull().references(() => erpGrn.id),
  itemId: text("item_id").notNull(),                 // cat_items.id
  qtyOrdered: numeric("qty_ordered", { precision: 12, scale: 3 }).notNull(),
  qtyReceived: numeric("qty_received", { precision: 12, scale: 3 }).notNull(),
  qtyAccepted: numeric("qty_accepted", { precision: 12, scale: 3 }).notNull(),
  qtyRejected: numeric("qty_rejected", { precision: 12, scale: 3 }).default("0"),
  condition: text("condition"),                      // good | damaged | expired
  rejectionReason: text("rejection_reason"),
  batchNo: text("batch_no"),
  expiryDate: timestamp("expiry_date"),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
});
```

### erp_delivery_notes

```typescript
export const erpDeliveryNote = pgTable("erp_delivery_notes", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dn")),
  organizationId: text("organization_id").notNull(),
  dnNumber: text("dn_number").notNull(),
  transactionId: text("transaction_id").notNull(),   // transactions.id (the SO)
  locationId: text("location_id").notNull(),         // locations.id (source warehouse)
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("draft"),
  shippingAddress: jsonb("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpDnItem = pgTable("erp_dn_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dni")),
  dnId: text("dn_id").notNull().references(() => erpDeliveryNote.id),
  transactionLineId: text("transaction_line_id").notNull(), // transaction_lines.id (SO line)
  itemId: text("item_id").notNull(),                 // cat_items.id
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  batchNo: text("batch_no"),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
});
```

### erp_stock_entries

```typescript
export const erpStockEntry = pgTable("erp_stock_entries", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ste")),
  organizationId: text("organization_id").notNull(),
  type: text("type").notNull(),                      // receipt|issue|transfer|manufacture|adjustment
  date: timestamp("date").notNull(),
  reference: text("reference"),                      // GRN ID, WO ID, etc.
  referenceType: text("reference_type"),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpStockEntryItem = pgTable("erp_stock_entry_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("sei")),
  entryId: text("entry_id").notNull().references(() => erpStockEntry.id),
  itemId: text("item_id").notNull(),                 // cat_items.id
  locationFrom: text("location_from"),               // locations.id (source warehouse)
  locationTo: text("location_to"),                   // locations.id (destination warehouse)
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
  lineValue: numeric("line_value", { precision: 15, scale: 2 }),
  batchNo: text("batch_no"),
});

export const erpStockLedger = pgTable("erp_stock_ledger", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("slg")),
  itemId: text("item_id").notNull(),                 // cat_items.id
  locationId: text("location_id").notNull(),         // locations.id (warehouse)
  date: timestamp("date").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(), // + in, - out
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
  stockValue: numeric("stock_value", { precision: 15, scale: 2 }),
  balance: numeric("balance", { precision: 12, scale: 3 }),   // running balance
  entryId: text("entry_id").notNull(),
}, (t) => [
  index("slg_item_loc_date_idx").on(t.itemId, t.locationId, t.date),
]);
```

### erp_bom (Bill of Materials)

```typescript
export const erpBom = pgTable("erp_bom", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("bom")),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id").notNull(),                 // cat_items.id (finished product, type=product)
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).default("1"),
  uom: text("uom").notNull(),
  operatingCost: numeric("operating_cost", { precision: 15, scale: 2 }).default("0"),
});

export const erpBomItem = pgTable("erp_bom_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("bmi")),
  bomId: text("bom_id").notNull().references(() => erpBom.id),
  componentItemId: text("component_item_id").notNull(), // cat_items.id (raw material, type=stock_item)
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  scrapPercent: numeric("scrap_percent", { precision: 5, scale: 2 }).default("0"),
});
```

### erp_work_orders

```typescript
export const erpWorkOrder = pgTable("erp_work_orders", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("wo")),
  organizationId: text("organization_id").notNull(),
  woNumber: text("wo_number").notNull(),
  bomId: text("bom_id").notNull().references(() => erpBom.id),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  producedQty: numeric("produced_qty", { precision: 12, scale: 3 }).default("0"),
  targetLocationId: text("target_location_id").notNull(), // locations.id (finished goods warehouse)
  status: text("status").notNull().default("draft"),
  stageId: text("stage_id"),                         // pipeline_stages.id (optional WO pipeline)
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### erp_departments

```typescript
export const erpDepartment = pgTable("erp_departments", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dep")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  code: text("code"),
  parentId: text("parent_id"),                       // self-reference for hierarchy
  managerId: text("manager_id"),                     // persons.id (employee who manages)
});
```

### erp_designations

```typescript
export const erpDesignation = pgTable("erp_designations", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dsg")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  departmentId: text("department_id").references(() => erpDepartment.id),
});
```

### erp_leave_types

```typescript
export const erpLeaveType = pgTable("erp_leave_types", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("lt")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  maxDays: integer("max_days").default(0),
  isPaid: boolean("is_paid").default(true),
  isCarryForward: boolean("is_carry_forward").default(false),
  maxCarryForward: integer("max_carry_forward").default(0),
});
```

### erp_leave_allocations

```typescript
export const erpLeaveAllocation = pgTable("erp_leave_allocations", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("la")),
  personId: text("person_id").notNull(),             // persons.id (employee)
  leaveTypeId: text("leave_type_id").notNull().references(() => erpLeaveType.id),
  year: integer("year").notNull(),
  allocated: numeric("allocated", { precision: 5, scale: 1 }).notNull(),
  used: numeric("used", { precision: 5, scale: 1 }).default("0"),
  balance: numeric("balance", { precision: 5, scale: 1 }),
});
```

### erp_leave_applications

```typescript
export const erpLeaveApplication = pgTable("erp_leave_applications", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("lav")),
  personId: text("person_id").notNull(),             // persons.id (employee)
  leaveTypeId: text("leave_type_id").notNull(),
  fromDate: timestamp("from_date").notNull(),
  toDate: timestamp("to_date").notNull(),
  days: numeric("days", { precision: 5, scale: 1 }).notNull(),
  status: text("status").notNull().default("draft"),
  reason: text("reason"),
  approvedBy: text("approved_by"),                  // persons.id
  createdAt: timestamp("created_at").defaultNow(),
});
```

### erp_attendance

```typescript
export const erpAttendance = pgTable("erp_attendance", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("att")),
  personId: text("person_id").notNull(),             // persons.id (employee)
  date: timestamp("date").notNull(),
  status: text("status").notNull(),                 // present|absent|half-day|leave|holiday
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  workHours: numeric("work_hours", { precision: 4, scale: 2 }),
}, (t) => [
  index("att_person_date_idx").on(t.personId, t.date),
]);
```

### erp_gl_accounts

```typescript
export const erpGlAccount = pgTable("erp_gl_accounts", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("acc")),
  organizationId: text("organization_id").notNull(),
  code: text("code").notNull(),                      // 1-1000 assets, 2-2000 liab, etc.
  name: text("name").notNull(),
  type: text("type").notNull(),                      // asset|liability|equity|revenue|expense
  subType: text("sub_type"),
  parentId: text("parent_id"),
  currency: text("currency").default("INR"),
  isGroup: boolean("is_group").default(false),
  isFrozen: boolean("is_frozen").default(false),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0"),
});
```

### erp_fiscal_years

```typescript
export const erpFiscalYear = pgTable("erp_fiscal_years", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("fy")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),                      // "FY 2024-25"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isClosed: boolean("is_closed").default(false),
});
```

### erp_journal_entries

```typescript
export const erpJournalEntry = pgTable("erp_journal_entries", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("je")),
  organizationId: text("organization_id").notNull(),
  transactionId: text("transaction_id"),             // transactions.id (optional — links to invoice/payment)
  date: timestamp("date").notNull(),
  reference: text("reference"),
  referenceType: text("reference_type"),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft|posted|cancelled
  totalDebit: numeric("total_debit", { precision: 15, scale: 2 }).default("0"),
  totalCredit: numeric("total_credit", { precision: 15, scale: 2 }).default("0"),
  fiscalYearId: text("fiscal_year_id").references(() => erpFiscalYear.id),
  postedBy: text("posted_by"),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpJournalLine = pgTable("erp_journal_lines", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("jln")),
  journalId: text("journal_id").notNull().references(() => erpJournalEntry.id),
  glAccountId: text("gl_account_id").notNull().references(() => erpGlAccount.id),
  debit: numeric("debit", { precision: 15, scale: 2 }).default("0"),
  credit: numeric("credit", { precision: 15, scale: 2 }).default("0"),
  partyId: text("party_id"),                        // parties.id (vendor or customer)
  personId: text("person_id"),                      // persons.id (employee)
  costCenter: text("cost_center"),
  description: text("description"),
});
```

### erp_bank_accounts

```typescript
export const erpBankAccount = pgTable("erp_bank_accounts", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("bka")),
  organizationId: text("organization_id").notNull(),
  accountName: text("account_name").notNull(),
  accountNo: text("account_no").notNull(),
  bankName: text("bank_name").notNull(),
  ifsc: text("ifsc"),
  currency: text("currency").default("INR"),
  glAccountId: text("gl_account_id").references(() => erpGlAccount.id),
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
  status: text("status").default("unmatched"),      // unmatched | matched
  matchedTransactionId: text("matched_transaction_id"), // transactions.id (receipt/payment type)
});
```

### erp_salary_structures

```typescript
export const erpSalaryStructure = pgTable("erp_salary_structures", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("sal")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  components: jsonb("components").notNull(),
  // components shape:
  // { earnings: [{ name, type: "fixed|formula|percentage", value, formula? }],
  //   deductions: [{ name, type: "fixed|formula|percentage", value, formula? }] }
});
```

### erp_payroll_runs

```typescript
export const erpPayrollRun = pgTable("erp_payroll_runs", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pr")),
  organizationId: text("organization_id").notNull(),
  period: text("period").notNull(),                  // "YYYY-MM"
  status: text("status").notNull().default("draft"), // draft|submitted|paid
  processedAt: timestamp("processed_at"),
  totalGross: numeric("total_gross", { precision: 15, scale: 2 }).default("0"),
  totalDeductions: numeric("total_deductions", { precision: 15, scale: 2 }).default("0"),
  totalNet: numeric("total_net", { precision: 15, scale: 2 }).default("0"),
  employeeCount: integer("employee_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### erp_salary_slips

```typescript
export const erpSalarySlip = pgTable("erp_salary_slips", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ss")),
  payrollRunId: text("payroll_run_id").notNull().references(() => erpPayrollRun.id),
  personId: text("person_id").notNull(),             // persons.id (employee)
  workingDays: integer("working_days").notNull(),
  presentDays: integer("present_days").notNull(),
  structureId: text("structure_id").references(() => erpSalaryStructure.id),
  earnings: jsonb("earnings").notNull(),             // [{ name, amount }]
  deductions: jsonb("deductions").notNull(),         // [{ name, amount }]
  gross: numeric("gross", { precision: 15, scale: 2 }).notNull(),
  net: numeric("net", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"), // draft|submitted|paid
  journalEntryId: text("journal_entry_id"),
});
```

### erp_assets

```typescript
export const erpAsset = pgTable("erp_assets", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ast")),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id"),                          // cat_items.id (type=asset), optional link
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),             // machinery|vehicle|furniture|IT-equipment
  status: text("status").default("active"),         // active|under-maintenance|disposed
  purchaseDate: timestamp("purchase_date").notNull(),
  purchaseCost: numeric("purchase_cost", { precision: 15, scale: 2 }).notNull(),
  usefulLifeYears: integer("useful_life_years").notNull(),
  depreciationMethod: text("depreciation_method").default("straight-line"),
  accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 15, scale: 2 }).default("0"),
  bookValue: numeric("book_value", { precision: 15, scale: 2 }),
  locationId: text("location_id"),                  // locations.id (warehouse/office where asset is kept)
  assignedToId: text("assigned_to_id"),             // persons.id (employee assigned to)
});

export const erpAssetDepreciation = pgTable("erp_asset_depreciation", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("adp")),
  assetId: text("asset_id").notNull().references(() => erpAsset.id),
  period: text("period").notNull(),                 // "YYYY-MM"
  depreciationAmount: numeric("depreciation_amount", { precision: 15, scale: 2 }).notNull(),
  bookValueAfter: numeric("book_value_after", { precision: 15, scale: 2 }).notNull(),
  postedAt: timestamp("posted_at"),
  journalEntryId: text("journal_entry_id"),
});
```

### erp_gst_templates

```typescript
export const erpGstTemplate = pgTable("erp_gst_templates", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("gst")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),                     // sales | purchase
  cgstRate: numeric("cgst_rate", { precision: 5, scale: 2 }).default("0"),
  sgstRate: numeric("sgst_rate", { precision: 5, scale: 2 }).default("0"),
  igstRate: numeric("igst_rate", { precision: 5, scale: 2 }).default("0"),
  cessRate: numeric("cess_rate", { precision: 5, scale: 2 }).default("0"),
});
```

### erp_gst_returns

```typescript
export const erpGstReturn = pgTable("erp_gst_returns", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("grt")),
  organizationId: text("organization_id").notNull(),
  type: text("type").notNull(),                     // GSTR1 | GSTR3B
  period: text("period").notNull(),                 // "2024-06" (YYYY-MM)
  status: text("status").default("draft"),          // draft | filed
  data: jsonb("data"),                              // serialized return data
  filedAt: timestamp("filed_at"),
});
```

---

## ID Prefixes

| Entity | Prefix | Example |
|--------|--------|---------|
| Purchase Requisition | `pr` | `pr_01ARZ...` |
| PR Item | `pri` | `pri_01ARZ...` |
| GRN | `grn` | `grn_01ARZ...` |
| GRN Item | `gri` | `gri_01ARZ...` |
| Delivery Note | `dn` | `dn_01ARZ...` |
| DN Item | `dni` | `dni_01ARZ...` |
| Stock Entry | `ste` | `ste_01ARZ...` |
| Stock Entry Item | `sei` | `sei_01ARZ...` |
| Stock Ledger | `slg` | `slg_01ARZ...` |
| BOM | `bom` | `bom_01ARZ...` |
| BOM Item | `bmi` | `bmi_01ARZ...` |
| Work Order | `wo` | `wo_01ARZ...` |
| Department | `dep` | `dep_01ARZ...` |
| Designation | `dsg` | `dsg_01ARZ...` |
| Leave Type | `lt` | `lt_01ARZ...` |
| Leave Allocation | `la` | `la_01ARZ...` |
| Leave Application | `lav` | `lav_01ARZ...` |
| Attendance | `att` | `att_01ARZ...` |
| GL Account | `acc` | `acc_01ARZ...` |
| Fiscal Year | `fy` | `fy_01ARZ...` |
| Journal Entry | `je` | `je_01ARZ...` |
| Journal Line | `jln` | `jln_01ARZ...` |
| Bank Account | `bka` | `bka_01ARZ...` |
| Bank Transaction | `btx` | `btx_01ARZ...` |
| Salary Structure | `sal` | `sal_01ARZ...` |
| Payroll Run | `prn` | `prn_01ARZ...` |
| Salary Slip | `ss` | `ss_01ARZ...` |
| Asset | `ast` | `ast_01ARZ...` |
| Asset Depreciation | `adp` | `adp_01ARZ...` |
| GST Template | `gst` | `gst_01ARZ...` |
| GST Return | `grt` | `grt_01ARZ...` |
