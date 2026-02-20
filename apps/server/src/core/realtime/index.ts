// Real-time communication interfaces

import type { ID } from "../entity";

// Client connection info
export interface RealTimeClient {
  id: ID;
  actorId: ID;
  orgId: ID;
  channels: Set<string>;
}

// RealTime Gateway interface - implemented by infrastructure
export interface RealTimeGateway {
  // Client management
  getClient(clientId: ID): RealTimeClient | undefined;
  getClientsByOrg(orgId: ID): RealTimeClient[];

  // Channel management
  subscribe(clientId: ID, channels: string[]): void;
  unsubscribe(clientId: ID, channels: string[]): void;
  isSubscribed(clientId: ID, channel: string): boolean;

  // Messaging
  publish(channel: string, payload: unknown): void;
  broadcast(orgId: ID, payload: unknown): void;
  sendToClient(clientId: ID, payload: unknown): void;
  sendToActor(actorId: ID, payload: unknown): void;
}

// RealTime Bridge - connects event bus to realtime
export interface RealTimeBridge {
  // Subscribe to events and publish to channels
  registerEventMapping(eventPattern: string, channelTemplate: string): void;

  // Handle incoming realtime messages from clients
  handleMessage(clientId: ID, message: RealtimeMessage): Promise<void>;
}

// Client message format
export interface RealtimeMessage {
  type: "subscribe" | "unsubscribe" | "broadcast" | "ping";
  channels?: string[];
  payload?: unknown;
}

// Server message format
export interface RealtimeServerMessage {
  type: "subscribed" | "unsubscribed" | "message" | "error" | "pong";
  channel?: string;
  data?: unknown;
  error?: string;
}
