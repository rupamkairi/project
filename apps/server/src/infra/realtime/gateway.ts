// Real-time Gateway - Bun WebSocket implementation

import type { RealTimeGateway, RealTimeClient, ID } from "@core";
import { generateId } from "@core";

interface WSClient {
  actorId: ID;
  orgId: ID;
  channels: Set<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send: (data: any) => void;
}

const clients = new Map<ID, WSClient>();
const channels = new Map<string, Set<ID>>();

export function createRealtimeGateway(): RealTimeGateway {
  return {
    // --- lifecycle ---

    connect(clientId: ID, actorId: ID, orgId: ID): void {
      if (!clients.has(clientId)) {
        clients.set(clientId, { actorId, orgId, channels: new Set(), send: () => {} });
      }
    },

    disconnect(clientId: ID): void {
      const client = clients.get(clientId);
      if (!client) return;
      for (const channel of client.channels) {
        const set = channels.get(channel);
        if (set) {
          set.delete(clientId);
          if (set.size === 0) channels.delete(channel);
        }
      }
      clients.delete(clientId);
    },

    // --- subscriptions ---

    subscribe(clientId: ID, channel: string): void {
      const client = clients.get(clientId);
      if (!client) return;
      if (!isChannelAllowed(client.orgId, channel)) return;
      if (!channels.has(channel)) channels.set(channel, new Set());
      channels.get(channel)!.add(clientId);
      client.channels.add(channel);
    },

    unsubscribe(clientId: ID, channel: string): void {
      const client = clients.get(clientId);
      if (!client) return;
      client.channels.delete(channel);
      const set = channels.get(channel);
      if (set) {
        set.delete(clientId);
        if (set.size === 0) channels.delete(channel);
      }
    },

    // --- presence ---

    getPresence(channel: string): ID[] {
      return Array.from(channels.get(channel) ?? []);
    },

    getChannels(clientId: ID): string[] {
      return Array.from(clients.get(clientId)?.channels ?? []);
    },

    // --- publish ---

    async publish(channel: string, payload: unknown): Promise<void> {
      const channelClients = channels.get(channel);
      if (!channelClients) return;
      const message = JSON.stringify({ channel, data: payload, ts: Date.now() });
      for (const clientId of channelClients) {
        clients.get(clientId)?.send(message);
      }
    },

    broadcast(orgId: ID, payload: unknown): void {
      void this.publish(`org:${orgId}:broadcast`, payload);
    },

    // --- helpers kept for internal use (not on RealTimeGateway interface) ---

    getClient(clientId: ID): RealTimeClient | undefined {
      const client = clients.get(clientId);
      if (!client) return undefined;
      return { id: clientId, actorId: client.actorId, orgId: client.orgId, channels: client.channels };
    },

    getClientsByOrg(orgId: ID): RealTimeClient[] {
      const result: RealTimeClient[] = [];
      for (const [id, client] of clients) {
        if (client.orgId === orgId)
          result.push({ id, actorId: client.actorId, orgId: client.orgId, channels: client.channels });
      }
      return result;
    },

    isSubscribed(clientId: ID, channel: string): boolean {
      return clients.get(clientId)?.channels.has(channel) ?? false;
    },

    sendToClient(clientId: ID, payload: unknown): void {
      clients.get(clientId)?.send(JSON.stringify(payload));
    },

    sendToActor(actorId: ID, payload: unknown): void {
      for (const [, client] of clients) {
        if (client.actorId === actorId) client.send(JSON.stringify(payload));
      }
    },
  };
}

function isChannelAllowed(orgId: ID, channel: string): boolean {
  if (channel.startsWith(`org:${orgId}:`)) return true;
  if (!channel.startsWith("org:")) return true;
  return false;
}

export function registerClient(
  clientId: ID,
  actorId: ID,
  orgId: ID,
  sendFn: (data: string) => void,
): void {
  clients.set(clientId, { actorId, orgId, channels: new Set(), send: sendFn });
}

export function unregisterClient(clientId: ID): void {
  const client = clients.get(clientId);
  if (!client) return;
  for (const channel of client.channels) {
    const set = channels.get(channel);
    if (set) {
      set.delete(clientId);
      if (set.size === 0) channels.delete(channel);
    }
  }
  clients.delete(clientId);
}

export function handleClientMessage(clientId: ID, message: string): void {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    const msg = JSON.parse(message);
    const gw = createRealtimeGateway();

    switch (msg.type) {
      case "subscribe":
        if (Array.isArray(msg.channels)) {
          for (const ch of msg.channels) gw.subscribe(clientId, ch);
        }
        break;
      case "unsubscribe":
        if (Array.isArray(msg.channels)) {
          for (const ch of msg.channels) gw.unsubscribe(clientId, ch);
        }
        break;
      case "ping":
        client.send(JSON.stringify({ type: "pong" }));
        break;
      default:
        client.send(JSON.stringify({ type: "error", message: `Unknown message type: ${msg.type}` }));
    }
  } catch {
    client.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
  }
}

export const gateway = createRealtimeGateway();
