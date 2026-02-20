import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  primaryKey,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

export const actorTypeEnum = pgEnum("actor_type", [
  "human",
  "system",
  "api_key",
]);
export const actorStatusEnum = pgEnum("actor_status", [
  "pending",
  "active",
  "suspended",
  "deleted",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: text("plan").notNull().default("free"),
    settings: jsonb("settings").notNull().default("{}"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("org_slug_idx").on(table.slug)],
);

export const actors = pgTable(
  "actors",
  {
    ...baseColumns,
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    type: actorTypeEnum("type").notNull().default("human"),
    status: actorStatusEnum("status").notNull().default("pending"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    avatarUrl: text("avatar_url"),
    lastLoginAt: timestamp("last_login_at"),
  },
  (table) => [
    uniqueIndex("actors_org_email_idx").on(table.organizationId, table.email),
    index("actors_org_status_idx").on(table.organizationId, table.status),
    index("actors_org_type_idx").on(table.organizationId, table.type),
  ],
);

export const roles = pgTable(
  "roles",
  {
    ...baseColumns,
    name: text("name").notNull(),
    description: text("description"),
    permissions: jsonb("permissions").notNull().default("[]"),
    isDefault: boolean("is_default").notNull().default(false),
    isSystem: boolean("is_system").notNull().default(false),
  },
  (table) => [
    uniqueIndex("roles_org_name_idx").on(table.organizationId, table.name),
  ],
);

export const actorRoles = pgTable(
  "actor_roles",
  {
    actorId: text("actor_id").notNull(),
    roleId: text("role_id").notNull(),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    assignedBy: text("assigned_by"),
  },
  (table) => [
    primaryKey({ columns: [table.actorId, table.roleId] }),
    index("actor_roles_actor_id_idx").on(table.actorId),
    index("actor_roles_role_id_idx").on(table.roleId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    ...baseColumns,
    actorId: text("actor_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    refreshTokenHash: text("refresh_token_hash"),
    expiresAt: timestamp("expires_at").notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    uniqueIndex("sessions_refresh_token_hash_idx").on(table.refreshTokenHash),
    index("sessions_actor_expires_idx").on(table.actorId, table.expiresAt),
    index("sessions_org_actor_idx").on(table.organizationId, table.actorId),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    ...baseColumns,
    name: text("name").notNull(),
    actorId: text("actor_id").notNull(),
    keyHash: text("key_hash").notNull(),
    scopes: jsonb("scopes").notNull().default("[]"),
    expiresAt: timestamp("expires_at"),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    uniqueIndex("api_keys_key_hash_idx").on(table.keyHash),
    index("api_keys_org_actor_idx").on(table.organizationId, table.actorId),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type Actor = typeof actors.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type ActorRole = typeof actorRoles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
