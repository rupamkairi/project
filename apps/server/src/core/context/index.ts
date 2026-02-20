import type { ID, Timestamp } from "../entity";
import { generateId } from "../entity";
import type { Command, Query } from "../cqrs";
import type { DomainEvent } from "../event";
import type { RuleEngine } from "../rule";
import type { FSMEngine, FSMContext } from "../state";

// Forward declare Queue interface
export interface Queue {
  add(name: string, data: unknown, opts?: JobOptions): Promise<Job>;
  addBulk(jobs: BulkJob[]): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  getJobs(types: string[]): Promise<Job[]>;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

export interface JobOptions {
  id?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number | { type: string; delay: number };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface Job {
  id: string;
  name: string;
  data: unknown;
  progress: number;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  returnvalue?: unknown;
  failedReason?: string;
}

export interface BulkJob {
  name: string;
  data: unknown;
  opts?: JobOptions;
}

// Logger interface
export interface Logger {
  fatal: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  trace: (msg: string, meta?: Record<string, unknown>) => void;
  child(bindings: Record<string, unknown>): Logger;
}

// System Context
export interface SystemContext {
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };
  org: {
    id: ID;
    slug: string;
    settings: Record<string, unknown>;
  };
  correlationId: ID;
  requestId: ID;
  startedAt: Timestamp;
  dispatch<R = unknown>(
    cmd: Omit<Command, "actorId" | "orgId" | "correlationId">,
  ): Promise<R>;
  query<R = unknown>(q: Omit<Query, "actorId" | "orgId">): Promise<R>;
  publish(
    event: Omit<DomainEvent, "actorId" | "orgId" | "correlationId">,
  ): Promise<void>;
  rules: RuleEngine;
  fsm: FSMEngine;
  queue: Queue;
  logger: Logger;
}

export interface SystemContextOptions {
  actorId?: ID;
  roles?: string[];
  orgId?: ID;
  orgSlug?: string;
  orgSettings?: Record<string, unknown>;
  actorType?: "human" | "system" | "api_key";
  correlationId?: ID;
  requestId?: ID;
  mediator?: {
    dispatch: <R = unknown>(cmd: Command) => Promise<R>;
    query: <R = unknown>(q: Query) => Promise<R>;
  };
  eventBus?: {
    publish: (event: DomainEvent) => Promise<void>;
  };
  rules?: RuleEngine;
  fsm?: FSMEngine;
  queue?: Queue;
  logger?: Logger;
}

// Create system context
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
