CREATE TYPE "public"."cat_item_type" AS ENUM('product', 'service', 'course', 'menu_item', 'room_type', 'asset', 'stock_item', 'drug', 'lab_test');--> statement-breakpoint
CREATE TYPE "public"."party_type" AS ENUM('company', 'vendor', 'insurer', 'school', 'clinic', 'corporate', 'ngo');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('lead', 'contact', 'customer', 'student', 'patient', 'guest', 'rider', 'vendor_contact', 'instructor');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('outlet', 'table', 'room', 'warehouse', 'ward', 'bed', 'virtual', 'building', 'floor');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('order', 'invoice', 'purchase_order', 'sales_order', 'bill', 'folio', 'quote', 'receipt');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('pending', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('call', 'email', 'meeting', 'note', 'task', 'log', 'service_request', 'visit_note');--> statement-breakpoint
CREATE TABLE "eco_cart" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transaction_id" text NOT NULL,
	"region_id" text,
	"coupon_id" text,
	"abandoned_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "eco_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transaction_id" text NOT NULL,
	"type" text NOT NULL,
	"resolution" text,
	"status" text DEFAULT 'open' NOT NULL,
	"description" text,
	"refund_amount" jsonb,
	"replacement_transaction_id" text
);
--> statement-breakpoint
CREATE TABLE "eco_customer_group_members" (
	"group_id" text NOT NULL,
	"person_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eco_customer_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"conditions" jsonb,
	"pricing_multiplier" numeric
);
--> statement-breakpoint
CREATE TABLE "eco_draft_order_items" (
	"draft_order_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" jsonb
);
--> statement-breakpoint
CREATE TABLE "eco_draft_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"person_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"billing_address_id" text,
	"shipping_address_id" text,
	"shipping_option_id" text,
	"region_id" text,
	"payment_method" text,
	"discount" jsonb,
	"note" text,
	"placed_transaction_id" text
);
--> statement-breakpoint
CREATE TABLE "eco_fulfillment_items" (
	"fulfillment_id" text NOT NULL,
	"transaction_line_id" text NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eco_fulfillments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transaction_id" text NOT NULL,
	"location_id" text,
	"stage_id" text,
	"provider_id" text,
	"tracking_number" text,
	"tracking_url" text,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"estimated_delivery" timestamp
);
--> statement-breakpoint
CREATE TABLE "eco_gift_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"code" text NOT NULL,
	"balance" jsonb NOT NULL,
	"original_amount" jsonb NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp,
	"person_id" text,
	"transaction_id" text,
	"issued_to_email" text
);
--> statement-breakpoint
CREATE TABLE "eco_order_edit_items" (
	"order_edit_id" text NOT NULL,
	"type" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" jsonb
);
--> statement-breakpoint
CREATE TABLE "eco_order_edits" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transaction_id" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"requested_by_id" text,
	"confirmed_by_id" text,
	"note" text,
	"total_difference" jsonb,
	"payment_session_id" text,
	"refund_amount" jsonb,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "eco_regions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"countries" text[] DEFAULT '{}',
	"tax_profile_id" text,
	"payment_providers" text[] DEFAULT '{}',
	"fulfillment_providers" text[] DEFAULT '{}',
	"is_default" boolean DEFAULT false NOT NULL,
	"tax_included" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eco_return_items" (
	"return_id" text NOT NULL,
	"transaction_line_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"condition" text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eco_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transaction_id" text NOT NULL,
	"stage_id" text,
	"reason" text NOT NULL,
	"reason_note" text,
	"shipping_option_id" text,
	"tracking_number" text,
	"refund_amount" jsonb,
	"requested_at" timestamp,
	"approved_at" timestamp,
	"received_at" timestamp,
	"refunded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "eco_shipping_options" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"provider_id" text,
	"region_id" text,
	"type" text DEFAULT 'flat_rate' NOT NULL,
	"rate" jsonb,
	"conditions" jsonb,
	"estimated_days" integer,
	"requires_shipping" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eco_swap_items" (
	"swap_id" text NOT NULL,
	"transaction_line_id" text NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eco_swap_new_items" (
	"swap_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" jsonb
);
--> statement-breakpoint
CREATE TABLE "eco_swaps" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transaction_id" text NOT NULL,
	"stage_id" text,
	"difference" jsonb,
	"payment_session_id" text,
	"return_id" text
);
--> statement-breakpoint
CREATE TABLE "eco_tax_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eco_tax_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tax_profile_id" text NOT NULL,
	"name" text NOT NULL,
	"rate" numeric NOT NULL,
	"jurisdiction" text,
	"product_type" text,
	"is_default" boolean DEFAULT false NOT NULL
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
ALTER TABLE "cat_items" ADD COLUMN "type" "cat_item_type" DEFAULT 'product' NOT NULL;--> statement-breakpoint
CREATE INDEX "eco_regions_org_default_idx" ON "eco_regions" USING btree ("organization_id","is_default");--> statement-breakpoint
CREATE INDEX "eco_shipping_options_org_region_idx" ON "eco_shipping_options" USING btree ("organization_id","region_id","is_active");--> statement-breakpoint
CREATE INDEX "parties_org_type_idx" ON "parties" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "parties_org_domain_idx" ON "parties" USING btree ("organization_id","domain");--> statement-breakpoint
CREATE INDEX "persons_org_type_idx" ON "persons" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "persons_org_email_idx" ON "persons" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "persons_org_party_idx" ON "persons" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "persons_org_actor_idx" ON "persons" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE INDEX "locations_org_type_idx" ON "locations" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "locations_org_parent_idx" ON "locations" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "locations_org_code_idx" ON "locations" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "pipeline_stages_org_pipeline_position_idx" ON "pipeline_stages" USING btree ("organization_id","pipeline_id","position");--> statement-breakpoint
CREATE INDEX "pipelines_org_entity_idx" ON "pipelines" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE INDEX "transaction_lines_org_transaction_idx" ON "transaction_lines" USING btree ("organization_id","transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_lines_org_item_idx" ON "transaction_lines" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "transactions_org_type_idx" ON "transactions" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "transactions_org_stage_idx" ON "transactions" USING btree ("organization_id","stage_id");--> statement-breakpoint
CREATE INDEX "transactions_org_person_idx" ON "transactions" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "transactions_org_party_idx" ON "transactions" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "activities_org_entity_idx" ON "activities" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activities_org_actor_idx" ON "activities" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE INDEX "activities_org_status_due_idx" ON "activities" USING btree ("organization_id","status","due_at");--> statement-breakpoint
CREATE INDEX "search_index_content_gin" ON "search_index" USING gin ("content");--> statement-breakpoint
CREATE INDEX "search_index_collection_org_idx" ON "search_index" USING btree ("collection","org_id");--> statement-breakpoint
CREATE INDEX "cat_items_org_type_idx" ON "cat_items" USING btree ("organization_id","type");