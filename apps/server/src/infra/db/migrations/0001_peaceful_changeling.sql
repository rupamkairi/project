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
CREATE UNIQUE INDEX "plt_compose_compose_id_idx" ON "plt_compose_config" USING btree ("compose_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plt_org_settings_org_idx" ON "plt_organization_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plt_settings_key_idx" ON "plt_settings" USING btree ("key");