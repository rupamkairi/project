/**
 * Result type
 *
 * Canonical location: core/primitives/result.ts
 * Canonical shape defined in core.md §12.
 *
 * @category Core
 * @packageDocumentation
 */

import type { CoreError } from "../errors";

/**
 * Result type for functional error handling.
 *
 * Provides a type-safe alternative to try-catch blocks.
 *
 * @typeParam T - The success value type
 * @typeParam E - The error type (defaults to CoreError)
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, ValidationError> {
 *   if (b === 0) {
 *     return Err(new ValidationError("Division by zero"));
 *   }
 *   return Ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.ok) {
 *   console.log(result.value); // 5
 * }
 * ```
 *
 * @category Core
 */
export type Result<T, E extends CoreError = CoreError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Creates a successful Result.
 *
 * @typeParam T - The value type
 * @param value - The success value
 * @returns A successful Result
 *
 * @category Core
 */
export function Ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

/**
 * Creates a failed Result.
 *
 * @typeParam E - The error type
 * @param error - The error value
 * @returns A failed Result
 *
 * @category Core
 */
export function Err<E extends CoreError>(error: E): Result<never, E> {
  return { ok: false, error };
}
