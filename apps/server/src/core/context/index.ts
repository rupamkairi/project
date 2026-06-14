/**
 * System Context
 *
 * Runtime context providing access to actor, organization, and system services.
 *
 * @category Core
 * @packageDocumentation
 */

import type { Entity, ID, Timestamp } from "../entity";
import { generateId } from "../entity";
import type { Command, Query } from "../cqrs";
import type { DomainEvent } from "../event";
import type { RuleEngine } from "../rule";
import type { FSMEngine } from "../state";
import type { Repository } from "../repository";
import type { Queue, Scheduler } from "../queue";
import type { RealTimeGateway } from "../realtime";
import type { AdapterRegistry } from "../adapters";

// Logger lives in primitives — re-exported here so any consumer importing from
// context still works without changes.
export type { Logger } from "../primitives/logger";
import type { Logger } from "../primitives/logger";

/**
 * System context for command/query execution.
 *
 * Provides access to actor, organization, and system services.
 * Canonical shape defined in core.md §11.
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
    type: "human" | "system" | "api-key";
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
   * Client IP address (optional, present on HTTP requests)
   */
  ip?: string;

  /**
   * Client user-agent string (optional, present on HTTP requests)
   */
  userAgent?: string;

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
   * Publishes multiple domain events.
   *
   * @param events - Full domain events to publish
   */
  publishBatch(events: DomainEvent[]): Promise<void>;

  /**
   * Rule engine for business logic evaluation
   */
  rules: RuleEngine;

  /**
   * FSM engine for state machine execution
   */
  fsm: FSMEngine;

  /**
   * Repository factory — returns a repository scoped to orgId automatically
   *
   * @param entityName - Entity name
   * @returns Org-scoped repository
   */
  repo<T extends Entity>(entityName: string): Repository<T>;

  /**
   * Queue for background job processing
   */
  queue: Queue;

  /**
   * Scheduler for recurring jobs
   */
  scheduler: Scheduler;

  /**
   * Real-time gateway for WebSocket/push
   */
  realtime: RealTimeGateway;

  /**
   * Adapter registry for external integrations
   */
  adapters: AdapterRegistry;

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
  actorType?: "human" | "system" | "api-key";

  /**
   * Correlation ID (auto-generated if not provided)
   */
  correlationId?: ID;

  /**
   * Request ID (auto-generated if not provided)
   */
  requestId?: ID;

  /**
   * Client IP address
   */
  ip?: string;

  /**
   * Client user-agent string
   */
  userAgent?: string;

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
    publishBatch?: (events: DomainEvent[]) => Promise<void>;
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

  /**
   * Scheduler instance
   */
  scheduler?: Scheduler;

  /**
   * Real-time gateway instance
   */
  realtime?: RealTimeGateway;

  /**
   * Adapter registry instance
   */
  adapters?: AdapterRegistry;

  /**
   * Repository factory — receives orgId + entityName and returns a scoped Repository
   */
  repoFactory?: <T extends Entity>(
    orgId: ID,
    entityName: string,
  ) => Repository<T>;
}

/**
 * Creates a system context with all required services.
 *
 * Required services that are not provided in opts will throw a clear error
 * on first access rather than silently returning an empty object.
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

  function notConfigured(name: string): never {
    throw new Error(`${name}: not configured (wire it at module boot)`);
  }

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
    ip: opts.ip,
    userAgent: opts.userAgent,

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

    publishBatch: async function (events: DomainEvent[]): Promise<void> {
      if (!opts.eventBus) {
        throw new Error("EventBus not configured in context");
      }
      if (opts.eventBus.publishBatch) {
        await opts.eventBus.publishBatch(events);
      } else {
        for (const event of events) {
          await opts.eventBus.publish(event);
        }
      }
    },

    get rules(): RuleEngine {
      if (!opts.rules) notConfigured("SystemContext.rules");
      return opts.rules;
    },

    get fsm(): FSMEngine {
      if (!opts.fsm) notConfigured("SystemContext.fsm");
      return opts.fsm;
    },

    get queue(): Queue {
      if (!opts.queue) notConfigured("SystemContext.queue");
      return opts.queue;
    },

    get scheduler(): Scheduler {
      if (!opts.scheduler) notConfigured("SystemContext.scheduler");
      return opts.scheduler;
    },

    get realtime(): RealTimeGateway {
      if (!opts.realtime) notConfigured("SystemContext.realtime");
      return opts.realtime;
    },

    get adapters(): AdapterRegistry {
      if (!opts.adapters) notConfigured("SystemContext.adapters");
      return opts.adapters;
    },

    repo<T extends Entity>(entityName: string): Repository<T> {
      if (!opts.repoFactory) notConfigured("SystemContext.repo");
      return opts.repoFactory<T>(orgId, entityName);
    },

    logger: opts.logger ?? (console as unknown as Logger),
  };
}
