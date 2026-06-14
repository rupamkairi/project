/**
 * SystemContext tests
 *
 * Tests for createSystemContext behavior per core.md §11.
 */

import { describe, it, expect } from "bun:test";
import { createSystemContext } from "./index";
import type { SystemContext, SystemContextOptions } from "./index";
import type { Command, Query } from "../cqrs";
import type { DomainEvent } from "../event";
import { generateId } from "../entity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMediatorSpy() {
  const dispatched: Command[] = [];
  const queried: Query[] = [];
  return {
    dispatched,
    queried,
    dispatch: async <R = unknown>(cmd: Command): Promise<R> => {
      dispatched.push(cmd);
      return { ok: true } as R;
    },
    query: async <R = unknown>(q: Query): Promise<R> => {
      queried.push(q);
      return { rows: [] } as R;
    },
  };
}

function makeEventBusSpy() {
  const published: DomainEvent[] = [];
  return {
    published,
    publish: async (event: DomainEvent) => {
      published.push(event);
    },
  };
}

// ---------------------------------------------------------------------------
// actor.type = "api-key" (HYPHEN, not underscore)
// ---------------------------------------------------------------------------

describe("createSystemContext — actor.type", () => {
  it('accepts "api-key" (hyphen) as actor type', () => {
    const ctx = createSystemContext({ actorType: "api-key" });
    expect(ctx.actor.type).toBe("api-key");
  });

  it('defaults actor.type to "system"', () => {
    const ctx = createSystemContext({});
    expect(ctx.actor.type).toBe("system");
  });

  it('accepts "human" as actor type', () => {
    const ctx = createSystemContext({ actorType: "human" });
    expect(ctx.actor.type).toBe("human");
  });
});

// ---------------------------------------------------------------------------
// dispatch fills actorId / orgId / correlationId automatically
// ---------------------------------------------------------------------------

describe("createSystemContext — dispatch", () => {
  it("fills actorId, orgId, correlationId on the dispatched command", async () => {
    const mediator = makeMediatorSpy();
    const ctx = createSystemContext({
      actorId: "actor-1",
      orgId: "org-1",
      correlationId: "corr-1",
      mediator,
    });

    await ctx.dispatch({ type: "foo.cmd", payload: {} });

    const cmd = mediator.dispatched[0];
    expect(cmd).toBeDefined();
    expect(cmd!.actorId).toBe("actor-1");
    expect(cmd!.orgId).toBe("org-1");
    expect(cmd!.correlationId).toBe("corr-1");
  });

  it("throws when mediator is not configured", async () => {
    const ctx = createSystemContext({});
    await expect(
      ctx.dispatch({ type: "foo.cmd", payload: {} }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// query fills actorId / orgId automatically
// ---------------------------------------------------------------------------

describe("createSystemContext — query", () => {
  it("fills actorId and orgId on the query", async () => {
    const mediator = makeMediatorSpy();
    const ctx = createSystemContext({
      actorId: "actor-2",
      orgId: "org-2",
      mediator,
    });

    await ctx.query({ type: "foo.query", params: {} });

    const q = mediator.queried[0];
    expect(q).toBeDefined();
    expect(q!.actorId).toBe("actor-2");
    expect(q!.orgId).toBe("org-2");
  });
});

// ---------------------------------------------------------------------------
// publish fills actorId / orgId / correlationId automatically
// ---------------------------------------------------------------------------

describe("createSystemContext — publish", () => {
  it("fills actorId, orgId, correlationId on the published event", async () => {
    const eventBus = makeEventBusSpy();
    const ctx = createSystemContext({
      actorId: "actor-3",
      orgId: "org-3",
      correlationId: "corr-3",
      eventBus,
    });

    await ctx.publish({
      id: generateId(),
      type: "foo.happened",
      payload: {},
      aggregateId: "agg-1",
      aggregateType: "Foo",
      version: 1,
      occurredAt: Date.now(),
      source: "test",
    } satisfies Omit<DomainEvent, "actorId" | "orgId" | "correlationId">);

    const ev = eventBus.published[0];
    expect(ev).toBeDefined();
    expect(ev!.actorId).toBe("actor-3");
    expect(ev!.orgId).toBe("org-3");
    expect(ev!.correlationId).toBe("corr-3");
  });
});

// ---------------------------------------------------------------------------
// publishBatch
// ---------------------------------------------------------------------------

describe("createSystemContext — publishBatch", () => {
  it("publishes all events via eventBus", async () => {
    const eventBus = makeEventBusSpy();
    const ctx = createSystemContext({
      actorId: "actor-4",
      orgId: "org-4",
      correlationId: "corr-4",
      eventBus,
    });

    const base = {
      id: generateId(),
      actorId: "actor-4",
      orgId: "org-4",
      correlationId: "corr-4",
      aggregateId: "agg-1",
      aggregateType: "Foo",
      version: 1,
      occurredAt: Date.now(),
      source: "test",
    } satisfies Omit<DomainEvent, "type" | "payload">;

    const events: DomainEvent[] = [
      { ...base, type: "foo.a", payload: {} },
      { ...base, type: "foo.b", payload: {} },
    ];

    await ctx.publishBatch(events);

    expect(eventBus.published).toHaveLength(2);
    expect(eventBus.published[0]!.type).toBe("foo.a");
    expect(eventBus.published[1]!.type).toBe("foo.b");
  });
});

// ---------------------------------------------------------------------------
// Accessing unconfigured services THROWS (not returns {})
// ---------------------------------------------------------------------------

describe("createSystemContext — unconfigured services throw", () => {
  it("ctx.rules throws when rules not configured", () => {
    const ctx = createSystemContext({});
    expect(() => ctx.rules).toThrow(/SystemContext.rules/);
  });

  it("ctx.fsm throws when fsm not configured", () => {
    const ctx = createSystemContext({});
    expect(() => ctx.fsm).toThrow(/SystemContext.fsm/);
  });

  it("ctx.queue throws when queue not configured", () => {
    const ctx = createSystemContext({});
    expect(() => ctx.queue).toThrow(/SystemContext.queue/);
  });

  it("ctx.scheduler throws when scheduler not configured", () => {
    const ctx = createSystemContext({});
    expect(() => ctx.scheduler).toThrow(/SystemContext.scheduler/);
  });

  it("ctx.realtime throws when realtime not configured", () => {
    const ctx = createSystemContext({});
    expect(() => ctx.realtime).toThrow(/SystemContext.realtime/);
  });

  it("ctx.adapters throws when adapters not configured", () => {
    const ctx = createSystemContext({});
    expect(() => ctx.adapters).toThrow(/SystemContext.adapters/);
  });

  it("ctx.repo() throws when repoFactory not configured", () => {
    const ctx = createSystemContext({});
    expect(() => ctx.repo("User")).toThrow(/SystemContext.repo/);
  });
});

// ---------------------------------------------------------------------------
// Optional metadata fields
// ---------------------------------------------------------------------------

describe("createSystemContext — optional metadata", () => {
  it("exposes ip and userAgent when provided", () => {
    const ctx = createSystemContext({ ip: "1.2.3.4", userAgent: "TestBot/1" });
    expect(ctx.ip).toBe("1.2.3.4");
    expect(ctx.userAgent).toBe("TestBot/1");
  });

  it("ip and userAgent are undefined when not provided", () => {
    const ctx = createSystemContext({});
    expect(ctx.ip).toBeUndefined();
    expect(ctx.userAgent).toBeUndefined();
  });
});
