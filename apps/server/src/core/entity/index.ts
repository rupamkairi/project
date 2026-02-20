import { ulid } from "ulid";

// Core types
export type ID = string; // ULID
export type Timestamp = number; // Unix epoch ms
export type Meta = Record<string, string | number | boolean | null>;

// Base entity interface - all domain entities should extend this
export interface Entity {
  id: ID;
  organizationId: ID; // multi-tenancy — always present
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp; // soft delete
  version: number; // optimistic concurrency
  meta: Meta;
}

// Generate a new ULID
export function generateId(): ID {
  return ulid();
}

// Generate a prefixed ULID (e.g., 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV')
export function generatePrefixedId(prefix: string): ID {
  return `${prefix}_${ulid()}`;
}

// Validate if a string is a valid ULID
export function isValidId(id: string): boolean {
  if (!id || id.length !== 26) return false;
  // ULID regex: Crockford's base32
  return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(id);
}

// Extract timestamp from a ULID
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

// Factory function to create a new entity with defaults
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

// Helper to check if entity is deleted (soft delete)
export function isDeleted(entity: Entity): boolean {
  return entity.deletedAt !== undefined;
}

// Helper to mark entity as deleted (soft delete)
export function softDelete(entity: Entity): Entity {
  return {
    ...entity,
    deletedAt: Date.now() as Timestamp,
    updatedAt: Date.now() as Timestamp,
    version: entity.version + 1,
  };
}

// Helper to update entity with optimistic locking
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
