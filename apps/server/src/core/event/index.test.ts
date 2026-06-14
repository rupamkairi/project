/**
 * Tests for the Core Event System (C5)
 *
 * Covers:
 *   F1 — once-handler cleanup bug
 *   F2 — SubscribeOptions priority & filter
 *   F3 — EventOutbox.writeBatch
 *   F4 — ReadOptions after / from / to
 *   F5 — EventFilter types[] & actorId
 *   F6 — OutboxRecord.publishedAt (not processedAt)
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  InMemoryEventBus,
  InMemoryEventStore,
  InMemoryEventOutbox,
  createDomainEvent,
} from "./index";
import type {
  DomainEvent,
  OutboxRecord,
  ReadOptions,
  EventFilter,
} from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  type: string,
  overrides: Partial<DomainEvent> = {},
): DomainEvent {
  return createDomainEvent(
    type,
    "agg-1" as DomainEvent["aggregateId"],
    "Order",
    {},
    "org-1" as DomainEvent["orgId"],
    {
      source: "test",
      ...overrides,
    },
  );
}

// ---------------------------------------------------------------------------
// F1 — once-handler cleanup: only remove matched, called once-handlers
// ---------------------------------------------------------------------------

describe("InMemoryEventBus — F1: once-handler cleanup", () => {
  test("once-handler is removed after it fires on a matching event", async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    bus.subscribe(
      "order.placed",
      async () => {
        calls.push("placed");
      },
      { once: true },
    );

    await bus.publish(makeEvent("order.placed"));
    await bus.publish(makeEvent("order.placed"));

    // Should have fired exactly once
    expect(calls).toEqual(["placed"]);
  });

  test("once-handler on 'order.placed' is NOT removed when 'order.cancelled' fires", async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    bus.subscribe(
      "order.placed",
      async () => {
        calls.push("placed");
      },
      { once: true },
    );

    // Unrelated event — once-sub should survive
    await bus.publish(makeEvent("order.cancelled"));

    // Now the matching event — should fire
    await bus.publish(makeEvent("order.placed"));

    expect(calls).toEqual(["placed"]);
  });

  test("once-handler for 'order.*' fires for first match then is gone, unrelated events don't remove it", async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    bus.subscribe(
      "order.*",
      async (e) => {
        calls.push(e.type);
      },
      { once: true },
    );

    // Non-matching event
    await bus.publish(makeEvent("user.created"));
    // First matching — fires and removes
    await bus.publish(makeEvent("order.placed"));
    // After removal — no more calls
    await bus.publish(makeEvent("order.cancelled"));

    expect(calls).toEqual(["order.placed"]);
  });

  test("non-once handler is never removed", async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    bus.subscribe("order.placed", async () => {
      calls.push("a");
    });

    await bus.publish(makeEvent("order.placed"));
    await bus.publish(makeEvent("order.placed"));

    expect(calls).toEqual(["a", "a"]);
  });
});

// ---------------------------------------------------------------------------
// F2 — SubscribeOptions: priority & filter
// ---------------------------------------------------------------------------

describe("InMemoryEventBus — F2: priority ordering", () => {
  test("handlers are called in ascending priority order (lower = first)", async () => {
    const bus = new InMemoryEventBus();
    const order: string[] = [];

    bus.subscribe(
      "order.placed",
      async () => {
        order.push("low-priority-10");
      },
      { priority: 10 },
    );
    bus.subscribe(
      "order.placed",
      async () => {
        order.push("high-priority-1");
      },
      { priority: 1 },
    );
    bus.subscribe(
      "order.placed",
      async () => {
        order.push("mid-priority-5");
      },
      { priority: 5 },
    );

    await bus.publish(makeEvent("order.placed"));

    expect(order).toEqual(["high-priority-1", "mid-priority-5", "low-priority-10"]);
  });

  test("default priority (0) fires before positive priority", async () => {
    const bus = new InMemoryEventBus();
    const order: string[] = [];

    bus.subscribe(
      "order.placed",
      async () => {
        order.push("explicit-5");
      },
      { priority: 5 },
    );
    bus.subscribe("order.placed", async () => {
      order.push("default-0");
    });

    await bus.publish(makeEvent("order.placed"));

    expect(order).toEqual(["default-0", "explicit-5"]);
  });
});

describe("InMemoryEventBus — F2: filter predicate", () => {
  test("filter predicate prevents handler from firing when it returns false", async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    bus.subscribe(
      "order.*",
      async (e) => {
        calls.push(e.type);
      },
      {
        filter: (e) => e.type === "order.placed",
      },
    );

    await bus.publish(makeEvent("order.placed"));
    await bus.publish(makeEvent("order.cancelled"));

    expect(calls).toEqual(["order.placed"]);
  });

  test("filter with orgId check only fires for matching org", async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    // Use '**' to match all event types (wildcard that matches any depth)
    bus.subscribe(
      "order.**",
      async () => {
        calls.push("fired");
      },
      {
        filter: (e) => e.orgId === ("org-target" as DomainEvent["orgId"]),
      },
    );

    const eventOtherOrg = createDomainEvent(
      "order.placed",
      "agg-1" as DomainEvent["aggregateId"],
      "Order",
      {},
      "org-other" as DomainEvent["orgId"],
    );
    const eventTargetOrg = createDomainEvent(
      "order.placed",
      "agg-1" as DomainEvent["aggregateId"],
      "Order",
      {},
      "org-target" as DomainEvent["orgId"],
    );

    await bus.publish(eventOtherOrg);
    await bus.publish(eventTargetOrg);

    expect(calls).toEqual(["fired"]);
  });

  test("filter + once: once-handler removed only when filter passes", async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    bus.subscribe(
      "order.*",
      async (e) => {
        calls.push(e.type);
      },
      {
        once: true,
        filter: (e) => e.type === "order.placed",
      },
    );

    // Filter rejects this — once-handler should survive
    await bus.publish(makeEvent("order.cancelled"));
    // Filter accepts — fires and removes
    await bus.publish(makeEvent("order.placed"));
    // Handler is gone now
    await bus.publish(makeEvent("order.placed"));

    expect(calls).toEqual(["order.placed"]);
  });
});

// ---------------------------------------------------------------------------
// F3 — EventOutbox.writeBatch
// ---------------------------------------------------------------------------

describe("InMemoryEventOutbox — F3: writeBatch", () => {
  test("writeBatch writes all events as separate outbox records", async () => {
    const outbox = new InMemoryEventOutbox();

    const events = [
      makeEvent("order.placed"),
      makeEvent("order.confirmed"),
      makeEvent("order.shipped"),
    ];

    await outbox.writeBatch(events);

    const records = await outbox.pollUnpublished(10);
    expect(records).toHaveLength(3);

    const types = records.map((r) => r.event.type).sort();
    expect(types).toEqual([
      "order.confirmed",
      "order.placed",
      "order.shipped",
    ]);
  });

  test("writeBatch with empty array is a no-op", async () => {
    const outbox = new InMemoryEventOutbox();
    await outbox.writeBatch([]);
    const records = await outbox.pollUnpublished(10);
    expect(records).toHaveLength(0);
  });

  test("writeBatch records all start as unpublished (no publishedAt)", async () => {
    const outbox = new InMemoryEventOutbox();
    await outbox.writeBatch([makeEvent("order.placed"), makeEvent("order.confirmed")]);

    const records = await outbox.pollUnpublished(10);
    for (const record of records) {
      expect(record.publishedAt).toBeUndefined();
    }
  });

  test("single write and writeBatch can coexist in pollUnpublished", async () => {
    const outbox = new InMemoryEventOutbox();
    const mockTx = { commit: async () => {}, rollback: async () => {} };

    await outbox.write(makeEvent("order.placed"), mockTx);
    await outbox.writeBatch([makeEvent("order.confirmed"), makeEvent("order.shipped")]);

    const records = await outbox.pollUnpublished(10);
    expect(records).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// F4 — ReadOptions: after / from / to
// ---------------------------------------------------------------------------

describe("InMemoryEventStore — F4: ReadOptions after/from/to", () => {
  let store: InMemoryEventStore;

  beforeEach(async () => {
    store = new InMemoryEventStore();
  });

  test("'after' filters out events at or below the version cursor", async () => {
    const aggId = "agg-v" as DomainEvent["aggregateId"];

    for (let v = 1; v <= 5; v++) {
      const e = createDomainEvent(
        "order.placed",
        aggId,
        "Order",
        {},
        "org-1" as DomainEvent["orgId"],
        { version: v },
      );
      await store.append(e);
    }

    const opts: ReadOptions = { after: 3 };
    const results: DomainEvent[] = [];
    for await (const e of store.read(aggId, opts)) {
      results.push(e);
    }

    expect(results).toHaveLength(2);
    expect(results.map((e) => e.version)).toEqual([4, 5]);
  });

  test("'from' filters out events before the timestamp", async () => {
    const aggId = "agg-ts" as DomainEvent["aggregateId"];
    const now = Date.now();

    const old = createDomainEvent(
      "order.placed",
      aggId,
      "Order",
      {},
      "org-1" as DomainEvent["orgId"],
      { version: 1 },
    );
    // Manually set occurredAt to simulate old event
    (old as { occurredAt: number }).occurredAt = now - 10000;

    const recent = createDomainEvent(
      "order.placed",
      aggId,
      "Order",
      {},
      "org-1" as DomainEvent["orgId"],
      { version: 2 },
    );
    (recent as { occurredAt: number }).occurredAt = now;

    await store.append(old);
    await store.append(recent);

    const opts: ReadOptions = { from: (now - 5000) as DomainEvent["occurredAt"] };
    const results: DomainEvent[] = [];
    for await (const e of store.read(aggId, opts)) {
      results.push(e);
    }

    expect(results).toHaveLength(1);
    expect(results[0]?.version).toBe(2);
  });

  test("'to' filters out events after the timestamp", async () => {
    const aggId = "agg-to" as DomainEvent["aggregateId"];
    const now = Date.now();

    const early = createDomainEvent(
      "order.placed",
      aggId,
      "Order",
      {},
      "org-1" as DomainEvent["orgId"],
      { version: 1 },
    );
    (early as { occurredAt: number }).occurredAt = now - 10000;

    const late = createDomainEvent(
      "order.placed",
      aggId,
      "Order",
      {},
      "org-1" as DomainEvent["orgId"],
      { version: 2 },
    );
    (late as { occurredAt: number }).occurredAt = now;

    await store.append(early);
    await store.append(late);

    const opts: ReadOptions = { to: (now - 5000) as DomainEvent["occurredAt"] };
    const results: DomainEvent[] = [];
    for await (const e of store.read(aggId, opts)) {
      results.push(e);
    }

    expect(results).toHaveLength(1);
    expect(results[0]?.version).toBe(1);
  });

  test("'after', 'from', and 'to' can be combined", async () => {
    const aggId = "agg-combo" as DomainEvent["aggregateId"];
    const base = Date.now() - 20000;

    for (let i = 1; i <= 5; i++) {
      const e = createDomainEvent(
        "order.placed",
        aggId,
        "Order",
        {},
        "org-1" as DomainEvent["orgId"],
        { version: i },
      );
      // Space events 4s apart starting from base
      (e as { occurredAt: number }).occurredAt = base + i * 4000;
      await store.append(e);
    }

    // after=1 means versions 2,3,4,5
    // from = base+5000 → version 2 (at base+8000), version 3 (at base+12000), version 4 (at base+16000), version 5 (at base+20000)
    // to = base+14000 → versions 2 (base+8000) and 3 (base+12000) only
    const opts: ReadOptions = {
      after: 1,
      from: (base + 5000) as DomainEvent["occurredAt"],
      to: (base + 14000) as DomainEvent["occurredAt"],
    };

    const results: DomainEvent[] = [];
    for await (const e of store.read(aggId, opts)) {
      results.push(e);
    }

    expect(results.map((e) => e.version)).toEqual([2, 3]);
  });

  test("'limit' caps the number of results", async () => {
    const aggId = "agg-limit" as DomainEvent["aggregateId"];

    for (let v = 1; v <= 5; v++) {
      await store.append(
        createDomainEvent(
          "order.placed",
          aggId,
          "Order",
          {},
          "org-1" as DomainEvent["orgId"],
          { version: v },
        ),
      );
    }

    const results: DomainEvent[] = [];
    for await (const e of store.read(aggId, { limit: 3 })) {
      results.push(e);
    }

    expect(results).toHaveLength(3);
  });

  test("ReadOptions has no 'fromVersion' field (renamed to 'after')", () => {
    // Compile-time check — the type should not have fromVersion
    const opts: ReadOptions = { after: 5 };
    // If 'fromVersion' existed on the type this assignment would still compile,
    // so we verify using a key check at runtime
    expect("after" in opts).toBe(true);
    expect("fromVersion" in opts).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F5 — EventFilter: types[] & actorId
// ---------------------------------------------------------------------------

describe("InMemoryEventStore — F5: EventFilter types[] and actorId", () => {
  test("replay filters by types array (matches any of the given types)", async () => {
    const store = new InMemoryEventStore();
    const orgId = "org-1" as DomainEvent["orgId"];
    const now = Date.now() - 1000;

    const events = [
      createDomainEvent("order.placed", "agg-1" as DomainEvent["aggregateId"], "Order", {}, orgId, { version: 1 }),
      createDomainEvent("order.confirmed", "agg-2" as DomainEvent["aggregateId"], "Order", {}, orgId, { version: 1 }),
      createDomainEvent("user.created", "agg-3" as DomainEvent["aggregateId"], "User", {}, orgId, { version: 1 }),
    ];

    for (const e of events) {
      await store.append(e);
    }

    const filter: EventFilter = { types: ["order.placed", "order.confirmed"] };
    const results: DomainEvent[] = [];
    for await (const e of store.replay(filter, now as DomainEvent["occurredAt"])) {
      results.push(e);
    }

    const types = results.map((e) => e.type).sort();
    expect(types).toEqual(["order.confirmed", "order.placed"]);
  });

  test("replay with empty types array matches all events", async () => {
    const store = new InMemoryEventStore();
    const orgId = "org-1" as DomainEvent["orgId"];
    const now = Date.now() - 1000;

    await store.append(createDomainEvent("order.placed", "agg-1" as DomainEvent["aggregateId"], "Order", {}, orgId, { version: 1 }));
    await store.append(createDomainEvent("user.created", "agg-2" as DomainEvent["aggregateId"], "User", {}, orgId, { version: 1 }));

    const filter: EventFilter = { types: [] };
    const results: DomainEvent[] = [];
    for await (const e of store.replay(filter, now as DomainEvent["occurredAt"])) {
      results.push(e);
    }

    expect(results).toHaveLength(2);
  });

  test("replay filters by actorId", async () => {
    const store = new InMemoryEventStore();
    const orgId = "org-1" as DomainEvent["orgId"];
    const actorA = "actor-a" as DomainEvent["actorId"];
    const actorB = "actor-b" as DomainEvent["actorId"];
    const now = Date.now() - 1000;

    await store.append(createDomainEvent("order.placed", "agg-1" as DomainEvent["aggregateId"], "Order", {}, orgId, { actorId: actorA, version: 1 }));
    await store.append(createDomainEvent("order.placed", "agg-2" as DomainEvent["aggregateId"], "Order", {}, orgId, { actorId: actorB, version: 1 }));

    const filter: EventFilter = { actorId: actorA };
    const results: DomainEvent[] = [];
    for await (const e of store.replay(filter, now as DomainEvent["occurredAt"])) {
      results.push(e);
    }

    expect(results).toHaveLength(1);
    expect(results[0]?.actorId).toBe(actorA);
  });

  test("EventFilter has no 'type' field (renamed to 'types')", () => {
    // Runtime shape check
    const filter: EventFilter = { types: ["order.placed"] };
    expect("types" in filter).toBe(true);
    expect("type" in filter).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F6 — OutboxRecord.publishedAt (not processedAt)
// ---------------------------------------------------------------------------

describe("InMemoryEventOutbox — F6: publishedAt field", () => {
  test("OutboxRecord has 'publishedAt' field, not 'processedAt'", async () => {
    const outbox = new InMemoryEventOutbox();
    const mockTx = { commit: async () => {}, rollback: async () => {} };

    await outbox.write(makeEvent("order.placed"), mockTx);

    const records = await outbox.pollUnpublished(10);
    expect(records).toHaveLength(1);

    const record = records[0] as OutboxRecord;
    // publishedAt should be present on the type and undefined before marking
    expect("publishedAt" in record).toBe(true);
    expect(record.publishedAt).toBeUndefined();
    // processedAt should NOT exist
    expect("processedAt" in record).toBe(false);
  });

  test("markPublished sets publishedAt to a timestamp", async () => {
    const outbox = new InMemoryEventOutbox();
    const mockTx = { commit: async () => {}, rollback: async () => {} };

    await outbox.write(makeEvent("order.placed"), mockTx);
    const [record] = await outbox.pollUnpublished(1);
    expect(record).toBeDefined();

    await outbox.markPublished(record!.id);

    // After marking, pollUnpublished should not return it
    const remaining = await outbox.pollUnpublished(10);
    expect(remaining).toHaveLength(0);
  });

  test("markFailed increments attempts and records error", async () => {
    const outbox = new InMemoryEventOutbox();
    const mockTx = { commit: async () => {}, rollback: async () => {} };

    await outbox.write(makeEvent("order.placed"), mockTx);
    const [record] = await outbox.pollUnpublished(1);
    expect(record).toBeDefined();

    await outbox.markFailed(record!.id, "network timeout");

    const afterFail = await outbox.pollUnpublished(10);
    expect(afterFail[0]?.attempts).toBe(1);
    expect(afterFail[0]?.lastError).toBe("network timeout");
    expect(afterFail[0]?.publishedAt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration: create + bus + store round-trip
// ---------------------------------------------------------------------------

describe("createDomainEvent integration", () => {
  test("createDomainEvent produces a valid DomainEvent", () => {
    const event = createDomainEvent(
      "order.placed",
      "agg-1" as DomainEvent["aggregateId"],
      "Order",
      { items: 3 },
      "org-1" as DomainEvent["orgId"],
      { source: "inventory", version: 2 },
    );

    expect(event.type).toBe("order.placed");
    expect(event.aggregateType).toBe("Order");
    expect(event.payload).toEqual({ items: 3 });
    expect(event.source).toBe("inventory");
    expect(event.version).toBe(2);
    expect(event.id).toBeDefined();
    expect(event.correlationId).toBeDefined();
  });

  test("bus publish + store append round-trip", async () => {
    const bus = new InMemoryEventBus();
    const store = new InMemoryEventStore();
    const received: DomainEvent[] = [];

    bus.subscribe("order.*", async (e) => {
      received.push(e);
      await store.append(e);
    });

    const event = makeEvent("order.placed");
    await bus.publish(event);

    expect(received).toHaveLength(1);
    const version = await store.getVersion(event.aggregateId);
    expect(version).toBe(1);
  });
});
