/**
 * Queue System
 *
 * Background job processing interfaces for asynchronous task execution.
 *
 * @category Core
 * @packageDocumentation
 */

import type { ID } from "../entity";

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
 *   priority: 10,
 *   delay: 5000,        // Process after 5 seconds
 *   attempts: 3,        // Retry up to 3 times
 *   backoff: {
 *     type: "exponential",
 *     delay: 1000       // Start with 1s, then 2s, then 4s
 *   },
 *   repeat: {
 *     every: 3600000    // Repeat every hour
 *   }
 * };
 * ```
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
   * Maximum retry attempts on failure
   */
  attempts?: number;

  /**
   * Backoff strategy for retries
   */
  backoff?: {
    /**
     * Backoff type
     * - `exponential`: Delay doubles each retry
     * - `fixed`: Constant delay between retries
     */
    type: "exponential" | "fixed";

    /**
     * Base delay in milliseconds
     */
    delay: number;
  };

  /**
   * Remove job on completion
   * - `true`: Remove immediately
   * - `number`: Keep last N completed jobs
   */
  removeOnComplete?: boolean | number;

  /**
   * Remove job on failure
   * - `true`: Remove immediately
   * - `number`: Keep last N failed jobs
   */
  removeOnFail?: boolean | number;

  /**
   * Repeat configuration for recurring jobs
   */
  repeat?: {
    /**
     * Interval in milliseconds
     */
    every?: number;

    /**
     * Cron expression (e.g., "0 0 * * *")
     */
    cron?: string;

    /**
     * Maximum number of repetitions
     */
    limit?: number;

    /**
     * Timezone for cron expressions
     */
    tz?: string;
  };

  /**
   * Lock duration in milliseconds
   */
  lockDuration?: number;
}

/**
 * Job representation.
 *
 * @typeParam T - Job data type
 *
 * @category Core
 */
export interface Job<T = unknown> {
  /**
   * Unique job identifier
   */
  id: ID;

  /**
   * Job type name
   */
  name: string;

  /**
   * Job data payload
   */
  data: T;

  /**
   * Progress percentage (0-100)
   */
  progress: number;

  /**
   * Number of attempts made
   */
  attemptsMade: number;

  /**
   * Maximum attempts configured
   */
  maxAttempts?: number;

  /**
   * Current job status
   */
  status: JobStatus;

  /**
   * Return value (if completed)
   */
  returnValue?: unknown;

  /**
   * Failure reason (if failed)
   */
  failedReason?: string;

  /**
   * Processing start timestamp
   */
  processedOn?: number;

  /**
   * Completion/failure timestamp
   */
  finishedOn?: number;

  /**
   * Delay in milliseconds
   */
  delay?: number;
}

/**
 * Bulk job input for adding multiple jobs.
 *
 * @typeParam T - Job data type
 *
 * @category Core
 */
export interface BulkJob<T = unknown> {
  /**
   * Job type name
   */
  name: string;

  /**
   * Job data payload
   */
  data: T;

  /**
   * Job options
   */
  opts?: JobOptions;
}

/**
 * Queue interface for background job processing.
 *
 * @example
 * ```typescript
 * // Add job
 * const job = await queue.add("send-email", {
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   body: "..."
 * }, {
 *   attempts: 3,
 *   priority: 5
 * });
 *
 * // Add bulk jobs
 * await queue.addBulk([
 *   { name: "process-order", data: { orderId: "1" } },
 *   { name: "process-order", data: { orderId: "2" } }
 * ]);
 *
 * // Listen for completions
 * queue.on("completed", (job) => {
 *   console.log(`Job ${job.name} completed:`, job.returnValue);
 * });
 *
 * // Get failed jobs
 * const failed = await queue.getFailed(10);
 * ```
 *
 * @category Core
 */
export interface Queue {
  /**
   * Adds a job to the queue.
   *
   * @param name - Job type name
   * @param data - Job data payload
   * @param opts - Job options
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
   * Gets jobs by status.
   *
   * @param types - Status types to filter
   * @returns Array of jobs
   */
  getJobs(types: JobStatus[]): Promise<Job[]>;

  /**
   * Gets waiting jobs.
   *
   * @param count - Maximum number to return
   * @returns Array of waiting jobs
   */
  getWaiting(count?: number): Promise<Job[]>;

  /**
   * Gets active jobs.
   *
   * @param count - Maximum number to return
   * @returns Array of active jobs
   */
  getActive(count?: number): Promise<Job[]>;

  /**
   * Gets completed jobs.
   *
   * @param count - Maximum number to return
   * @returns Array of completed jobs
   */
  getCompleted(count?: number): Promise<Job[]>;

  /**
   * Gets failed jobs.
   *
   * @param count - Maximum number to return
   * @returns Array of failed jobs
   */
  getFailed(count?: number): Promise<Job[]>;

  /**
   * Removes a job.
   *
   * @param id - Job ID
   */
  remove(id: string): Promise<void>;

  /**
   * Updates job progress.
   *
   * @param id - Job ID
   * @param progress - Progress percentage (0-100)
   */
  updateProgress(id: string, progress: number): Promise<void>;

  /**
   * Updates job data.
   *
   * @param id - Job ID
   * @param data - New job data
   */
  updateData(id: string, data: unknown): Promise<void>;

  /**
   * Retries a failed job.
   *
   * @param id - Job ID
   */
  retry(id: string): Promise<void>;

  /**
   * Removes all jobs.
   */
  removeAllJobs(): Promise<void>;

  /**
   * Subscribes to queue events.
   *
   * @param event - Event name
   * @param handler - Event handler
   */
  on(
    event: "completed" | "failed" | "progress" | "waiting",
    handler: (job: Job) => void,
  ): void;

  /**
   * Unsubscribes from queue events.
   *
   * @param event - Event name
   * @param handler - Event handler
   */
  off(
    event: "completed" | "failed" | "progress" | "waiting",
    handler: (job: Job) => void,
  ): void;

  /**
   * Pauses the queue (stops processing).
   */
  pause(): Promise<void>;

  /**
   * Resumes the queue.
   */
  resume(): Promise<void>;

  /**
   * Closes the queue connection.
   */
  close(): Promise<void>;
}

/**
 * Worker interface for processing jobs.
 *
 * @category Core
 */
export interface Worker {
  /**
   * Starts processing jobs.
   */
  run(): Promise<void>;

  /**
   * Stops processing jobs.
   */
  stop(): Promise<void>;

  /**
   * Subscribes to worker events.
   *
   * @param event - Event name
   * @param handler - Event handler
   */
  on(
    event: "completed" | "failed" | "progress",
    handler: (job: Job, result?: unknown) => void,
  ): void;

  /**
   * Unsubscribes from worker events.
   *
   * @param event - Event name
   * @param handler - Event handler
   */
  off(
    event: "completed" | "failed" | "progress",
    handler: (job: Job, result?: unknown) => void,
  ): void;
}

/**
 * Scheduler interface for recurring jobs.
 *
 * @category Core
 */
export interface Scheduler {
  /**
   * Schedules a recurring job.
   *
   * @param cronExpression - Cron expression (e.g., "0 0 * * *" for daily)
   * @param name - Job type name
   * @param data - Job data payload
   * @param opts - Job options
   */
  schedule(
    cronExpression: string,
    name: string,
    data: unknown,
    opts?: JobOptions,
  ): Promise<void>;

  /**
   * Cancels a scheduled job.
   *
   * @param name - Job type name
   */
  cancel(name: string): Promise<void>;

  /**
   * Cancels all scheduled jobs.
   */
  cancelAll(): Promise<void>;

  /**
   * Gets all scheduled jobs.
   *
   * @returns Array of scheduled jobs with next run times
   */
  getScheduledJobs(): Promise<Array<{ name: string; nextRun: number }>>;

  /**
   * Pauses the scheduler.
   */
  pause(): Promise<void>;

  /**
   * Resumes the scheduler.
   */
  resume(): Promise<void>;

  /**
   * Closes the scheduler connection.
   */
  close(): Promise<void>;
}
