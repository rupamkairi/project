// Core Error Hierarchy

export class CoreError extends Error {
  public readonly code: string;
  public readonly meta?: Record<string, unknown>;
  override readonly cause?: unknown;

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

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      ...(this.meta && { meta: this.meta }),
    };
  }
}

export class NotFoundError extends CoreError {
  constructor(
    message: string,
    meta?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super("NOT_FOUND", message, meta, cause);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends CoreError {
  public readonly failures: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    failures: Array<{ field: string; message: string }> = [],
    meta?: Record<string, unknown>,
  ) {
    super("VALIDATION_ERROR", message, { ...meta, failures }, undefined);
    this.name = "ValidationError";
    this.failures = failures;
  }

  override toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      failures: this.failures,
    };
  }
}

export class AuthenticationError extends CoreError {
  constructor(
    message: string = "Authentication required",
    meta?: Record<string, unknown>,
  ) {
    super("AUTHENTICATION_ERROR", message, meta);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends CoreError {
  constructor(
    message: string = "Access denied",
    meta?: Record<string, unknown>,
  ) {
    super("AUTHORIZATION_ERROR", message, meta);
    this.name = "AuthorizationError";
  }
}

export class ConflictError extends CoreError {
  constructor(
    message: string,
    meta?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super("CONFLICT", message, meta, cause);
    this.name = "ConflictError";
  }
}

export class BusinessError extends CoreError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("BUSINESS_ERROR", message, meta);
    this.name = "BusinessError";
  }
}

export class IntegrationError extends CoreError {
  constructor(
    message: string,
    meta?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super("INTEGRATION_ERROR", message, meta, cause);
    this.name = "IntegrationError";
  }
}

// Result type for functional error handling
export type Result<T, E extends CoreError = CoreError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function Err<E extends CoreError>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Helper to check if result is ok
export function isOk<T, E extends CoreError>(
  result: Result<T, E>,
): result is { ok: true; value: T } {
  return result.ok === true;
}

export function isErr<T, E extends CoreError>(
  result: Result<T, E>,
): result is { ok: false; error: E } {
  return result.ok === false;
}

// Map HTTP status codes to error types
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
