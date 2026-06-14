/**
 * Entity primitive types shared across id.ts, schema.ts, registry.ts.
 *
 * These are re-exported from entity/index.ts and must stay in sync with
 * the definitions that already live there. This file exists so that
 * id.ts and schema.ts can import from a stable internal module without
 * creating a circular dependency through the barrel index.
 *
 * @internal
 */

/** ULID-format unique identifier. */
export type ID = string;

/** Unix epoch milliseconds — no Date objects in Core. */
export type Timestamp = number;

/** Flexible metadata bag. */
export type Meta = Record<string, string | number | boolean | null>;
