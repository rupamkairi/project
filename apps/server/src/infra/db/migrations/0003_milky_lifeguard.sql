ALTER TABLE "storage_files" ALTER COLUMN "content_type" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "storage_files" ALTER COLUMN "content_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_files" ALTER COLUMN "size" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "storage_files" ALTER COLUMN "size" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_files" ALTER COLUMN "uploaded_by_id" SET NOT NULL;