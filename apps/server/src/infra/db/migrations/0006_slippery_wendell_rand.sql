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
CREATE TABLE "rst_aggregator_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"platform" text NOT NULL,
	"store_id" text NOT NULL,
	"api_key_hash" text,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"sync_status" text DEFAULT 'idle',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rst_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"parent_id" text,
	"is_active" boolean DEFAULT true,
	"meal_period" text DEFAULT 'all'
);
--> statement-breakpoint
CREATE TABLE "rst_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"person_id" text,
	"stage_id" text,
	"tracking_code" text,
	"pickup_at" timestamp,
	"delivered_at" timestamp,
	"delivery_address" text,
	"distance_km" numeric(6, 2),
	"estimated_delivery_at" timestamp,
	"rider_location" jsonb,
	"proof_of_delivery" text,
	"failure_reason" text,
	"status" text DEFAULT 'unassigned' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rst_kot" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"location_id" text,
	"kot_number" text NOT NULL,
	"station" text NOT NULL,
	"priority" text DEFAULT 'normal',
	"printed_at" timestamp,
	"status" text DEFAULT 'new' NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"prep_start_at" timestamp,
	"ready_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "rst_kot_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"kot_id" text NOT NULL,
	"transaction_line_id" text NOT NULL,
	"item_id" text NOT NULL,
	"name" text NOT NULL,
	"qty" integer NOT NULL,
	"notes" text,
	"modifiers" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "rst_modifier_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"selection_type" text NOT NULL,
	"required" boolean DEFAULT false,
	"item_ids" jsonb DEFAULT '[]'::jsonb,
	"modifier_ids" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "rst_modifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"price_adjustment" numeric(8, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "rst_recipe_ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"item_id" text NOT NULL,
	"qty" numeric(10, 3) NOT NULL,
	"unit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rst_recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" text NOT NULL,
	"version" integer DEFAULT 1,
	"yield" numeric(6, 2),
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rst_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"person_id" text,
	"party_size" integer NOT NULL,
	"reserved_at" timestamp NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rst_shift_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"person_id" text NOT NULL,
	"role" text NOT NULL,
	"clock_in" timestamp,
	"clock_out" timestamp
);
--> statement-breakpoint
CREATE TABLE "rst_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"shift_type" text,
	"status" text DEFAULT 'open',
	"opened_by" text,
	"closed_by" text,
	"opening_balance" numeric(10, 2) DEFAULT '0',
	"closing_balance" numeric(10, 2),
	"variance" numeric(10, 2),
	"approved_by" text,
	"notes" text,
	"opened_at" timestamp DEFAULT now(),
	"closed_at" timestamp
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
ALTER TABLE "rst_kot_items" ADD CONSTRAINT "rst_kot_items_kot_id_rst_kot_id_fk" FOREIGN KEY ("kot_id") REFERENCES "public"."rst_kot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rst_recipe_ingredients" ADD CONSTRAINT "rst_recipe_ingredients_recipe_id_rst_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."rst_recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rst_shift_assignments" ADD CONSTRAINT "rst_shift_assignments_shift_id_rst_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."rst_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_org_entity_idx" ON "activities" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activities_org_actor_idx" ON "activities" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE INDEX "activities_org_status_due_idx" ON "activities" USING btree ("organization_id","status","due_at");--> statement-breakpoint
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