import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { generatePrefixedId } from "@core";

// ─── Purchase Requisitions ───────────────────────────────────────────────────

export const erpPurchaseRequisition = pgTable("erp_purchase_requisitions", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pr")),
  organizationId: text("organization_id").notNull(),
  refNo: text("ref_no").notNull(),
  requestedById: text("requested_by_id").notNull(),
  departmentId: text("department_id"),
  urgency: text("urgency").default("normal"),
  justification: text("justification"),
  requiredBy: timestamp("required_by"),
  stageId: text("stage_id"),
  status: text("status").notNull().default("draft"),
  approvedBy: text("approved_by"),
  rejectedReason: text("rejected_reason"),
  meta: jsonb("meta").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const erpPrItem = pgTable("erp_pr_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("pri")),
  requisitionId: text("requisition_id").notNull().references(() => erpPurchaseRequisition.id),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  estimatedUnitCost: numeric("estimated_unit_cost", { precision: 15, scale: 2 }),
  preferredVendorId: text("preferred_vendor_id"),
  notes: text("notes"),
});

// ─── Goods Receipt Notes ─────────────────────────────────────────────────────

export const erpGrn = pgTable("erp_grns", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("grn")),
  organizationId: text("organization_id").notNull(),
  grnNumber: text("grn_number").notNull(),
  transactionId: text("transaction_id").notNull(),
  locationId: text("location_id").notNull(),
  receivedById: text("received_by_id").notNull(),
  status: text("status").notNull().default("draft"),
  qualityNotes: text("quality_notes"),
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpGrnItem = pgTable("erp_grn_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("gri")),
  grnId: text("grn_id").notNull().references(() => erpGrn.id),
  itemId: text("item_id").notNull(),
  qtyOrdered: numeric("qty_ordered", { precision: 12, scale: 3 }).notNull(),
  qtyReceived: numeric("qty_received", { precision: 12, scale: 3 }).notNull(),
  qtyAccepted: numeric("qty_accepted", { precision: 12, scale: 3 }).notNull(),
  qtyRejected: numeric("qty_rejected", { precision: 12, scale: 3 }).default("0"),
  condition: text("condition"),
  rejectionReason: text("rejection_reason"),
  batchNo: text("batch_no"),
  expiryDate: timestamp("expiry_date"),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
});

// ─── Delivery Notes ──────────────────────────────────────────────────────────

export const erpDeliveryNote = pgTable("erp_delivery_notes", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dn")),
  organizationId: text("organization_id").notNull(),
  dnNumber: text("dn_number").notNull(),
  transactionId: text("transaction_id").notNull(),
  locationId: text("location_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("draft"),
  shippingAddress: jsonb("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpDnItem = pgTable("erp_dn_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dni")),
  dnId: text("dn_id").notNull().references(() => erpDeliveryNote.id),
  transactionLineId: text("transaction_line_id").notNull(),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  batchNo: text("batch_no"),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
});

// ─── Stock Entries & Ledger ──────────────────────────────────────────────────

export const erpStockEntry = pgTable("erp_stock_entries", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ste")),
  organizationId: text("organization_id").notNull(),
  type: text("type").notNull(),
  date: timestamp("date").notNull(),
  reference: text("reference"),
  referenceType: text("reference_type"),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpStockEntryItem = pgTable("erp_stock_entry_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("sei")),
  entryId: text("entry_id").notNull().references(() => erpStockEntry.id),
  itemId: text("item_id").notNull(),
  locationFrom: text("location_from"),
  locationTo: text("location_to"),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
  lineValue: numeric("line_value", { precision: 15, scale: 2 }),
  batchNo: text("batch_no"),
});

export const erpStockLedger = pgTable("erp_stock_ledger", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("slg")),
  itemId: text("item_id").notNull(),
  locationId: text("location_id").notNull(),
  date: timestamp("date").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  valuationRate: numeric("valuation_rate", { precision: 15, scale: 2 }),
  stockValue: numeric("stock_value", { precision: 15, scale: 2 }),
  balance: numeric("balance", { precision: 12, scale: 3 }),
  entryId: text("entry_id").notNull(),
}, (t) => [
  index("slg_item_loc_date_idx").on(t.itemId, t.locationId, t.date),
]);

// ─── Manufacturing ───────────────────────────────────────────────────────────

export const erpBom = pgTable("erp_bom", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("bom")),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id").notNull(),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).default("1"),
  uom: text("uom").notNull(),
  operatingCost: numeric("operating_cost", { precision: 15, scale: 2 }).default("0"),
});

export const erpBomItem = pgTable("erp_bom_items", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("bmi")),
  bomId: text("bom_id").notNull().references(() => erpBom.id),
  componentItemId: text("component_item_id").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  scrapPercent: numeric("scrap_percent", { precision: 5, scale: 2 }).default("0"),
});

export const erpWorkOrder = pgTable("erp_work_orders", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("wo")),
  organizationId: text("organization_id").notNull(),
  woNumber: text("wo_number").notNull(),
  bomId: text("bom_id").notNull().references(() => erpBom.id),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  producedQty: numeric("produced_qty", { precision: 12, scale: 3 }).default("0"),
  targetLocationId: text("target_location_id").notNull(),
  status: text("status").notNull().default("draft"),
  stageId: text("stage_id"),
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── HR ──────────────────────────────────────────────────────────────────────

export const erpDepartment = pgTable("erp_departments", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dep")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  code: text("code"),
  parentId: text("parent_id"),
  managerId: text("manager_id"),
});

export const erpDesignation = pgTable("erp_designations", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("dsg")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  departmentId: text("department_id").references(() => erpDepartment.id),
});

export const erpLeaveType = pgTable("erp_leave_types", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("lt")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  maxDays: integer("max_days").default(0),
  isPaid: boolean("is_paid").default(true),
  isCarryForward: boolean("is_carry_forward").default(false),
  maxCarryForward: integer("max_carry_forward").default(0),
});

export const erpLeaveAllocation = pgTable("erp_leave_allocations", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("la")),
  personId: text("person_id").notNull(),
  leaveTypeId: text("leave_type_id").notNull().references(() => erpLeaveType.id),
  year: integer("year").notNull(),
  allocated: numeric("allocated", { precision: 5, scale: 1 }).notNull(),
  used: numeric("used", { precision: 5, scale: 1 }).default("0"),
  balance: numeric("balance", { precision: 5, scale: 1 }),
});

export const erpLeaveApplication = pgTable("erp_leave_applications", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("lav")),
  personId: text("person_id").notNull(),
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
  personId: text("person_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  workHours: numeric("work_hours", { precision: 4, scale: 2 }),
}, (t) => [
  index("att_person_date_idx").on(t.personId, t.date),
]);

// ─── Finance ─────────────────────────────────────────────────────────────────

export const erpFiscalYear = pgTable("erp_fiscal_years", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("fy")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isClosed: boolean("is_closed").default(false),
});

export const erpGlAccount = pgTable("erp_gl_accounts", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("acc")),
  organizationId: text("organization_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subType: text("sub_type"),
  parentId: text("parent_id"),
  currency: text("currency").default("INR"),
  isGroup: boolean("is_group").default(false),
  isFrozen: boolean("is_frozen").default(false),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0"),
});

export const erpJournalEntry = pgTable("erp_journal_entries", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("je")),
  organizationId: text("organization_id").notNull(),
  transactionId: text("transaction_id"),
  date: timestamp("date").notNull(),
  reference: text("reference"),
  referenceType: text("reference_type"),
  description: text("description"),
  status: text("status").notNull().default("draft"),
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
  partyId: text("party_id"),
  personId: text("person_id"),
  costCenter: text("cost_center"),
  description: text("description"),
});

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
  status: text("status").default("unmatched"),
  matchedTransactionId: text("matched_transaction_id"),
});

// ─── Payroll ─────────────────────────────────────────────────────────────────

export const erpSalaryStructure = pgTable("erp_salary_structures", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("sal")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  components: jsonb("components").notNull(),
});

export const erpPayrollRun = pgTable("erp_payroll_runs", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("prn")),
  organizationId: text("organization_id").notNull(),
  period: text("period").notNull(),
  status: text("status").notNull().default("draft"),
  processedAt: timestamp("processed_at"),
  totalGross: numeric("total_gross", { precision: 15, scale: 2 }).default("0"),
  totalDeductions: numeric("total_deductions", { precision: 15, scale: 2 }).default("0"),
  totalNet: numeric("total_net", { precision: 15, scale: 2 }).default("0"),
  employeeCount: integer("employee_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpSalarySlip = pgTable("erp_salary_slips", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ss")),
  payrollRunId: text("payroll_run_id").notNull().references(() => erpPayrollRun.id),
  personId: text("person_id").notNull(),
  workingDays: integer("working_days").notNull(),
  presentDays: integer("present_days").notNull(),
  structureId: text("structure_id").references(() => erpSalaryStructure.id),
  earnings: jsonb("earnings").notNull(),
  deductions: jsonb("deductions").notNull(),
  gross: numeric("gross", { precision: 15, scale: 2 }).notNull(),
  net: numeric("net", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  journalEntryId: text("journal_entry_id"),
});

// ─── Assets ──────────────────────────────────────────────────────────────────

export const erpAsset = pgTable("erp_assets", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("ast")),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id"),
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").default("active"),
  purchaseDate: timestamp("purchase_date").notNull(),
  purchaseCost: numeric("purchase_cost", { precision: 15, scale: 2 }).notNull(),
  usefulLifeYears: integer("useful_life_years").notNull(),
  depreciationMethod: text("depreciation_method").default("straight-line"),
  accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 15, scale: 2 }).default("0"),
  bookValue: numeric("book_value", { precision: 15, scale: 2 }),
  locationId: text("location_id"),
  assignedToId: text("assigned_to_id"),
});

export const erpAssetDepreciation = pgTable("erp_asset_depreciation", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("adp")),
  assetId: text("asset_id").notNull().references(() => erpAsset.id),
  period: text("period").notNull(),
  depreciationAmount: numeric("depreciation_amount", { precision: 15, scale: 2 }).notNull(),
  bookValueAfter: numeric("book_value_after", { precision: 15, scale: 2 }).notNull(),
  postedAt: timestamp("posted_at"),
  journalEntryId: text("journal_entry_id"),
});

// ─── GST & Tax ───────────────────────────────────────────────────────────────

export const erpGstTemplate = pgTable("erp_gst_templates", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("gst")),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  cgstRate: numeric("cgst_rate", { precision: 5, scale: 2 }).default("0"),
  sgstRate: numeric("sgst_rate", { precision: 5, scale: 2 }).default("0"),
  igstRate: numeric("igst_rate", { precision: 5, scale: 2 }).default("0"),
  cessRate: numeric("cess_rate", { precision: 5, scale: 2 }).default("0"),
});

export const erpGstReturn = pgTable("erp_gst_returns", {
  id: text("id").primaryKey().$defaultFn(() => generatePrefixedId("grt")),
  organizationId: text("organization_id").notNull(),
  type: text("type").notNull(),
  period: text("period").notNull(),
  status: text("status").default("draft"),
  data: jsonb("data"),
  filedAt: timestamp("filed_at"),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type ErpPurchaseRequisition = typeof erpPurchaseRequisition.$inferSelect;
export type ErpPrItem = typeof erpPrItem.$inferSelect;
export type ErpGrn = typeof erpGrn.$inferSelect;
export type ErpGrnItem = typeof erpGrnItem.$inferSelect;
export type ErpDeliveryNote = typeof erpDeliveryNote.$inferSelect;
export type ErpDnItem = typeof erpDnItem.$inferSelect;
export type ErpStockEntry = typeof erpStockEntry.$inferSelect;
export type ErpStockEntryItem = typeof erpStockEntryItem.$inferSelect;
export type ErpStockLedger = typeof erpStockLedger.$inferSelect;
export type ErpBom = typeof erpBom.$inferSelect;
export type ErpBomItem = typeof erpBomItem.$inferSelect;
export type ErpWorkOrder = typeof erpWorkOrder.$inferSelect;
export type ErpDepartment = typeof erpDepartment.$inferSelect;
export type ErpDesignation = typeof erpDesignation.$inferSelect;
export type ErpLeaveType = typeof erpLeaveType.$inferSelect;
export type ErpLeaveAllocation = typeof erpLeaveAllocation.$inferSelect;
export type ErpLeaveApplication = typeof erpLeaveApplication.$inferSelect;
export type ErpAttendance = typeof erpAttendance.$inferSelect;
export type ErpFiscalYear = typeof erpFiscalYear.$inferSelect;
export type ErpGlAccount = typeof erpGlAccount.$inferSelect;
export type ErpJournalEntry = typeof erpJournalEntry.$inferSelect;
export type ErpJournalLine = typeof erpJournalLine.$inferSelect;
export type ErpBankAccount = typeof erpBankAccount.$inferSelect;
export type ErpBankTransaction = typeof erpBankTransaction.$inferSelect;
export type ErpSalaryStructure = typeof erpSalaryStructure.$inferSelect;
export type ErpPayrollRun = typeof erpPayrollRun.$inferSelect;
export type ErpSalarySlip = typeof erpSalarySlip.$inferSelect;
export type ErpAsset = typeof erpAsset.$inferSelect;
export type ErpAssetDepreciation = typeof erpAssetDepreciation.$inferSelect;
export type ErpGstTemplate = typeof erpGstTemplate.$inferSelect;
export type ErpGstReturn = typeof erpGstReturn.$inferSelect;
