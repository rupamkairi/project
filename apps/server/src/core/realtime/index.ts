/**
 * Real-time Communication
 *
 * WebSocket gateway and event bridge for real-time updates.
 *
 * @category Core
 * @packageDocumentation
 */

import type { ID } from "../entity";
import type { DomainEvent } from "../event";

/**
 * Client connection information.
 *
 * @category Core
 */
export interface RealTimeClient {
  /**
   * Unique client connection ID
   */
  id: ID;

  /**
   * Actor ID associated with this connection
   */
  actorId: ID;

  /**
   * Organization ID for multi-tenancy
   */
  orgId: ID;

  /**
   * Set of channels this client is subscribed to
   */
  channels: Set<string>;
}

/**
 * Real-time gateway interface for WebSocket management.
 *
 * @example
 * ```typescript
 * // Connect a client
 * gateway.connect(clientId, actorId, orgId);
 *
 * // Subscribe client to a channel (single)
 * gateway.subscribe(clientId, "org:123:orders");
 *
 * // Publish to channel
 * await gateway.publish("orders", { type: "order.created", data: order });
 *
 * // Get presence on a channel
 * const ids = gateway.getPresence("org:123:orders");
 * ```
 *
 * @category Core
 */
export interface RealTimeGateway {
  /**
   * Gets a client by connection ID.
   *
   * @param clientId - Client connection ID
   * @returns Client info or undefined
   */
  getClient(clientId: ID): RealTimeClient | undefined;

  /**
   * Gets all clients for an organization.
   *
   * @param orgId - Organization ID
   * @returns Array of clients
   */
  getClientsByOrg(orgId: ID): RealTimeClient[];

  // -------------------------------------------------------------------------
  // Client lifecycle (called by WebSocket transport)
  // -------------------------------------------------------------------------

  /**
   * Registers a newly connected client.
   *
   * @param clientId - Unique client connection ID
   * @param actorId - Actor associated with the connection
   * @param orgId - Organization the actor belongs to
   */
  connect(clientId: ID, actorId: ID, orgId: ID): void;

  /**
   * Removes a disconnected client and cleans up subscriptions.
   *
   * @param clientId - Client connection ID
   */
  disconnect(clientId: ID): void;

  /**
   * Subscribes a client to a single channel.
   *
   * @param clientId - Client connection ID
   * @param channel - Channel name to subscribe to
   */
  subscribe(clientId: ID, channel: string): void;

  /**
   * Unsubscribes a client from a single channel.
   *
   * @param clientId - Client connection ID
   * @param channel - Channel name to unsubscribe from
   */
  unsubscribe(clientId: ID, channel: string): void;

  /**
   * Checks if a client is subscribed to a channel.
   *
   * @param clientId - Client connection ID
   * @param channel - Channel name
   * @returns True if subscribed
   */
  isSubscribed(clientId: ID, channel: string): boolean;

  /**
   * Publishes a message to all clients subscribed to a channel.
   *
   * @param channel - Channel name
   * @param payload - Message payload
   */
  publish(channel: string, payload: unknown): Promise<void>;

  /**
   * Broadcasts to all clients in an organization.
   *
   * @param orgId - Organization ID
   * @param payload - Message payload
   */
  broadcast(orgId: ID, payload: unknown): void;

  /**
   * Sends a message to a specific client.
   *
   * @param clientId - Client connection ID
   * @param payload - Message payload
   */
  sendToClient(clientId: ID, payload: unknown): void;

  /**
   * Sends a message to all clients of an actor.
   *
   * @param actorId - Actor ID
   * @param payload - Message payload
   */
  sendToActor(actorId: ID, payload: unknown): void;

  // -------------------------------------------------------------------------
  // Presence
  // -------------------------------------------------------------------------

  /**
   * Returns the IDs of all clients currently subscribed to a channel.
   *
   * @param channel - Channel name
   * @returns Array of client IDs
   */
  getPresence(channel: string): ID[];

  /**
   * Returns all channels a client is subscribed to.
   *
   * @param clientId - Client connection ID
   * @returns Array of channel names
   */
  getChannels(clientId: ID): string[];
}

/**
 * Real-time bridge connecting event bus to WebSocket gateway.
 *
 * Configured in each Compose (or Module) to declare which EventBus
 * patterns map to which channels.
 *
 * @example
 * ```typescript
 * bridge.forward("order.*", (e) => `org:${e.orgId}:orders`);
 * bridge.forward(
 *   "*.created",
 *   (e) => `org:${e.orgId}:actor:${e.actorId}:inbox`,
 *   (e) => e.source === "notification",
 * );
 * ```
 *
 * @category Core
 */
export interface RealTimeBridge {
  /**
   * Declares which event pattern forwards to which channel.
   *
   * @param eventPattern - Glob-style event type pattern (e.g. "order.*")
   * @param toChannel - Function that derives the channel name from the event
   * @param filter - Optional predicate; only matching events are forwarded
   */
  forward(
    eventPattern: string,
    toChannel: (event: DomainEvent) => string,
    filter?: (event: DomainEvent) => boolean,
  ): void;

  /**
   * Handles incoming realtime messages from clients.
   *
   * @param clientId - Client connection ID
   * @param message - Incoming message
   */
  handleMessage(clientId: ID, message: RealtimeMessage): Promise<void>;
}

/**
 * Client message types.
 *
 * @category Core
 */
export type RealtimeMessageType =
  | "subscribe"
  | "unsubscribed"
  | "broadcast"
  | "ping";

/**
 * Message format from client to server.
 *
 * @example
 * ```typescript
 * // Subscribe to a channel
 * const subscribeMsg: RealtimeMessage = {
 *   type: "subscribe",
 *   channels: ["orders"]
 * };
 *
 * // Ping for keepalive
 * const pingMsg: RealtimeMessage = {
 *   type: "ping"
 * };
 * ```
 *
 * @category Core
 */
export interface RealtimeMessage {
  /**
   * Message type
   */
  type: RealtimeMessageType;

  /**
   * Channels to subscribe/unsubscribe
   */
  channels?: string[];

  /**
   * Message payload (for broadcast)
   */
  payload?: unknown;
}

/**
 * Server message types.
 *
 * @category Core
 */
export type RealtimeServerMessageType =
  | "subscribed"
  | "unsubscribed"
  | "message"
  | "error"
  | "pong";

/**
 * Message format from server to client.
 *
 * @example
 * ```typescript
 * // Subscription confirmation
 * const subscribedMsg: RealtimeServerMessage = {
 *   type: "subscribed",
 *   channel: "orders"
 * };
 *
 * // Incoming message
 * const dataMsg: RealtimeServerMessage = {
 *   type: "message",
 *   channel: "orders",
 *   data: { type: "order.created", order: orderData }
 * };
 *
 * // Error
 * const errorMsg: RealtimeServerMessage = {
 *   type: "error",
 *   error: "Invalid channel format"
 * };
 * ```
 *
 * @category Core
 */
export interface RealtimeServerMessage {
  /**
   * Message type
   */
  type: RealtimeServerMessageType;

  /**
   * Channel name (for subscribed/unsubscribed/message)
   */
  channel?: string;

  /**
   * Message data (for message type)
   */
  data?: unknown;

  /**
   * Error message (for error type)
   */
  error?: string;
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

/**
 * In-memory store for a single gateway instance.
 */
interface ClientRecord {
  actorId: ID;
  orgId: ID;
  channels: Set<string>;
}

/**
 * Creates an in-memory {@link RealTimeGateway}.
 *
 * Suitable for testing and single-process deployments.
 * Production deployments should replace this with a Redis-backed adapter.
 *
 * @category Core
 */
export function createInMemoryGateway(): RealTimeGateway {
  const clientMap = new Map<ID, ClientRecord>();
  const channelMap = new Map<string, Set<ID>>();

  function addToChannel(channel: string, clientId: ID): void {
    if (!channelMap.has(channel)) {
      channelMap.set(channel, new Set());
    }
    channelMap.get(channel)!.add(clientId);
  }

  function removeFromChannel(channel: string, clientId: ID): void {
    const set = channelMap.get(channel);
    if (!set) return;
    set.delete(clientId);
    if (set.size === 0) channelMap.delete(channel);
  }

  return {
    getClient(clientId: ID): RealTimeClient | undefined {
      const record = clientMap.get(clientId);
      if (!record) return undefined;
      return {
        id: clientId,
        actorId: record.actorId,
        orgId: record.orgId,
        channels: record.channels,
      };
    },

    getClientsByOrg(orgId: ID): RealTimeClient[] {
      const result: RealTimeClient[] = [];
      for (const [id, record] of clientMap) {
        if (record.orgId === orgId) {
          result.push({ id, actorId: record.actorId, orgId: record.orgId, channels: record.channels });
        }
      }
      return result;
    },

    connect(clientId: ID, actorId: ID, orgId: ID): void {
      clientMap.set(clientId, { actorId, orgId, channels: new Set() });
    },

    disconnect(clientId: ID): void {
      const record = clientMap.get(clientId);
      if (!record) return;
      for (const channel of record.channels) {
        removeFromChannel(channel, clientId);
      }
      clientMap.delete(clientId);
    },

    subscribe(clientId: ID, channel: string): void {
      const record = clientMap.get(clientId);
      if (!record) return;
      record.channels.add(channel);
      addToChannel(channel, clientId);
    },

    unsubscribe(clientId: ID, channel: string): void {
      const record = clientMap.get(clientId);
      if (!record) return;
      record.channels.delete(channel);
      removeFromChannel(channel, clientId);
    },

    isSubscribed(clientId: ID, channel: string): boolean {
      return clientMap.get(clientId)?.channels.has(channel) ?? false;
    },

    async publish(channel: string, payload: unknown): Promise<void> {
      // In-memory: no actual transport — payload is captured for testing
      // Real adapters (WebSocket, Redis pub/sub) replace this method.
      void channel;
      void payload;
    },

    broadcast(orgId: ID, payload: unknown): void {
      void orgId;
      void payload;
    },

    sendToClient(clientId: ID, payload: unknown): void {
      void clientId;
      void payload;
    },

    sendToActor(actorId: ID, payload: unknown): void {
      void actorId;
      void payload;
    },

    getPresence(channel: string): ID[] {
      const set = channelMap.get(channel);
      return set ? Array.from(set) : [];
    },

    getChannels(clientId: ID): string[] {
      const record = clientMap.get(clientId);
      return record ? Array.from(record.channels) : [];
    },
  };
}

/**
 * Creates an in-memory {@link RealTimeBridge}.
 *
 * Records forwarding rules. The caller is responsible for wiring
 * event bus subscriptions and invoking the bridge to resolve channels.
 *
 * @category Core
 */
export function createInMemoryBridge(): RealTimeBridge & {
  /** Resolve the channel(s) for a given event, applying filter and pattern. */
  resolve(event: DomainEvent): string[];
  /** All registered mappings (for inspection in tests). */
  readonly mappings: ReadonlyArray<{
    pattern: string;
    toChannel: (event: DomainEvent) => string;
    filter?: (event: DomainEvent) => boolean;
  }>;
} {
  type Mapping = {
    pattern: string;
    toChannel: (event: DomainEvent) => string;
    filter?: (event: DomainEvent) => boolean;
  };

  const mappings: Mapping[] = [];

  /** Glob-style match: supports "*" (single segment) and "**" (any). */
  function matches(pattern: string, type: string): boolean {
    const re = new RegExp(
      "^" +
        pattern
          .split(".")
          .map((seg) => (seg === "*" ? "[^.]+" : seg === "**" ? ".+" : seg.replace(/[+?^${}()|[\]\\]/g, "\\$&")))
          .join("\\.") +
        "$",
    );
    return re.test(type);
  }

  return {
    get mappings() {
      return mappings as ReadonlyArray<Mapping>;
    },

    forward(
      eventPattern: string,
      toChannel: (event: DomainEvent) => string,
      filter?: (event: DomainEvent) => boolean,
    ): void {
      mappings.push({ pattern: eventPattern, toChannel, filter });
    },

    resolve(event: DomainEvent): string[] {
      const channels: string[] = [];
      for (const mapping of mappings) {
        if (!matches(mapping.pattern, event.type)) continue;
        if (mapping.filter && !mapping.filter(event)) continue;
        channels.push(mapping.toChannel(event));
      }
      return channels;
    },

    async handleMessage(_clientId: ID, _message: RealtimeMessage): Promise<void> {
      // No-op in-memory implementation
    },
  };
}
