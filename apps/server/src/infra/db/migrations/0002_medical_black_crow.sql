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
	"content_type" text,
	"size" integer,
	"uploaded_by_id" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "storage_files_org_created_at_idx" ON "storage_files" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "storage_files_org_uploaded_by_id_idx" ON "storage_files" USING btree ("organization_id","uploaded_by_id");