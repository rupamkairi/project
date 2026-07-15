-- Restaurant Management Expansion
-- Drops delivery, expands existing tables, adds new tables

-- 1. Drop delivery table
DROP TABLE IF EXISTS "rst_deliveries" CASCADE;

-- 2. Expand rst_categories
ALTER TABLE "rst_categories" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "rst_categories" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "rst_categories" ADD COLUMN IF NOT EXISTS "outlet_id" text;
ALTER TABLE "rst_categories" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "rst_categories" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- 3. Expand rst_kot
ALTER TABLE "rst_kot" ADD COLUMN IF NOT EXISTS "course" text DEFAULT 'main';
ALTER TABLE "rst_kot" ADD COLUMN IF NOT EXISTS "hold_fire" text DEFAULT 'fire';
ALTER TABLE "rst_kot" ADD COLUMN IF NOT EXISTS "bumped_at" timestamp;

-- 4. Expand rst_modifiers / rst_modifier_groups
ALTER TABLE "rst_modifiers" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE "rst_modifiers" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0;
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "min_selections" integer DEFAULT 0;
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "max_selections" integer DEFAULT 1;
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "outlet_id" text;

-- 5. Expand rst_reservations
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "table_id" text;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "guest_name" text NOT NULL DEFAULT '';
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "guest_phone" text;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "guest_email" text;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "duration_minutes" integer DEFAULT 90;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "occasion" text;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'phone';
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "deposit_amount" numeric(8,2) DEFAULT '0';
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "deposit_paid" boolean DEFAULT false;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "seated_at" timestamp;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "cancel_reason" text;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "no_show_at" timestamp;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
-- Drop default constraint from guest_name after setting
ALTER TABLE "rst_reservations" ALTER COLUMN "guest_name" DROP DEFAULT;

-- 6. Expand rst_shifts
ALTER TABLE "rst_shifts" ADD COLUMN IF NOT EXISTS "expected_balance" numeric(10,2);
ALTER TABLE "rst_shifts" ADD COLUMN IF NOT EXISTS "variance_approved" boolean DEFAULT false;

-- 7. Expand rst_shift_assignments
ALTER TABLE "rst_shift_assignments" ADD COLUMN IF NOT EXISTS "total_hours" numeric(4,2);
ALTER TABLE "rst_shift_assignments" ADD COLUMN IF NOT EXISTS "notes" text;

-- 8. Expand rst_recipes
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT '';
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "instructions" text;
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "prep_time_minutes" integer;
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "cook_time_minutes" integer;
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
ALTER TABLE "rst_recipes" RENAME COLUMN "yield" TO "yield_qty";
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "yield_unit" text DEFAULT 'portions';
ALTER TABLE "rst_recipes" ALTER COLUMN "name" DROP DEFAULT;

-- 9. Expand rst_recipe_ingredients
ALTER TABLE "rst_recipe_ingredients" ADD COLUMN IF NOT EXISTS "wastage_pct" numeric(5,2) DEFAULT '0';
ALTER TABLE "rst_recipe_ingredients" ADD COLUMN IF NOT EXISTS "is_optional" boolean DEFAULT false;

-- 10. New: rst_menu_periods
CREATE TABLE IF NOT EXISTS "rst_menu_periods" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "outlet_id" text NOT NULL,
  "name" text NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "days_of_week" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

-- 11. New: rst_item_variants
CREATE TABLE IF NOT EXISTS "rst_item_variants" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "item_id" text NOT NULL,
  "name" text NOT NULL,
  "price_adjustment" numeric(8,2) DEFAULT '0',
  "is_default" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0
);

-- 12. New: rst_item_allergens
CREATE TABLE IF NOT EXISTS "rst_item_allergens" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "item_id" text NOT NULL,
  "allergen" text NOT NULL,
  "severity" text DEFAULT 'contains'
);

-- 13. New: rst_order_history
CREATE TABLE IF NOT EXISTS "rst_order_history" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "order_id" text NOT NULL,
  "from_status" text,
  "to_status" text NOT NULL,
  "actor_id" text,
  "actor_name" text,
  "note" text,
  "changed_at" timestamp DEFAULT now()
);

-- 14. New: rst_stock_movements
CREATE TABLE IF NOT EXISTS "rst_stock_movements" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "item_id" text NOT NULL,
  "outlet_id" text NOT NULL,
  "movement_type" text NOT NULL,
  "qty" numeric(10,3) NOT NULL,
  "unit" text NOT NULL,
  "before_qty" numeric(10,3),
  "after_qty" numeric(10,3),
  "reference_type" text,
  "reference_id" text,
  "reason" text,
  "performed_by" text,
  "cost_per_unit" numeric(10,3),
  "created_at" timestamp DEFAULT now()
);

-- 15. New: rst_equipment
CREATE TABLE IF NOT EXISTS "rst_equipment" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "outlet_id" text NOT NULL,
  "category" text NOT NULL,
  "name" text NOT NULL,
  "serial_number" text,
  "reference" text,
  "purchase_date" date,
  "warranty_expiry" date,
  "purchase_cost" numeric(10,2),
  "status" text DEFAULT 'active',
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- 16. New: rst_equipment_logs
CREATE TABLE IF NOT EXISTS "rst_equipment_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "equipment_id" text NOT NULL REFERENCES "rst_equipment"("id"),
  "log_type" text NOT NULL,
  "description" text NOT NULL,
  "service_date" date NOT NULL,
  "service_cost" numeric(10,2),
  "performed_by" text,
  "notes" text,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

-- 17. New: rst_partners
CREATE TABLE IF NOT EXISTS "rst_partners" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "partner_type" text NOT NULL,
  "name" text NOT NULL,
  "contact_name" text,
  "contact_phone" text,
  "contact_email" text,
  "platform" text,
  "store_id" text,
  "agreement_notes" text,
  "commission_pct" numeric(5,2),
  "service_areas" jsonb DEFAULT '[]'::jsonb,
  "handoff_method" text DEFAULT 'manual',
  "api_key_hash" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- 18. New: rst_staff
CREATE TABLE IF NOT EXISTS "rst_staff" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "person_id" text NOT NULL,
  "employee_code" text,
  "outlet_id" text NOT NULL,
  "operational_roles" jsonb DEFAULT '[]'::jsonb,
  "is_active" boolean DEFAULT true,
  "hire_date" date,
  "exit_date" date,
  "hourly_rate" numeric(8,2),
  "bank_account" text,
  "emergency_contact" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- 19. New: rst_waitlist
CREATE TABLE IF NOT EXISTS "rst_waitlist" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "location_id" text NOT NULL,
  "guest_name" text NOT NULL,
  "guest_phone" text,
  "party_size" integer NOT NULL,
  "quoted_minutes" integer,
  "status" text DEFAULT 'waiting',
  "joined_at" timestamp DEFAULT now(),
  "notified_at" timestamp,
  "seated_at" timestamp,
  "cancelled_at" timestamp,
  "notes" text
);

-- 20. New: rst_bills
CREATE TABLE IF NOT EXISTS "rst_bills" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "order_id" text NOT NULL,
  "outlet_id" text NOT NULL,
  "bill_number" text NOT NULL,
  "subtotal" numeric(10,2) NOT NULL DEFAULT '0',
  "discount_total" numeric(10,2) DEFAULT '0',
  "tax_total" numeric(10,2) DEFAULT '0',
  "service_charge" numeric(10,2) DEFAULT '0',
  "tip_amount" numeric(10,2) DEFAULT '0',
  "round_off" numeric(4,2) DEFAULT '0',
  "grand_total" numeric(10,2) NOT NULL DEFAULT '0',
  "status" text DEFAULT 'open',
  "table_id" text,
  "cover_count" integer,
  "cashier_id" text,
  "shift_id" text,
  "receipt_number" text,
  "created_at" timestamp DEFAULT now(),
  "settled_at" timestamp,
  "voided_at" timestamp,
  "void_reason" text
);

-- 21. New: rst_bill_payments
CREATE TABLE IF NOT EXISTS "rst_bill_payments" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "bill_id" text NOT NULL REFERENCES "rst_bills"("id"),
  "method" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "reference_number" text,
  "card_last_four" text,
  "is_refund" boolean DEFAULT false,
  "refund_reason" text,
  "created_at" timestamp DEFAULT now()
);

-- 22. New: rst_bill_splits
CREATE TABLE IF NOT EXISTS "rst_bill_splits" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "bill_id" text NOT NULL REFERENCES "rst_bills"("id"),
  "guest_label" text NOT NULL,
  "item_ids" jsonb DEFAULT '[]'::jsonb,
  "subtotal" numeric(10,2) DEFAULT '0'
);

-- 23. New: rst_discounts
CREATE TABLE IF NOT EXISTS "rst_discounts" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "discount_type" text NOT NULL,
  "value" numeric(8,2) NOT NULL,
  "is_percentage" boolean DEFAULT true,
  "applies_to" text DEFAULT 'order',
  "requires_approval" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "outlet_id" text,
  "created_at" timestamp DEFAULT now()
);
