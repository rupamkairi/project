/**
 * Entity & ID Generation — Barrel
 *
 * Public API for the entity sub-system. Re-exports:
 *   - Primitive types (ID, Timestamp, Meta, Entity) and entity helpers
 *   - IDGenerator interface + default implementation (id.ts)
 *   - EntitySchema system — FieldType, FieldSchema, Validators, etc. (schema.ts)
 *   - EntitySchemaRegistry (registry.ts)
 *
 * ALL existing consumers importing from this barrel continue to work unchanged.
 *
 * @category Core
 * @packageDocumentation
 */

import { ulid } from "ulid";

// ---------------------------------------------------------------------------
// Primitive types — defined here for backward compatibility.
// types.ts holds an internal copy; keep these in sync.
// ---------------------------------------------------------------------------

/**
 * Unique identifier type using ULID (Universally Unique Lexicographically Sortable Identifier).
 *
 * ULIDs are 26 characters long and provide:
 * - 128-bit compatibility
 * - Lexicographic sorting by timestamp
 * - URL-safe encoding
 *
 * @example
 * ```typescript
 * const userId: ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
 * ```
 *
 * @category Core
 */
export type ID = string;

/**
 * Timestamp as Unix epoch in milliseconds.
 *
 * @example
 * ```typescript
 * const now: Timestamp = Date.now(); // 1709876543210
 * ```
 *
 * @category Core
 */
export type Timestamp = number;

/**
 * Flexible metadata container for entities.
 *
 * @category Core
 */
export type Meta = Record<string, string | number | boolean | null>;

/**
 * Base entity interface for all domain entities.
 *
 * All domain entities should extend this interface to ensure
 * consistent multi-tenancy, auditing, and concurrency control.
 *
 * @example
 * ```typescript
 * interface User extends Entity {
 *   email: string;
 *   name: string;
 *   role: "admin" | "user";
 * }
 * ```
 *
 * @category Core
 */
export interface Entity {
  /**
   * Unique identifier (ULID format)
   */
  id: ID;

  /**
   * Organization ID for multi-tenancy
   *
   * Always present to ensure data isolation between organizations
   */
  organizationId: ID;

  /**
   * Creation timestamp (Unix epoch ms)
   */
  createdAt: Timestamp;

  /**
   * Last update timestamp (Unix epoch ms)
   */
  updatedAt: Timestamp;

  /**
   * Soft delete timestamp (undefined if not deleted)
   */
  deletedAt?: Timestamp;

  /**
   * Version number for optimistic concurrency control
   *
   * Incremented on each update
   */
  version: number;

  /**
   * Flexible metadata storage
   */
  meta: Meta;
}

// ---------------------------------------------------------------------------
// Legacy / backward-compat ID functions
// (kept here so existing imports don't break)
// ---------------------------------------------------------------------------

/**
 * Generates a new ULID.
 *
 * @returns A new 26-character ULID string
 *
 * @example
 * ```typescript
 * const id = generateId(); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
 * ```
 *
 * @category Core
 */
export function generateId(): ID {
  return ulid();
}

/**
 * Generates a prefixed ULID for entity type identification.
 *
 * @param prefix - Entity type prefix (e.g., "user", "ord", "inv")
 * @returns Prefixed ULID string
 *
 * @example
 * ```typescript
 * const userId = generatePrefixedId("usr"); // "usr_01ARZ3NDEKTSV4RRFFQ69G5FAV"
 * const orderId = generatePrefixedId("ord"); // "ord_01ARZ3NDEKTSV4RRFFQ69G5FAV"
 * ```
 *
 * @category Core
 */
export function generatePrefixedId(prefix: string): ID {
  return `${prefix}_${ulid()}`;
}

/**
 * Validates if a string is a valid ULID.
 *
 * @param id - String to validate
 * @returns True if valid ULID (26 characters, Crockford base32)
 *
 * @example
 * ```typescript
 * isValidId("01ARZ3NDEKTSV4RRFFQ69G5FAV"); // true
 * isValidId("invalid"); // false
 * isValidId("01ARZ3NDEKTSV4RRFFQ69G5FA"); // false (25 chars)
 * ```
 *
 * @category Core
 */
export function isValidId(id: string): boolean {
  if (!id || id.length !== 26) return false;
  // ULID regex: Crockford's base32
  return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(id);
}

/**
 * Extracts the timestamp from a ULID.
 *
 * @param id - ULID to extract timestamp from
 * @returns Unix epoch timestamp in milliseconds
 *
 * @throws Error if ULID format is invalid
 *
 * @example
 * ```typescript
 * const id = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
 * const timestamp = extractTimestamp(id); // 1469918176385
 * const date = new Date(timestamp);
 * ```
 *
 * @category Core
 */
export function extractTimestamp(id: ID): Timestamp {
  if (!isValidId(id)) {
    throw new Error("Invalid ULID format");
  }
  // First 10 characters of ULID encode the timestamp in base32
  const timePart = id.substring(0, 10);
  // Decode base32 Crockford
  let timestamp = 0;
  const base32Chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  for (let i = 0; i < timePart.length; i++) {
    const char: string = timePart.charAt(i).toUpperCase();
    const value = base32Chars.indexOf(char);
    if (value === -1) return 0;
    timestamp = timestamp * 32 + value;
  }
  return timestamp;
}

/**
 * Factory function to create a new entity with default values.
 *
 * @typeParam T - Entity type extending Entity interface
 * @param id - Entity ID (use generateId() or generatePrefixedId())
 * @param organizationId - Organization ID for multi-tenancy
 * @param partial - Optional partial entity properties
 * @returns Complete entity with defaults applied
 *
 * @example
 * ```typescript
 * const user = createEntity<User>(
 *   generateId(),
 *   "org_01ARZ3NDEKTSV4RRFFQ69G5FAV",
 *   { email: "user@example.com", name: "John" }
 * );
 * // Result has: id, organizationId, createdAt, updatedAt, version: 1, meta: {}
 * ```
 *
 * @category Core
 */
export function createEntity<T extends Entity>(
  id: ID,
  organizationId: ID,
  partial?: Partial<T>,
): T {
  const now = Date.now() as Timestamp;
  return {
    id,
    organizationId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: {},
    ...partial,
  } as T;
}

/**
 * Checks if an entity has been soft-deleted.
 *
 * @param entity - Entity to check
 * @returns True if entity is soft-deleted
 *
 * @category Core
 */
export function isDeleted(entity: Entity): boolean {
  return entity.deletedAt !== undefined;
}

/**
 * Marks an entity as soft-deleted.
 *
 * Sets deletedAt timestamp, updates updatedAt, and increments version.
 *
 * @param entity - Entity to soft-delete
 * @returns New soft-deleted entity instance
 *
 * @category Core
 */
export function softDelete(entity: Entity): Entity {
  return {
    ...entity,
    deletedAt: Date.now() as Timestamp,
    updatedAt: Date.now() as Timestamp,
    version: entity.version + 1,
  };
}

/**
 * Updates an entity with optimistic locking.
 *
 * @typeParam T - Entity type
 * @param entity - Entity to update
 * @param updates - Properties to update
 * @returns New entity instance with updates applied
 *
 * @remarks
 * Automatically updates:
 * - updatedAt to current timestamp
 * - version incremented by 1
 *
 * @example
 * ```typescript
 * const updated = updateEntity(user, { name: "New Name" });
 * // updated.version === user.version + 1
 * ```
 *
 * @category Core
 */
export function updateEntity<T extends Entity>(
  entity: T,
  updates: Partial<T>,
): T {
  return {
    ...entity,
    ...updates,
    updatedAt: Date.now() as Timestamp,
    version: entity.version + 1,
  };
}

// ---------------------------------------------------------------------------
// New exports — Entity Schema System
// ---------------------------------------------------------------------------

// IDGenerator interface + default implementation
export type { IDGenerator } from "./id";
export { createIdGenerator, defaultIdGenerator } from "./id";

// Schema system types and Validators
export type {
  FieldType,
  FieldSchema,
  EntitySchema,
  EntityHooks,
  Validator,
  ValidatorFn,
  ValidationContext,
  ValidationResult,
  GeoPoint,
  GeoPolygon,
  GeoLinestring,
} from "./schema";
export { Validators } from "./schema";

// EntitySchemaRegistry
export type { EntitySchemaRegistry } from "./registry";
export { createEntitySchemaRegistry } from "./registry";
