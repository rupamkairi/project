/**
 * ID Generator
 *
 * IDGenerator interface and default ULID-based implementation.
 * Wraps the ULID library to provide a structured, testable API for ID generation.
 *
 * @category Core
 * @packageDocumentation
 */

import { ulid } from "ulid";
import type { ID, Timestamp } from "./types";

// Re-export so callers can `import type { ID } from "./id"` without going to types.ts
export type { ID, Timestamp } from "./types";

// ---------------------------------------------------------------------------
// IDGenerator interface (per docs/architecture/core.md §1)
// ---------------------------------------------------------------------------

/**
 * Interface for generating and validating entity IDs.
 *
 * Default implementation wraps ULID — lexicographically sortable, URL-safe.
 */
export interface IDGenerator {
  /** Generate a new bare ULID. */
  generate(): ID;

  /** Generate a namespaced ID: `namespace_<ULID>`. E.g. `ord_01ARZ...` */
  generateFor(namespace: string): ID;

  /** Returns true if the string is a valid bare 26-character ULID. */
  isValid(id: string): boolean;

  /** Decode the Unix epoch ms timestamp embedded in a ULID. */
  extractTimestamp(id: ID): Timestamp;
}

// ---------------------------------------------------------------------------
// Helpers (also exported as legacy standalone functions for backward compat)
// ---------------------------------------------------------------------------

/** Crockford base32 alphabet used in ULID. */
const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Regex for a bare 26-char Crockford base32 ULID. */
const ULID_RE = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i;

/**
 * Check if a string is a valid bare ULID.
 * @internal
 */
function _isValid(id: string): boolean {
  return typeof id === "string" && id.length === 26 && ULID_RE.test(id);
}

/**
 * Decode the timestamp component from a ULID string.
 * The first 10 characters encode 48-bit Unix epoch ms in base32.
 * @internal
 */
function _extractTimestamp(id: ID): Timestamp {
  if (!_isValid(id)) {
    throw new Error(`Invalid ULID: "${id}"`);
  }
  const timePart = id.substring(0, 10).toUpperCase();
  let ts = 0;
  for (let i = 0; i < timePart.length; i++) {
    const char = timePart.charAt(i);
    const value = BASE32.indexOf(char);
    if (value === -1) throw new Error(`Invalid ULID character: "${char}"`);
    ts = ts * 32 + value;
  }
  return ts as Timestamp;
}

// ---------------------------------------------------------------------------
// Default implementation
// ---------------------------------------------------------------------------

/**
 * Factory that creates an IDGenerator backed by ULID.
 */
export function createIdGenerator(): IDGenerator {
  return {
    generate(): ID {
      return ulid() as ID;
    },

    generateFor(namespace: string): ID {
      return `${namespace}_${ulid()}` as ID;
    },

    isValid(id: string): boolean {
      return _isValid(id);
    },

    extractTimestamp(id: ID): Timestamp {
      return _extractTimestamp(id);
    },
  };
}

/**
 * Singleton default IDGenerator.
 * Modules can inject their own, but this covers the common case.
 */
export const defaultIdGenerator: IDGenerator = createIdGenerator();
