// Queue interfaces - abstract layer for background job processing

import type { ID } from "../entity";

// Job status
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

// Job options
export interface JobOptions {
  id?: string;
  priority?: number;
  delay?: number; // milliseconds
  attempts?: number;
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  repeat?: {
    every?: number;
    cron?: string;
    limit?: number;
    tz?: string;
  };
  lockDuration?: number;
}

// Job representation
export interface Job<T = unknown> {
  id: ID;
  name: string;
  data: T;
  progress: number;
  attemptsMade: number;
  maxAttempts?: number;
  status: JobStatus;
  returnValue?: unknown;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
  delay?: number;
}

// Bulk job input
export interface BulkJob<T = unknown> {
  name: string;
  data: T;
  opts?: JobOptions;
}

// Queue interface
export interface Queue {
  // Add jobs
  add(name: string, data: unknown, opts?: JobOptions): Promise<Job>;
  addBulk(jobs: BulkJob[]): Promise<Job[]>;

  // Get jobs
  getJob(id: string): Promise<Job | undefined>;
  getJobs(types: JobStatus[]): Promise<Job[]>;
  getWaiting(count?: number): Promise<Job[]>;
  getActive(count?: number): Promise<Job[]>;
  getCompleted(count?: number): Promise<Job[]>;
  getFailed(count?: number): Promise<Job[]>;

  // Job control
  remove(id: string): Promise<void>;
  updateProgress(id: string, progress: number): Promise<void>;
  updateData(id: string, data: unknown): Promise<void>;
  retry(id: string): Promise<void>;
  removeAllJobs(): Promise<void>;

  // Events
  on(
    event: "completed" | "failed" | "progress" | "waiting",
    handler: (job: Job) => void,
  ): void;
  off(
    event: "completed" | "failed" | "progress" | "waiting",
    handler: (job: Job) => void,
  ): void;

  // Queue control
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
}

// Worker interface
export interface Worker {
  // Start processing
  run(): Promise<void>;
  stop(): Promise<void>;

  // Events
  on(
    event: "completed" | "failed" | "progress",
    handler: (job: Job, result?: unknown) => void,
  ): void;
  off(
    event: "completed" | "failed" | "progress",
    handler: (job: Job, result?: unknown) => void,
  ): void;
}

// Scheduler interface
export interface Scheduler {
  // Schedule jobs
  schedule(
    cronExpression: string,
    name: string,
    data: unknown,
    opts?: JobOptions,
  ): Promise<void>;
  cancel(name: string): Promise<void>;
  cancelAll(): Promise<void>;

  // Get scheduled jobs
  getScheduledJobs(): Promise<Array<{ name: string; nextRun: number }>>;

  // Control
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
}
