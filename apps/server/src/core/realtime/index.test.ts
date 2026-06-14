import { describe, test, expect, beforeEach } from "bun:test";
import {
  createInMemoryGateway,
  createInMemoryBridge,
} from "./index";
import type { RealTimeGateway, RealTimeBridge } from "./index";
import type { DomainEvent } from "../event";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: "evt-1",
    type: "order.created",
    aggregateId: "agg-1",
    aggregateType: "Order",
    payload: { locationId: "loc-99" },
    occurredAt: Date.now(),
    orgId: "org-1",
    actorId: "actor-1",
    correlationId: "corr-1",
    version: 1,
    source: "catalog",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// RealTimeGateway — in-memory
// ---------------------------------------------------------------------------

describe("createInMemoryGateway", () => {
  let gw: RealTimeGateway;

  beforeEach(() => {
    gw = createInMemoryGateway();
  });

  // F1 — connect / disconnect
  describe("connect / disconnect", () => {
    test("connect registers the client", () => {
      gw.connect("c1", "actor-1", "org-1");
      const client = gw.getClient("c1");
      expect(client).toBeDefined();
      expect(client?.actorId).toBe("actor-1");
      expect(client?.orgId).toBe("org-1");
    });

    test("disconnect removes the client", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.disconnect("c1");
      expect(gw.getClient("c1")).toBeUndefined();
    });

    test("disconnect cleans up channel subscriptions", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.subscribe("c1", "org:org-1:orders");
      expect(gw.getPresence("org:org-1:orders")).toContain("c1");
      gw.disconnect("c1");
      expect(gw.getPresence("org:org-1:orders")).not.toContain("c1");
    });

    test("disconnect on unknown clientId is a no-op", () => {
      expect(() => gw.disconnect("nonexistent")).not.toThrow();
    });
  });

  // F2 — subscribe / unsubscribe (single channel)
  describe("subscribe / unsubscribe — single channel", () => {
    test("subscribe adds client to channel", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.subscribe("c1", "org:org-1:orders");
      expect(gw.isSubscribed("c1", "org:org-1:orders")).toBe(true);
    });

    test("subscribe on unknown client is a no-op", () => {
      expect(() => gw.subscribe("ghost", "some-channel")).not.toThrow();
    });

    test("unsubscribe removes client from channel", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.subscribe("c1", "org:org-1:orders");
      gw.unsubscribe("c1", "org:org-1:orders");
      expect(gw.isSubscribed("c1", "org:org-1:orders")).toBe(false);
    });

    test("unsubscribe on unknown client is a no-op", () => {
      expect(() => gw.unsubscribe("ghost", "some-channel")).not.toThrow();
    });

    test("subscribe accepts a single string (not array)", () => {
      gw.connect("c1", "actor-1", "org-1");
      // TypeScript type: subscribe(clientId: ID, channel: string)
      // If the arg were still string[] this call would still work at runtime
      // but the type test below ensures signature is correct.
      const channelArg: string = "org:org-1:inventory";
      gw.subscribe("c1", channelArg);
      expect(gw.isSubscribed("c1", "org:org-1:inventory")).toBe(true);
    });
  });

  // F1 — getPresence
  describe("getPresence", () => {
    test("returns client IDs subscribed to channel", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.connect("c2", "actor-2", "org-1");
      gw.subscribe("c1", "org:org-1:orders");
      gw.subscribe("c2", "org:org-1:orders");
      const presence = gw.getPresence("org:org-1:orders");
      expect(presence).toContain("c1");
      expect(presence).toContain("c2");
      expect(presence.length).toBe(2);
    });

    test("returns empty array for unknown channel", () => {
      expect(gw.getPresence("no-such-channel")).toEqual([]);
    });

    test("presence shrinks after unsubscribe", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.subscribe("c1", "org:org-1:orders");
      gw.unsubscribe("c1", "org:org-1:orders");
      expect(gw.getPresence("org:org-1:orders")).toEqual([]);
    });
  });

  // F1 — getChannels
  describe("getChannels", () => {
    test("returns channels the client is subscribed to", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.subscribe("c1", "org:org-1:orders");
      gw.subscribe("c1", "org:org-1:workflow");
      const ch = gw.getChannels("c1");
      expect(ch).toContain("org:org-1:orders");
      expect(ch).toContain("org:org-1:workflow");
      expect(ch.length).toBe(2);
    });

    test("returns empty array for unknown client", () => {
      expect(gw.getChannels("ghost")).toEqual([]);
    });

    test("reflects unsubscriptions", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.subscribe("c1", "org:org-1:orders");
      gw.subscribe("c1", "org:org-1:workflow");
      gw.unsubscribe("c1", "org:org-1:orders");
      const ch = gw.getChannels("c1");
      expect(ch).not.toContain("org:org-1:orders");
      expect(ch).toContain("org:org-1:workflow");
    });
  });

  // F4 — publish returns Promise<void>
  describe("publish — async", () => {
    test("publish returns a Promise", async () => {
      const result = gw.publish("some-channel", { hello: "world" });
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });

    test("publish on channel with no subscribers resolves cleanly", async () => {
      await expect(gw.publish("empty-channel", {})).resolves.toBeUndefined();
    });
  });

  // getClientsByOrg
  describe("getClientsByOrg", () => {
    test("returns only clients in the given org", () => {
      gw.connect("c1", "actor-1", "org-1");
      gw.connect("c2", "actor-2", "org-2");
      const result = gw.getClientsByOrg("org-1");
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe("c1");
    });
  });
});

// ---------------------------------------------------------------------------
// RealTimeBridge — in-memory
// ---------------------------------------------------------------------------

describe("createInMemoryBridge", () => {
  let bridge: ReturnType<typeof createInMemoryBridge>;

  beforeEach(() => {
    bridge = createInMemoryBridge();
  });

  // F3 — forward with function toChannel
  describe("forward — function toChannel", () => {
    test("registers a mapping and resolves the channel", () => {
      bridge.forward("order.*", (e) => `org:${e.orgId}:orders`);
      const event = makeEvent({ type: "order.created", orgId: "org-42" });
      const channels = bridge.resolve(event);
      expect(channels).toEqual(["org:org-42:orders"]);
    });

    test("toChannel receives the full event", () => {
      let captured: DomainEvent | undefined;
      bridge.forward("order.*", (e) => {
        captured = e;
        return "channel";
      });
      const event = makeEvent({ type: "order.shipped" });
      bridge.resolve(event);
      expect(captured).toBe(event);
    });

    test("pattern does not match unrelated event types", () => {
      bridge.forward("order.*", (e) => `org:${e.orgId}:orders`);
      const event = makeEvent({ type: "stock.updated" });
      expect(bridge.resolve(event)).toEqual([]);
    });

    test("multiple mappings can match the same event", () => {
      bridge.forward("order.*", () => "channel-a");
      bridge.forward("order.*", () => "channel-b");
      const event = makeEvent({ type: "order.created" });
      const channels = bridge.resolve(event);
      expect(channels).toContain("channel-a");
      expect(channels).toContain("channel-b");
      expect(channels.length).toBe(2);
    });
  });

  // F3 — forward with filter predicate
  describe("forward — filter predicate", () => {
    test("filter prevents forwarding when it returns false", () => {
      bridge.forward(
        "*.created",
        (e) => `org:${e.orgId}:actor:${e.actorId}:inbox`,
        (e) => (e as DomainEvent<{ source?: string }>).source === "notification",
      );
      const event = makeEvent({ type: "order.created", source: "catalog" });
      expect(bridge.resolve(event)).toEqual([]);
    });

    test("filter allows forwarding when it returns true", () => {
      bridge.forward(
        "*.created",
        (e) => `org:${e.orgId}:actor:${e.actorId}:inbox`,
        (e) => e.source === "notification",
      );
      const event = makeEvent({
        type: "task.created",
        orgId: "org-1",
        actorId: "actor-1",
        source: "notification",
      });
      const channels = bridge.resolve(event);
      expect(channels).toEqual(["org:org-1:actor:actor-1:inbox"]);
    });

    test("no filter means always forward", () => {
      bridge.forward("task.*", (e) => `org:${e.orgId}:workflow`);
      const event = makeEvent({ type: "task.completed", orgId: "org-7" });
      expect(bridge.resolve(event)).toEqual(["org:org-7:workflow"]);
    });
  });

  // RealTimeBridge interface type check
  describe("interface conformance", () => {
    test("bridge satisfies RealTimeBridge interface", () => {
      const typed: RealTimeBridge = bridge;
      expect(typeof typed.forward).toBe("function");
      expect(typeof typed.handleMessage).toBe("function");
    });

    test("handleMessage resolves without error", async () => {
      await expect(
        bridge.handleMessage("c1", { type: "ping" }),
      ).resolves.toBeUndefined();
    });

    test("mappings are recorded", () => {
      bridge.forward("order.*", () => "ch");
      expect(bridge.mappings.length).toBe(1);
      expect(bridge.mappings[0]?.pattern).toBe("order.*");
    });
  });
});
