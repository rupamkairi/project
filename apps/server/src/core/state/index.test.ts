/**
 * State Machine (FSM) Engine — unit tests
 *
 * Covers: FSMContext shape, TransitionResult shape, reachableStates BFS,
 * StateMachineRegistry, FSMEngine.resolve NotFoundError, Action discriminated union.
 */

import { describe, test, expect } from "bun:test";
import {
  createFSMEngine,
  createStateMachineRegistry,
  type Action,
  type FSMContext,
  type StateMachine,
  type TransitionResult,
} from "./index";
import { NotFoundError } from "../errors";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

type OrderState = "pending" | "confirmed" | "shipped" | "cancelled";
type OrderEvent = "pay" | "ship" | "cancel";

const orderMachine: StateMachine<OrderState, OrderEvent> = {
  id: "order",
  entityType: "Order",
  initial: "pending",
  states: {
    pending: {
      label: "Pending",
      color: "#F59E0B",
      on: {
        pay: { target: "confirmed", description: "Payment received" },
        cancel: { target: "cancelled" },
      },
    },
    confirmed: {
      label: "Confirmed",
      entry: [{ type: "emit", event: "order.confirmed" }],
      exit: [{ type: "log", message: "leaving confirmed" }],
      on: {
        ship: { target: "shipped" },
        cancel: { target: "cancelled" },
      },
    },
    shipped: { terminal: true },
    cancelled: { terminal: true },
  },
};

const makeCtx = (overrides?: Partial<FSMContext>): FSMContext => ({
  entity: { orderId: "o-1" },
  actor: { id: "u-1", roles: ["admin"], orgId: "org-1" },
  ...overrides,
});

// ---------------------------------------------------------------------------
// F1 — FSMContext shape
// ---------------------------------------------------------------------------

describe("FSMContext shape", () => {
  test("has entity, actor, and optional payload fields", () => {
    const ctx: FSMContext = {
      entity: { foo: "bar" },
      actor: { id: "u-1", roles: ["editor"], orgId: "org-1" },
      payload: { amount: 100 },
    };

    expect(ctx.entity).toEqual({ foo: "bar" });
    expect(ctx.actor.id).toBe("u-1");
    expect(ctx.actor.roles).toContain("editor");
    expect(ctx.actor.orgId).toBe("org-1");
    expect(ctx.payload).toEqual({ amount: 100 });
  });

  test("payload is optional", () => {
    const ctx: FSMContext = {
      entity: {},
      actor: { id: "u-2", roles: [], orgId: "org-2" },
    };
    expect(ctx.payload).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F2 — TransitionResult shape
// ---------------------------------------------------------------------------

describe("TransitionResult shape", () => {
  test("successful transition returns previousState, nextState, actionsExecuted, eventsEmitted", async () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    const result: TransitionResult = await engine.transition(
      "order",
      "pending",
      "pay",
      makeCtx(),
    );

    expect(result.previousState).toBe("pending");
    expect(result.nextState).toBe("confirmed");
    expect(Array.isArray(result.actionsExecuted)).toBe(true);
    expect(Array.isArray(result.eventsEmitted)).toBe(true);
  });

  test("actionsExecuted includes entry actions of target state", async () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    const result = await engine.transition("order", "pending", "pay", makeCtx());

    // confirmed.entry has { type: "emit", event: "order.confirmed" }
    const emitAction = result.actionsExecuted.find((a) => a.type === "emit");
    expect(emitAction).toBeDefined();
    expect((emitAction as Extract<Action, { type: "emit" }>).event).toBe("order.confirmed");
  });

  test("actionsExecuted includes exit actions of source state", async () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    // confirmed -> shipped; confirmed.exit = [log]
    const result = await engine.transition("order", "confirmed", "ship", makeCtx());

    const logAction = result.actionsExecuted.find((a) => a.type === "log");
    expect(logAction).toBeDefined();
    expect((logAction as Extract<Action, { type: "log" }>).message).toBe("leaving confirmed");
  });

  test("eventsEmitted is an empty array by default", async () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    const result = await engine.transition("order", "pending", "cancel", makeCtx());

    expect(result.eventsEmitted).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// F3 — reachableStates BFS
// ---------------------------------------------------------------------------

describe("FSMEngine.reachableStates", () => {
  test("returns all states reachable from pending via BFS", () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    const reachable = engine.reachableStates("order", "pending");

    // From pending: pay -> confirmed -> shipped; cancel -> cancelled
    expect(reachable).toContain("confirmed");
    expect(reachable).toContain("shipped");
    expect(reachable).toContain("cancelled");
    // Does not include the starting state itself
    expect(reachable).not.toContain("pending");
  });

  test("returns empty array for terminal state", () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    expect(engine.reachableStates("order", "shipped")).toEqual([]);
    expect(engine.reachableStates("order", "cancelled")).toEqual([]);
  });

  test("returns empty array for unknown machine", () => {
    const engine = createFSMEngine();
    expect(engine.reachableStates("no-such-machine", "pending")).toEqual([]);
  });

  test("does not revisit states (no infinite loops)", () => {
    // Build a cycle: a -> b -> a
    type CycleState = "a" | "b";
    type CycleEvent = "go";
    const cycleMachine: StateMachine<CycleState, CycleEvent> = {
      id: "cycle",
      entityType: "Cycle",
      initial: "a",
      states: {
        a: { on: { go: { target: "b" } } },
        b: { on: { go: { target: "a" } } },
      },
    };

    const engine = createFSMEngine();
    engine.register(cycleMachine);

    const reachable = engine.reachableStates("cycle", "a");
    expect(reachable).toEqual(["b"]);
  });
});

// ---------------------------------------------------------------------------
// F4 — StateMachineRegistry
// ---------------------------------------------------------------------------

describe("StateMachineRegistry", () => {
  test("register and resolve a machine", () => {
    const registry = createStateMachineRegistry();
    registry.register(orderMachine);

    const resolved = registry.resolve("order");
    expect(resolved).toBe(orderMachine);
  });

  test("resolve returns undefined for unknown id", () => {
    const registry = createStateMachineRegistry();
    expect(registry.resolve("ghost")).toBeUndefined();
  });

  test("list returns all registered machines", () => {
    const registry = createStateMachineRegistry();
    const machine2: StateMachine<"a", "go"> = {
      id: "other",
      entityType: "Other",
      initial: "a",
      states: { a: {} },
    };

    registry.register(orderMachine);
    registry.register(machine2);

    const all = registry.list();
    expect(all).toHaveLength(2);
    expect(all).toContain(orderMachine);
    expect(all).toContain(machine2);
  });

  test("list returns empty array when nothing registered", () => {
    const registry = createStateMachineRegistry();
    expect(registry.list()).toEqual([]);
  });

  test("registering the same id overwrites previous", () => {
    const registry = createStateMachineRegistry();
    registry.register(orderMachine);

    const updated = { ...orderMachine, entityType: "NewOrder" };
    registry.register(updated);

    expect(registry.list()).toHaveLength(1);
    expect(registry.resolve("order")?.entityType).toBe("NewOrder");
  });
});

// ---------------------------------------------------------------------------
// F5 — FSMEngine.resolve throws NotFoundError
// ---------------------------------------------------------------------------

describe("FSMEngine.resolve", () => {
  test("returns registered machine", () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    const m = engine.resolve("order");
    expect(m).toBe(orderMachine);
  });

  test("throws NotFoundError for unknown machine id", () => {
    const engine = createFSMEngine();

    expect(() => engine.resolve("ghost")).toThrow(NotFoundError);
  });

  test("thrown NotFoundError has correct code", () => {
    const engine = createFSMEngine();

    try {
      engine.resolve("ghost");
      // should not reach here
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).code).toBe("NOT_FOUND");
    }
  });
});

// ---------------------------------------------------------------------------
// F6 — Action discriminated union narrowing
// ---------------------------------------------------------------------------

describe("Action discriminated union", () => {
  test("emit action has event and optional payload", () => {
    const a: Action = { type: "emit", event: "order.shipped", payload: { id: "1" } };
    if (a.type === "emit") {
      expect(a.event).toBe("order.shipped");
      expect(a.payload).toEqual({ id: "1" });
    }
  });

  test("dispatch action has command and optional payload", () => {
    const a: Action = { type: "dispatch", command: "SendEmail", payload: { to: "x@x.com" } };
    if (a.type === "dispatch") {
      expect(a.command).toBe("SendEmail");
    }
  });

  test("assign action has field and value", () => {
    const a: Action = { type: "assign", field: "status", value: "active" };
    if (a.type === "assign") {
      expect(a.field).toBe("status");
      expect(a.value).toBe("active");
    }
  });

  test("assign action value can be a function", () => {
    const a: Action = { type: "assign", field: "count", value: (ctx: FSMContext) => ctx.entity["count"] };
    if (a.type === "assign") {
      expect(typeof a.value).toBe("function");
    }
  });

  test("log action has message", () => {
    const a: Action = { type: "log", message: "hello" };
    if (a.type === "log") {
      expect(a.message).toBe("hello");
    }
  });

  test("all 4 action types are valid", () => {
    const actions: Action[] = [
      { type: "emit", event: "e" },
      { type: "dispatch", command: "c" },
      { type: "assign", field: "f", value: 1 },
      { type: "log", message: "m" },
    ];
    expect(actions).toHaveLength(4);
    expect(actions.map((a) => a.type)).toEqual(["emit", "dispatch", "assign", "log"]);
  });
});

// ---------------------------------------------------------------------------
// Integration — can + validEvents
// ---------------------------------------------------------------------------

describe("FSMEngine integration", () => {
  test("can returns true for valid event", () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    expect(engine.can("order", "pending", "pay", makeCtx())).toBe(true);
  });

  test("can returns false for invalid event", () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    expect(engine.can("order", "shipped", "pay", makeCtx())).toBe(false);
  });

  test("validEvents returns all guarded-passing events", () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    const events = engine.validEvents("order", "pending", makeCtx());
    expect(events).toContain("pay");
    expect(events).toContain("cancel");
    expect(events).not.toContain("ship");
  });

  test("transition throws for unregistered machine", async () => {
    const engine = createFSMEngine();

    await expect(
      engine.transition("ghost", "pending", "pay", makeCtx()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("transition throws for invalid event in state", async () => {
    const engine = createFSMEngine();
    engine.register(orderMachine);

    await expect(
      engine.transition("order", "shipped", "pay", makeCtx()),
    ).rejects.toThrow();
  });
});
