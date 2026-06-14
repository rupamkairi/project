import type { EntitySchema } from "@core";
import { Validators } from "@core";

export const OrganizationSchema: EntitySchema = {
  name: "Organization",
  namespace: "identity",
  idPrefix: "org_",
  fields: [
    { key: "name", type: "string", required: true },
    { key: "slug", type: "string", required: true, unique: true },
    { key: "plan", type: "enum", enumValues: ["free", "pro", "enterprise"], default: "free" },
    { key: "settings", type: "json" },
    { key: "status", type: "enum", enumValues: ["active", "suspended"], default: "active" },
  ],
};

export const ActorSchema: EntitySchema = {
  name: "Actor",
  namespace: "identity",
  idPrefix: "act_",
  fields: [
    { key: "email", type: "string", required: true, validators: [Validators.email()], unique: true },
    { key: "passwordHash", type: "string", sensitive: true },
    { key: "type", type: "enum", enumValues: ["human", "system", "api_key"], default: "human" },
    { key: "status", type: "enum", enumValues: ["pending", "active", "suspended", "deleted"], default: "pending" },
    { key: "firstName", type: "string" },
    { key: "lastName", type: "string" },
    { key: "avatarUrl", type: "string" },
    { key: "lastLoginAt", type: "date" },
  ],
};

export const RoleSchema: EntitySchema = {
  name: "Role",
  namespace: "identity",
  idPrefix: "rol_",
  fields: [
    { key: "name", type: "string", required: true, unique: true },
    { key: "description", type: "string" },
    { key: "permissions", type: "json" },
    { key: "isDefault", type: "boolean", default: false },
    { key: "isSystem", type: "boolean", default: false },
  ],
};

export const SessionSchema: EntitySchema = {
  name: "Session",
  namespace: "identity",
  idPrefix: "ses_",
  softDelete: false,
  fields: [
    { key: "actorId", type: "ref", refEntity: "Actor", required: true },
    { key: "tokenHash", type: "string", required: true, unique: true, sensitive: true },
    { key: "refreshTokenHash", type: "string", sensitive: true },
    { key: "expiresAt", type: "date", required: true },
    { key: "refreshExpiresAt", type: "date" },
    { key: "ip", type: "string" },
    { key: "userAgent", type: "string" },
    { key: "revokedAt", type: "date" },
  ],
};

export const ApiKeySchema: EntitySchema = {
  name: "ApiKey",
  namespace: "identity",
  idPrefix: "key_",
  fields: [
    { key: "name", type: "string", required: true },
    { key: "actorId", type: "ref", refEntity: "Actor", required: true },
    { key: "keyHash", type: "string", required: true, unique: true, sensitive: true },
    { key: "scopes", type: "json" },
    { key: "expiresAt", type: "date" },
    { key: "lastUsedAt", type: "date" },
    { key: "revokedAt", type: "date" },
  ],
};
