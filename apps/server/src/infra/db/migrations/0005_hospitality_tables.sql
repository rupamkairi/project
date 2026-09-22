CREATE TABLE IF NOT EXISTS "hsp_rate_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "property_id" text NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "min_stay" integer DEFAULT 1 NOT NULL,
  "max_stay" integer,
  "min_guests" integer DEFAULT 1 NOT NULL,
  "max_guests" integer DEFAULT 1 NOT NULL,
  "max_adults" integer DEFAULT 2 NOT NULL,
  "max_children" integer DEFAULT 0 NOT NULL,
  "meal_plan" text,
  "extra_person_charge" jsonb,
  "extra_child_charge" jsonb,
  "cancellation_policy" jsonb,
  "terms" text
);

CREATE INDEX IF NOT EXISTS "hsp_rate_plans_org_property_idx" ON "hsp_rate_plans" ("organization_id", "property_id");
CREATE INDEX IF NOT EXISTS "hsp_rate_plans_org_code_idx" ON "hsp_rate_plans" ("organization_id", "code");

CREATE TABLE IF NOT EXISTS "hsp_rate_overrides" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "rate_plan_id" text NOT NULL,
  "room_type_item_id" text NOT NULL,
  "date" date NOT NULL,
  "price_override" jsonb,
  "allocation_override" integer,
  "channel_partner_id" text,
  "is_closed" boolean DEFAULT false NOT NULL,
  "min_stay_override" integer,
  "max_stay_override" integer
);

CREATE INDEX IF NOT EXISTS "hsp_rate_overrides_org_plan_date_idx" ON "hsp_rate_overrides" ("organization_id", "rate_plan_id", "date");
CREATE INDEX IF NOT EXISTS "hsp_rate_overrides_org_channel_idx" ON "hsp_rate_overrides" ("organization_id", "channel_partner_id");

CREATE TABLE IF NOT EXISTS "hsp_reservations" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "reservation_number" text NOT NULL,
  "property_id" text NOT NULL,
  "person_id" text NOT NULL,
  "party_id" text,
  "booking_id" text,
  "status" text DEFAULT 'hold' NOT NULL,
  "hold_expires_at" timestamp,
  "source" text DEFAULT 'direct' NOT NULL,
  "channel_partner_id" text,
  "group_id" text,
  "group_name" text,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "guest_count" integer DEFAULT 1 NOT NULL,
  "adult_count" integer DEFAULT 1 NOT NULL,
  "child_count" integer DEFAULT 0 NOT NULL,
  "confirmed_at" timestamp,
  "cancelled_at" timestamp,
  "cancellation_reason" text,
  "no_show_at" timestamp,
  "checked_in_at" timestamp,
  "checked_out_at" timestamp,
  "extended_to_date" date,
  "early_departure_at" timestamp,
  "arrival_time" text,
  "departure_time" text,
  "special_requests" text,
  "notes" text,
  "created_by_actor_id" text
);

CREATE INDEX IF NOT EXISTS "hsp_reservations_org_property_idx" ON "hsp_reservations" ("organization_id", "property_id");
CREATE INDEX IF NOT EXISTS "hsp_reservations_org_person_idx" ON "hsp_reservations" ("organization_id", "person_id");
CREATE INDEX IF NOT EXISTS "hsp_reservations_org_status_idx" ON "hsp_reservations" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "hsp_reservations_org_dates_idx" ON "hsp_reservations" ("organization_id", "check_in", "check_out");
CREATE INDEX IF NOT EXISTS "hsp_reservations_org_group_idx" ON "hsp_reservations" ("organization_id", "group_id");
CREATE INDEX IF NOT EXISTS "hsp_reservations_org_number_idx" ON "hsp_reservations" ("organization_id", "reservation_number");

CREATE TABLE IF NOT EXISTS "hsp_reservation_rooms" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "reservation_id" text NOT NULL,
  "room_location_id" text,
  "room_type_item_id" text NOT NULL,
  "rate_plan_id" text,
  "room_count" integer DEFAULT 1 NOT NULL,
  "daily_rate" jsonb,
  "status" text DEFAULT 'pending' NOT NULL,
  "assigned_room_id" text,
  "assigned_at" timestamp
);

CREATE INDEX IF NOT EXISTS "hsp_res_rooms_org_reservation_idx" ON "hsp_reservation_rooms" ("organization_id", "reservation_id");
CREATE INDEX IF NOT EXISTS "hsp_res_rooms_org_room_idx" ON "hsp_reservation_rooms" ("organization_id", "assigned_room_id");

CREATE TABLE IF NOT EXISTS "hsp_room_status_history" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "room_location_id" text NOT NULL,
  "status" text NOT NULL,
  "previous_status" text,
  "changed_by_actor_id" text,
  "reason" text,
  "reservation_id" text
);

CREATE INDEX IF NOT EXISTS "hsp_room_status_hist_org_room_idx" ON "hsp_room_status_history" ("organization_id", "room_location_id");
CREATE INDEX IF NOT EXISTS "hsp_room_status_hist_org_date_idx" ON "hsp_room_status_history" ("organization_id", "created_at");

CREATE TABLE IF NOT EXISTS "hsp_housekeeping" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "property_id" text NOT NULL,
  "room_location_id" text NOT NULL,
  "task_type" text DEFAULT 'cleaning' NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "assigned_actor_id" text,
  "scheduled_date" date,
  "started_at" timestamp,
  "completed_at" timestamp,
  "inspected_by_id" text,
  "inspected_at" timestamp,
  "inspection_result" text,
  "linen_notes" text,
  "minibar_notes" text,
  "maintenance_issues" jsonb,
  "notes" text,
  "reservation_id" text
);

CREATE INDEX IF NOT EXISTS "hsp_hk_org_property_status_idx" ON "hsp_housekeeping" ("organization_id", "property_id", "status");
CREATE INDEX IF NOT EXISTS "hsp_hk_org_room_idx" ON "hsp_housekeeping" ("organization_id", "room_location_id");
CREATE INDEX IF NOT EXISTS "hsp_hk_org_assignee_idx" ON "hsp_housekeeping" ("organization_id", "assigned_actor_id");
CREATE INDEX IF NOT EXISTS "hsp_hk_org_date_idx" ON "hsp_housekeeping" ("organization_id", "scheduled_date");

CREATE TABLE IF NOT EXISTS "hsp_service_catalog" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "property_id" text NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_available_24x7" boolean DEFAULT false NOT NULL,
  "available_from" text,
  "available_to" text,
  "base_price" jsonb,
  "fulfillment_type" text DEFAULT 'internal' NOT NULL,
  "partner_id" text,
  "auto_post_to_folio" boolean DEFAULT true NOT NULL,
  "requires_room" boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS "hsp_svc_catalog_org_property_idx" ON "hsp_service_catalog" ("organization_id", "property_id");
CREATE INDEX IF NOT EXISTS "hsp_svc_catalog_org_code_idx" ON "hsp_service_catalog" ("organization_id", "code");

CREATE TABLE IF NOT EXISTS "hsp_service_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "property_id" text NOT NULL,
  "service_catalog_id" text,
  "reservation_id" text,
  "room_location_id" text,
  "person_id" text,
  "status" text DEFAULT 'requested' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "requested_at" timestamp DEFAULT now() NOT NULL,
  "assigned_actor_id" text,
  "completed_at" timestamp,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price" jsonb,
  "total_charge" jsonb,
  "transaction_line_id" text,
  "notes" text,
  "guest_feedback" text,
  "guest_rating" integer
);

CREATE INDEX IF NOT EXISTS "hsp_svc_req_org_property_status_idx" ON "hsp_service_requests" ("organization_id", "property_id", "status");
CREATE INDEX IF NOT EXISTS "hsp_svc_req_org_reservation_idx" ON "hsp_service_requests" ("organization_id", "reservation_id");
CREATE INDEX IF NOT EXISTS "hsp_svc_req_org_room_idx" ON "hsp_service_requests" ("organization_id", "room_location_id");
CREATE INDEX IF NOT EXISTS "hsp_svc_req_org_assignee_idx" ON "hsp_service_requests" ("organization_id", "assigned_actor_id");

CREATE TABLE IF NOT EXISTS "hsp_parking" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "property_id" text NOT NULL,
  "reservation_id" text NOT NULL,
  "person_id" text,
  "vehicle_plate" text,
  "vehicle_make" text,
  "vehicle_model" text,
  "vehicle_color" text,
  "space_number" text,
  "pass_number" text,
  "check_in" timestamp,
  "check_out" timestamp,
  "daily_charge" jsonb,
  "transaction_line_id" text,
  "notes" text,
  "status" text DEFAULT 'active' NOT NULL
);

CREATE INDEX IF NOT EXISTS "hsp_parking_org_property_idx" ON "hsp_parking" ("organization_id", "property_id");
CREATE INDEX IF NOT EXISTS "hsp_parking_org_reservation_idx" ON "hsp_parking" ("organization_id", "reservation_id");
CREATE INDEX IF NOT EXISTS "hsp_parking_org_status_idx" ON "hsp_parking" ("organization_id", "status");

CREATE TABLE IF NOT EXISTS "hsp_partners" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "party_id" text,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "agreement_start" date,
  "agreement_end" date,
  "commission_rate" integer,
  "fee_notes" text,
  "listing_url" text,
  "listing_id" text,
  "allocated_room_inventory" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text
);

CREATE INDEX IF NOT EXISTS "hsp_partners_org_type_idx" ON "hsp_partners" ("organization_id", "type");
CREATE INDEX IF NOT EXISTS "hsp_partners_org_party_idx" ON "hsp_partners" ("organization_id", "party_id");

CREATE TABLE IF NOT EXISTS "hsp_venues" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "property_id" text NOT NULL,
  "location_id" text NOT NULL,
  "name" text NOT NULL,
  "type" text DEFAULT 'hall' NOT NULL,
  "capacity" integer,
  "area_sqft" integer,
  "base_price" jsonb,
  "packages" jsonb,
  "amenities" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "min_hours" integer,
  "max_hours" integer,
  "notes" text
);

CREATE INDEX IF NOT EXISTS "hsp_venues_org_property_idx" ON "hsp_venues" ("organization_id", "property_id");
CREATE INDEX IF NOT EXISTS "hsp_venues_org_location_idx" ON "hsp_venues" ("organization_id", "location_id");

CREATE TABLE IF NOT EXISTS "hsp_venue_reservations" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "venue_id" text NOT NULL,
  "property_id" text NOT NULL,
  "person_id" text,
  "party_id" text,
  "event_name" text,
  "event_type" text,
  "start_at" timestamp NOT NULL,
  "end_at" timestamp NOT NULL,
  "expected_guests" integer,
  "actual_guests" integer,
  "package_id" text,
  "package_details" jsonb,
  "status" text DEFAULT 'tentative' NOT NULL,
  "deposit_required" jsonb,
  "deposit_received" jsonb,
  "total_charges" jsonb,
  "transaction_id" text,
  "notes" text,
  "special_requirements" text,
  "cancelled_at" timestamp,
  "cancellation_reason" text
);

CREATE INDEX IF NOT EXISTS "hsp_venue_res_org_venue_idx" ON "hsp_venue_reservations" ("organization_id", "venue_id");
CREATE INDEX IF NOT EXISTS "hsp_venue_res_org_property_idx" ON "hsp_venue_reservations" ("organization_id", "property_id");
CREATE INDEX IF NOT EXISTS "hsp_venue_res_org_status_idx" ON "hsp_venue_reservations" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "hsp_venue_res_org_dates_idx" ON "hsp_venue_reservations" ("organization_id", "start_at", "end_at");
