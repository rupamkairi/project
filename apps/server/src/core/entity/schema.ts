/**
 * Entity Schema System
 *
 * FieldType, FieldSchema, EntitySchema, Validator, ValidationContext,
 * ValidationResult, Validators factory, EntityHooks, ValidatorFn.
 *
 * CONTRACT: exactly as specified in docs/architecture/core.md §2.
 * Zod is used INTERNALLY for some validators. The public API never
 * exposes Zod types.
 *
 * @category Core
 * @packageDocumentation
 */

import { z } from "zod";
import { ValidationError } from "../errors/index";
import type { ID } from "./types";

// ---------------------------------------------------------------------------
// Re-export ValidationError so callers import it from one place
// ---------------------------------------------------------------------------
export { ValidationError };

// ---------------------------------------------------------------------------
// FieldType
// ---------------------------------------------------------------------------

/**
 * All supported field kinds for EntitySchema fields.
 * Extend only through a schema evolution — never break this union.
 */
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"       // stored as Timestamp (Unix epoch ms)
  | "enum"       // enumValues must be provided
  | "ref"        // single foreign key; refEntity required
  | "ref[]"      // array of foreign keys; refEntity required
  | "json"       // arbitrary nested object
  | "money"      // { amount: number; currency: string }
  | "geo.point"      // { lat: number; lng: number }
  | "geo.polygon"    // GeoJSON polygon
  | "geo.linestring"; // GeoJSON linestring

// ---------------------------------------------------------------------------
// Geo primitives (opaque minimal types — real shape TBD by geo adapter)
// ---------------------------------------------------------------------------

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GeoLinestring {
  type: "LineString";
  coordinates: number[][];
}

// ---------------------------------------------------------------------------
// Validator types
// ---------------------------------------------------------------------------

/**
 * Context passed to every Validator call.
 */
export interface ValidationContext {
  /** The full entity object being validated. */
  entity: Record<string, unknown>;
  /** The EntitySchema for the entity being validated. */
  schema: EntitySchema;
  /** True when this is a create operation. */
  isCreate: boolean;
  /** True when this is an update operation. */
  isUpdate: boolean;
  /** ID of the actor performing the operation. */
  actorId: ID;
  /** Organization ID for tenant scoping. */
  orgId: ID;
}

/**
 * The function signature that custom validators must match.
 * Returns null on success, a ValidationError on failure.
 */
export type ValidatorFn = (
  value: unknown,
  context: ValidationContext,
) => ValidationError | null;

/**
 * A Validator is a pure function: `(value, context) => ValidationError | null`.
 * Returning null means the value is valid.
 * Returning a ValidationError means it failed.
 *
 * IMPORTANT: validators must NEVER return a boolean.
 */
export type Validator = (
  value: unknown,
  context: ValidationContext,
) => ValidationError | null;

// ---------------------------------------------------------------------------
// ValidationResult
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// EntityHooks
// ---------------------------------------------------------------------------

export interface EntityHooks {
  beforeSave?: (entity: Record<string, unknown>, ctx: ValidationContext) => void | Promise<void>;
  afterSave?: (entity: Record<string, unknown>, ctx: ValidationContext) => void | Promise<void>;
  beforeDelete?: (entity: Record<string, unknown>, ctx: ValidationContext) => void | Promise<void>;
  afterDelete?: (entity: Record<string, unknown>, ctx: ValidationContext) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// FieldSchema
// ---------------------------------------------------------------------------

export interface FieldSchema {
  /** Field key — used as the property name on entities. */
  key: string;
  /** Field type — one of the FieldType union members. */
  type: FieldType;
  /** Human-readable label for auto-UI generation. */
  label?: string;
  /** Whether this field must be present and non-null. */
  required?: boolean;
  /** Whether this field must be unique within the organization scope. */
  unique?: boolean;
  /** Static default value or a factory function that produces one. */
  default?: unknown | (() => unknown);
  /** Array of validator functions applied in order during validate(). */
  validators?: Validator[];
  /** Valid enum members — required when type = 'enum'. */
  enumValues?: string[];
  /** Entity schema name this field references — required when type = 'ref' | 'ref[]'. */
  refEntity?: string;
  /** Field to join on (default: 'id') — used when type = 'ref' | 'ref[]'. */
  refField?: string;
  /** Create a DB index on this field. */
  indexed?: boolean;
  /** Include in SearchAdapter sync. */
  searchable?: boolean;
  /** Redacted from logs and API responses. */
  sensitive?: boolean;
  /** Virtual / computed field — not persisted; derived at read time. */
  computed?: (entity: Record<string, unknown>) => unknown;
}

// ---------------------------------------------------------------------------
// EntitySchema
// ---------------------------------------------------------------------------

export interface EntitySchema {
  /** PascalCase entity name: 'Product', 'OrderItem', 'StockUnit'. */
  name: string;
  /** Owning module namespace: 'catalog', 'inventory'. */
  namespace: string;
  /** ID prefix: 'prod_', 'si_', 'ord_'. */
  idPrefix?: string;
  /** Field definitions — an ARRAY, not a Record. */
  fields: FieldSchema[];
  /** Composite index definitions. */
  indexes?: Array<string[]>;
  /** Composite unique constraint definitions. */
  uniqueConstraints?: Array<string[]>;
  /** Enable soft-delete via deletedAt timestamp (default: true). */
  softDelete?: boolean;
  /** Auto-manage createdAt / updatedAt (default: true). */
  timestamps?: boolean;
  /** Enable optimistic locking via version counter (default: true). */
  versioned?: boolean;
  /** Auto-sync to SearchAdapter on change. */
  searchSync?: boolean;
  /** Real-time channel to broadcast mutations on. */
  rtChannel?: string;
  /** Lifecycle hooks: beforeSave, afterSave, beforeDelete, afterDelete. */
  hooks?: EntityHooks;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a one-failure ValidationError for a field. */
function fieldError(field: string, message: string): ValidationError {
  return new ValidationError("Validation failed", [{ field, message }]);
}

/** Build a ValidationError with a generic (non-field) failure. */
function genericError(message: string): ValidationError {
  return new ValidationError("Validation failed", [{ field: "_", message }]);
}

// ---------------------------------------------------------------------------
// Built-in Validators
// ---------------------------------------------------------------------------

/**
 * Built-in validator factory functions.
 *
 * Each factory returns a `Validator` — a function with signature
 * `(value, context) => ValidationError | null`.
 */
export const Validators = {
  // --- String validators ---

  minLength(n: number): Validator {
    return (value, _ctx) => {
      if (typeof value !== "string") {
        return genericError(`Expected a string but got ${typeof value}`);
      }
      if (value.length < n) {
        return genericError(`Minimum length is ${n}, got ${value.length}`);
      }
      return null;
    };
  },

  maxLength(n: number): Validator {
    return (value, _ctx) => {
      if (typeof value !== "string") {
        return genericError(`Expected a string but got ${typeof value}`);
      }
      if (value.length > n) {
        return genericError(`Maximum length is ${n}, got ${value.length}`);
      }
      return null;
    };
  },

  pattern(re: RegExp): Validator {
    return (value, _ctx) => {
      if (typeof value !== "string") {
        return genericError(`Expected a string`);
      }
      if (!re.test(value)) {
        return genericError(`Value does not match pattern ${re.toString()}`);
      }
      return null;
    };
  },

  /** Validate email format using Zod internally. */
  email(): Validator {
    const schema = z.email();
    return (value, _ctx) => {
      if (typeof value !== "string") {
        return genericError("Expected a string for email");
      }
      const result = schema.safeParse(value);
      if (!result.success) {
        return genericError("Must be a valid email address");
      }
      return null;
    };
  },

  /** Validate URL format using Zod internally. */
  url(): Validator {
    const schema = z.url();
    return (value, _ctx) => {
      if (typeof value !== "string") {
        return genericError("Expected a string for URL");
      }
      const result = schema.safeParse(value);
      if (!result.success) {
        return genericError("Must be a valid URL");
      }
      return null;
    };
  },

  /**
   * Validate phone number — requires E.164 format (+<country><number>).
   * E.g. +14155552671
   */
  phone(): Validator {
    // E.164: + followed by 1–15 digits
    const E164 = /^\+[1-9]\d{1,14}$/;
    return (value, _ctx) => {
      if (typeof value !== "string") {
        return genericError("Expected a string for phone number");
      }
      if (!E164.test(value)) {
        return genericError("Phone must be in E.164 format (e.g. +14155552671)");
      }
      return null;
    };
  },

  // --- Number validators ---

  min(n: number): Validator {
    return (value, _ctx) => {
      if (typeof value !== "number") {
        return genericError(`Expected a number`);
      }
      if (value < n) {
        return genericError(`Value must be >= ${n}, got ${value}`);
      }
      return null;
    };
  },

  max(n: number): Validator {
    return (value, _ctx) => {
      if (typeof value !== "number") {
        return genericError(`Expected a number`);
      }
      if (value > n) {
        return genericError(`Value must be <= ${n}, got ${value}`);
      }
      return null;
    };
  },

  positive(): Validator {
    return (value, _ctx) => {
      if (typeof value !== "number") {
        return genericError("Expected a number");
      }
      if (value <= 0) {
        return genericError("Value must be positive (> 0)");
      }
      return null;
    };
  },

  nonZero(): Validator {
    return (value, _ctx) => {
      if (typeof value !== "number") {
        return genericError("Expected a number");
      }
      if (value === 0) {
        return genericError("Value must not be zero");
      }
      return null;
    };
  },

  // --- Date validators ---

  /** Value (Unix epoch ms) must be in the future. */
  future(): Validator {
    return (value, _ctx) => {
      if (typeof value !== "number") {
        return genericError("Expected a timestamp (number)");
      }
      if (value <= Date.now()) {
        return genericError("Date must be in the future");
      }
      return null;
    };
  },

  /** Value (Unix epoch ms) must be in the past. */
  past(): Validator {
    return (value, _ctx) => {
      if (typeof value !== "number") {
        return genericError("Expected a timestamp (number)");
      }
      if (value >= Date.now()) {
        return genericError("Date must be in the past");
      }
      return null;
    };
  },

  // --- Relational validators (DB-dependent — best-effort stubs) ---

  /**
   * Verifies the referenced entity exists in DB.
   *
   * TODO: wire to a DB resolver once the DatabaseAdapter lands.
   * For now returns null (passes) so Core does not block on DB layer.
   */
  refExists(): Validator {
    return (_value, _ctx) => {
      // TODO: inject a resolver via ctx when DatabaseAdapter is available.
      return null;
    };
  },

  /**
   * Verifies the field value is unique within the organization scope.
   *
   * TODO: wire to a DB resolver once the DatabaseAdapter lands.
   * For now returns null (passes) so Core does not block on DB layer.
   */
  unique(): Validator {
    return (_value, _ctx) => {
      // TODO: inject a resolver via ctx when DatabaseAdapter is available.
      return null;
    };
  },

  // --- Custom validator ---

  /**
   * Wrap a ValidatorFn as a Validator.
   * The supplied function must match `(value, ctx) => ValidationError | null`.
   */
  custom(fn: ValidatorFn): Validator {
    return (value, ctx) => fn(value, ctx);
  },
} as const;
