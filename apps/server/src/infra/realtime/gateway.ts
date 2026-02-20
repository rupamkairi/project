// Real-time Gateway - Bun WebSocket implementation

import type { RealTimeGateway, RealTimeClient } from "../../core/realtime";
import type { ID } from "../../core/entity";
import { generateId } from "../../core/entity";

// Client info
interface WSClient {
  actorId: ID;
  orgId: ID;
  channels: Set<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send: (data: any) => void;
}

// Gateway state
const clients = new Map<ID, WSClient>();
const channels = new Map<string, Set<ID>>();

// Create real-time gateway
export function createRealtimeGateway(): RealTimeGateway {
  return {
    getClient(clientId: ID): RealTimeClient | undefined {
      const client = clients.get(clientId);
      if (!client) return undefined;
      return {
        id: clientId,
        actorId: client.actorId,
        orgId: client.orgId,
        channels: client.channels,
      };
    },

    getClientsByOrg(orgId: ID): RealTimeClient[] {
      const result: RealTimeClient[] = [];
      for (const [id, client] of clients) {
        if (client.orgId === orgId) {
          result.push({
            id,
            actorId: client.actorId,
            orgId: client.orgId,
            channels: client.channels,
          });
        }
      }
      return result;
    },

    subscribe(clientId: ID, channelNames: string[]): void {
      const client = clients.get(clientId);
      if (!client) return;

      for (const channel of channelNames) {
        // Verify channel access
        if (!isChannelAllowed(client.orgId, channel)) {
          continue;
        }

        // Add to channels map
        if (!channels.has(channel)) {
          channels.set(channel, new Set());
        }
        channels.get(channel)!.add(clientId);

        // Add to client channels
        client.channels.add(channel);
      }
    },

    unsubscribe(clientId: ID, channelNames: string[]): void {
      const client = clients.get(clientId);
      if (!client) return;

      for (const channel of channelNames) {
        client.channels.delete(channel);

        const channelClients = channels.get(channel);
        if (channelClients) {
          channelClients.delete(clientId);
          if (channelClients.size === 0) {
            channels.delete(channel);
          }
        }
      }
    },

    isSubscribed(clientId: ID, channel: string): boolean {
      const client = clients.get(clientId);
      return client?.channels.has(channel) ?? false;
    },

    publish(channel: string, payload: unknown): void {
      const channelClients = channels.get(channel);
      if (!channelClients) return;

      const message = JSON.stringify({
        channel,
        data: payload,
        ts: Date.now(),
      });

      for (const clientId of channelClients) {
        const client = clients.get(clientId);
        if (client) {
          client.send(message);
        }
      }
    },

    broadcast(orgId: ID, payload: unknown): void {
      this.publish(`org:${orgId}:broadcast`, payload);
    },

    sendToClient(clientId: ID, payload: unknown): void {
      const client = clients.get(clientId);
      if (client) {
        client.send(JSON.stringify(payload));
      }
    },

    sendToActor(actorId: ID, payload: unknown): void {
      for (const [, client] of clients) {
        if (client.actorId === actorId) {
          client.send(JSON.stringify(payload));
        }
      }
    },
  };
}

// Helper to check if client can access channel
function isChannelAllowed(orgId: ID, channel: string): boolean {
  // Allow channels that start with org:{orgId}:
  if (channel.startsWith(`org:${orgId}:`)) return true;

  // Allow public channels (no org prefix)
  if (!channel.startsWith("org:")) return true;

  return false;
}

// Register a WebSocket client
export function registerClient(
  clientId: ID,
  actorId: ID,
  orgId: ID,
  sendFn: (data: string) => void,
): void {
  clients.set(clientId, {
    actorId,
    orgId,
    channels: new Set(),
    send: sendFn,
  });
}

// Unregister a WebSocket client
export function unregisterClient(clientId: ID): void {
  const client = clients.get(clientId);
  if (client) {
    // Remove from all channels
    for (const channel of client.channels) {
      const channelClients = channels.get(channel);
      if (channelClients) {
        channelClients.delete(clientId);
        if (channelClients.size === 0) {
          channels.delete(channel);
        }
      }
    }
    clients.delete(clientId);
  }
}

// Handle message from client
export function handleClientMessage(clientId: ID, message: string): void {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    const msg = JSON.parse(message);

    switch (msg.type) {
      case "subscribe":
        if (msg.channels && Array.isArray(msg.channels)) {
          const gateway = createRealtimeGateway();
          gateway.subscribe(clientId, msg.channels);
        }
        break;

      case "unsubscribe":
        if (msg.channels && Array.isArray(msg.channels)) {
          const gateway = createRealtimeGateway();
          gateway.unsubscribe(clientId, msg.channels);
        }
        break;

      case "ping":
        client.send(JSON.stringify({ type: "pong" }));
        break;

      default:
        client.send(
          JSON.stringify({
            type: "error",
            message: `Unknown message type: ${msg.type}`,
          }),
        );
    }
  } catch {
    client.send(
      JSON.stringify({ type: "error", message: "Invalid message format" }),
    );
  }
}

// Export singleton instance
export const gateway = createRealtimeGateway();
