/**
 * Domain Events & Event Sourcing
 *
 * Event bus, event store, and outbox pattern implementations for event-driven architecture.
 *
 * @category Core
 * @packageDocumentation
 */

import type { ID, Timestamp, Meta } from "../entity";
import { generateId } from "../entity";

/**
 * Domain event interface for event sourcing.
 *
 * Represents a fact that occurred in the domain at a specific point in time.
 * Events are immutable and represent the source of truth for state changes.
 *
 * @typeParam T - Payload type containing event-specific data
 *
 * @example
 * ```typescript
 * const event: DomainEvent<UserCreated> = {
 *   id: generateId(),
 *   type: "user.created",
 *   aggregateId: userId,
 *   aggregateType: "User",
 *   payload: { email: "user@example.com" },
 *   occurredAt: Date.now(),
 *   orgId: orgId,
 *   correlationId: correlationId,
 *   version: 1,
 *   source: "identity"
 * };
 * ```
 *
 * @category Core
 */
export interface DomainEvent<T = unknown> {
  /**
   * Unique event identifier
   */
  id: ID;

  /**
   * Event type in dot notation (e.g., "user.created", "order.completed")
   */
  type: string;

  /**
   * ID of the aggregate that produced this event
   */
  aggregateId: ID;

  /**
   * Type of the aggregate (e.g., "User", "Order")
   */
  aggregateType: string;

  /**
   * Event payload containing event-specific data
   */
  payload: T;

  /**
   * Timestamp when the event occurred (Unix epoch ms)
   */
  occurredAt: Timestamp;

  /**
   * ID of the actor who caused the event (optional)
   */
  actorId?: ID;

  /**
   * Organization ID for multi-tenancy
   */
  orgId: ID;

  /**
   * Correlation ID for tracing related events across aggregates
   */
  correlationId: ID;

  /**
   * ID of the causing event (for event chains)
   */
  causedBy?: ID;

  /**
   * Aggregate version at time of event emission
   */
  version: number;

  /**
   * Module ID that emitted this event
   */
  source: string;

  /**
   * Additional metadata
   */
  metadata?: Meta;
}

/**
 * Event handler function signature.
 *
 * @category Core
 */
export interface EventHandler {
  (event: DomainEvent): Promise<void>;
}

/**
 * Subscription options for event handlers.
 *
 * @category Core
 */
export interface SubscribeOptions {
  /**
   * If true, unsubscribe after first event
   */
  once?: boolean;
}

/**
 * Unsubscribe function returned from subscribe().
 *
 * Call to stop receiving events.
 *
 * @category Core
 */
export interface Unsubscribe {
  (): void;
}

/**
 * Event bus interface for publish/subscribe pattern.
 *
 * Supports wildcard pattern matching for flexible subscriptions.
 *
 * @example
 * ```typescript
 * // Subscribe to all user events
 * bus.subscribe("user.*", (event) => {
 *   console.log("User event:", event.type);
 * });
 *
 * // Subscribe to specific event
 * bus.subscribe("user.created", (event) => {
 *   console.log("New user:", event.payload);
 * });
 *
 * // Publish event
 * await bus.publish(event);
 * ```
 *
 * @category Core
 */
export interface EventBus {
  /**
   * Publishes an event to all matching subscribers.
   *
   * @param event - Event to publish
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple events.
   *
   * @param events - Events to publish
   */
  publishBatch(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribes to events matching a pattern.
   *
   * @param pattern - Dot-notation pattern (e.g., "user.*", "*.created", "*")
   * @param handler - Event handler function
   * @param opts - Subscription options
   * @returns Unsubscribe function
   */
  subscribe(
    pattern: string,
    handler: EventHandler,
    opts?: SubscribeOptions,
  ): Unsubscribe;
}

/**
 * Options for reading events from the store.
 *
 * @category Core
 */
export interface ReadOptions {
  /**
   * Start reading from this version (exclusive)
   */
  fromVersion?: number;

  /**
   * Maximum number of events to return
   */
  limit?: number;
}

/**
 * Filter criteria for querying events.
 *
 * @category Core
 */
export interface EventFilter {
  /**
   * Filter by aggregate ID
   */
  aggregateId?: ID;

  /**
   * Filter by aggregate type
   */
  aggregateType?: string;

  /**
   * Filter by event type
   */
  type?: string;

  /**
   * Filter by organization ID
   */
  orgId?: ID;
}

/**
 * Event store interface for append-only event log.
 *
 * Provides event sourcing capabilities with stream-based reading.
 *
 * @example
 * ```typescript
 * // Append event
 * await store.append(event);
 *
 * // Read all events for an aggregate
 * for await (const event of store.read(aggregateId)) {
 *   console.log(event);
 * }
 *
 * // Replay events from a point in time
 * for await (const event of store.replay({ aggregateType: "Order" }, startTime)) {
 *   rebuildProjection(event);
 * }
 * ```
 *
 * @category Core
 */
export interface EventStore {
  /**
   * Appends a single event to the store.
   *
   * @param event - Event to append
   */
  append(event: DomainEvent): Promise<void>;

  /**
   * Appends multiple events atomically.
   *
   * @param events - Events to append
   */
  appendBatch(events: DomainEvent[]): Promise<void>;

  /**
   * Reads events for a specific aggregate.
   *
   * @param aggregateId - Aggregate ID to read events for
   * @param opts - Read options (fromVersion, limit)
   * @returns Async iterable of events
   */
  read(aggregateId: ID, opts?: ReadOptions): AsyncIterable<DomainEvent>;

  /**
   * Reads events by type.
   *
   * @param type - Event type to read
   * @param opts - Read options
   * @returns Async iterable of events
   */
  readByType(type: string, opts?: ReadOptions): AsyncIterable<DomainEvent>;

  /**
   * Replays events matching a filter from a point in time.
   *
   * @param filter - Event filter criteria
   * @param from - Start timestamp (Unix epoch ms)
   * @returns Async iterable of events
   */
  replay(filter: EventFilter, from: Timestamp): AsyncIterable<DomainEvent>;

  /**
   * Gets the current version of an aggregate.
   *
   * @param aggregateId - Aggregate ID
   * @returns Current version number
   */
  getVersion(aggregateId: ID): Promise<number>;
}

/**
 * Outbox record for transactional outbox pattern.
 *
 * @category Core
 */
export interface OutboxRecord {
  /**
   * Unique record identifier
   */
  id: ID;

  /**
   * The domain event to publish
   */
  event: DomainEvent;

  /**
   * Number of publish attempts
   */
  attempts: number;

  /**
   * Last error message (if failed)
   */
  lastError?: string;

  /**
   * Creation timestamp
   */
  createdAt: Timestamp;

  /**
   * Published timestamp (if successful)
   */
  processedAt?: Timestamp;
}

/**
 * Event outbox interface for reliable event publishing.
 *
 * Implements the transactional outbox pattern to ensure events
 * are published exactly once, even in distributed systems.
 *
 * @category Core
 */
export interface EventOutbox {
  /**
   * Writes an event to the outbox within a transaction.
   *
   * @param event - Event to write
   * @param tx - Database transaction
   */
  write(event: DomainEvent, tx: unknown): Promise<void>;

  /**
   * Polls for unpublished events.
   *
   * @param limit - Maximum number of records to return
   * @returns Array of outbox records
   */
  pollUnpublished(limit: number): Promise<OutboxRecord[]>;

  /**
   * Marks a record as successfully published.
   *
   * @param id - Record ID
   */
  markPublished(id: ID): Promise<void>;

  /**
   * Marks a record as failed.
   *
   * @param id - Record ID
   * @param error - Error message
   */
  markFailed(id: ID, error: string): Promise<void>;
}

/**
 * Options for creating a domain event.
 *
 * @category Core
 */
export interface CreateDomainEventOptions {
  /**
   * ID of the actor who caused the event
   */
  actorId?: ID;

  /**
   * Correlation ID for tracing (auto-generated if not provided)
   */
  correlationId?: ID;

  /**
   * ID of the causing event
   */
  causedBy?: ID;

  /**
   * Aggregate version (default: 1)
   */
  version?: number;

  /**
   * Source module ID (default: "unknown")
   */
  source?: string;

  /**
   * Additional metadata
   */
  metadata?: Meta;
}

/**
 * Creates a new domain event with all required fields.
 *
 * @typeParam T - Payload type
 * @param type - Event type (e.g., "user.created")
 * @param aggregateId - Aggregate ID
 * @param aggregateType - Aggregate type (e.g., "User")
 * @param payload - Event payload
 * @param orgId - Organization ID
 * @param options - Optional event configuration
 * @returns Complete domain event
 *
 * @example
 * ```typescript
 * const event = createDomainEvent(
 *   "user.created",
 *   userId,
 *   "User",
 *   { email: "user@example.com" },
 *   orgId,
 *   {
 *     actorId: currentUserId,
 *     source: "identity",
 *     metadata: { ip: "192.168.1.1" }
 *   }
 * );
 * ```
 *
 * @category Core
 */
export function createDomainEvent<T>(
  type: string,
  aggregateId: ID,
  aggregateType: string,
  payload: T,
  orgId: ID,
  options?: CreateDomainEventOptions,
): DomainEvent<T> {
  return {
    id: generateId(),
    type,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: Date.now() as Timestamp,
    orgId,
    correlationId: options?.correlationId ?? generateId(),
    actorId: options?.actorId,
    causedBy: options?.causedBy,
    version: options?.version ?? 1,
    source: options?.source ?? "unknown",
    metadata: options?.metadata,
  };
}

/**
 * Internal subscription representation.
 *
 * @internal
 */
interface Subscription {
  pattern: string[];
  handler: EventHandler;
  once: boolean;
}

/**
 * In-memory event bus implementation with wildcard pattern matching.
 *
 * Pattern syntax:
 * - `user.created` - Exact match
 * - `user.*` - Matches any single level (user.created, user.updated)
 * - `*` - Matches everything
 * - `user.**` - Matches any depth (user.created, user.profile.updated)
 *
 * @example
 * ```typescript
 * const bus = new InMemoryEventBus();
 *
 * // Subscribe to all user events
 * bus.subscribe("user.*", (event) => {
 *   console.log("User event:", event.type);
 * });
 *
 * // Subscribe once
 * bus.subscribe("order.created", (event) => {
 *   console.log("First order created");
 * }, { once: true });
 * ```
 *
 * @category Core
 */
export class InMemoryEventBus implements EventBus {
  private subscriptions: Subscription[] = [];

  /**
   * Publishes an event to all matching subscribers.
   *
   * @param event - Event to publish
   */
  async publish(event: DomainEvent): Promise<void> {
    const promises = this.subscriptions
      .filter((sub) => this.matchesPattern(event.type, sub.pattern))
      .map((sub) => sub.handler(event));

    await Promise.all(promises);

    // Remove once handlers after execution
    this.subscriptions = this.subscriptions.filter((sub) => !sub.once);
  }

  /**
   * Publishes multiple events.
   *
   * @param events - Events to publish
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }

  /**
   * Subscribes to events matching a pattern.
   *
   * @param pattern - Dot-notation pattern
   * @param handler - Event handler function
   * @param opts - Subscription options
   * @returns Unsubscribe function
   */
  subscribe(
    pattern: string,
    handler: EventHandler,
    opts?: SubscribeOptions,
  ): Unsubscribe {
    const subscription: Subscription = {
      pattern: pattern.split("."),
      handler,
      once: opts?.once ?? false,
    };
    this.subscriptions.push(subscription);

    return () => {
      const index = this.subscriptions.indexOf(subscription);
      if (index > -1) {
        this.subscriptions.splice(index, 1);
      }
    };
  }

  /**
   * Matches an event type against a pattern.
   *
   * @param eventType - Event type string (e.g., "user.created")
   * @param pattern - Pattern parts (e.g., ["user", "*"])
   * @returns True if the pattern matches
   *
   * @internal
   */
  private matchesPattern(eventType: string, pattern: string[]): boolean {
    const eventParts = eventType.split(".");

    for (let i = 0; i < pattern.length; i++) {
      const patternPart = pattern[i];

      if (patternPart === "*") {
        // Wildcard matches anything
        continue;
      }

      if (patternPart === "**") {
        // Double wildcard matches any remaining parts
        return true;
      }

      // Specific match required
      if (i >= eventParts.length || patternPart !== eventParts[i]) {
        return false;
      }
    }

    return pattern.length === eventParts.length;
  }
}

/**
 * In-memory event store implementation.
 *
 * Suitable for testing and development. Use database-backed
 * implementations for production.
 *
 * @example
 * ```typescript
 * const store = new InMemoryEventStore();
 *
 * // Append event
 * await store.append(event);
 *
 * // Read stream
 * for await (const e of store.read(aggregateId)) {
 *   console.log(e.type, e.payload);
 * }
 * ```
 *
 * @category Core
 */
export class InMemoryEventStore implements EventStore {
  private events: Map<ID, DomainEvent[]> = new Map();

  /**
   * Appends a single event.
   *
   * @param event - Event to append
   */
  async append(event: DomainEvent): Promise<void> {
    const existing = this.events.get(event.aggregateId) ?? [];
    existing.push(event);
    this.events.set(event.aggregateId, existing);
  }

  /**
   * Appends multiple events.
   *
   * @param events - Events to append
   */
  async appendBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.append(event);
    }
  }

  /**
   * Reads events for an aggregate.
   *
   * @param aggregateId - Aggregate ID
   * @param opts - Read options
   * @returns Async iterable of events
   */
  async *read(aggregateId: ID, opts?: ReadOptions): AsyncIterable<DomainEvent> {
    const events = this.events.get(aggregateId) ?? [];
    let version = opts?.fromVersion ?? 0;
    const limit = opts?.limit ?? Infinity;

    let count = 0;
    for (const event of events) {
      if (event.version > version && count < limit) {
        yield event;
        count++;
        version = event.version;
      }
    }
  }

  /**
   * Reads events by type.
   *
   * @param type - Event type
   * @param opts - Read options
   * @returns Async iterable of events
   */
  async *readByType(
    type: string,
    opts?: ReadOptions,
  ): AsyncIterable<DomainEvent> {
    const limit = opts?.limit ?? Infinity;
    let count = 0;

    for (const [, events] of this.events) {
      for (const event of events) {
        if (event.type === type && count < limit) {
          yield event;
          count++;
        }
      }
    }
  }

  /**
   * Replays events matching a filter.
   *
   * @param filter - Event filter
   * @param _from - Start timestamp (not used in in-memory implementation)
   * @returns Async iterable of events
   */
  async *replay(
    filter: EventFilter,
    _from: Timestamp,
  ): AsyncIterable<DomainEvent> {
    for (const [, events] of this.events) {
      for (const event of events) {
        if (this.matchesFilter(event, filter)) {
          yield event;
        }
      }
    }
  }

  /**
   * Gets the current version of an aggregate.
   *
   * @param aggregateId - Aggregate ID
   * @returns Current version (0 if no events)
   */
  async getVersion(aggregateId: ID): Promise<number> {
    const events = this.events.get(aggregateId) ?? [];
    if (events.length === 0) return 0;
    const lastEvent = events[events.length - 1];
    return lastEvent ? lastEvent.version : 0;
  }

  /**
   * Checks if an event matches a filter.
   *
   * @param event - Event to check
   * @param filter - Filter criteria
   * @returns True if event matches all filter criteria
   *
   * @internal
   */
  private matchesFilter(event: DomainEvent, filter: EventFilter): boolean {
    if (filter.aggregateId && event.aggregateId !== filter.aggregateId)
      return false;
    if (filter.aggregateType && event.aggregateType !== filter.aggregateType)
      return false;
    if (filter.type && event.type !== filter.type) return false;
    if (filter.orgId && event.orgId !== filter.orgId) return false;
    return true;
  }
}
