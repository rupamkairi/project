/**
 * Real-time Communication
 *
 * WebSocket gateway and event bridge for real-time updates.
 *
 * @category Core
 * @packageDocumentation
 */

import type { ID } from "../entity";

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
 * // Get clients by organization
 * const clients = gateway.getClientsByOrg(orgId);
 *
 * // Subscribe client to channels
 * gateway.subscribe(clientId, ["orders", "notifications"]);
 *
 * // Publish to channel
 * gateway.publish("orders", { type: "order.created", data: order });
 *
 * // Send to specific client
 * gateway.sendToClient(clientId, { type: "notification", message: "New order!" });
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

  /**
   * Subscribes a client to channels.
   *
   * @param clientId - Client connection ID
   * @param channels - Channel names to subscribe to
   */
  subscribe(clientId: ID, channels: string[]): void;

  /**
   * Unsubscribes a client from channels.
   *
   * @param clientId - Client connection ID
   * @param channels - Channel names to unsubscribe from
   */
  unsubscribe(clientId: ID, channels: string[]): void;

  /**
   * Checks if a client is subscribed to a channel.
   *
   * @param clientId - Client connection ID
   * @param channel - Channel name
   * @returns True if subscribed
   */
  isSubscribed(clientId: ID, channel: string): boolean;

  /**
   * Publishes a message to a channel.
   *
   * @param channel - Channel name
   * @param payload - Message payload
   */
  publish(channel: string, payload: unknown): void;

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
}

/**
 * Real-time bridge connecting event bus to WebSocket gateway.
 *
 * @category Core
 */
export interface RealTimeBridge {
  /**
   * Registers an event-to-channel mapping.
   *
   * @param eventPattern - Event pattern (e.g., "order.*")
   * @param channelTemplate - Channel template (e.g., "org:{orgId}:orders")
   */
  registerEventMapping(eventPattern: string, channelTemplate: string): void;

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
 * // Subscribe to channels
 * const subscribeMsg: RealtimeMessage = {
 *   type: "subscribe",
 *   channels: ["orders", "notifications"]
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
