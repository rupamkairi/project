-- 0007: access cleanup — retire rst_staff in favour of rst_outlet_assignments
-- and drop orphaned erp_* tables superseded by shared masters.
--
-- * `rst_staff` (0002) was superseded by `rst_outlet_assignments` (0004, same
--   columns). TS symbol `rstStaff` already points at the new table, so backfill
--   any legacy rows and drop the old table.
-- * `erp_bom`, `erp_bom_items`, `erp_gl_accounts`, `erp_journal_entries`,
--   `erp_journal_lines`, `erp_stock_ledger` were removed from the ERP TS schema
--   when BOM moved to catalog (`cat_*`), journals to ledger (`ldg_*`) and stock
--   to inventory (`inv_*`). Zero TS references remain; drop the tables after
--   removing constraints held by surviving tables.

INSERT INTO "rst_outlet_assignments" ("id", "organization_id", "created_at", "updated_at", "deleted_at", "version", "meta", "person_id", "employee_code", "outlet_id", "operational_roles", "is_active", "hire_date", "exit_date", "hourly_rate", "bank_account", "emergency_contact")
SELECT "id", "organization_id", "created_at", "updated_at", "deleted_at", "version", "meta", "person_id", "employee_code", "outlet_id", "operational_roles", "is_active", "hire_date", "exit_date", "hourly_rate", "bank_account", "emergency_contact"
FROM "rst_staff" AS "s"
WHERE NOT EXISTS (SELECT 1 FROM "rst_outlet_assignments" AS "d" WHERE "d"."id" = "s"."id");--> statement-breakpoint
DROP TABLE IF EXISTS "rst_staff";--> statement-breakpoint
ALTER TABLE "erp_bank_accounts" DROP CONSTRAINT IF EXISTS "erp_bank_accounts_gl_account_id_erp_gl_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "erp_work_orders" DROP CONSTRAINT IF EXISTS "erp_work_orders_bom_id_erp_bom_id_fk";--> statement-breakpoint
DROP TABLE IF EXISTS "erp_bom_items";--> statement-breakpoint
DROP TABLE IF EXISTS "erp_bom";--> statement-breakpoint
DROP TABLE IF EXISTS "erp_journal_lines";--> statement-breakpoint
DROP TABLE IF EXISTS "erp_journal_entries";--> statement-breakpoint
DROP TABLE IF EXISTS "erp_gl_accounts";--> statement-breakpoint
DROP TABLE IF EXISTS "erp_stock_ledger";
