DO $$ BEGIN
  CREATE TYPE "invite_status" AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "plt_invites" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "email" text NOT NULL,
  "role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "invited_by" text NOT NULL,
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "status" "invite_status" DEFAULT 'pending' NOT NULL
);

CREATE TABLE IF NOT EXISTS "crm_tickets" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "version" integer DEFAULT 1 NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "subject" text NOT NULL,
  "description" text,
  "person_id" text,
  "party_id" text,
  "deal_id" text,
  "assignee_id" text,
  "status" text DEFAULT 'open' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "resolved_at" timestamp,
  "closed_at" timestamp,
  "first_response_at" timestamp
);

CREATE INDEX IF NOT EXISTS "crm_tickets_org_status_idx" ON "crm_tickets" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "crm_tickets_org_assignee_idx" ON "crm_tickets" ("organization_id", "assignee_id");
CREATE INDEX IF NOT EXISTS "crm_tickets_org_person_idx" ON "crm_tickets" ("organization_id", "person_id");
