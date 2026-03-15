/**
 * Core Error Hierarchy
 *
 * Provides a standardized error handling system with a base error class
 * and specialized error types for common failure scenarios.
 *
 * @category Core
 * @packageDocumentation
 */

/**
 * Base class for all custom errors in the system.
 *
 * All domain-specific errors should extend this class to maintain
 * consistent error handling across the application.
 *
 * @example
 * ```typescript
 * try {
 *   throw new CoreError("USER_NOT_FOUND", "User does not exist");
 * } catch (error) {
 *   if (error instanceof CoreError) {
 *     console.log(error.code, error.message);
 *   }
 * }
 * ```
 *
 * @category Core
 */
export class CoreError extends Error {
  /**
   * Machine-readable error code for programmatic handling
   */
  public readonly code: string;

  /**
   * Additional metadata about the error context
   */
  public readonly meta?: Record<string, unknown>;

  /**
   * The original error that caused this error (if any)
   */
  override readonly cause?: unknown;

  /**
   * Creates a new CoreError instance.
   *
   * @param code - Machine-readable error code (e.g., "USER_NOT_FOUND")
   * @param message - Human-readable error message
   * @param meta - Optional metadata for debugging
   * @param cause - Optional original error that caused this error
   */
  constructor(
    code: string,
    message: string,
    meta?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
    this.cause = cause;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error to a plain object for serialization.
   *
   * @returns Object representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      ...(this.meta && { meta: this.meta }),
    };
  }
}

/**
 * Error thrown when a requested resource is not found.
 *
 * HTTP Status: 404 Not Found
 *
 * @example
 * ```typescript
 * const user = await findById(userId);
 * if (!user) {
 *   throw new NotFoundError("User not found", { userId });
 * }
 * ```
 *
 * @category Core
 */
export class NotFoundError extends CoreError {
  /**
   * Creates a new NotFoundError.
   *
   * @param message - Human-readable error message
   * @param meta - Optional metadata (e.g., resource ID)
   * @param cause - Optional original error
   */
  constructor(
    message: string,
    meta?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super("NOT_FOUND", message, meta, cause);
    this.name = "NotFoundError";
  }
}

/**
 * Error thrown when validation fails.
 *
 * Contains detailed information about which fields failed validation.
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * ```typescript
 * throw new ValidationError("Invalid input", [
 *   { field: "email", message: "Must be a valid email address" },
 *   { field: "age", message: "Must be at least 18" }
 * ]);
 * ```
 *
 * @category Core
 */
export class ValidationError extends CoreError {
  /**
   * Array of validation failures with field names and messages
   */
  public readonly failures: Array<{ field: string; message: string }>;

  /**
   * Creates a new ValidationError.
   *
   * @param message - Human-readable error message
   * @param failures - Array of field-level validation failures
   * @param meta - Optional additional metadata
   */
  constructor(
    message: string,
    failures: Array<{ field: string; message: string }> = [],
    meta?: Record<string, unknown>,
  ) {
    super("VALIDATION_ERROR", message, { ...meta, failures }, undefined);
    this.name = "ValidationError";
    this.failures = failures;
  }

  /**
   * Converts the error to a plain object including failures.
   *
   * @returns Object representation with validation failures
   */
  override toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      failures: this.failures,
    };
  }
}

/**
 * Error thrown when authentication is required or fails.
 *
 * HTTP Status: 401 Unauthorized
 *
 * @example
 * ```typescript
 * if (!session) {
 *   throw new AuthenticationError("Session expired");
 * }
 * ```
 *
 * @category Core
 */
export class AuthenticationError extends CoreError {
  /**
   * Creates a new AuthenticationError.
   *
   * @param message - Human-readable error message (default: "Authentication required")
   * @param meta - Optional metadata
   */
  constructor(
    message: string = "Authentication required",
    meta?: Record<string, unknown>,
  ) {
    super("AUTHENTICATION_ERROR", message, meta);
    this.name = "AuthenticationError";
  }
}

/**
 * Error thrown when access to a resource is denied.
 *
 * HTTP Status: 403 Forbidden
 *
 * @example
 * ```typescript
 * if (!user.hasPermission("delete:user")) {
 *   throw new AuthorizationError("Insufficient permissions");
 * }
 * ```
 *
 * @category Core
 */
export class AuthorizationError extends CoreError {
  /**
   * Creates a new AuthorizationError.
   *
   * @param message - Human-readable error message (default: "Access denied")
   * @param meta - Optional metadata
   */
  constructor(
    message: string = "Access denied",
    meta?: Record<string, unknown>,
  ) {
    super("AUTHORIZATION_ERROR", message, meta);
    this.name = "AuthorizationError";
  }
}

/**
 * Error thrown when a conflict occurs (e.g., duplicate resource).
 *
 * HTTP Status: 409 Conflict
 *
 * @example
 * ```typescript
 * const existing = await findByEmail(email);
 * if (existing) {
 *   throw new ConflictError("Email already registered", { email });
 * }
 * ```
 *
 * @category Core
 */
export class ConflictError extends CoreError {
  /**
   * Creates a new ConflictError.
   *
   * @param message - Human-readable error message
   * @param meta - Optional metadata
   * @param cause - Optional original error
   */
  constructor(
    message: string,
    meta?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super("CONFLICT", message, meta, cause);
    this.name = "ConflictError";
  }
}

/**
 * Error thrown when a business rule is violated.
 *
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * ```typescript
 * if (account.balance < withdrawal.amount) {
 *   throw new BusinessError("Insufficient funds");
 * }
 * ```
 *
 * @category Core
 */
export class BusinessError extends CoreError {
  /**
   * Creates a new BusinessError.
   *
   * @param message - Human-readable error message
   * @param meta - Optional metadata
   */
  constructor(message: string, meta?: Record<string, unknown>) {
    super("BUSINESS_ERROR", message, meta);
    this.name = "BusinessError";
  }
}

/**
 * Error thrown when an external integration fails.
 *
 * HTTP Status: 502 Bad Gateway
 *
 * @example
 * ```typescript
 * try {
 *   await paymentGateway.charge(card);
 * } catch (error) {
 *   throw new IntegrationError("Payment gateway unavailable", {}, error);
 * }
 * ```
 *
 * @category Core
 */
export class IntegrationError extends CoreError {
  /**
   * Creates a new IntegrationError.
   *
   * @param message - Human-readable error message
   * @param meta - Optional metadata
   * @param cause - Optional original error from the integration
   */
  constructor(
    message: string,
    meta?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super("INTEGRATION_ERROR", message, meta, cause);
    this.name = "IntegrationError";
  }
}

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
 * if (isOk(result)) {
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

/**
 * Type guard to check if a Result is successful.
 *
 * @typeParam T - The value type
 * @typeParam E - The error type
 * @param result - The Result to check
 * @returns True if the Result is successful
 *
 * @category Core
 */
export function isOk<T, E extends CoreError>(
  result: Result<T, E>,
): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard to check if a Result is failed.
 *
 * @typeParam T - The value type
 * @typeParam E - The error type
 * @param result - The Result to check
 * @returns True if the Result is failed
 *
 * @category Core
 */
export function isErr<T, E extends CoreError>(
  result: Result<T, E>,
): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Maps HTTP status codes to error types.
 *
 * @param error - The error to get status for
 * @returns The corresponding HTTP status code
 *
 * @category Core
 */
export function getHttpStatus(error: CoreError): number {
  switch (error.name) {
    case "NotFoundError":
      return 404;
    case "ValidationError":
    case "BusinessError":
      return 422;
    case "AuthenticationError":
      return 401;
    case "AuthorizationError":
      return 403;
    case "ConflictError":
      return 409;
    case "IntegrationError":
      return 502;
    default:
      return 500;
  }
}
