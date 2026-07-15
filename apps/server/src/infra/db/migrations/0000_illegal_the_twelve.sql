CREATE TYPE "public"."lms_cohort_status" AS ENUM('scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lms_content_type" AS ENUM('video', 'text', 'pdf', 'embed', 'quiz');--> statement-breakpoint
CREATE TYPE "public"."lms_coupon_discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."lms_course_level" AS ENUM('beginner', 'intermediate', 'advanced', 'all');--> statement-breakpoint
CREATE TYPE "public"."lms_course_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lms_question_type" AS ENUM('mcq', 'true_false', 'short_answer');--> statement-breakpoint
CREATE TYPE "public"."lms_session_status" AS ENUM('scheduled', 'live', 'ended', 'recorded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lms_submission_status" AS ENUM('submitted', 'grading', 'graded', 'returned');--> statement-breakpoint
CREATE TYPE "public"."lms_waitlist_status" AS ENUM('waiting', 'notified', 'expired', 'enrolled');--> statement-breakpoint
CREATE TYPE "public"."actor_status" AS ENUM('pending', 'active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('human', 'system', 'api_key');--> statement-breakpoint
CREATE TYPE "public"."cat_item_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cat_item_type" AS ENUM('product', 'service', 'course', 'menu_item', 'room_type', 'asset', 'stock_item', 'drug', 'lab_test');--> statement-breakpoint
CREATE TYPE "public"."cat_price_list_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."inv_location_type" AS ENUM('warehouse', 'store', 'shelf', 'virtual');--> statement-breakpoint
CREATE TYPE "public"."party_type" AS ENUM('company', 'vendor', 'insurer', 'school', 'clinic', 'corporate', 'ngo');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('lead', 'contact', 'customer', 'student', 'patient', 'guest', 'rider', 'vendor_contact', 'instructor');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('outlet', 'table', 'room', 'warehouse', 'ward', 'bed', 'virtual', 'building', 'floor');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('order', 'invoice', 'purchase_order', 'sales_order', 'bill', 'folio', 'quote', 'receipt');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('pending', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('call', 'email', 'meeting', 'note', 'task', 'log', 'service_request', 'visit_note');--> statement-breakpoint
CREATE TYPE "public"."ldg_account_type" AS ENUM('asset', 'liability', 'revenue', 'expense', 'equity');--> statement-breakpoint
CREATE TYPE "public"."ldg_tx_status" AS ENUM('pending', 'posted', 'voided');--> statement-breakpoint
CREATE TYPE "public"."wf_instance_status" AS ENUM('pending', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."wf_task_status" AS ENUM('open', 'in_progress', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."sch_booking_status" AS ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."sch_slot_status" AS ENUM('available', 'partially_booked', 'fully_booked', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('draft', 'under_review', 'approved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."ntf_channel" AS ENUM('email', 'sms', 'push', 'whatsapp', 'webhook', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."ntf_log_status" AS ENUM('pending', 'sent', 'failed', 'read');--> statement-breakpoint
CREATE TABLE "crm_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"segment_id" text,
	"stage_id" text,
	"template_id" text,
	"subject" text,
	"from_name" text,
	"from_email" text,
	"body" text,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"opened_count" integer DEFAULT 0 NOT NULL,
	"clicked_count" integer DEFAULT 0 NOT NULL,
	"bounced_count" integer DEFAULT 0 NOT NULL,
	"unsubscribed_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_campaign_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"campaign_id" text NOT NULL,
	"person_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	CONSTRAINT "crm_campaign_contacts_campaign_id_person_id_pk" PRIMARY KEY("campaign_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"title" text NOT NULL,
	"person_id" text,
	"party_id" text,
	"stage_id" text,
	"transaction_id" text,
	"item_id" text,
	"pipeline_id" text,
	"owner_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"value" jsonb,
	"probability" integer,
	"expected_close_date" timestamp,
	"actual_close_date" timestamp,
	"lost_reason" text,
	"rotting_at" timestamp,
	"approval_status" text,
	"approved_by_id" text
);
--> statement-breakpoint
CREATE TABLE "crm_email_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"thread_id" text NOT NULL,
	"external_message_id" text NOT NULL,
	"from" text NOT NULL,
	"to" jsonb NOT NULL,
	"body_text" text,
	"received_at" timestamp NOT NULL,
	"direction" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_email_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"external_thread_id" text NOT NULL,
	"provider" text NOT NULL,
	"person_id" text,
	"transaction_id" text,
	"subject" text,
	"last_message_at" timestamp,
	"message_count" integer DEFAULT 1 NOT NULL,
	"synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"person_id" text NOT NULL,
	"party_id" text,
	"stage_id" text,
	"owner_id" text,
	"status" text DEFAULT 'new' NOT NULL,
	"interest" text,
	"estimated_value" jsonb,
	"notes" text,
	"qualified_at" timestamp,
	"converted_at" timestamp,
	"deal_id" text
);
--> statement-breakpoint
CREATE TABLE "crm_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"filters" jsonb NOT NULL,
	"contact_count" integer DEFAULT 0 NOT NULL,
	"last_computed_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "lms_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"module_id" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"due_offset_days" integer DEFAULT 7 NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"allow_late_submission" boolean DEFAULT false NOT NULL,
	"late_penalty_percent" integer DEFAULT 0,
	"attachment_required" boolean DEFAULT false NOT NULL,
	"rubrics" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "lms_certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_id" text NOT NULL,
	"transaction_id" text,
	"person_id" text NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"certificate_no" text NOT NULL,
	"verification_code" text NOT NULL,
	"expires_at" timestamp,
	"template_id" text,
	"pdf_url" text,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lms_cohorts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"max_size" integer DEFAULT 50 NOT NULL,
	"status" "lms_cohort_status" DEFAULT 'scheduled' NOT NULL,
	"instructor_id" text
);
--> statement-breakpoint
CREATE TABLE "lms_cohort_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cohort_id" text NOT NULL,
	"person_id" text NOT NULL,
	"transaction_id" text,
	"enrolled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"code" text NOT NULL,
	"discount_type" "lms_coupon_discount_type" DEFAULT 'percentage' NOT NULL,
	"discount_value" integer NOT NULL,
	"max_uses" integer DEFAULT 100 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"min_amount" integer,
	"applicable_item_ids" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "lms_course_detail" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_id" text NOT NULL,
	"instructor_id" text,
	"level" "lms_course_level" DEFAULT 'all' NOT NULL,
	"duration_hours" integer,
	"language" text DEFAULT 'en' NOT NULL,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"thumbnail_url" text,
	"introduction_video_url" text,
	"completion_threshold" integer DEFAULT 80 NOT NULL,
	"certificate_template_id" text,
	"allow_discussion" boolean DEFAULT true NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lms_course_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"status" "lms_course_review_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lms_discussions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lesson_id" text NOT NULL,
	"person_id" text NOT NULL,
	"body" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_discussion_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"discussion_id" text NOT NULL,
	"person_id" text NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"module_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"content_type" "lms_content_type" DEFAULT 'video' NOT NULL,
	"content_url" text,
	"content_body" text,
	"duration_minutes" integer,
	"is_free" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"attachment_url" text
);
--> statement-breakpoint
CREATE TABLE "lms_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"required_previous" boolean DEFAULT true NOT NULL,
	"previous_module_id" text
);
--> statement-breakpoint
CREATE TABLE "lms_org_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_completion_threshold" integer DEFAULT 80 NOT NULL,
	"max_quiz_attempts" integer DEFAULT 3 NOT NULL,
	"allow_guest_access" boolean DEFAULT false NOT NULL,
	"certificate_logo_url" text,
	"certificate_signature_name" text,
	"certificate_signature_title" text,
	"payment_provider" text DEFAULT 'stripe' NOT NULL,
	"video_provider" text DEFAULT 'vimeo' NOT NULL,
	"video_cdn_base_url" text
);
--> statement-breakpoint
CREATE TABLE "lms_payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"transaction_id" text,
	"processed" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_id" text NOT NULL,
	"module_id" text,
	"lesson_id" text NOT NULL,
	"person_id" text NOT NULL,
	"transaction_id" text,
	"completed_at" timestamp,
	"watched_seconds" integer DEFAULT 0 NOT NULL,
	"last_position" integer DEFAULT 0,
	"score" integer,
	"is_completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_quizzes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lesson_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"passing_score" integer DEFAULT 60 NOT NULL,
	"time_limit_minutes" integer,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"shuffle_questions" boolean DEFAULT false NOT NULL,
	"show_result_immediately" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_quiz_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quiz_id" text NOT NULL,
	"question" text NOT NULL,
	"type" "lms_question_type" DEFAULT 'mcq' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb,
	"correct_answer" text,
	"correct_answers" jsonb DEFAULT '[]'::jsonb,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_quiz_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quiz_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"person_id" text NOT NULL,
	"enrollment_id" text,
	"score" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 0 NOT NULL,
	"percentage" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"time_spent_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "lms_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"assignment_id" text NOT NULL,
	"person_id" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"content" text,
	"attachment_urls" jsonb DEFAULT '[]'::jsonb,
	"score" integer,
	"max_score" integer,
	"graded_at" timestamp,
	"graded_by" text,
	"feedback" text,
	"status" "lms_submission_status" DEFAULT 'submitted' NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cohort_id" text NOT NULL,
	"person_id" text NOT NULL,
	"status" "lms_waitlist_status" DEFAULT 'waiting' NOT NULL,
	"notified_at" timestamp,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plt_compose_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"compose_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plt_organization_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plt_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"description" text
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
	"type" "cat_item_type" DEFAULT 'product' NOT NULL,
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
CREATE TABLE "storage_files" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text DEFAULT '' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
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
CREATE TABLE "workplace_announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'general',
	"priority" text DEFAULT 'normal',
	"posted_by_id" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_opening_id" text NOT NULL,
	"person_id" text,
	"candidate_name" text NOT NULL,
	"candidate_email" text,
	"candidate_phone" text,
	"resume_document_id" text,
	"current_ctc" numeric(12, 2),
	"expected_ctc" numeric(12, 2),
	"notice_period_days" integer,
	"source" text,
	"stage_id" text,
	"status" text DEFAULT 'screening' NOT NULL,
	"applied_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'available',
	"purchase_date" timestamp,
	"purchase_cost" numeric(15, 2),
	"serial_number" text,
	"model" text,
	"location_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_asset_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"expected_return_at" timestamp,
	"returned_at" timestamp,
	"condition" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workplace_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"status" text NOT NULL,
	"shift_id" text,
	"check_in" timestamp,
	"check_out" timestamp,
	"work_hours" numeric(4, 2),
	"overtime_hours" numeric(4, 2) DEFAULT '0',
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "workplace_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"type" text DEFAULT 'permanent' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"probation_months" integer DEFAULT 6,
	"notice_period_days" integer DEFAULT 30,
	"ctc" numeric(12, 2),
	"document_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_departments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"parent_id" text,
	"manager_id" text
);
--> statement-breakpoint
CREATE TABLE "workplace_employees" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" text NOT NULL,
	"employee_code" text,
	"position_id" text,
	"department_id" text,
	"manager_id" text,
	"employment_type" text DEFAULT 'permanent' NOT NULL,
	"employment_status" text DEFAULT 'preboarding' NOT NULL,
	"join_date" timestamp,
	"probation_end_date" timestamp,
	"confirmation_date" timestamp,
	"termination_date" timestamp,
	"termination_reason" text,
	"work_schedule" text DEFAULT 'standard',
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_employee_compensation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"structure_id" text,
	"ctc" numeric(12, 2) NOT NULL,
	"effective_from" timestamp NOT NULL,
	"effective_to" timestamp,
	"bank_account" text,
	"bank_name" text,
	"bank_ifsc" text,
	"pan" text,
	"pf_no" text,
	"esi_no" text,
	"uan" text,
	"active" boolean DEFAULT true,
	"updated_by_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_employment_history" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by_id" text,
	"changed_at" timestamp DEFAULT now(),
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "workplace_expense_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'INR',
	"status" text DEFAULT 'draft' NOT NULL,
	"workflow_instance_id" text,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"approved_by_id" text,
	"rejected_reason" text,
	"paid_at" timestamp,
	"journal_entry_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_expense_items" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'INR',
	"document_id" text,
	"billable" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "workplace_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"from_employee_id" text NOT NULL,
	"to_employee_id" text NOT NULL,
	"context" text,
	"feedback" text NOT NULL,
	"is_anonymous" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'individual' NOT NULL,
	"employee_id" text,
	"department_id" text,
	"parent_goal_id" text,
	"category" text,
	"weight" numeric(5, 2),
	"target_value" numeric(10, 2),
	"current_value" numeric(10, 2),
	"unit" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_interviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" text NOT NULL,
	"interviewer_id" text,
	"round" integer DEFAULT 1,
	"type" text DEFAULT 'technical' NOT NULL,
	"scheduled_at" timestamp,
	"duration_minutes" integer DEFAULT 60,
	"location" text,
	"meeting_link" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"feedback" text,
	"rating" integer,
	"recommendation" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_job_openings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"position_id" text,
	"department_id" text,
	"pipeline_id" text,
	"employment_type" text DEFAULT 'permanent',
	"head_count" integer DEFAULT 1,
	"filled_count" integer DEFAULT 0,
	"min_ctc" numeric(12, 2),
	"max_ctc" numeric(12, 2),
	"description" text,
	"requirements" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"opened_at" timestamp,
	"closed_at" timestamp,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_leave_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"leave_type_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"year" integer NOT NULL,
	"allocated" numeric(5, 1) NOT NULL,
	"used" numeric(5, 1) DEFAULT '0',
	"balance" numeric(5, 1)
);
--> statement-breakpoint
CREATE TABLE "workplace_leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"leave_type_id" text NOT NULL,
	"from_date" timestamp NOT NULL,
	"to_date" timestamp NOT NULL,
	"days" numeric(5, 1) NOT NULL,
	"half_day" boolean DEFAULT false,
	"reason" text,
	"document_id" text,
	"workflow_instance_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by_id" text,
	"approved_at" timestamp,
	"rejected_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_leave_types" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"max_days" integer DEFAULT 0,
	"is_paid" boolean DEFAULT true,
	"is_carry_forward" boolean DEFAULT false,
	"max_carry_forward" integer DEFAULT 0,
	"requires_documents" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "workplace_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" text NOT NULL,
	"position_id" text,
	"department_id" text,
	"offered_ctc" numeric(12, 2),
	"joining_date" timestamp,
	"validity_days" integer DEFAULT 7,
	"document_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_pay_components" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"type" text NOT NULL,
	"is_taxable" boolean DEFAULT true,
	"calculation_method" text DEFAULT 'formula',
	"formula" text,
	"default_value" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "workplace_payroll_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"period" text NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"workflow_instance_id" text,
	"total_gross" numeric(15, 2) DEFAULT '0',
	"total_deductions" numeric(15, 2) DEFAULT '0',
	"total_net" numeric(15, 2) DEFAULT '0',
	"employee_count" integer DEFAULT 0,
	"processed_at" timestamp,
	"approved_at" timestamp,
	"approved_by_id" text,
	"journal_entry_id" text,
	"payment_exported" boolean DEFAULT false,
	"payment_exported_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_payslips" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"payroll_run_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"compensation_id" text,
	"working_days" integer NOT NULL,
	"present_days" integer NOT NULL,
	"paid_days" integer NOT NULL,
	"earnings" jsonb NOT NULL,
	"deductions" jsonb NOT NULL,
	"gross" numeric(15, 2) NOT NULL,
	"net" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workplace_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"version" integer DEFAULT 1,
	"content" text,
	"document_id" text,
	"is_active" boolean DEFAULT true,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_policy_acknowledgements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"acknowledged_at" timestamp DEFAULT now(),
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "workplace_positions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1,
	"department_id" text,
	"is_head" boolean DEFAULT false,
	"head_count" integer DEFAULT 1,
	"filled_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "workplace_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"review_cycle_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"reviewer_id" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"overall_rating" numeric(3, 2),
	"strengths" text,
	"improvements" text,
	"comments" text,
	"submitted_at" timestamp,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_review_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"weight" numeric(5, 2),
	"rating" numeric(3, 2),
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "workplace_review_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'annual' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"self_review_deadline" timestamp,
	"manager_review_deadline" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"floor" text,
	"capacity" integer DEFAULT 1,
	"location_id" text,
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "workplace_room_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"room_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"title" text NOT NULL,
	"from_time" timestamp NOT NULL,
	"to_time" timestamp NOT NULL,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_salary_structures" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"components" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"break_minutes" integer DEFAULT 60,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "workplace_shift_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"from_date" timestamp NOT NULL,
	"to_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "workplace_timesheets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"week_start_date" timestamp NOT NULL,
	"week_end_date" timestamp NOT NULL,
	"total_hours" numeric(5, 2) DEFAULT '0',
	"billable_hours" numeric(5, 2) DEFAULT '0',
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"approved_by_id" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplace_timesheet_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"timesheet_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"project_id" text,
	"task_id" text,
	"description" text,
	"hours" numeric(4, 2) NOT NULL,
	"billable" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "workplace_visitors" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"company" text,
	"host_employee_id" text,
	"purpose" text NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"badge_number" text,
	"status" text DEFAULT 'expected' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "rst_kot_items" ADD CONSTRAINT "rst_kot_items_kot_id_rst_kot_id_fk" FOREIGN KEY ("kot_id") REFERENCES "public"."rst_kot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rst_recipe_ingredients" ADD CONSTRAINT "rst_recipe_ingredients_recipe_id_rst_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."rst_recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rst_shift_assignments" ADD CONSTRAINT "rst_shift_assignments_shift_id_rst_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."rst_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_asset_depreciation" ADD CONSTRAINT "erp_asset_depreciation_asset_id_erp_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."erp_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_bank_accounts" ADD CONSTRAINT "erp_bank_accounts_gl_account_id_erp_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."erp_gl_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_bank_transactions" ADD CONSTRAINT "erp_bank_transactions_bank_account_id_erp_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."erp_bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_bom_items" ADD CONSTRAINT "erp_bom_items_bom_id_erp_bom_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."erp_bom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_dn_items" ADD CONSTRAINT "erp_dn_items_dn_id_erp_delivery_notes_id_fk" FOREIGN KEY ("dn_id") REFERENCES "public"."erp_delivery_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_grn_items" ADD CONSTRAINT "erp_grn_items_grn_id_erp_grns_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."erp_grns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_journal_entries" ADD CONSTRAINT "erp_journal_entries_fiscal_year_id_erp_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."erp_fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_journal_lines" ADD CONSTRAINT "erp_journal_lines_journal_id_erp_journal_entries_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."erp_journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_journal_lines" ADD CONSTRAINT "erp_journal_lines_gl_account_id_erp_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."erp_gl_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_pr_items" ADD CONSTRAINT "erp_pr_items_requisition_id_erp_purchase_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."erp_purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_stock_entry_items" ADD CONSTRAINT "erp_stock_entry_items_entry_id_erp_stock_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."erp_stock_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_work_orders" ADD CONSTRAINT "erp_work_orders_bom_id_erp_bom_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."erp_bom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_applications" ADD CONSTRAINT "workplace_applications_job_opening_id_workplace_job_openings_id_fk" FOREIGN KEY ("job_opening_id") REFERENCES "public"."workplace_job_openings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_asset_assignments" ADD CONSTRAINT "workplace_asset_assignments_asset_id_workplace_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."workplace_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_asset_assignments" ADD CONSTRAINT "workplace_asset_assignments_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_attendance" ADD CONSTRAINT "workplace_attendance_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_contracts" ADD CONSTRAINT "workplace_contracts_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_employees" ADD CONSTRAINT "workplace_employees_position_id_workplace_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."workplace_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_employees" ADD CONSTRAINT "workplace_employees_department_id_workplace_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."workplace_departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_employee_compensation" ADD CONSTRAINT "workplace_employee_compensation_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_employee_compensation" ADD CONSTRAINT "workplace_employee_compensation_structure_id_workplace_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."workplace_salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_employment_history" ADD CONSTRAINT "workplace_employment_history_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_expense_claims" ADD CONSTRAINT "workplace_expense_claims_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_expense_items" ADD CONSTRAINT "workplace_expense_items_claim_id_workplace_expense_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."workplace_expense_claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_feedback" ADD CONSTRAINT "workplace_feedback_from_employee_id_workplace_employees_id_fk" FOREIGN KEY ("from_employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_feedback" ADD CONSTRAINT "workplace_feedback_to_employee_id_workplace_employees_id_fk" FOREIGN KEY ("to_employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_goals" ADD CONSTRAINT "workplace_goals_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_interviews" ADD CONSTRAINT "workplace_interviews_application_id_workplace_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."workplace_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_job_openings" ADD CONSTRAINT "workplace_job_openings_position_id_workplace_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."workplace_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_job_openings" ADD CONSTRAINT "workplace_job_openings_department_id_workplace_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."workplace_departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_leave_allocations" ADD CONSTRAINT "workplace_leave_allocations_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_leave_allocations" ADD CONSTRAINT "workplace_leave_allocations_leave_type_id_workplace_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."workplace_leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_leave_requests" ADD CONSTRAINT "workplace_leave_requests_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_leave_requests" ADD CONSTRAINT "workplace_leave_requests_leave_type_id_workplace_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."workplace_leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_offers" ADD CONSTRAINT "workplace_offers_application_id_workplace_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."workplace_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_payslips" ADD CONSTRAINT "workplace_payslips_payroll_run_id_workplace_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."workplace_payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_payslips" ADD CONSTRAINT "workplace_payslips_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_payslips" ADD CONSTRAINT "workplace_payslips_compensation_id_workplace_employee_compensation_id_fk" FOREIGN KEY ("compensation_id") REFERENCES "public"."workplace_employee_compensation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_policy_acknowledgements" ADD CONSTRAINT "workplace_policy_acknowledgements_policy_id_workplace_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."workplace_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_policy_acknowledgements" ADD CONSTRAINT "workplace_policy_acknowledgements_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_positions" ADD CONSTRAINT "workplace_positions_department_id_workplace_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."workplace_departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_reviews" ADD CONSTRAINT "workplace_reviews_review_cycle_id_workplace_review_cycles_id_fk" FOREIGN KEY ("review_cycle_id") REFERENCES "public"."workplace_review_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_reviews" ADD CONSTRAINT "workplace_reviews_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_review_criteria" ADD CONSTRAINT "workplace_review_criteria_review_id_workplace_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."workplace_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_room_bookings" ADD CONSTRAINT "workplace_room_bookings_room_id_workplace_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."workplace_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_room_bookings" ADD CONSTRAINT "workplace_room_bookings_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_shift_assignments" ADD CONSTRAINT "workplace_shift_assignments_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_shift_assignments" ADD CONSTRAINT "workplace_shift_assignments_shift_id_workplace_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."workplace_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_timesheets" ADD CONSTRAINT "workplace_timesheets_employee_id_workplace_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_timesheet_entries" ADD CONSTRAINT "workplace_timesheet_entries_timesheet_id_workplace_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."workplace_timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_visitors" ADD CONSTRAINT "workplace_visitors_host_employee_id_workplace_employees_id_fk" FOREIGN KEY ("host_employee_id") REFERENCES "public"."workplace_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_campaigns_org_status_idx" ON "crm_campaigns" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "crm_campaigns_org_segment_idx" ON "crm_campaigns" USING btree ("organization_id","segment_id");--> statement-breakpoint
CREATE INDEX "crm_campaign_contacts_org_campaign_idx" ON "crm_campaign_contacts" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE INDEX "crm_campaign_contacts_org_person_idx" ON "crm_campaign_contacts" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "crm_deals_org_pipeline_stage_idx" ON "crm_deals" USING btree ("organization_id","pipeline_id","stage_id");--> statement-breakpoint
CREATE INDEX "crm_deals_org_owner_idx" ON "crm_deals" USING btree ("organization_id","owner_id");--> statement-breakpoint
CREATE INDEX "crm_deals_org_status_idx" ON "crm_deals" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "crm_email_messages_org_thread_idx" ON "crm_email_messages" USING btree ("organization_id","thread_id");--> statement-breakpoint
CREATE INDEX "crm_email_threads_org_person_idx" ON "crm_email_threads" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "crm_email_threads_org_external_idx" ON "crm_email_threads" USING btree ("organization_id","external_thread_id");--> statement-breakpoint
CREATE INDEX "crm_leads_org_status_idx" ON "crm_leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "crm_leads_org_owner_idx" ON "crm_leads" USING btree ("organization_id","owner_id");--> statement-breakpoint
CREATE INDEX "crm_leads_org_person_idx" ON "crm_leads" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "crm_segments_org_idx" ON "crm_segments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "eco_regions_org_default_idx" ON "eco_regions" USING btree ("organization_id","is_default");--> statement-breakpoint
CREATE INDEX "eco_shipping_options_org_region_idx" ON "eco_shipping_options" USING btree ("organization_id","region_id","is_active");--> statement-breakpoint
CREATE INDEX "lms_assignments_module_idx" ON "lms_assignments" USING btree ("organization_id","module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_certificates_verification_code_idx" ON "lms_certificates" USING btree ("verification_code");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_certificates_person_course_idx" ON "lms_certificates" USING btree ("organization_id","person_id","item_id");--> statement-breakpoint
CREATE INDEX "lms_certificates_person_idx" ON "lms_certificates" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "lms_cohorts_course_idx" ON "lms_cohorts" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "lms_cohorts_status_idx" ON "lms_cohorts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_cohort_members_cohort_person_idx" ON "lms_cohort_members" USING btree ("organization_id","cohort_id","person_id");--> statement-breakpoint
CREATE INDEX "lms_cohort_members_cohort_idx" ON "lms_cohort_members" USING btree ("organization_id","cohort_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_coupons_code_org_idx" ON "lms_coupons" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "lms_coupons_active_idx" ON "lms_coupons" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_course_detail_item_idx" ON "lms_course_detail" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "lms_course_detail_instructor_idx" ON "lms_course_detail" USING btree ("organization_id","instructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_course_reviews_course_reviewer_idx" ON "lms_course_reviews" USING btree ("organization_id","item_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "lms_discussions_lesson_idx" ON "lms_discussions" USING btree ("organization_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lms_discussions_person_idx" ON "lms_discussions" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "lms_discussion_replies_discussion_idx" ON "lms_discussion_replies" USING btree ("organization_id","discussion_id");--> statement-breakpoint
CREATE INDEX "lms_lessons_module_idx" ON "lms_lessons" USING btree ("organization_id","module_id");--> statement-breakpoint
CREATE INDEX "lms_lessons_module_position_idx" ON "lms_lessons" USING btree ("organization_id","module_id","position");--> statement-breakpoint
CREATE INDEX "lms_modules_course_idx" ON "lms_modules" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "lms_modules_course_position_idx" ON "lms_modules" USING btree ("organization_id","item_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_org_config_org_idx" ON "lms_org_config" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_payment_events_stripe_id_idx" ON "lms_payment_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_progress_person_lesson_idx" ON "lms_progress" USING btree ("organization_id","person_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lms_progress_person_course_idx" ON "lms_progress" USING btree ("organization_id","person_id","item_id");--> statement-breakpoint
CREATE INDEX "lms_progress_transaction_idx" ON "lms_progress" USING btree ("organization_id","transaction_id");--> statement-breakpoint
CREATE INDEX "lms_quizzes_lesson_idx" ON "lms_quizzes" USING btree ("organization_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lms_quiz_questions_quiz_idx" ON "lms_quiz_questions" USING btree ("organization_id","quiz_id");--> statement-breakpoint
CREATE INDEX "lms_quiz_questions_quiz_position_idx" ON "lms_quiz_questions" USING btree ("organization_id","quiz_id","position");--> statement-breakpoint
CREATE INDEX "lms_quiz_submissions_quiz_person_idx" ON "lms_quiz_submissions" USING btree ("organization_id","quiz_id","person_id");--> statement-breakpoint
CREATE INDEX "lms_quiz_submissions_enrollment_idx" ON "lms_quiz_submissions" USING btree ("organization_id","enrollment_id");--> statement-breakpoint
CREATE INDEX "lms_submissions_assignment_idx" ON "lms_submissions" USING btree ("organization_id","assignment_id");--> statement-breakpoint
CREATE INDEX "lms_submissions_person_idx" ON "lms_submissions" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "lms_submissions_status_idx" ON "lms_submissions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_waitlist_cohort_person_idx" ON "lms_waitlist" USING btree ("organization_id","cohort_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plt_compose_compose_id_idx" ON "plt_compose_config" USING btree ("compose_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plt_org_settings_org_idx" ON "plt_organization_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plt_settings_key_idx" ON "plt_settings" USING btree ("key");--> statement-breakpoint
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
CREATE INDEX "cat_items_org_type_idx" ON "cat_items" USING btree ("organization_id","type");--> statement-breakpoint
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
CREATE INDEX "anl_snapshots_org_metric_idx" ON "anl_snapshots" USING btree ("organization_id","metric_key");--> statement-breakpoint
CREATE INDEX "storage_files_org_created_at_idx" ON "storage_files" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "storage_files_org_uploaded_by_id_idx" ON "storage_files" USING btree ("organization_id","uploaded_by_id");--> statement-breakpoint
CREATE INDEX "search_index_content_gin" ON "search_index" USING gin ("content");--> statement-breakpoint
CREATE INDEX "search_index_collection_org_idx" ON "search_index" USING btree ("collection","org_id");--> statement-breakpoint
CREATE INDEX "slg_item_loc_date_idx" ON "erp_stock_ledger" USING btree ("item_id","location_id","date");--> statement-breakpoint
CREATE INDEX "wkp_ann_org_date_idx" ON "workplace_announcements" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "wkp_app_job_idx" ON "workplace_applications" USING btree ("job_opening_id");--> statement-breakpoint
CREATE INDEX "wkp_app_status_idx" ON "workplace_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wkp_asa_asset_idx" ON "workplace_asset_assignments" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "wkp_asa_emp_idx" ON "workplace_asset_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_att_emp_date_idx" ON "workplace_attendance" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "wkp_att_date_idx" ON "workplace_attendance" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_dept_org_name_idx" ON "workplace_departments" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_emp_person_idx" ON "workplace_employees" USING btree ("person_id","organization_id");--> statement-breakpoint
CREATE INDEX "wkp_emp_dept_idx" ON "workplace_employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "wkp_emp_manager_idx" ON "workplace_employees" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "wkp_ec_emp_idx" ON "workplace_employee_compensation" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "wkp_exp_emp_idx" ON "workplace_expense_claims" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "wkp_exp_status_idx" ON "workplace_expense_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wkp_gol_emp_idx" ON "workplace_goals" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "wkp_ivw_app_idx" ON "workplace_interviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "wkp_job_status_idx" ON "workplace_job_openings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wkp_job_dept_idx" ON "workplace_job_openings" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_la_emp_type_year_idx" ON "workplace_leave_allocations" USING btree ("employee_id","leave_type_id","year");--> statement-breakpoint
CREATE INDEX "wkp_lr_emp_idx" ON "workplace_leave_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "wkp_lr_status_idx" ON "workplace_leave_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_pr_org_period_idx" ON "workplace_payroll_runs" USING btree ("organization_id","period");--> statement-breakpoint
CREATE INDEX "wkp_ps_run_idx" ON "workplace_payslips" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_ps_run_emp_idx" ON "workplace_payslips" USING btree ("payroll_run_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_pak_policy_emp_idx" ON "workplace_policy_acknowledgements" USING btree ("policy_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_pos_org_name_idx" ON "workplace_positions" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_rev_cycle_emp_type_idx" ON "workplace_reviews" USING btree ("review_cycle_id","employee_id","type");--> statement-breakpoint
CREATE INDEX "wkp_rb_room_time_idx" ON "workplace_room_bookings" USING btree ("room_id","from_time","to_time");--> statement-breakpoint
CREATE INDEX "wkp_sha_emp_idx" ON "workplace_shift_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wkp_ts_emp_week_idx" ON "workplace_timesheets" USING btree ("employee_id","week_start_date");--> statement-breakpoint
CREATE INDEX "wkp_vis_host_idx" ON "workplace_visitors" USING btree ("host_employee_id");