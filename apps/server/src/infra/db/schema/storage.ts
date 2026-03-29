import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

export const storageFiles = pgTable(
  "storage_files",
  {
    ...baseColumns,
    bucket: text("bucket").notNull(),
    key: text("key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull().default(""),
    size: integer("size").notNull().default(0),
    uploadedById: text("uploaded_by_id").notNull(),
    status: text("status").notNull().default("pending"),
  },
  (table) => [
    index("storage_files_org_created_at_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("storage_files_org_uploaded_by_id_idx").on(
      table.organizationId,
      table.uploadedById,
    ),
  ],
);

export type StorageFile = typeof storageFiles.$inferSelect;
