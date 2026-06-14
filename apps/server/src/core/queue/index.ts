/**
 * Queue System
 *
 * Background job processing and scheduling interfaces for asynchronous task execution.
 *
 * @category Core
 * @packageDocumentation
 */

import type { ID, Timestamp } from "../entity";
import type { SystemContext } from "../context";

// ---------------------------------------------------------------------------
// Job types
// ---------------------------------------------------------------------------

/**
 * Job status values.
 *
 * - `waiting`: Job is queued, waiting to be processed
 * - `active`: Job is currently being processed
 * - `completed`: Job finished successfully
 * - `failed`: Job failed after all retries
 * - `delayed`: Job is delayed, waiting for scheduled time
 *
 * @category Core
 */
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

/**
 * Job processing options.
 *
 * @example
 * ```typescript
 * const opts: JobOptions = {
 *   priority: "critical",
 *   delay: 5000,
 *   attempts: 3,
 *   backoff: { type: "exponential", delay: 1000 },
 *   jobId: "send-welcome-email-user-123",
 * };
 * ```
 *
 * @category Core
 */
export interface JobOptions {
  /** Priority tier — affects worker concurrency and queue ordering */
  priority?: "critical" | "standard" | "bulk";

  /** Delay in milliseconds before the job becomes available */
  delay?: number;

  /** Retry count before the job moves to the DLQ (default: 3) */
  attempts?: number;

  /** Backoff strategy for retries */
  backoff?: {
    type: "fixed" | "exponential";
    /** Base delay in milliseconds */
    delay: number;
  };

  /** Idempotency key — duplicate adds with the same jobId are ignored */
  jobId?: string;

  /** Milliseconds before a hung job is considered timed out */
  timeout?: number;

  /** Remove the job record after successful completion (default: true) */
  removeOnComplete?: boolean;
}

/**
 * A job in the queue system.
 *
 * @typeParam T - Job payload type
 * @category Core
 */
export interface Job<T = unknown> {
  /** Unique job identifier */
  id: ID;

  /** Job type name */
  name: string;

  /** Job data payload */
  payload: T;

  /** Current job status */
  status: JobStatus;

  /** Number of processing attempts made so far */
  attempts: number;

  /** When the job was created */
  createdAt: Timestamp;

  /** When the job was picked up for processing */
  processedAt?: Timestamp;

  /** When the job finished (success or failure) */
  completedAt?: Timestamp;

  /** Failure reason, if the job failed */
  failedReason?: string;

  /** Progress percentage (0–100) for long-running jobs */
  progress?: number;
}

/**
 * Handler function for processing a job.
 *
 * @typeParam T - Job payload type
 * @category Core
 */
export type JobHandler<T = unknown> = (
  job: Job<T>,
  ctx: SystemContext,
) => Promise<void>;

// ---------------------------------------------------------------------------
// Queue interface
// ---------------------------------------------------------------------------

/**
 * Queue interface for background job processing.
 *
 * @example
 * ```typescript
 * // Add a job
 * const job = await queue.add("send-email", { to: "user@example.com" }, {
 *   priority: "standard",
 *   attempts: 3,
 * });
 *
 * // Register a processor during module boot
 * queue.process("send-email", async (job, ctx) => {
 *   await ctx.logger.info(`Sending email to ${job.payload.to}`);
 * });
 * ```
 *
 * @category Core
 */
export interface Queue {
  /**
   * Adds a single job to the queue.
   *
   * @param name - Job type name
   * @param payload - Job data payload
   * @param opts - Job options
   * @returns The created job
   */
  add<T>(name: string, payload: T, opts?: JobOptions): Promise<Job<T>>;

  /**
   * Adds multiple jobs of the same type in one call.
   *
   * @param name - Job type name
   * @param payloads - Array of payloads
   * @param opts - Shared job options applied to all jobs
   * @returns Array of created jobs
   */
  addBatch<T>(
    name: string,
    payloads: T[],
    opts?: JobOptions,
  ): Promise<Job<T>[]>;

  /**
   * Registers a job processor. Called during module boot.
   *
   * @param name - Job type name to handle
   * @param handler - Handler function
   * @param concurrency - Maximum parallel executions (default: 1)
   */
  process<T>(
    name: string,
    handler: JobHandler<T>,
    concurrency?: number,
  ): void;

  /**
   * Gets a job by ID.
   *
   * @param id - Job ID
   * @returns The job or null if not found
   */
  getJob<T>(id: ID): Promise<Job<T> | null>;

  /**
   * Retries a failed job.
   *
   * @param id - Job ID
   */
  retry(id: ID): Promise<void>;

  /**
   * Cancels a job (removes it from the queue).
   *
   * @param id - Job ID
   */
  cancel(id: ID): Promise<void>;

  /**
   * Waits for all jobs in the named queue to complete.
   *
   * @param name - Queue name
   */
  drain(name: string): Promise<void>;

  /**
   * Returns all jobs that have exhausted their retries (Dead Letter Queue).
   *
   * @param name - Queue name
   * @returns Array of dead-lettered jobs
   */
  getDLQ(name: string): Promise<Job[]>;

  /**
   * Re-queues dead-lettered jobs for another attempt.
   *
   * @param name - Queue name
   * @param limit - Maximum number of jobs to replay (default: all)
   */
  replayDLQ(name: string, limit?: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// Scheduler types
// ---------------------------------------------------------------------------

/**
 * A scheduled (recurring or one-shot) job entry.
 *
 * @category Core
 */
export interface ScheduledJob {
  /** Unique name identifying this scheduled job */
  name: string;

  /** Cron expression for recurring jobs */
  cron: string;

  /** Next scheduled execution time */
  next: Timestamp;

  /** Whether the job is active or paused */
  status: "active" | "paused";
}

/**
 * Options for the Scheduler.
 *
 * @category Core
 */
export interface SchedulerOptions {
  /** IANA timezone string (e.g. "Asia/Kolkata", "UTC") */
  timezone?: string;

  /** Allow concurrent runs if a previous execution has not finished (default: false) */
  overlap?: boolean;

  /** Re-run missed executions after downtime (default: false) */
  catchUp?: boolean;
}

// ---------------------------------------------------------------------------
// Scheduler interface
// ---------------------------------------------------------------------------

/**
 * Scheduler interface for recurring and one-shot timed jobs.
 *
 * @example
 * ```typescript
 * // Define a recurring job
 * scheduler.define("nightly-report", "0 0 * * *", async (job, ctx) => {
 *   await generateReport(ctx);
 * }, { timezone: "UTC" });
 *
 * // Run a one-shot job at a specific time
 * scheduler.runOnce("send-promo", new Date("2025-12-25"), { campaign: "xmas" }, handler);
 * ```
 *
 * @category Core
 */
export interface Scheduler {
  /**
   * Defines a recurring scheduled job using a cron expression.
   *
   * @param name - Unique name for the scheduled job
   * @param cron - Standard cron expression
   * @param handler - Handler to execute on each tick
   * @param opts - Scheduler options
   */
  define(
    name: string,
    cron: string,
    handler: JobHandler,
    opts?: SchedulerOptions,
  ): void;

  /**
   * Schedules a one-shot job that fires once at a specific time.
   *
   * @param name - Unique name for the one-shot job
   * @param at - Date or Unix timestamp (ms) when the job should run
   * @param payload - Data to pass to the handler
   * @param handler - Handler to execute once
   */
  runOnce(
    name: string,
    at: Date | Timestamp,
    payload: unknown,
    handler: JobHandler,
  ): void;

  /**
   * Cancels and removes a scheduled job.
   *
   * @param name - Scheduled job name
   */
  cancel(name: string): void;

  /**
   * Pauses a scheduled job without removing it.
   *
   * @param name - Scheduled job name
   */
  pause(name: string): void;

  /**
   * Resumes a paused scheduled job.
   *
   * @param name - Scheduled job name
   */
  resume(name: string): void;

  /**
   * Lists all registered scheduled jobs.
   *
   * @returns Array of scheduled job entries
   */
  list(): ScheduledJob[];

  /**
   * Returns the next scheduled execution time for a named job.
   *
   * @param name - Scheduled job name
   * @returns Unix timestamp (ms) of the next run, or null if not found / paused
   */
  getNext(name: string): Timestamp | null;
}

// ---------------------------------------------------------------------------
// In-memory implementations (test doubles / development defaults)
// ---------------------------------------------------------------------------

/**
 * In-memory Queue implementation.
 *
 * Suitable for unit tests and local development.
 * Does NOT persist across restarts.
 *
 * @category Core
 */
export class InMemoryQueue implements Queue {
  private jobs = new Map<string, Job<unknown>>();
  private handlers = new Map<
    string,
    { handler: JobHandler<unknown>; concurrency: number }
  >();
  private dlq = new Map<string, Job<unknown>[]>();
  private idCounter = 0;

  private makeId(): ID {
    return `job-${++this.idCounter}` as ID;
  }

  async add<T>(name: string, payload: T, opts?: JobOptions): Promise<Job<T>> {
    const id = (opts?.jobId ?? this.makeId()) as ID;

    // Idempotency: ignore duplicate jobId
    if (this.jobs.has(id as string)) {
      return this.jobs.get(id as string) as Job<T>;
    }

    const job: Job<T> = {
      id,
      name,
      payload,
      status: opts?.delay ? "delayed" : "waiting",
      attempts: 0,
      createdAt: Date.now(),
      progress: 0,
    };

    this.jobs.set(id as string, job as Job<unknown>);
    return job;
  }

  async addBatch<T>(
    name: string,
    payloads: T[],
    opts?: JobOptions,
  ): Promise<Job<T>[]> {
    const results: Job<T>[] = [];
    for (const payload of payloads) {
      results.push(await this.add(name, payload, opts));
    }
    return results;
  }

  process<T>(
    name: string,
    handler: JobHandler<T>,
    concurrency = 1,
  ): void {
    this.handlers.set(name, {
      handler: handler as JobHandler<unknown>,
      concurrency,
    });
  }

  async getJob<T>(id: ID): Promise<Job<T> | null> {
    return (this.jobs.get(id as string) as Job<T>) ?? null;
  }

  async retry(id: ID): Promise<void> {
    const job = this.jobs.get(id as string);
    if (!job) return;
    job.status = "waiting";
    job.failedReason = undefined;
  }

  async cancel(id: ID): Promise<void> {
    this.jobs.delete(id as string);
  }

  async drain(_name: string): Promise<void> {
    // In-memory: all jobs resolve synchronously — nothing to await
  }

  async getDLQ(name: string): Promise<Job[]> {
    return this.dlq.get(name) ?? [];
  }

  async replayDLQ(name: string, limit?: number): Promise<void> {
    const dead = this.dlq.get(name) ?? [];
    const toReplay = limit !== undefined ? dead.slice(0, limit) : dead;

    for (const job of toReplay) {
      job.status = "waiting";
      job.failedReason = undefined;
      job.attempts = 0;
      this.jobs.set(job.id as string, job);
    }

    const remaining = limit !== undefined ? dead.slice(limit) : [];
    this.dlq.set(name, remaining);
  }

  /**
   * Test helper: run a pending job through its registered handler.
   *
   * @param id - Job ID to execute
   * @param ctx - SystemContext to pass to the handler
   */
  async _runJob(id: ID, ctx: SystemContext): Promise<void> {
    const job = this.jobs.get(id as string);
    if (!job) throw new Error(`Job ${id} not found`);

    const entry = this.handlers.get(job.name);
    if (!entry) throw new Error(`No handler for job type '${job.name}'`);

    job.status = "active";
    job.processedAt = Date.now();
    job.attempts += 1;

    try {
      await entry.handler(job, ctx);
      job.status = "completed";
      job.completedAt = Date.now();
    } catch (err) {
      job.status = "failed";
      job.failedReason = String(err);
      job.completedAt = Date.now();

      // Move to DLQ
      const dead = this.dlq.get(job.name) ?? [];
      dead.push(job);
      this.dlq.set(job.name, dead);
    }
  }
}

/**
 * In-memory Scheduler implementation.
 *
 * Suitable for unit tests and local development.
 * Cron expressions are stored but not actually ticked in this implementation.
 *
 * @category Core
 */
export class InMemoryScheduler implements Scheduler {
  private jobs = new Map<
    string,
    {
      cron: string;
      handler: JobHandler;
      opts?: SchedulerOptions;
      status: "active" | "paused";
      next: Timestamp;
    }
  >();

  private computeNext(_cron: string): Timestamp {
    // Minimal stub: returns 1 hour from now.
    // Real implementations use a cron parser (e.g. croner, cron-parser).
    return Date.now() + 3_600_000;
  }

  define(
    name: string,
    cron: string,
    handler: JobHandler,
    opts?: SchedulerOptions,
  ): void {
    this.jobs.set(name, {
      cron,
      handler,
      opts,
      status: "active",
      next: this.computeNext(cron),
    });
  }

  runOnce(
    name: string,
    at: Date | Timestamp,
    payload: unknown,
    handler: JobHandler,
  ): void {
    const next = at instanceof Date ? at.getTime() : at;
    this.jobs.set(name, {
      cron: "@once",
      handler,
      status: "active",
      next,
    });
    // Attach payload for test introspection
    (this.jobs.get(name) as Record<string, unknown>).payload = payload;
  }

  cancel(name: string): void {
    this.jobs.delete(name);
  }

  pause(name: string): void {
    const entry = this.jobs.get(name);
    if (entry) entry.status = "paused";
  }

  resume(name: string): void {
    const entry = this.jobs.get(name);
    if (entry) {
      entry.status = "active";
      entry.next = this.computeNext(entry.cron);
    }
  }

  list(): ScheduledJob[] {
    return Array.from(this.jobs.entries()).map(([name, entry]) => ({
      name,
      cron: entry.cron,
      next: entry.next,
      status: entry.status,
    }));
  }

  getNext(name: string): Timestamp | null {
    const entry = this.jobs.get(name);
    return entry?.next ?? null;
  }
}

// ---------------------------------------------------------------------------
// Deprecated aliases — kept so core/index.ts barrel re-exports compile
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `Job<T>` with the `payload` field instead.
 * This alias exists to avoid breaking the core barrel export.
 */
export interface BulkJob<T = unknown> {
  name: string;
  data: T;
  opts?: JobOptions;
}

/**
 * @deprecated Worker is no longer part of the core queue interface.
 * Kept so core/index.ts barrel re-exports compile.
 */
export interface Worker {
  run(): Promise<void>;
  stop(): Promise<void>;
  on(
    event: "completed" | "failed" | "progress",
    handler: (job: Job, result?: unknown) => void,
  ): void;
  off(
    event: "completed" | "failed" | "progress",
    handler: (job: Job, result?: unknown) => void,
  ): void;
}
