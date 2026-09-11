-- Restaurant DB Refactor
-- Removes redundant rst_* tables in favor of shared masters, renames bill/equipment
-- detail columns, and aligns kept rst_* tables with baseColumns.

-- 1. Drop foreign keys on kept tables that no longer use `.references()`.
ALTER TABLE "rst_kot_items" DROP CONSTRAINT IF EXISTS "rst_kot_items_kot_id_rst_kot_id_fk";
ALTER TABLE "rst_recipe_ingredients" DROP CONSTRAINT IF EXISTS "rst_recipe_ingredients_recipe_id_rst_recipes_id_fk";
ALTER TABLE "rst_shift_assignments" DROP CONSTRAINT IF EXISTS "rst_shift_assignments_shift_id_rst_shifts_id_fk";

-- 2. Rename bill/equipment detail columns.
ALTER TABLE "rst_bill_payments" RENAME COLUMN "bill_id" TO "transaction_id";
ALTER TABLE "rst_bill_splits" RENAME COLUMN "bill_id" TO "transaction_id";
ALTER TABLE "rst_equipment_logs" RENAME COLUMN "equipment_id" TO "item_id";

-- 3. Drop redundant tables (CASCADE drops remaining FKs from renamed detail columns).
DROP TABLE IF EXISTS "rst_categories" CASCADE;
DROP TABLE IF EXISTS "rst_item_variants" CASCADE;
DROP TABLE IF EXISTS "rst_item_allergens" CASCADE;
DROP TABLE IF EXISTS "rst_order_history" CASCADE;
DROP TABLE IF EXISTS "rst_bills" CASCADE;
DROP TABLE IF EXISTS "rst_equipment" CASCADE;

-- 4. Add party_id to rst_partners.
ALTER TABLE "rst_partners" ADD COLUMN IF NOT EXISTS "party_id" text;

-- 5. Add baseColumns fields (created_at, updated_at, deleted_at, version, meta) to kept tables.

-- rst_menu_periods (has created_at)
ALTER TABLE "rst_menu_periods" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_menu_periods" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_menu_periods" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_menu_periods" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_modifiers
ALTER TABLE "rst_modifiers" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_modifiers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_modifiers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_modifiers" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_modifiers" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_modifier_groups
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_modifier_groups" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_kot
ALTER TABLE "rst_kot" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_kot" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_kot" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_kot" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_kot" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_kot_items
ALTER TABLE "rst_kot_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_kot_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_kot_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_kot_items" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_kot_items" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_shifts
ALTER TABLE "rst_shifts" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_shifts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_shifts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_shifts" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_shifts" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_shift_assignments
ALTER TABLE "rst_shift_assignments" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_shift_assignments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_shift_assignments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_shift_assignments" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_shift_assignments" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_staff (has created_at, updated_at)
ALTER TABLE "rst_staff" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_staff" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_staff" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_reservations (has created_at, updated_at)
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_reservations" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_waitlist
ALTER TABLE "rst_waitlist" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_waitlist" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_waitlist" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_waitlist" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_waitlist" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_recipes (has created_at, updated_at, version)
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_recipes" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_recipe_ingredients
ALTER TABLE "rst_recipe_ingredients" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_recipe_ingredients" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_recipe_ingredients" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_recipe_ingredients" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_recipe_ingredients" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_stock_movements (has created_at)
ALTER TABLE "rst_stock_movements" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_stock_movements" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_stock_movements" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_stock_movements" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_equipment_logs (has created_at; equipment_id already renamed to item_id)
ALTER TABLE "rst_equipment_logs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_equipment_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_equipment_logs" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_equipment_logs" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_partners (has created_at, updated_at; party_id already added)
ALTER TABLE "rst_partners" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_partners" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_partners" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_aggregator_mappings (has created_at)
ALTER TABLE "rst_aggregator_mappings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_aggregator_mappings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_aggregator_mappings" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_aggregator_mappings" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_bill_payments (has created_at; bill_id already renamed to transaction_id)
ALTER TABLE "rst_bill_payments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_bill_payments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_bill_payments" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_bill_payments" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_bill_splits (bill_id already renamed to transaction_id)
ALTER TABLE "rst_bill_splits" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_bill_splits" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_bill_splits" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_bill_splits" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_bill_splits" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- rst_discounts (has created_at)
ALTER TABLE "rst_discounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "rst_discounts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "rst_discounts" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "rst_discounts" ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;
