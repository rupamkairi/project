/**
 * CQRS Mediator tests
 *
 * Tests for createMediator with contextFactory per core.md §11 (C3 fix),
 * and built-in middleware factories (C8).
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  createMediator,
  AuthorizationMiddleware,
  ValidationMiddleware,
  IdempotencyMiddleware,
  LoggingMiddleware,
  TracingMiddleware,
  RateLimitMiddleware,
  tracingStore,
} from "./index";
import type { SystemContext, Logger } from "../context";
import type { Command, Query } from "./index";
import { AuthorizationError, ValidationError } from "../errors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinimalContext(actorId: string): SystemContext {
  return {
    actor: { id: actorId, roles: [], orgId: "org-test", type: "system" },
    org: { id: "org-test", slug: "test", settings: {} },
    correlationId: "corr-test",
    requestId: "req-test",
    startedAt: Date.now(),
    dispatch: async () => ({ ok: true }) as unknown,
    query: async () => ({ rows: [] }) as unknown,
    publish: async () => {},
    publishBatch: async () => {},
    get rules(): never {
      throw new Error("SystemContext.rules: not configured");
    },
    get fsm(): never {
      throw new Error("SystemContext.fsm: not configured");
    },
    get queue(): never {
      throw new Error("SystemContext.queue: not configured");
    },
    get scheduler(): never {
      throw new Error("SystemContext.scheduler: not configured");
    },
    get realtime(): never {
      throw new Error("SystemContext.realtime: not configured");
    },
    get adapters(): never {
      throw new Error("SystemContext.adapters: not configured");
    },
    repo: () => {
      throw new Error("SystemContext.repo: not configured");
    },
    logger: console as unknown as SystemContext["logger"],
    ip: undefined,
    userAgent: undefined,
  } as unknown as SystemContext;
}

/** Build a mediator with a contextFactory wired up. */
function makeMediatorWithCtx(actorId = "actor-test") {
  return createMediator({
    contextFactory: (req) =>
      makeMinimalContext((req as Command).actorId ?? actorId),
  });
}

function makeCmd(overrides?: Partial<Command>): Command {
  return {
    type: "test.cmd",
    payload: {},
    actorId: "actor-abc",
    orgId: "org-1",
    correlationId: "corr-1",
    ...overrides,
  };
}

function makeQuery(overrides?: Partial<Query>): Query {
  return {
    type: "test.query",
    params: {},
    actorId: "actor-abc",
    orgId: "org-1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createMediator — contextFactory
// ---------------------------------------------------------------------------

describe("createMediator — contextFactory", () => {
  it("passes the factory-built context to the command handler", async () => {
    let receivedCtx: SystemContext | undefined;

    const mediator = createMediator({
      contextFactory: (req) =>
        makeMinimalContext((req as Command).actorId ?? "unknown"),
    });

    mediator.registerCommand("test.cmd", async (cmd, ctx) => {
      receivedCtx = ctx;
      return { done: true };
    });

    await mediator.dispatch(makeCmd({ actorId: "actor-abc" }));

    expect(receivedCtx).toBeDefined();
    // The factory used the command's actorId — not an empty object
    expect(receivedCtx!.actor.id).toBe("actor-abc");
  });

  it("passes the factory-built context to the query handler", async () => {
    let receivedCtx: SystemContext | undefined;

    const mediator = createMediator({
      contextFactory: (req) => makeMinimalContext((req as Query).actorId),
    });

    mediator.registerQuery("test.query", async (q, ctx) => {
      receivedCtx = ctx;
      return { rows: [] };
    });

    await mediator.query(makeQuery({ actorId: "actor-xyz" }));

    expect(receivedCtx).toBeDefined();
    expect(receivedCtx!.actor.id).toBe("actor-xyz");
  });

  it("passes context through middleware pipeline", async () => {
    let middlewareCtx: SystemContext | undefined;

    const mediator = createMediator({
      contextFactory: (req) =>
        makeMinimalContext((req as Command).actorId ?? "mw-actor"),
    });

    mediator.use(async (req, ctx, next) => {
      middlewareCtx = ctx;
      return next();
    });

    mediator.registerCommand("mw.cmd", async () => ({ ok: true }));

    await mediator.dispatch(makeCmd({ type: "mw.cmd", actorId: "mw-actor" }));

    expect(middlewareCtx).toBeDefined();
    expect(middlewareCtx!.actor.id).toBe("mw-actor");
  });
});

// ---------------------------------------------------------------------------
// createMediator — no contextFactory
// ---------------------------------------------------------------------------

describe("createMediator — no contextFactory", () => {
  it("dispatch throws a clear error when contextFactory is not configured", async () => {
    const mediator = createMediator();

    mediator.registerCommand("no-ctx.cmd", async () => ({ ok: true }));

    await expect(
      mediator.dispatch(makeCmd({ type: "no-ctx.cmd" })),
    ).rejects.toThrow("Mediator: contextFactory not configured");
  });

  it("query throws a clear error when contextFactory is not configured", async () => {
    const mediator = createMediator();

    mediator.registerQuery("no-ctx.query", async () => ({ rows: [] }));

    await expect(
      mediator.query(makeQuery({ type: "no-ctx.query" })),
    ).rejects.toThrow("Mediator: contextFactory not configured");
  });
});

// ---------------------------------------------------------------------------
// AuthorizationMiddleware
// ---------------------------------------------------------------------------

describe("AuthorizationMiddleware", () => {
  it("allows the request when check returns true", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(AuthorizationMiddleware(() => true));
    mediator.registerCommand("auth.cmd", async () => ({ ok: true }));

    const result = await mediator.dispatch(makeCmd({ type: "auth.cmd" }));
    expect(result).toEqual({ ok: true });
  });

  it("throws AuthorizationError when check returns false", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(AuthorizationMiddleware(() => false));
    mediator.registerCommand("auth.cmd", async () => ({ ok: true }));

    await expect(
      mediator.dispatch(makeCmd({ type: "auth.cmd" })),
    ).rejects.toThrow(AuthorizationError);
  });

  it("throws AuthorizationError when async check resolves false", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(AuthorizationMiddleware(async () => false));
    mediator.registerCommand("auth.cmd", async () => ({ ok: true }));

    await expect(
      mediator.dispatch(makeCmd({ type: "auth.cmd" })),
    ).rejects.toThrow(AuthorizationError);
  });

  it("does NOT call the handler when authorization fails", async () => {
    let handlerCalled = false;
    const mediator = makeMediatorWithCtx();
    mediator.use(AuthorizationMiddleware(() => false));
    mediator.registerCommand("auth.cmd", async () => {
      handlerCalled = true;
      return {};
    });

    await expect(
      mediator.dispatch(makeCmd({ type: "auth.cmd" })),
    ).rejects.toThrow(AuthorizationError);

    expect(handlerCalled).toBe(false);
  });

  it("provides ctx to the check function", async () => {
    let capturedCtx: SystemContext | undefined;
    const mediator = makeMediatorWithCtx("actor-check");
    mediator.use(
      AuthorizationMiddleware((_req, ctx) => {
        capturedCtx = ctx;
        return true;
      }),
    );
    mediator.registerCommand("auth.cmd", async () => ({}));
    await mediator.dispatch(makeCmd({ type: "auth.cmd", actorId: "actor-check" }));

    expect(capturedCtx?.actor.id).toBe("actor-check");
  });
});

// ---------------------------------------------------------------------------
// ValidationMiddleware
// ---------------------------------------------------------------------------

describe("ValidationMiddleware", () => {
  it("allows the request when validator returns no failures", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(ValidationMiddleware(() => []));
    mediator.registerCommand("val.cmd", async () => ({ ok: true }));

    const result = await mediator.dispatch(makeCmd({ type: "val.cmd" }));
    expect(result).toEqual({ ok: true });
  });

  it("throws ValidationError when validator returns failures", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(
      ValidationMiddleware(() => [
        { field: "email", message: "Required" },
      ]),
    );
    mediator.registerCommand("val.cmd", async () => ({ ok: true }));

    await expect(
      mediator.dispatch(makeCmd({ type: "val.cmd" })),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError with the correct failures attached", async () => {
    const failures = [
      { field: "name", message: "Too short" },
      { field: "age", message: "Must be >= 18" },
    ];
    const mediator = makeMediatorWithCtx();
    mediator.use(ValidationMiddleware(() => failures));
    mediator.registerCommand("val.cmd", async () => ({}));

    let caught: ValidationError | undefined;
    try {
      await mediator.dispatch(makeCmd({ type: "val.cmd" }));
    } catch (err) {
      caught = err as ValidationError;
    }

    expect(caught).toBeInstanceOf(ValidationError);
    expect(caught!.failures).toEqual(failures);
  });

  it("supports async validators", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(
      ValidationMiddleware(async () => [{ field: "x", message: "bad" }]),
    );
    mediator.registerCommand("val.cmd", async () => ({}));

    await expect(
      mediator.dispatch(makeCmd({ type: "val.cmd" })),
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// IdempotencyMiddleware
// ---------------------------------------------------------------------------

describe("IdempotencyMiddleware", () => {
  it("executes the handler on first dispatch", async () => {
    let callCount = 0;
    const mediator = makeMediatorWithCtx();
    mediator.use(IdempotencyMiddleware());
    mediator.registerCommand("idem.cmd", async () => {
      callCount++;
      return { callCount };
    });

    const result = await mediator.dispatch(
      makeCmd({ type: "idem.cmd", idempotencyKey: "key-1" }),
    );

    expect(callCount).toBe(1);
    expect((result as { callCount: number }).callCount).toBe(1);
  });

  it("returns cached result on duplicate dispatch without re-executing", async () => {
    let callCount = 0;
    const mediator = makeMediatorWithCtx();
    mediator.use(IdempotencyMiddleware());
    mediator.registerCommand("idem.cmd", async () => {
      callCount++;
      return { callCount };
    });

    const cmd = makeCmd({ type: "idem.cmd", idempotencyKey: "key-deduplicate" });
    await mediator.dispatch(cmd);
    await mediator.dispatch(cmd);
    await mediator.dispatch(cmd);

    expect(callCount).toBe(1);
  });

  it("treats different idempotency keys as different requests", async () => {
    let callCount = 0;
    const mediator = makeMediatorWithCtx();
    mediator.use(IdempotencyMiddleware());
    mediator.registerCommand("idem.cmd", async () => {
      callCount++;
      return { callCount };
    });

    await mediator.dispatch(makeCmd({ type: "idem.cmd", idempotencyKey: "key-A" }));
    await mediator.dispatch(makeCmd({ type: "idem.cmd", idempotencyKey: "key-B" }));

    expect(callCount).toBe(2);
  });

  it("does not deduplicate commands without an idempotency key", async () => {
    let callCount = 0;
    const mediator = makeMediatorWithCtx();
    mediator.use(IdempotencyMiddleware());
    mediator.registerCommand("idem.cmd", async () => {
      callCount++;
      return {};
    });

    // No idempotencyKey set
    await mediator.dispatch(makeCmd({ type: "idem.cmd" }));
    await mediator.dispatch(makeCmd({ type: "idem.cmd" }));

    expect(callCount).toBe(2);
  });

  it("re-executes after TTL expires", async () => {
    let callCount = 0;
    const mediator = createMediator({
      contextFactory: () => makeMinimalContext("actor"),
    });
    mediator.use(IdempotencyMiddleware({ ttl: 1 }));
    mediator.registerCommand("idem.cmd", async () => {
      callCount++;
      return {};
    });

    const cmd = makeCmd({ type: "idem.cmd", idempotencyKey: "ttl-key" });
    await mediator.dispatch(cmd);
    // Wait for TTL to lapse
    await new Promise((r) => setTimeout(r, 10));
    await mediator.dispatch(cmd);

    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// LoggingMiddleware
// ---------------------------------------------------------------------------

describe("LoggingMiddleware", () => {
  it("calls logger.info on success", async () => {
    const calls: Array<{ msg: string; meta?: Record<string, unknown> }> = [];
    const mockLogger: Logger = {
      fatal: () => {},
      error: () => {},
      warn: () => {},
      info: (msg, meta) => calls.push({ msg, meta }),
      debug: () => {},
      trace: () => {},
      child: () => mockLogger,
    };

    const mediator = makeMediatorWithCtx();
    mediator.use(LoggingMiddleware(mockLogger));
    mediator.registerCommand("log.cmd", async () => ({ ok: true }));

    await mediator.dispatch(makeCmd({ type: "log.cmd" }));

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]!.msg).toContain("log.cmd");
    expect(calls[0]!.meta?.type).toBe("log.cmd");
    expect(typeof calls[0]!.meta?.durationMs).toBe("number");
  });

  it("calls logger.error and rethrows on handler failure", async () => {
    const errorCalls: string[] = [];
    const mockLogger: Logger = {
      fatal: () => {},
      error: (msg) => errorCalls.push(msg),
      warn: () => {},
      info: () => {},
      debug: () => {},
      trace: () => {},
      child: () => mockLogger,
    };

    const mediator = makeMediatorWithCtx();
    mediator.use(LoggingMiddleware(mockLogger));
    mediator.registerCommand("log.fail", async () => {
      throw new Error("handler error");
    });

    await expect(
      mediator.dispatch(makeCmd({ type: "log.fail" })),
    ).rejects.toThrow("handler error");

    expect(errorCalls.length).toBeGreaterThan(0);
    expect(errorCalls[0]).toContain("log.fail");
  });
});

// ---------------------------------------------------------------------------
// TracingMiddleware
// ---------------------------------------------------------------------------

describe("TracingMiddleware", () => {
  beforeEach(() => {
    // Clear the shared store between tests
    tracingStore.splice(0, tracingStore.length);
  });

  it("records a span for each request", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(TracingMiddleware({ serviceName: "test-service" }));
    mediator.registerCommand("trace.cmd", async () => ({}));

    await mediator.dispatch(makeCmd({ type: "trace.cmd" }));

    expect(tracingStore.length).toBe(1);
    expect(tracingStore[0]!.type).toBe("trace.cmd");
    expect(tracingStore[0]!.serviceName).toBe("test-service");
  });

  it("attaches correlationId to the span", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(TracingMiddleware());
    mediator.registerCommand("trace.cmd", async () => ({}));

    await mediator.dispatch(
      makeCmd({ type: "trace.cmd", correlationId: "corr-xyz" }),
    );

    expect(tracingStore[0]!.correlationId).toBe("corr-xyz");
  });

  it("records endedAt after the request completes", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(TracingMiddleware());
    mediator.registerCommand("trace.cmd", async () => ({}));

    await mediator.dispatch(makeCmd({ type: "trace.cmd" }));

    expect(tracingStore[0]!.endedAt).toBeDefined();
    expect(tracingStore[0]!.endedAt).toBeGreaterThanOrEqual(
      tracingStore[0]!.startedAt,
    );
  });

  it("records endedAt even when handler throws", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(TracingMiddleware());
    mediator.registerCommand("trace.fail", async () => {
      throw new Error("boom");
    });

    await expect(
      mediator.dispatch(makeCmd({ type: "trace.fail" })),
    ).rejects.toThrow("boom");

    expect(tracingStore[0]!.endedAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// RateLimitMiddleware
// ---------------------------------------------------------------------------

describe("RateLimitMiddleware", () => {
  it("allows requests within the limit", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(RateLimitMiddleware({ limit: 3, windowMs: 60_000 }));
    mediator.registerCommand("rl.cmd", async () => ({ ok: true }));

    for (let i = 0; i < 3; i++) {
      const result = await mediator.dispatch(makeCmd({ type: "rl.cmd" }));
      expect(result).toEqual({ ok: true });
    }
  });

  it("throws AuthorizationError after limit is exceeded within window", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(RateLimitMiddleware({ limit: 2, windowMs: 60_000 }));
    mediator.registerCommand("rl.cmd", async () => ({ ok: true }));

    // Two succeed
    await mediator.dispatch(makeCmd({ type: "rl.cmd" }));
    await mediator.dispatch(makeCmd({ type: "rl.cmd" }));

    // Third fails
    await expect(
      mediator.dispatch(makeCmd({ type: "rl.cmd" })),
    ).rejects.toThrow(AuthorizationError);
  });

  it("resets the window after windowMs elapses", async () => {
    const mediator = makeMediatorWithCtx();
    mediator.use(RateLimitMiddleware({ limit: 1, windowMs: 20 })); // 20 ms window
    mediator.registerCommand("rl.cmd", async () => ({ ok: true }));

    // First succeeds
    await mediator.dispatch(makeCmd({ type: "rl.cmd" }));

    // Second fails (same window)
    await expect(
      mediator.dispatch(makeCmd({ type: "rl.cmd" })),
    ).rejects.toThrow(AuthorizationError);

    // Wait for window to reset
    await new Promise((r) => setTimeout(r, 30));

    // Now it succeeds again
    const result = await mediator.dispatch(makeCmd({ type: "rl.cmd" }));
    expect(result).toEqual({ ok: true });
  });

  it("enforces limits per actor independently", async () => {
    const mediator = createMediator({
      contextFactory: (req) => makeMinimalContext((req as Command).actorId),
    });
    mediator.use(RateLimitMiddleware({ limit: 1, windowMs: 60_000 }));
    mediator.registerCommand("rl.cmd", async () => ({ ok: true }));

    // Actor A exhausts their limit
    await mediator.dispatch(makeCmd({ type: "rl.cmd", actorId: "actor-A" }));
    await expect(
      mediator.dispatch(makeCmd({ type: "rl.cmd", actorId: "actor-A" })),
    ).rejects.toThrow(AuthorizationError);

    // Actor B is unaffected
    const result = await mediator.dispatch(
      makeCmd({ type: "rl.cmd", actorId: "actor-B" }),
    );
    expect(result).toEqual({ ok: true });
  });
});
