CREATE TYPE "public"."activity_status" AS ENUM('pending', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('call', 'email', 'meeting', 'note', 'task', 'log', 'service_request', 'visit_note');--> statement-breakpoint
CREATE TYPE "public"."cat_item_type" AS ENUM('product', 'service', 'course', 'menu_item', 'room_type', 'asset', 'stock_item', 'drug', 'lab_test');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('outlet', 'table', 'room', 'warehouse', 'ward', 'bed', 'virtual', 'building', 'floor');--> statement-breakpoint
CREATE TYPE "public"."party_type" AS ENUM('company', 'vendor', 'insurer', 'school', 'clinic', 'corporate', 'ngo');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('lead', 'contact', 'customer', 'student', 'patient', 'guest', 'rider', 'vendor_contact', 'instructor');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('order', 'invoice', 'purchase_order', 'sales_order', 'bill', 'folio', 'quote', 'receipt');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"type" "activity_type" NOT NULL,
	"subject" text,
	"body" text,
	"status" "activity_status" DEFAULT 'pending' NOT NULL,
	"actor_id" text,
	"entity_id" text,
	"entity_type" text,
	"due_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "erp_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'active',
	"purchase_date" timestamp NOT NULL,
	"purchase_cost" numeric(15, 2) NOT NULL,
	"useful_life_years" integer NOT NULL,
	"depreciation_method" text DEFAULT 'straight-line',
	"accumulated_depreciation" numeric(15, 2) DEFAULT '0',
	"book_value" numeric(15, 2),
	"location_id" text,
	"assigned_to_id" text
);
--> statement-breakpoint
CREATE TABLE "erp_asset_depreciation" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"period" text NOT NULL,
	"depreciation_amount" numeric(15, 2) NOT NULL,
	"book_value_after" numeric(15, 2) NOT NULL,
	"posted_at" timestamp,
	"journal_entry_id" text
);
--> statement-breakpoint
CREATE TABLE "erp_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"status" text NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"work_hours" numeric(4, 2)
);
--> statement-breakpoint
CREATE TABLE "erp_bank_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"account_name" text NOT NULL,
	"account_no" text NOT NULL,
	"bank_name" text NOT NULL,
	"ifsc" text,
	"currency" text DEFAULT 'INR',
	"gl_account_id" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "erp_bank_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"bank_account_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"description" text,
	"debit" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0',
	"balance" numeric(15, 2),
	"status" text DEFAULT 'unmatched',
	"matched_transaction_id" text
);
--> statement-breakpoint
CREATE TABLE "erp_bom" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" text NOT NULL,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"quantity" numeric(12, 3) DEFAULT '1',
	"uom" text NOT NULL,
	"operating_cost" numeric(15, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "erp_bom_items" (
	"id" text PRIMARY KEY NOT NULL,
	"bom_id" text NOT NULL,
	"component_item_id" text NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"uom" text NOT NULL,
	"scrap_percent" numeric(5, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "erp_delivery_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"dn_number" text NOT NULL,
	"transaction_id" text NOT NULL,
	"location_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"shipping_address" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "erp_departments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"parent_id" text,
	"manager_id" text
);
--> statement-breakpoint
CREATE TABLE "erp_designations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1,
	"department_id" text
);
--> statement-breakpoint
CREATE TABLE "erp_dn_items" (
	"id" text PRIMARY KEY NOT NULL,
	"dn_id" text NOT NULL,
	"transaction_line_id" text NOT NULL,
	"item_id" text NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"uom" text NOT NULL,
	"batch_no" text,
	"valuation_rate" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE "erp_fiscal_years" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_closed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "erp_gl_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"sub_type" text,
	"parent_id" text,
	"currency" text DEFAULT 'INR',
	"is_group" boolean DEFAULT false,
	"is_frozen" boolean DEFAULT false,
	"balance" numeric(15, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "erp_grns" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"grn_number" text NOT NULL,
	"transaction_id" text NOT NULL,
	"location_id" text NOT NULL,
	"received_by_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"quality_notes" text,
	"received_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "erp_grn_items" (
	"id" text PRIMARY KEY NOT NULL,
	"grn_id" text NOT NULL,
	"item_id" text NOT NULL,
	"qty_ordered" numeric(12, 3) NOT NULL,
	"qty_received" numeric(12, 3) NOT NULL,
	"qty_accepted" numeric(12, 3) NOT NULL,
	"qty_rejected" numeric(12, 3) DEFAULT '0',
	"condition" text,
	"rejection_reason" text,
	"batch_no" text,
	"expiry_date" timestamp,
	"valuation_rate" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE "erp_gst_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'draft',
	"data" jsonb,
	"filed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "erp_gst_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"cgst_rate" numeric(5, 2) DEFAULT '0',
	"sgst_rate" numeric(5, 2) DEFAULT '0',
	"igst_rate" numeric(5, 2) DEFAULT '0',
	"cess_rate" numeric(5, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "erp_journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"transaction_id" text,
	"date" timestamp NOT NULL,
	"reference" text,
	"reference_type" text,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_debit" numeric(15, 2) DEFAULT '0',
	"total_credit" numeric(15, 2) DEFAULT '0',
	"fiscal_year_id" text,
	"posted_by" text,
	"posted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "erp_journal_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"journal_id" text NOT NULL,
	"gl_account_id" text NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0',
	"party_id" text,
	"person_id" text,
	"cost_center" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "erp_leave_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"leave_type_id" text NOT NULL,
	"year" integer NOT NULL,
	"allocated" numeric(5, 1) NOT NULL,
	"used" numeric(5, 1) DEFAULT '0',
	"balance" numeric(5, 1)
);
--> statement-breakpoint
CREATE TABLE "erp_leave_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"leave_type_id" text NOT NULL,
	"from_date" timestamp NOT NULL,
	"to_date" timestamp NOT NULL,
	"days" numeric(5, 1) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reason" text,
	"approved_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "erp_leave_types" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"max_days" integer DEFAULT 0,
	"is_paid" boolean DEFAULT true,
	"is_carry_forward" boolean DEFAULT false,
	"max_carry_forward" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "erp_payroll_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"processed_at" timestamp,
	"total_gross" numeric(15, 2) DEFAULT '0',
	"total_deductions" numeric(15, 2) DEFAULT '0',
	"total_net" numeric(15, 2) DEFAULT '0',
	"employee_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "erp_pr_items" (
	"id" text PRIMARY KEY NOT NULL,
	"requisition_id" text NOT NULL,
	"item_id" text NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"uom" text NOT NULL,
	"estimated_unit_cost" numeric(15, 2),
	"preferred_vendor_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "erp_purchase_requisitions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ref_no" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"department_id" text,
	"urgency" text DEFAULT 'normal',
	"justification" text,
	"required_by" timestamp,
	"stage_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" text,
	"rejected_reason" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "erp_salary_slips" (
	"id" text PRIMARY KEY NOT NULL,
	"payroll_run_id" text NOT NULL,
	"person_id" text NOT NULL,
	"working_days" integer NOT NULL,
	"present_days" integer NOT NULL,
	"structure_id" text,
	"earnings" jsonb NOT NULL,
	"deductions" jsonb NOT NULL,
	"gross" numeric(15, 2) NOT NULL,
	"net" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"journal_entry_id" text
);
--> statement-breakpoint
CREATE TABLE "erp_salary_structures" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"components" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_stock_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"date" timestamp NOT NULL,
	"reference" text,
	"reference_type" text,
	"total_value" numeric(15, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "erp_stock_entry_items" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"item_id" text NOT NULL,
	"location_from" text,
	"location_to" text,
	"qty" numeric(12, 3) NOT NULL,
	"valuation_rate" numeric(15, 2),
	"line_value" numeric(15, 2),
	"batch_no" text
);
--> statement-breakpoint
CREATE TABLE "erp_stock_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"location_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"valuation_rate" numeric(15, 2),
	"stock_value" numeric(15, 2),
	"balance" numeric(12, 3),
	"entry_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_work_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"wo_number" text NOT NULL,
	"bom_id" text NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"produced_qty" numeric(12, 3) DEFAULT '0',
	"target_location_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"stage_id" text,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"type" "location_type" NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"capacity" integer,
	"parent_id" text,
	"address_id" text,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"type" "party_type" DEFAULT 'company' NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"industry" text,
	"employee_count" integer
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"type" "person_type" DEFAULT 'contact' NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"source" text,
	"party_id" text,
	"actor_id" text
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pipeline_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity_type" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_index" (
	"id" text PRIMARY KEY NOT NULL,
	"collection" text NOT NULL,
	"entity_id" text NOT NULL,
	"org_id" text NOT NULL,
	"content" "tsvector" NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transaction_id" text NOT NULL,
	"item_id" text,
	"description" text,
	"qty" integer DEFAULT 1 NOT NULL,
	"unitPrice_amount" integer NOT NULL,
	"unitPrice_currency" text NOT NULL,
	"tax_rate" integer DEFAULT 0 NOT NULL,
	"lineTotal_amount" integer NOT NULL,
	"lineTotal_currency" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"type" "transaction_type" NOT NULL,
	"reference_no" text,
	"person_id" text,
	"party_id" text,
	"stage_id" text,
	"total_amount" integer NOT NULL,
	"total_currency" text NOT NULL,
	"tax_amount" integer NOT NULL,
	"tax_currency" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cat_items" ADD COLUMN "type" "cat_item_type" DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "erp_asset_depreciation" ADD CONSTRAINT "erp_asset_depreciation_asset_id_erp_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."erp_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_bank_accounts" ADD CONSTRAINT "erp_bank_accounts_gl_account_id_erp_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."erp_gl_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_bank_transactions" ADD CONSTRAINT "erp_bank_transactions_bank_account_id_erp_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."erp_bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_bom_items" ADD CONSTRAINT "erp_bom_items_bom_id_erp_bom_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."erp_bom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_designations" ADD CONSTRAINT "erp_designations_department_id_erp_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."erp_departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_dn_items" ADD CONSTRAINT "erp_dn_items_dn_id_erp_delivery_notes_id_fk" FOREIGN KEY ("dn_id") REFERENCES "public"."erp_delivery_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_grn_items" ADD CONSTRAINT "erp_grn_items_grn_id_erp_grns_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."erp_grns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_journal_entries" ADD CONSTRAINT "erp_journal_entries_fiscal_year_id_erp_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."erp_fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_journal_lines" ADD CONSTRAINT "erp_journal_lines_journal_id_erp_journal_entries_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."erp_journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_journal_lines" ADD CONSTRAINT "erp_journal_lines_gl_account_id_erp_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."erp_gl_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_leave_allocations" ADD CONSTRAINT "erp_leave_allocations_leave_type_id_erp_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."erp_leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_pr_items" ADD CONSTRAINT "erp_pr_items_requisition_id_erp_purchase_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."erp_purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_salary_slips" ADD CONSTRAINT "erp_salary_slips_payroll_run_id_erp_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."erp_payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_salary_slips" ADD CONSTRAINT "erp_salary_slips_structure_id_erp_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."erp_salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_stock_entry_items" ADD CONSTRAINT "erp_stock_entry_items_entry_id_erp_stock_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."erp_stock_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_work_orders" ADD CONSTRAINT "erp_work_orders_bom_id_erp_bom_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."erp_bom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_org_entity_idx" ON "activities" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activities_org_actor_idx" ON "activities" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE INDEX "activities_org_status_due_idx" ON "activities" USING btree ("organization_id","status","due_at");--> statement-breakpoint
CREATE INDEX "att_person_date_idx" ON "erp_attendance" USING btree ("person_id","date");--> statement-breakpoint
CREATE INDEX "slg_item_loc_date_idx" ON "erp_stock_ledger" USING btree ("item_id","location_id","date");--> statement-breakpoint
CREATE INDEX "locations_org_type_idx" ON "locations" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "locations_org_parent_idx" ON "locations" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "locations_org_code_idx" ON "locations" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "parties_org_type_idx" ON "parties" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "parties_org_domain_idx" ON "parties" USING btree ("organization_id","domain");--> statement-breakpoint
CREATE INDEX "persons_org_type_idx" ON "persons" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "persons_org_email_idx" ON "persons" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "persons_org_party_idx" ON "persons" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "persons_org_actor_idx" ON "persons" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE INDEX "pipeline_stages_org_pipeline_position_idx" ON "pipeline_stages" USING btree ("organization_id","pipeline_id","position");--> statement-breakpoint
CREATE INDEX "pipelines_org_entity_idx" ON "pipelines" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE INDEX "search_index_content_gin" ON "search_index" USING gin ("content");--> statement-breakpoint
CREATE INDEX "search_index_collection_org_idx" ON "search_index" USING btree ("collection","org_id");--> statement-breakpoint
CREATE INDEX "transaction_lines_org_transaction_idx" ON "transaction_lines" USING btree ("organization_id","transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_lines_org_item_idx" ON "transaction_lines" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "transactions_org_type_idx" ON "transactions" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "transactions_org_stage_idx" ON "transactions" USING btree ("organization_id","stage_id");--> statement-breakpoint
CREATE INDEX "transactions_org_person_idx" ON "transactions" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "transactions_org_party_idx" ON "transactions" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "cat_items_org_type_idx" ON "cat_items" USING btree ("organization_id","type");