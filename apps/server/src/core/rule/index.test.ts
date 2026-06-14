/**
 * Rule Engine tests
 *
 * Tests for createRuleEngine per core.md §5 "Rule Engine" (C7 fixes).
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  createRuleEngine,
  type RuleEngine,
  type RuleExpr,
  type Op,
  type RuleExplanation,
  type CompiledRule,
} from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let engine: RuleEngine;

beforeEach(() => {
  engine = createRuleEngine();
});

// ---------------------------------------------------------------------------
// F1 — TemplateRule variant in RuleExpr
// ---------------------------------------------------------------------------

describe("TemplateRule", () => {
  it("is a valid RuleExpr with kind, template, and params", () => {
    const expr: RuleExpr = {
      kind: "template",
      template: "hasMinAge",
      params: { minAge: 18 },
    };
    // Type-check: just constructing without TS error is the assertion
    expect(expr).toBeDefined();
  });

  it("evaluates a template rule by merging params into context", () => {
    // Register a rule that checks a flat 'score' field against a threshold
    engine.register("scoreCheck", {
      field: "score",
      op: "gte",
      value: 10,
    });

    // Template provides 'score' via params, context is empty
    const templateExpr: RuleExpr = {
      kind: "template",
      template: "scoreCheck",
      params: { score: 50 },
    };

    // params { score: 50 } merged into context {}, so score=50 >= 10 => true
    const result = engine.evaluate(templateExpr, {});
    expect(result).toBe(true);
  });

  it("template params can override context values", () => {
    engine.register("flagCheck", {
      field: "enabled",
      op: "eq",
      value: true,
    });

    // Context says enabled=false, params override to enabled=true
    const templateExpr: RuleExpr = {
      kind: "template",
      template: "flagCheck",
      params: { enabled: true },
    };

    expect(engine.evaluate(templateExpr, { enabled: false })).toBe(true);
  });

  it("returns false when the referenced template is not registered", () => {
    const expr: RuleExpr = {
      kind: "template",
      template: "nonexistent",
      params: {},
    };
    expect(engine.evaluate(expr, {})).toBe(false);
  });

  it("explain includes a failure when template is not registered", () => {
    const expr: RuleExpr = {
      kind: "template",
      template: "ghost",
      params: {},
    };
    const result = engine.explain(expr, {});
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0].field).toBe("ghost");
  });
});

// ---------------------------------------------------------------------------
// F2 — containsAll operator
// ---------------------------------------------------------------------------

describe("Op: containsAll", () => {
  it("returns true when array contains all expected values", () => {
    const expr: RuleExpr = {
      field: "tags",
      op: "containsAll",
      value: ["a", "b"],
    };
    expect(engine.evaluate(expr, { tags: ["a", "b", "c"] })).toBe(true);
  });

  it("returns true when array exactly matches expected values", () => {
    const expr: RuleExpr = {
      field: "tags",
      op: "containsAll",
      value: ["x", "y"],
    };
    expect(engine.evaluate(expr, { tags: ["x", "y"] })).toBe(true);
  });

  it("returns false when array is missing one expected value", () => {
    const expr: RuleExpr = {
      field: "tags",
      op: "containsAll",
      value: ["a", "z"],
    };
    expect(engine.evaluate(expr, { tags: ["a", "b"] })).toBe(false);
  });

  it("returns false when actual is not an array", () => {
    const expr: RuleExpr = {
      field: "tags",
      op: "containsAll",
      value: ["a"],
    };
    expect(engine.evaluate(expr, { tags: "a" })).toBe(false);
  });

  it("returns false when expected is not an array", () => {
    const expr: RuleExpr = {
      field: "tags",
      op: "containsAll",
      value: "a",
    };
    expect(engine.evaluate(expr, { tags: ["a"] })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F2 — withinDays operator
// ---------------------------------------------------------------------------

describe("Op: withinDays", () => {
  it("returns true for a date that is today (0 days ago)", () => {
    const expr: RuleExpr = {
      field: "createdAt",
      op: "withinDays",
      value: 7,
    };
    const now = new Date().toISOString();
    expect(engine.evaluate(expr, { createdAt: now })).toBe(true);
  });

  it("returns true for a date within the allowed window", () => {
    const expr: RuleExpr = {
      field: "createdAt",
      op: "withinDays",
      value: 30,
    };
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(engine.evaluate(expr, { createdAt: fiveDaysAgo })).toBe(true);
  });

  it("returns false for a date outside the allowed window", () => {
    const expr: RuleExpr = {
      field: "createdAt",
      op: "withinDays",
      value: 3,
    };
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(engine.evaluate(expr, { createdAt: tenDaysAgo })).toBe(false);
  });

  it("returns false for an invalid date string", () => {
    const expr: RuleExpr = {
      field: "createdAt",
      op: "withinDays",
      value: 7,
    };
    expect(engine.evaluate(expr, { createdAt: "not-a-date" })).toBe(false);
  });

  it("accepts a Date object directly", () => {
    const expr: RuleExpr = {
      field: "createdAt",
      op: "withinDays",
      value: 5,
    };
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(engine.evaluate(expr, { createdAt: yesterday })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// F2 — spatialWithin operator (best-effort: always false)
// ---------------------------------------------------------------------------

describe("Op: spatialWithin", () => {
  it("returns false (geo engine not available)", () => {
    const expr: RuleExpr = {
      field: "location",
      op: "spatialWithin",
      value: { type: "Polygon", coordinates: [] },
    };
    expect(engine.evaluate(expr, { location: { lat: 1, lng: 2 } })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F3 — RuleEngine.unregister
// ---------------------------------------------------------------------------

describe("unregister", () => {
  it("removes a registered rule so resolve returns undefined", () => {
    engine.register("myRule", { field: "x", op: "eq", value: 1 });
    expect(engine.resolve("myRule")).toBeDefined();
    engine.unregister("myRule");
    expect(engine.resolve("myRule")).toBeUndefined();
  });

  it("makes evaluate return false after unregistration", () => {
    engine.register("myRule", { field: "x", op: "eq", value: 1 });
    engine.unregister("myRule");
    expect(engine.evaluate({ ref: "myRule" }, { x: 1 })).toBe(false);
  });

  it("is a no-op when the rule does not exist", () => {
    // Should not throw
    expect(() => engine.unregister("doesNotExist")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// F4 — CompiledRule has both evaluate and explain
// ---------------------------------------------------------------------------

describe("compile returns CompiledRule", () => {
  it("returns an object with evaluate and explain", () => {
    const expr: RuleExpr = { field: "user.age", op: "gte", value: 18 };
    const compiled: CompiledRule = engine.compile(expr);
    expect(typeof compiled.evaluate).toBe("function");
    expect(typeof compiled.explain).toBe("function");
  });

  it("compiled.evaluate returns correct boolean", () => {
    const expr: RuleExpr = { field: "user.age", op: "gte", value: 18 };
    const compiled = engine.compile(expr);
    expect(compiled.evaluate({ user: { age: 21 } })).toBe(true);
    expect(compiled.evaluate({ user: { age: 16 } })).toBe(false);
  });

  it("compiled.explain returns RuleExplanation", () => {
    const expr: RuleExpr = { field: "user.age", op: "gte", value: 18 };
    const compiled = engine.compile(expr);
    const explanation = compiled.explain({ user: { age: 16 } });
    expect(explanation).toHaveProperty("passed");
    expect(explanation).toHaveProperty("failures");
    expect(explanation.passed).toBe(false);
  });

  it("compiled.explain is consistent with engine.explain", () => {
    const expr: RuleExpr = { field: "score", op: "gt", value: 100 };
    const ctx = { score: 50 };
    const compiled = engine.compile(expr);
    const fromCompile = compiled.explain(ctx);
    const fromEngine = engine.explain(expr, ctx);
    expect(fromCompile.passed).toBe(fromEngine.passed);
    expect(fromCompile.failures.length).toBe(fromEngine.failures.length);
  });
});

// ---------------------------------------------------------------------------
// F5 — RuleExplanation uses failures[] and op (not details[]/operator)
// ---------------------------------------------------------------------------

describe("RuleExplanation shape", () => {
  it("has failures array (not details)", () => {
    const expr: RuleExpr = { field: "user.age", op: "gte", value: 18 };
    const explanation: RuleExplanation = engine.explain(expr, { user: { age: 10 } });
    expect(explanation).toHaveProperty("failures");
    expect((explanation as unknown as Record<string, unknown>)["details"]).toBeUndefined();
  });

  it("failures entries use op (not operator)", () => {
    const expr: RuleExpr = { field: "user.age", op: "gte", value: 18 };
    const explanation = engine.explain(expr, { user: { age: 10 } });
    expect(explanation.failures.length).toBe(1);
    const failure = explanation.failures[0];
    expect(failure).toHaveProperty("op");
    expect((failure as unknown as Record<string, unknown>)["operator"]).toBeUndefined();
    expect(failure.op).toBe("gte");
  });

  it("failures entries have field, expected, actual, message", () => {
    const expr: RuleExpr = { field: "count", op: "lte", value: 5 };
    const explanation = engine.explain(expr, { count: 10 });
    expect(explanation.failures.length).toBe(1);
    const f = explanation.failures[0];
    expect(f.field).toBe("count");
    expect(f.expected).toBe(5);
    expect(f.actual).toBe(10);
    expect(typeof f.message).toBe("string");
  });

  it("failures is empty when rule passes", () => {
    const expr: RuleExpr = { field: "user.age", op: "gte", value: 18 };
    const explanation = engine.explain(expr, { user: { age: 21 } });
    expect(explanation.passed).toBe(true);
    expect(explanation.failures).toHaveLength(0);
  });

  it("compile explain uses failures[].op", () => {
    const expr: RuleExpr = { field: "val", op: "eq", value: "hello" };
    const compiled = engine.compile(expr);
    const explanation = compiled.explain({ val: "world" });
    expect(explanation.failures.length).toBe(1);
    expect(explanation.failures[0].op).toBe("eq");
    expect((explanation.failures[0] as unknown as Record<string, unknown>)["operator"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F6 — Op is exported
// ---------------------------------------------------------------------------

describe("Op export", () => {
  it("Op type is exported and usable", () => {
    const op: Op = "containsAll";
    expect(op).toBe("containsAll");
  });

  it("Op includes all required operators", () => {
    const ops: Op[] = [
      "eq", "neq", "gt", "gte", "lt", "lte",
      "in", "nin", "contains", "containsAll",
      "matches", "exists", "empty", "withinDays", "spatialWithin",
    ];
    expect(ops.length).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Existing behaviour — regression tests
// ---------------------------------------------------------------------------

describe("evaluate: existing operators", () => {
  it("eq operator", () => {
    expect(engine.evaluate({ field: "x", op: "eq", value: 1 }, { x: 1 })).toBe(true);
    expect(engine.evaluate({ field: "x", op: "eq", value: 2 }, { x: 1 })).toBe(false);
  });

  it("and/or/not operators", () => {
    expect(
      engine.evaluate(
        { and: [{ field: "a", op: "eq", value: 1 }, { field: "b", op: "eq", value: 2 }] },
        { a: 1, b: 2 },
      ),
    ).toBe(true);

    expect(
      engine.evaluate(
        { or: [{ field: "a", op: "eq", value: 9 }, { field: "b", op: "eq", value: 2 }] },
        { a: 1, b: 2 },
      ),
    ).toBe(true);

    expect(
      engine.evaluate({ not: { field: "x", op: "eq", value: 1 } }, { x: 2 }),
    ).toBe(true);
  });

  it("ref resolves registered rule", () => {
    engine.register("bigNumber", { field: "n", op: "gt", value: 100 });
    expect(engine.evaluate({ ref: "bigNumber" }, { n: 200 })).toBe(true);
    expect(engine.evaluate({ ref: "bigNumber" }, { n: 50 })).toBe(false);
  });

  it("contains works for arrays", () => {
    expect(
      engine.evaluate({ field: "roles", op: "contains", value: "admin" }, { roles: ["admin", "user"] }),
    ).toBe(true);
    expect(
      engine.evaluate({ field: "roles", op: "contains", value: "admin" }, { roles: ["user"] }),
    ).toBe(false);
  });

  it("exists operator", () => {
    expect(engine.evaluate({ field: "x", op: "exists", value: null }, { x: 1 })).toBe(true);
    expect(engine.evaluate({ field: "x", op: "exists", value: null }, {})).toBe(false);
  });
});
