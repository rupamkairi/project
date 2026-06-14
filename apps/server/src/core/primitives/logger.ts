/**
 * Logger interface
 *
 * Canonical location: core/primitives/logger.ts
 * Canonical shape defined in core.md §1 (primitives) and referenced in §11 (context).
 *
 * @category Core
 * @packageDocumentation
 */

/**
 * Logger interface for structured logging.
 *
 * @category Core
 */
export interface Logger {
  /**
   * Logs a fatal error (application crash)
   */
  fatal: (msg: string, meta?: Record<string, unknown>) => void;

  /**
   * Logs an error (operation failed)
   */
  error: (msg: string, meta?: Record<string, unknown>) => void;

  /**
   * Logs a warning (potential issue)
   */
  warn: (msg: string, meta?: Record<string, unknown>) => void;

  /**
   * Logs an info message (normal operation)
   */
  info: (msg: string, meta?: Record<string, unknown>) => void;

  /**
   * Logs a debug message (debugging info)
   */
  debug: (msg: string, meta?: Record<string, unknown>) => void;

  /**
   * Logs a trace message (detailed debugging)
   */
  trace: (msg: string, meta?: Record<string, unknown>) => void;

  /**
   * Creates a child logger with additional context.
   *
   * @param bindings - Additional context to attach to logs
   * @returns Child logger instance
   */
  child(bindings: Record<string, unknown>): Logger;
}
