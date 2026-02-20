CREATE TYPE "public"."actor_status" AS ENUM('pending', 'active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('human', 'system', 'api_key');--> statement-breakpoint
CREATE TYPE "public"."cat_item_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cat_price_list_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."inv_location_type" AS ENUM('warehouse', 'store', 'shelf', 'virtual');--> statement-breakpoint
CREATE TYPE "public"."ldg_account_type" AS ENUM('asset', 'liability', 'revenue', 'expense', 'equity');--> statement-breakpoint
CREATE TYPE "public"."ldg_tx_status" AS ENUM('pending', 'posted', 'voided');--> statement-breakpoint
CREATE TYPE "public"."wf_instance_status" AS ENUM('pending', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."wf_task_status" AS ENUM('open', 'in_progress', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."sch_booking_status" AS ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."sch_slot_status" AS ENUM('available', 'partially_booked', 'fully_booked', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('draft', 'under_review', 'approved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."ntf_channel" AS ENUM('email', 'sms', 'push', 'whatsapp', 'webhook', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."ntf_log_status" AS ENUM('pending', 'sent', 'failed', 'read');--> statement-breakpoint
CREATE TABLE "evt_store" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"actor_id" text,
	"org_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"caused_by" text,
	"version" integer NOT NULL,
	"source" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evt_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"event" jsonb NOT NULL,
	"published_at" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actor_roles" (
	"actor_id" text NOT NULL,
	"role_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text,
	CONSTRAINT "actor_roles_actor_id_role_id_pk" PRIMARY KEY("actor_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "actors" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"type" "actor_type" DEFAULT 'human' NOT NULL,
	"status" "actor_status" DEFAULT 'pending' NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"last_login_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"actor_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]' NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"refresh_token_hash" text,
	"expires_at" timestamp NOT NULL,
	"refresh_expires_at" timestamp,
	"ip" text,
	"user_agent" text,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cat_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" text,
	"attribute_set" jsonb DEFAULT '[]' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" text,
	"description" text,
	"attributes" jsonb DEFAULT '{}' NOT NULL,
	"status" "cat_item_status" DEFAULT 'draft' NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"media" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_price_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"audience" jsonb DEFAULT '{}' NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"status" "cat_price_list_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_price_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_list_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"price_amount" integer NOT NULL,
	"price_currency" text NOT NULL,
	"min_qty" integer DEFAULT 1 NOT NULL,
	"conditions" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_id" text NOT NULL,
	"sku" text NOT NULL,
	"attributes" jsonb DEFAULT '{}' NOT NULL,
	"stock_tracked" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"type" "inv_location_type" DEFAULT 'warehouse' NOT NULL,
	"address" jsonb,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"variant_id" text NOT NULL,
	"from_location_id" text,
	"to_location_id" text,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_id" text,
	"reference_type" text,
	"actor_id" text
);
--> statement-breakpoint
CREATE TABLE "inv_stock_units" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"variant_id" text NOT NULL,
	"location_id" text NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ldg_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "ldg_account_type" NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"parent_id" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "ldg_journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transaction_id" text NOT NULL,
	"account_id" text NOT NULL,
	"debit" integer DEFAULT 0 NOT NULL,
	"credit" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ldg_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reference" text NOT NULL,
	"reference_type" text NOT NULL,
	"description" text NOT NULL,
	"currency" text NOT NULL,
	"amount_amount" integer NOT NULL,
	"amount_currency" text NOT NULL,
	"status" "ldg_tx_status" DEFAULT 'pending' NOT NULL,
	"posted_at" timestamp,
	"voided_at" timestamp,
	"void_reason" text,
	"actor_id" text
);
--> statement-breakpoint
CREATE TABLE "wf_process_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"template_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"current_stage" text,
	"context" jsonb DEFAULT '{}' NOT NULL,
	"status" "wf_instance_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wf_process_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"entity_type" text NOT NULL,
	"stages" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"instance_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assignee_role" text,
	"assignee_id" text,
	"status" "wf_task_status" DEFAULT 'open' NOT NULL,
	"due_at" timestamp,
	"completed_at" timestamp,
	"outcome" jsonb
);
--> statement-breakpoint
CREATE TABLE "sch_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"slot_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"status" "sch_booking_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"confirmed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"checked_in_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sch_calendars" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_id" text NOT NULL,
	"owner_type" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"working_hours" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sch_recurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"calendar_id" text NOT NULL,
	"rrule" text NOT NULL,
	"slot_template" jsonb NOT NULL,
	"generated_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sch_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"calendar_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"status" "sch_slot_status" DEFAULT 'available' NOT NULL,
	"recurrence_id" text
);
--> statement-breakpoint
CREATE TABLE "doc_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"document_id" text NOT NULL,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "doc_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"folder_id" text,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"status" "doc_status" DEFAULT 'draft' NOT NULL,
	"latest_version_id" text,
	"tags" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"owner_id" text NOT NULL,
	"owner_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"document_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"uploaded_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ntf_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"template_key" text,
	"channel" "ntf_channel" NOT NULL,
	"recipient" text NOT NULL,
	"status" "ntf_log_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"read_at" timestamp,
	"error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ntf_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_id" text NOT NULL,
	"channel" "ntf_channel" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"mute_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "ntf_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"key" text NOT NULL,
	"channel" "ntf_channel" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ntf_triggers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_pattern" text NOT NULL,
	"template_key" text NOT NULL,
	"channel" "ntf_channel" NOT NULL,
	"recipient_expr" jsonb DEFAULT '{}' NOT NULL,
	"conditions" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"label" text,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"state" text,
	"country" text NOT NULL,
	"postcode" text,
	"coordinates" jsonb,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_entities" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"geometry_type" text NOT NULL,
	"coordinates" jsonb NOT NULL,
	"properties" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_territories" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"polygon" jsonb NOT NULL,
	"properties" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anl_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"aggregation" text NOT NULL,
	"unit" text,
	"query_template" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anl_report_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"query_template" text NOT NULL,
	"parameters" jsonb DEFAULT '[]' NOT NULL,
	"format" text DEFAULT 'json' NOT NULL,
	"is_scheduled" boolean DEFAULT false NOT NULL,
	"schedule_cron" text
);
--> statement-breakpoint
CREATE TABLE "anl_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metric_key" text NOT NULL,
	"value" text NOT NULL,
	"captured_at" timestamp NOT NULL,
	"dimensions" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "evt_store_aggregate_version_idx" ON "evt_store" USING btree ("aggregate_id","version");--> statement-breakpoint
CREATE INDEX "evt_store_org_type_idx" ON "evt_store" USING btree ("org_id","type");--> statement-breakpoint
CREATE INDEX "evt_store_org_aggregate_type_idx" ON "evt_store" USING btree ("org_id","aggregate_type");--> statement-breakpoint
CREATE INDEX "evt_store_org_aggregate_id_idx" ON "evt_store" USING btree ("org_id","aggregate_id");--> statement-breakpoint
CREATE INDEX "evt_store_correlation_id_idx" ON "evt_store" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "evt_store_occurred_at_idx" ON "evt_store" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "evt_store_source_idx" ON "evt_store" USING btree ("source");--> statement-breakpoint
CREATE INDEX "evt_outbox_published_at_null_idx" ON "evt_outbox" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "evt_outbox_attempts_idx" ON "evt_outbox" USING btree ("attempts");--> statement-breakpoint
CREATE INDEX "evt_outbox_created_at_idx" ON "evt_outbox" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "actor_roles_actor_id_idx" ON "actor_roles" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "actor_roles_role_id_idx" ON "actor_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "actors_org_email_idx" ON "actors" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "actors_org_status_idx" ON "actors" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "actors_org_type_idx" ON "actors" USING btree ("organization_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_org_actor_idx" ON "api_keys" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_org_name_idx" ON "roles" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_token_hash_idx" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_actor_expires_idx" ON "sessions" USING btree ("actor_id","expires_at");--> statement-breakpoint
CREATE INDEX "sessions_org_actor_idx" ON "sessions" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cat_categories_org_slug_idx" ON "cat_categories" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "cat_categories_org_parent_idx" ON "cat_categories" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "cat_categories_org_status_idx" ON "cat_categories" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cat_items_org_slug_idx" ON "cat_items" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "cat_items_org_status_idx" ON "cat_items" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "cat_items_org_category_idx" ON "cat_items" USING btree ("organization_id","category_id");--> statement-breakpoint
CREATE INDEX "cat_price_lists_org_status_idx" ON "cat_price_lists" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "cat_price_lists_org_valid_dates_idx" ON "cat_price_lists" USING btree ("organization_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "cat_price_rules_org_list_variant_idx" ON "cat_price_rules" USING btree ("organization_id","price_list_id","variant_id");--> statement-breakpoint
CREATE INDEX "cat_price_rules_org_variant_idx" ON "cat_price_rules" USING btree ("organization_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cat_variants_org_sku_idx" ON "cat_variants" USING btree ("organization_id","sku");--> statement-breakpoint
CREATE INDEX "cat_variants_org_item_idx" ON "cat_variants" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "inv_locations_org_default_idx" ON "inv_locations" USING btree ("organization_id","is_default");--> statement-breakpoint
CREATE INDEX "inv_locations_org_type_idx" ON "inv_locations" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "inv_movements_org_variant_idx" ON "inv_movements" USING btree ("organization_id","variant_id");--> statement-breakpoint
CREATE INDEX "inv_movements_org_reference_idx" ON "inv_movements" USING btree ("organization_id","reference_id","reference_type");--> statement-breakpoint
CREATE INDEX "inv_movements_org_reason_idx" ON "inv_movements" USING btree ("organization_id","reason");--> statement-breakpoint
CREATE INDEX "inv_movements_created_at_idx" ON "inv_movements" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_stock_units_org_variant_location_idx" ON "inv_stock_units" USING btree ("organization_id","variant_id","location_id");--> statement-breakpoint
CREATE INDEX "inv_stock_units_org_location_idx" ON "inv_stock_units" USING btree ("organization_id","location_id");--> statement-breakpoint
CREATE INDEX "inv_stock_units_org_variant_idx" ON "inv_stock_units" USING btree ("organization_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ldg_accounts_org_code_idx" ON "ldg_accounts" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "ldg_accounts_org_type_idx" ON "ldg_accounts" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "ldg_accounts_org_parent_idx" ON "ldg_accounts" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "ldg_journal_entries_transaction_idx" ON "ldg_journal_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "ldg_journal_entries_account_idx" ON "ldg_journal_entries" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "ldg_journal_entries_org_account_idx" ON "ldg_journal_entries" USING btree ("organization_id","account_id");--> statement-breakpoint
CREATE INDEX "ldg_transactions_org_ref_type_idx" ON "ldg_transactions" USING btree ("organization_id","reference","reference_type");--> statement-breakpoint
CREATE INDEX "ldg_transactions_org_status_idx" ON "ldg_transactions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "ldg_transactions_org_posted_idx" ON "ldg_transactions" USING btree ("organization_id","posted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wf_process_instances_org_entity_idx" ON "wf_process_instances" USING btree ("organization_id","entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "wf_process_instances_org_status_idx" ON "wf_process_instances" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "wf_process_instances_org_template_idx" ON "wf_process_instances" USING btree ("organization_id","template_id");--> statement-breakpoint
CREATE INDEX "wf_process_templates_org_entity_type_idx" ON "wf_process_templates" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE INDEX "wf_process_templates_org_active_idx" ON "wf_process_templates" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "wf_tasks_org_instance_idx" ON "wf_tasks" USING btree ("organization_id","instance_id");--> statement-breakpoint
CREATE INDEX "wf_tasks_org_assignee_status_idx" ON "wf_tasks" USING btree ("organization_id","assignee_id","status");--> statement-breakpoint
CREATE INDEX "wf_tasks_org_status_idx" ON "wf_tasks" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "wf_tasks_org_due_at_idx" ON "wf_tasks" USING btree ("organization_id","due_at");--> statement-breakpoint
CREATE INDEX "sch_bookings_org_slot_idx" ON "sch_bookings" USING btree ("organization_id","slot_id");--> statement-breakpoint
CREATE INDEX "sch_bookings_org_actor_status_idx" ON "sch_bookings" USING btree ("organization_id","actor_id","status");--> statement-breakpoint
CREATE INDEX "sch_bookings_org_status_idx" ON "sch_bookings" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "sch_calendars_org_owner_idx" ON "sch_calendars" USING btree ("organization_id","owner_id","owner_type");--> statement-breakpoint
CREATE INDEX "sch_recurrences_org_calendar_idx" ON "sch_recurrences" USING btree ("organization_id","calendar_id");--> statement-breakpoint
CREATE INDEX "sch_slots_org_calendar_start_idx" ON "sch_slots" USING btree ("organization_id","calendar_id","start_at");--> statement-breakpoint
CREATE INDEX "sch_slots_org_resource_start_idx" ON "sch_slots" USING btree ("organization_id","resource_id","resource_type","start_at");--> statement-breakpoint
CREATE INDEX "sch_slots_org_status_idx" ON "sch_slots" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "doc_attachments_org_entity_idx" ON "doc_attachments" USING btree ("organization_id","entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "doc_attachments_org_document_idx" ON "doc_attachments" USING btree ("organization_id","document_id");--> statement-breakpoint
CREATE INDEX "doc_documents_org_folder_idx" ON "doc_documents" USING btree ("organization_id","folder_id");--> statement-breakpoint
CREATE INDEX "doc_documents_org_status_idx" ON "doc_documents" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "doc_folders_org_owner_idx" ON "doc_folders" USING btree ("organization_id","owner_id","owner_type");--> statement-breakpoint
CREATE INDEX "doc_folders_org_parent_idx" ON "doc_folders" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "doc_versions_org_document_idx" ON "doc_versions" USING btree ("organization_id","document_id");--> statement-breakpoint
CREATE INDEX "doc_versions_org_document_created_idx" ON "doc_versions" USING btree ("organization_id","document_id","created_at");--> statement-breakpoint
CREATE INDEX "ntf_logs_org_recipient_status_idx" ON "ntf_logs" USING btree ("organization_id","recipient","status");--> statement-breakpoint
CREATE INDEX "ntf_logs_org_status_idx" ON "ntf_logs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "ntf_logs_org_template_key_idx" ON "ntf_logs" USING btree ("organization_id","template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ntf_preferences_org_actor_channel_idx" ON "ntf_preferences" USING btree ("organization_id","actor_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "ntf_templates_org_key_channel_locale_idx" ON "ntf_templates" USING btree ("organization_id","key","channel","locale");--> statement-breakpoint
CREATE INDEX "ntf_triggers_org_event_pattern_idx" ON "ntf_triggers" USING btree ("organization_id","event_pattern");--> statement-breakpoint
CREATE INDEX "ntf_triggers_org_active_idx" ON "ntf_triggers" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "geo_addresses_org_entity_idx" ON "geo_addresses" USING btree ("organization_id","entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "geo_addresses_org_entity_default_idx" ON "geo_addresses" USING btree ("organization_id","entity_id","entity_type","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_entities_org_entity_idx" ON "geo_entities" USING btree ("organization_id","entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "geo_entities_org_geometry_type_idx" ON "geo_entities" USING btree ("organization_id","geometry_type");--> statement-breakpoint
CREATE INDEX "geo_territories_org_type_idx" ON "geo_territories" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "geo_territories_org_active_idx" ON "geo_territories" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "anl_metrics_org_key_idx" ON "anl_metrics" USING btree ("organization_id","key");--> statement-breakpoint
CREATE INDEX "anl_report_definitions_org_scheduled_idx" ON "anl_report_definitions" USING btree ("organization_id","is_scheduled");--> statement-breakpoint
CREATE INDEX "anl_snapshots_org_metric_captured_idx" ON "anl_snapshots" USING btree ("organization_id","metric_key","captured_at");--> statement-breakpoint
CREATE INDEX "anl_snapshots_org_metric_idx" ON "anl_snapshots" USING btree ("organization_id","metric_key");