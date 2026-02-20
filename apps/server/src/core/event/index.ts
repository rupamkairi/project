import type { ID, Timestamp, Meta } from "../entity";
import { generateId } from "../entity";

// Domain Event
export interface DomainEvent<T = unknown> {
  id: ID;
  type: string; // 'actor.created', 'stock.low'
  aggregateId: ID;
  aggregateType: string;
  payload: T;
  occurredAt: Timestamp;
  actorId?: ID;
  orgId: ID;
  correlationId: ID;
  causedBy?: ID;
  version: number; // aggregate version at time of event
  source: string; // module id that emitted
  metadata?: Meta;
}

// Event Bus - publish/subscribe pattern
export interface EventHandler {
  (event: DomainEvent): Promise<void>;
}

export interface SubscribeOptions {
  once?: boolean;
}

export interface Unsubscribe {
  (): void;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
  subscribe(
    pattern: string,
    handler: EventHandler,
    opts?: SubscribeOptions,
  ): Unsubscribe;
}

// Event Store - append-only event log
export interface ReadOptions {
  fromVersion?: number;
  limit?: number;
}

export interface EventFilter {
  aggregateId?: ID;
  aggregateType?: string;
  type?: string;
  orgId?: ID;
}

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  appendBatch(events: DomainEvent[]): Promise<void>;
  read(aggregateId: ID, opts?: ReadOptions): AsyncIterable<DomainEvent>;
  readByType(type: string, opts?: ReadOptions): AsyncIterable<DomainEvent>;
  replay(filter: EventFilter, from: Timestamp): AsyncIterable<DomainEvent>;
  getVersion(aggregateId: ID): Promise<number>;
}

// Event Outbox - transactional outbox pattern
export interface OutboxRecord {
  id: ID;
  event: DomainEvent;
  attempts: number;
  lastError?: string;
  createdAt: Timestamp;
  processedAt?: Timestamp;
}

export interface EventOutbox {
  write(event: DomainEvent, tx: unknown): Promise<void>;
  pollUnpublished(limit: number): Promise<OutboxRecord[]>;
  markPublished(id: ID): Promise<void>;
  markFailed(id: ID, error: string): Promise<void>;
}

// Helper to create a domain event
export function createDomainEvent<T>(
  type: string,
  aggregateId: ID,
  aggregateType: string,
  payload: T,
  orgId: ID,
  options?: {
    actorId?: ID;
    correlationId?: ID;
    causedBy?: ID;
    version?: number;
    source?: string;
    metadata?: Meta;
  },
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

// In-Memory Event Bus implementation with wildcard pattern matching
interface Subscription {
  pattern: string[];
  handler: EventHandler;
  once: boolean;
}

export class InMemoryEventBus implements EventBus {
  private subscriptions: Subscription[] = [];

  async publish(event: DomainEvent): Promise<void> {
    const promises = this.subscriptions
      .filter((sub) => this.matchesPattern(event.type, sub.pattern))
      .map((sub) => sub.handler(event));

    await Promise.all(promises);

    // Remove once handlers after execution
    this.subscriptions = this.subscriptions.filter((sub) => !sub.once);
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }

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

  // Wildcard pattern matching
  // 'actor.*' matches 'actor.created', 'actor.suspended'
  // '*.created' matches 'actor.created', 'stock.created'
  // '*' matches everything
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

// In-Memory Event Store implementation
export class InMemoryEventStore implements EventStore {
  private events: Map<ID, DomainEvent[]> = new Map();

  async append(event: DomainEvent): Promise<void> {
    const existing = this.events.get(event.aggregateId) ?? [];
    existing.push(event);
    this.events.set(event.aggregateId, existing);
  }

  async appendBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.append(event);
    }
  }

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

  async getVersion(aggregateId: ID): Promise<number> {
    const events = this.events.get(aggregateId) ?? [];
    if (events.length === 0) return 0;
    const lastEvent = events[events.length - 1];
    return lastEvent ? lastEvent.version : 0;
  }

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
