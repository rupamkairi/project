/**
 * System Context
 *
 * Runtime context providing access to actor, organization, and system services.
 *
 * @category Core
 * @packageDocumentation
 */

import type { ID, Timestamp } from "../entity";
import { generateId } from "../entity";
import type { Command, Query } from "../cqrs";
import type { DomainEvent } from "../event";
import type { RuleEngine } from "../rule";
import type { FSMEngine, FSMContext } from "../state";

/**
 * Queue interface for background job processing.
 *
 * @category Core
 */
export interface Queue {
  /**
   * Adds a job to the queue.
   *
   * @param name - Job type name
   * @param data - Job data payload
   * @param opts - Job options (priority, delay, attempts)
   * @returns The created job
   */
  add(name: string, data: unknown, opts?: JobOptions): Promise<Job>;

  /**
   * Adds multiple jobs in bulk.
   *
   * @param jobs - Array of jobs to add
   * @returns Array of created jobs
   */
  addBulk(jobs: BulkJob[]): Promise<Job[]>;

  /**
   * Gets a job by ID.
   *
   * @param id - Job ID
   * @returns The job or undefined
   */
  getJob(id: string): Promise<Job | undefined>;

  /**
   * Gets jobs by type.
   *
   * @param types - Job types to filter
   * @returns Array of jobs
   */
  getJobs(types: string[]): Promise<Job[]>;

  /**
   * Subscribes to queue events.
   *
   * @param event - Event name
   * @param handler - Event handler
   */
  on(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * Job processing options.
 *
 * @category Core
 */
export interface JobOptions {
  /**
   * Custom job ID
   */
  id?: string;

  /**
   * Priority (higher = more urgent)
   */
  priority?: number;

  /**
   * Delay before processing (milliseconds)
   */
  delay?: number;

  /**
   * Maximum retry attempts
   */
  attempts?: number;

  /**
   * Backoff strategy for retries
   */
  backoff?: number | { type: string; delay: number };

  /**
   * Remove job on completion (true or keep count)
   */
  removeOnComplete?: boolean | number;

  /**
   * Remove job on failure (true or keep count)
   */
  removeOnFail?: boolean | number;
}

/**
 * Job representation.
 *
 * @category Core
 */
export interface Job {
  /**
   * Unique job identifier
   */
  id: string;

  /**
   * Job type name
   */
  name: string;

  /**
   * Job data payload
   */
  data: unknown;

  /**
   * Progress percentage (0-100)
   */
  progress: number;

  /**
   * Number of attempts made
   */
  attemptsMade: number;

  /**
   * Processing timestamp
   */
  processedOn?: number;

  /**
   * Completion timestamp
   */
  finishedOn?: number;

  /**
   * Return value (if completed)
   */
  returnvalue?: unknown;

  /**
   * Failure reason (if failed)
   */
  failedReason?: string;
}

/**
 * Bulk job input.
 *
 * @category Core
 */
export interface BulkJob {
  /**
   * Job type name
   */
  name: string;

  /**
   * Job data payload
   */
  data: unknown;

  /**
   * Job options
   */
  opts?: JobOptions;
}

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

/**
 * System context for command/query execution.
 *
 * Provides access to actor, organization, and system services.
 *
 * @category Core
 */
export interface SystemContext {
  /**
   * Current actor information
   */
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };

  /**
   * Organization information
   */
  org: {
    id: ID;
    slug: string;
    settings: Record<string, unknown>;
  };

  /**
   * Correlation ID for tracing related operations
   */
  correlationId: ID;

  /**
   * Request ID for this specific operation
   */
  requestId: ID;

  /**
   * Timestamp when execution started (Unix epoch ms)
   */
  startedAt: Timestamp;

  /**
   * Dispatches a command (auto-fills actorId, orgId, correlationId).
   *
   * @typeParam R - Return type
   * @param cmd - Command without actor/org/correlation fields
   * @returns Handler result
   */
  dispatch<R = unknown>(
    cmd: Omit<Command, "actorId" | "orgId" | "correlationId">,
  ): Promise<R>;

  /**
   * Sends a query (auto-fills actorId, orgId).
   *
   * @typeParam R - Return type
   * @param q - Query without actor/org fields
   * @returns Handler result
   */
  query<R = unknown>(q: Omit<Query, "actorId" | "orgId">): Promise<R>;

  /**
   * Publishes a domain event (auto-fills actorId, orgId, correlationId).
   *
   * @param event - Event without actor/org/correlation fields
   */
  publish(
    event: Omit<DomainEvent, "actorId" | "orgId" | "correlationId">,
  ): Promise<void>;

  /**
   * Rule engine for business logic evaluation
   */
  rules: RuleEngine;

  /**
   * FSM engine for state machine execution
   */
  fsm: FSMEngine;

  /**
   * Queue for background job processing
   */
  queue: Queue;

  /**
   * Logger for structured logging
   */
  logger: Logger;
}

/**
 * Options for creating system context.
 *
 * @category Core
 */
export interface SystemContextOptions {
  /**
   * Actor ID (default: "system")
   */
  actorId?: ID;

  /**
   * Actor roles
   */
  roles?: string[];

  /**
   * Organization ID (default: "system")
   */
  orgId?: ID;

  /**
   * Organization slug
   */
  orgSlug?: string;

  /**
   * Organization settings
   */
  orgSettings?: Record<string, unknown>;

  /**
   * Actor type (default: "system")
   */
  actorType?: "human" | "system" | "api_key";

  /**
   * Correlation ID (auto-generated if not provided)
   */
  correlationId?: ID;

  /**
   * Request ID (auto-generated if not provided)
   */
  requestId?: ID;

  /**
   * Mediator for command/query dispatch
   */
  mediator?: {
    dispatch: <R = unknown>(cmd: Command) => Promise<R>;
    query: <R = unknown>(q: Query) => Promise<R>;
  };

  /**
   * Event bus for event publishing
   */
  eventBus?: {
    publish: (event: DomainEvent) => Promise<void>;
  };

  /**
   * Rule engine instance
   */
  rules?: RuleEngine;

  /**
   * FSM engine instance
   */
  fsm?: FSMEngine;

  /**
   * Queue instance
   */
  queue?: Queue;

  /**
   * Logger instance
   */
  logger?: Logger;
}

/**
 * Creates a system context with all required services.
 *
 * @param opts - Context options
 * @returns System context instance
 *
 * @example
 * ```typescript
 * const ctx = createSystemContext({
 *   actorId: currentUserId,
 *   orgId: orgId,
 *   roles: ["admin"],
 *   mediator,
 *   eventBus,
 *   logger
 * });
 *
 * // Use context to dispatch commands
 * await ctx.dispatch({
 *   type: "user.create",
 *   payload: { email: "user@example.com" }
 * });
 * ```
 *
 * @category Core
 */
export function createSystemContext(opts: SystemContextOptions): SystemContext {
  const actorId = opts.actorId ?? "system";
  const orgId = opts.orgId ?? "system";
  const correlationId = opts.correlationId ?? generateId();
  const requestId = opts.requestId ?? generateId();

  return {
    actor: {
      id: actorId,
      roles: opts.roles ?? [],
      orgId: orgId,
      type: opts.actorType ?? "system",
    },
    org: {
      id: orgId,
      slug: opts.orgSlug ?? "system",
      settings: opts.orgSettings ?? {},
    },
    correlationId,
    requestId,
    startedAt: Date.now() as Timestamp,
    dispatch: async function <R = unknown>(
      cmd: Omit<Command, "actorId" | "orgId" | "correlationId">,
    ): Promise<R> {
      if (!opts.mediator) {
        throw new Error("Mediator not configured in context");
      }
      return opts.mediator.dispatch({
        ...cmd,
        actorId,
        orgId,
        correlationId,
      } as Command);
    },
    query: async function <R = unknown>(
      q: Omit<Query, "actorId" | "orgId">,
    ): Promise<R> {
      if (!opts.mediator) {
        throw new Error("Mediator not configured in context");
      }
      return opts.mediator.query({
        ...q,
        actorId,
        orgId,
      } as Query);
    },
    publish: async function (
      event: Omit<DomainEvent, "actorId" | "orgId" | "correlationId">,
    ): Promise<void> {
      if (!opts.eventBus) {
        throw new Error("EventBus not configured in context");
      }
      await opts.eventBus.publish({
        ...event,
        actorId,
        orgId,
        correlationId,
      } as DomainEvent);
    },
    rules: opts.rules ?? ({} as RuleEngine),
    fsm: opts.fsm ?? ({} as FSMEngine),
    queue: opts.queue ?? ({} as Queue),
    logger: opts.logger ?? (console as unknown as Logger),
  };
}
