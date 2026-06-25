/**
 * Applies only the ERP-specific tables to the DB.
 * Safe to run on a DB that already has the foundation schema (0000-0003 equivalent).
 * Uses neon-http (same as app runtime) to avoid WebSocket issues.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const sql = neon(url);

const ERP_DDL = `
-- ERP tables (created with IF NOT EXISTS for idempotency)

CREATE TABLE IF NOT EXISTS "erp_fiscal_years" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "is_closed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_gl_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "parent_id" text,
  "is_group" boolean DEFAULT false,
  "balance" numeric(18, 2) DEFAULT '0',
  "currency" text DEFAULT 'INR',
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_journal_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "ref_no" text,
  "posting_date" timestamp,
  "fiscal_year_id" text,
  "memo" text,
  "status" text DEFAULT 'draft',
  "total_debit" numeric(18, 2) DEFAULT '0',
  "total_credit" numeric(18, 2) DEFAULT '0',
  "posted_by" text,
  "posted_at" timestamp,
  "tags" jsonb DEFAULT '[]',
  "meta" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_journal_lines" (
  "id" text PRIMARY KEY NOT NULL,
  "journal_entry_id" text NOT NULL,
  "account_id" text NOT NULL,
  "type" text NOT NULL,
  "amount" numeric(18, 2) NOT NULL,
  "party_id" text,
  "description" text,
  "cost_center" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_bank_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "account_number" text,
  "bank_name" text,
  "ifsc" text,
  "currency" text DEFAULT 'INR',
  "balance" numeric(18, 2) DEFAULT '0',
  "gl_account_id" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_bank_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "bank_account_id" text NOT NULL,
  "date" timestamp NOT NULL,
  "type" text NOT NULL,
  "amount" numeric(18, 2) NOT NULL,
  "description" text,
  "reference" text,
  "reconciled" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_purchase_requisitions" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "ref_no" text NOT NULL,
  "requested_by_id" text NOT NULL,
  "department_id" text,
  "urgency" text DEFAULT 'normal',
  "justification" text,
  "required_by" timestamp,
  "stage_id" text,
  "status" text NOT NULL DEFAULT 'draft',
  "approved_by" text,
  "rejected_reason" text,
  "meta" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_pr_items" (
  "id" text PRIMARY KEY NOT NULL,
  "requisition_id" text NOT NULL,
  "item_id" text NOT NULL,
  "description" text,
  "qty" numeric(12, 3) NOT NULL,
  "unit" text,
  "estimated_rate" numeric(15, 2),
  "estimated_amount" numeric(15, 2),
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_grns" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "ref_no" text NOT NULL,
  "po_id" text,
  "vendor_id" text NOT NULL,
  "warehouse_id" text,
  "status" text DEFAULT 'draft',
  "received_by" text,
  "received_at" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_grn_items" (
  "id" text PRIMARY KEY NOT NULL,
  "grn_id" text NOT NULL,
  "item_id" text NOT NULL,
  "po_line_id" text,
  "qty_ordered" numeric(12, 3),
  "qty_received" numeric(12, 3) NOT NULL,
  "qty_accepted" numeric(12, 3),
  "qty_rejected" numeric(12, 3) DEFAULT '0',
  "rate" numeric(15, 2),
  "amount" numeric(15, 2),
  "batch_no" text,
  "expiry_date" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_delivery_notes" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "ref_no" text NOT NULL,
  "so_id" text,
  "customer_id" text NOT NULL,
  "warehouse_id" text,
  "status" text DEFAULT 'draft',
  "shipped_by" text,
  "shipped_at" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_dn_items" (
  "id" text PRIMARY KEY NOT NULL,
  "dn_id" text NOT NULL,
  "item_id" text NOT NULL,
  "so_line_id" text,
  "qty" numeric(12, 3) NOT NULL,
  "rate" numeric(15, 2),
  "amount" numeric(15, 2),
  "batch_no" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_stock_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "ref_no" text NOT NULL,
  "type" text NOT NULL,
  "from_warehouse_id" text,
  "to_warehouse_id" text,
  "status" text DEFAULT 'draft',
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_stock_entry_items" (
  "id" text PRIMARY KEY NOT NULL,
  "stock_entry_id" text NOT NULL,
  "item_id" text NOT NULL,
  "qty" numeric(12, 3) NOT NULL,
  "rate" numeric(15, 2),
  "amount" numeric(15, 2),
  "batch_no" text,
  "expiry_date" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_stock_ledger" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "item_id" text NOT NULL,
  "warehouse_id" text NOT NULL,
  "date" timestamp NOT NULL,
  "qty_change" numeric(12, 3) NOT NULL,
  "qty_after" numeric(12, 3) NOT NULL,
  "voucher_type" text,
  "voucher_id" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "erp_stock_ledger_item_warehouse_idx" ON "erp_stock_ledger" ("item_id", "warehouse_id");

CREATE TABLE IF NOT EXISTS "erp_bom" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "item_id" text NOT NULL,
  "version" integer DEFAULT 1,
  "is_active" boolean DEFAULT false,
  "quantity" numeric(12, 3) DEFAULT '1',
  "uom" text DEFAULT 'nos',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_bom_items" (
  "id" text PRIMARY KEY NOT NULL,
  "bom_id" text NOT NULL,
  "item_id" text NOT NULL,
  "qty" numeric(12, 3) NOT NULL,
  "uom" text DEFAULT 'nos',
  "rate" numeric(15, 2),
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_work_orders" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "ref_no" text NOT NULL,
  "item_id" text NOT NULL,
  "bom_id" text,
  "planned_qty" numeric(12, 3) NOT NULL,
  "produced_qty" numeric(12, 3) DEFAULT '0',
  "scrap_qty" numeric(12, 3) DEFAULT '0',
  "warehouse_id" text,
  "fg_warehouse_id" text,
  "status" text DEFAULT 'draft',
  "planned_start_date" timestamp,
  "planned_end_date" timestamp,
  "actual_start_date" timestamp,
  "actual_end_date" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_departments" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "parent_id" text,
  "head_person_id" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_designations" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "department_id" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_leave_types" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "days_allowed" integer DEFAULT 0,
  "carry_forward" boolean DEFAULT false,
  "encashable" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_leave_allocations" (
  "id" text PRIMARY KEY NOT NULL,
  "person_id" text NOT NULL,
  "leave_type_id" text NOT NULL,
  "year" integer NOT NULL,
  "total_days" numeric(5, 1) NOT NULL,
  "used_days" numeric(5, 1) DEFAULT '0',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_leave_applications" (
  "id" text PRIMARY KEY NOT NULL,
  "person_id" text NOT NULL,
  "leave_type_id" text NOT NULL,
  "from_date" timestamp NOT NULL,
  "to_date" timestamp NOT NULL,
  "days" numeric(5, 1) NOT NULL,
  "reason" text,
  "status" text DEFAULT 'draft',
  "approved_by" text,
  "rejected_reason" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_attendance" (
  "id" text PRIMARY KEY NOT NULL,
  "person_id" text NOT NULL,
  "date" timestamp NOT NULL,
  "status" text NOT NULL,
  "check_in" timestamp,
  "check_out" timestamp,
  "work_hours" numeric(4, 2)
);

CREATE INDEX IF NOT EXISTS "erp_attendance_person_date_idx" ON "erp_attendance" ("person_id", "date");

CREATE TABLE IF NOT EXISTS "erp_salary_structures" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "components" jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS "erp_payroll_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "period" text NOT NULL,
  "status" text DEFAULT 'draft',
  "employee_count" integer DEFAULT 0,
  "total_gross" numeric(18, 2) DEFAULT '0',
  "total_deductions" numeric(18, 2) DEFAULT '0',
  "total_net" numeric(18, 2) DEFAULT '0',
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_salary_slips" (
  "id" text PRIMARY KEY NOT NULL,
  "payroll_run_id" text NOT NULL,
  "person_id" text NOT NULL,
  "structure_id" text,
  "working_days" integer DEFAULT 0,
  "present_days" integer DEFAULT 0,
  "earnings" jsonb DEFAULT '[]',
  "deductions" jsonb DEFAULT '[]',
  "gross" numeric(18, 2) DEFAULT '0',
  "net" numeric(18, 2) DEFAULT '0',
  "status" text DEFAULT 'draft',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "item_id" text,
  "name" text NOT NULL,
  "category" text,
  "status" text DEFAULT 'active',
  "purchase_date" timestamp NOT NULL,
  "purchase_value" numeric(18, 2),
  "useful_life_months" integer DEFAULT 60,
  "depreciation_method" text DEFAULT 'straight-line',
  "book_value" numeric(18, 2),
  "location_id" text,
  "assigned_to_id" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_asset_depreciation" (
  "id" text PRIMARY KEY NOT NULL,
  "asset_id" text NOT NULL,
  "date" timestamp NOT NULL,
  "amount" numeric(18, 2) NOT NULL,
  "method" text DEFAULT 'straight-line',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_gst_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "type" text DEFAULT 'goods',
  "cgst_rate" numeric(5, 2) DEFAULT '0',
  "sgst_rate" numeric(5, 2) DEFAULT '0',
  "igst_rate" numeric(5, 2) DEFAULT '0',
  "cess_rate" numeric(5, 2) DEFAULT '0',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "erp_gst_returns" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "type" text NOT NULL,
  "period" text NOT NULL,
  "status" text DEFAULT 'draft',
  "data" jsonb DEFAULT '{}',
  "filed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
`;

const statements = ERP_DDL
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

console.log(`Applying ${statements.length} ERP DDL statements...`);

let applied = 0;
let skipped = 0;
let failed = 0;

for (const stmt of statements) {
  try {
    await sql.query(stmt + ";");
    applied++;
  } catch (err: any) {
    if (err?.message?.includes("already exists")) {
      skipped++;
    } else {
      console.error(`Failed: ${stmt.slice(0, 80)}...\n  Error: ${err?.message}`);
      failed++;
    }
  }
}

console.log(`Done. Applied: ${applied}, Skipped (exists): ${skipped}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
process.exit(0);
