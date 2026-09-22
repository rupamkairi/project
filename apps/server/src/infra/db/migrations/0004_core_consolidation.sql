CREATE TABLE IF NOT EXISTS "cat_bom_headers" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "parent_item_id" text NOT NULL,
  "name" text,
  "yield_qty" integer DEFAULT 1 NOT NULL,
  "uom" text DEFAULT 'ea' NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS "cat_bom_headers_org_parent_idx" ON "cat_bom_headers" ("organization_id", "parent_item_id");
CREATE INDEX IF NOT EXISTS "cat_bom_headers_org_active_idx" ON "cat_bom_headers" ("organization_id", "is_active");

CREATE TABLE IF NOT EXISTS "cat_bom_lines" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "bom_id" text NOT NULL,
  "component_item_id" text NOT NULL,
  "qty" integer DEFAULT 1 NOT NULL,
  "uom" text DEFAULT 'ea' NOT NULL,
  "scrap_percent" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "cat_bom_lines_org_bom_idx" ON "cat_bom_lines" ("organization_id", "bom_id");
CREATE INDEX IF NOT EXISTS "cat_bom_lines_org_component_idx" ON "cat_bom_lines" ("organization_id", "component_item_id");

CREATE TABLE IF NOT EXISTS "tax_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "name" text NOT NULL,
  "provider" text DEFAULT 'manual' NOT NULL,
  "jurisdiction" text
);

CREATE INDEX IF NOT EXISTS "tax_templates_org_idx" ON "tax_templates" ("organization_id");

CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "template_id" text NOT NULL,
  "name" text NOT NULL,
  "rate_bps" integer DEFAULT 0 NOT NULL,
  "jurisdiction" text,
  "product_type" text,
  "is_default" boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS "tax_rates_org_template_idx" ON "tax_rates" ("organization_id", "template_id");

CREATE TABLE IF NOT EXISTS "rst_outlet_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "person_id" text NOT NULL,
  "employee_code" text,
  "outlet_id" text NOT NULL,
  "operational_roles" jsonb DEFAULT '[]'::jsonb,
  "is_active" boolean DEFAULT true,
  "hire_date" date,
  "exit_date" date,
  "hourly_rate" numeric(8, 2),
  "bank_account" text,
  "emergency_contact" jsonb
);

ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "booking_id" text;
ALTER TABLE "rst_shift_assignments" ADD COLUMN IF NOT EXISTS "booking_id" text;
