import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

export const docStatusEnum = pgEnum("doc_status", [
  "draft",
  "under_review",
  "approved",
  "archived",
]);

export const docFolders = pgTable(
  "doc_folders",
  {
    ...baseColumns,
    name: text("name").notNull(),
    parentId: text("parent_id"),
    ownerId: text("owner_id").notNull(),
    ownerType: text("owner_type").notNull(),
  },
  (table) => [
    index("doc_folders_org_owner_idx").on(
      table.organizationId,
      table.ownerId,
      table.ownerType,
    ),
    index("doc_folders_org_parent_idx").on(
      table.organizationId,
      table.parentId,
    ),
  ],
);

export const docDocuments = pgTable(
  "doc_documents",
  {
    ...baseColumns,
    folderId: text("folder_id"),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    status: docStatusEnum("status").notNull().default("draft"),
    latestVersionId: text("latest_version_id"),
    tags: jsonb("tags").notNull().default("[]"),
  },
  (table) => [
    index("doc_documents_org_folder_idx").on(
      table.organizationId,
      table.folderId,
    ),
    index("doc_documents_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const docVersions = pgTable(
  "doc_versions",
  {
    ...baseColumns,
    documentId: text("document_id").notNull(),
    storageKey: text("storage_key").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: text("checksum").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
  },
  (table) => [
    index("doc_versions_org_document_idx").on(
      table.organizationId,
      table.documentId,
    ),
    index("doc_versions_org_document_created_idx").on(
      table.organizationId,
      table.documentId,
      table.createdAt,
    ),
  ],
);

export const docAttachments = pgTable(
  "doc_attachments",
  {
    ...baseColumns,
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    documentId: text("document_id").notNull(),
    label: text("label"),
  },
  (table) => [
    index("doc_attachments_org_entity_idx").on(
      table.organizationId,
      table.entityId,
      table.entityType,
    ),
    index("doc_attachments_org_document_idx").on(
      table.organizationId,
      table.documentId,
    ),
  ],
);

export type DocFolder = typeof docFolders.$inferSelect;
export type DocDocument = typeof docDocuments.$inferSelect;
export type DocVersion = typeof docVersions.$inferSelect;
export type DocAttachment = typeof docAttachments.$inferSelect;
