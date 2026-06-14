/**
 * Core Primitives
 *
 * Fundamental types and utilities used throughout the system.
 * Includes monetary values, pagination support, logger, and result type.
 *
 * @category Core
 * @packageDocumentation
 */

// Logger — canonical location
export type { Logger } from "./logger";

// Result type — canonical location
// Note: Result depends on CoreError from errors/index.ts, which in turn
// imports from primitives — to avoid a circular dependency the import in
// result.ts goes directly to ../errors (not through this barrel).
export type { Result } from "./result";
export { Ok, Err } from "./result";

/**
 * Monetary value with currency.
 *
 * All amounts are stored as integers in the smallest currency unit
 * (e.g., cents, paise) to avoid floating-point precision issues.
 *
 * @example
 * ```typescript
 * const price: Money = { amount: 999, currency: "USD" }; // $9.99
 * const total = moneyAdd(price, { amount: 100, currency: "USD" }); // $10.99
 * ```
 *
 * @category Core
 */
export interface Money {
  /**
   * Amount in smallest currency unit (integer)
   *
   * Examples:
   * - 999 = $9.99 USD
   * - 100 = ₹1.00 INR
   * - 50 = €0.50 EUR
   */
  amount: number;

  /**
   * ISO 4217 currency code
   *
   * Examples: "USD", "EUR", "INR", "GBP"
   */
  currency: string;
}

/**
 * Adds two monetary values.
 *
 * @param a - First monetary value
 * @param b - Second monetary value
 * @returns Sum of the two values
 *
 * @throws Error if currencies don't match
 *
 * @example
 * ```typescript
 * const total = moneyAdd(
 *   { amount: 1000, currency: "USD" },
 *   { amount: 500, currency: "USD" }
 * ); // { amount: 1500, currency: "USD" }
 * ```
 *
 * @category Core
 */
export function moneyAdd(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot add different currencies: ${a.currency} and ${b.currency}`,
    );
  }
  return {
    amount: a.amount + b.amount,
    currency: a.currency,
  };
}

/**
 * Subtracts two monetary values.
 *
 * @param a - First monetary value (minuend)
 * @param b - Second monetary value (subtrahend)
 * @returns Difference of the two values
 *
 * @throws Error if currencies don't match
 *
 * @category Core
 */
export function moneySubtract(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot subtract different currencies: ${a.currency} and ${b.currency}`,
    );
  }
  return {
    amount: a.amount - b.amount,
    currency: a.currency,
  };
}

/**
 * Multiplies a monetary value by a factor.
 *
 * @param m - Monetary value to multiply
 * @param factor - Multiplication factor
 * @returns Multiplied monetary value (rounded to nearest integer)
 *
 * @example
 * ```typescript
 * const doubled = moneyMultiply({ amount: 500, currency: "USD" }, 2);
 * // { amount: 1000, currency: "USD" }
 * ```
 *
 * @category Core
 */
export function moneyMultiply(m: Money, factor: number): Money {
  return {
    amount: Math.round(m.amount * factor),
    currency: m.currency,
  };
}

/**
 * ISO 4217 currencies that have no minor unit (i.e. the amount is already
 * in the major unit — no division by 100 needed).
 *
 * @see https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY",
  "KRW",
  "VND",
  "BIF",
  "CLP",
  "GNF",
  "ISK",
  "KMF",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "UZS",
  "XAF",
  "XOF",
  "XPF",
]);

/**
 * Formats a monetary value as a localized currency string.
 *
 * Amounts in zero-decimal currencies (e.g. JPY, KRW) are used as-is;
 * all other currencies are divided by 100 to convert from the smallest unit.
 *
 * @param m - Monetary value to format
 * @param locale - Locale for formatting (default: "en-US")
 * @returns Formatted currency string
 *
 * @example
 * ```typescript
 * moneyFormat({ amount: 999, currency: "USD" }); // "$9.99"
 * moneyFormat({ amount: 999, currency: "EUR" }, "de-DE"); // "9,99 €"
 * moneyFormat({ amount: 100, currency: "INR" }, "en-IN"); // "₹1.00"
 * moneyFormat({ amount: 500, currency: "JPY" }); // "¥500"
 * ```
 *
 * @category Core
 */
export function moneyFormat(m: Money, locale: string = "en-US"): string {
  const amount = ZERO_DECIMAL_CURRENCIES.has(m.currency.toUpperCase())
    ? m.amount
    : m.amount / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
  }).format(amount);
}

/**
 * Paginated result wrapper for list queries.
 *
 * @typeParam T - The type of items in the result
 *
 * @example
 * ```typescript
 * const users: PaginatedResult<User> = await findAll(orgId, {
 *   page: 1,
 *   limit: 20
 * });
 *
 * console.log(`Showing ${users.data.length} of ${users.total}`);
 * if (users.hasNext) {
 *   console.log("Next page available");
 * }
 * ```
 *
 * @category Core
 */
export interface PaginatedResult<T> {
  /**
   * Array of items for the current page
   */
  data: T[];

  /**
   * Total number of items across all pages
   */
  total: number;

  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Whether there are more pages after the current one
   */
  hasNext: boolean;
}

/**
 * Sort specification for queries.
 *
 * @example
 * ```typescript
 * const sort: SortSpec[] = [
 *   { field: "createdAt", order: "desc" },
 *   { field: "name", order: "asc" }
 * ];
 * ```
 *
 * @category Core
 */
export interface SortSpec {
  /**
   * Field name to sort by
   */
  field: string;

  /**
   * Sort order
   */
  order: "asc" | "desc";
}

/**
 * Pagination options for queries.
 *
 * @example
 * ```typescript
 * const options: PageOptions = {
 *   page: 1,
 *   limit: 50,
 *   sort: [{ field: "name", order: "asc" }]
 * };
 * ```
 *
 * @category Core
 */
export interface PageOptions {
  /**
   * Page number (1-indexed, default: 1)
   */
  page?: number;

  /**
   * Number of items per page (default: 20)
   */
  limit?: number;

  /**
   * Sort specifications
   */
  sort?: SortSpec[];
}

/**
 * Creates a paginated result from raw data.
 *
 * @typeParam T - The type of items
 * @param data - Array of items for the current page
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Paginated result with hasNext calculated
 *
 * @category Core
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    hasNext: page * limit < total,
  };
}

/**
 * Returns default pagination options.
 *
 * @returns Default page options (page: 1, limit: 20, sort: [])
 *
 * @category Core
 */
export function getDefaultPageOptions(): PageOptions {
  return {
    page: 1,
    limit: 20,
    sort: [],
  };
}
