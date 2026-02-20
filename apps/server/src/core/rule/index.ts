// Rule Engine - expression evaluation and compilation

export type Op =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "matches"
  | "exists"
  | "empty";

export type RuleExpr =
  | { field: string; op: Op; value: unknown }
  | { and: RuleExpr[] }
  | { or: RuleExpr[] }
  | { not: RuleExpr }
  | { ref: string };

export interface RuleExplanation {
  passed: boolean;
  details: Array<{
    field: string;
    operator: string;
    expected: unknown;
    actual: unknown;
    passed: boolean;
  }>;
}

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

// Compare two values using operator
function compare(actual: unknown, op: Op, expected: unknown): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual > expected
      );
    case "gte":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual >= expected
      );
    case "lt":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual < expected
      );
    case "lte":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual <= expected
      );
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "nin":
      return Array.isArray(expected) && !expected.includes(actual);
    case "contains":
      return (
        typeof actual === "string" &&
        typeof expected === "string" &&
        actual.includes(expected)
      );
    case "matches":
      if (typeof actual === "string" && expected instanceof RegExp) {
        return expected.test(actual);
      }
      return false;
    case "exists":
      return actual !== undefined && actual !== null;
    case "empty":
      if (actual === null || actual === undefined) return true;
      if (typeof actual === "string") return actual.length === 0;
      if (Array.isArray(actual)) return actual.length === 0;
      if (typeof actual === "object") return Object.keys(actual).length === 0;
      return false;
    default:
      return false;
  }
}

export interface RuleEngine {
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;
  compile(expr: RuleExpr): { evaluate(ctx: Record<string, unknown>): boolean };
  register(id: string, expr: RuleExpr): void;
  resolve(id: string): RuleExpr | undefined;
  explain(expr: RuleExpr, context: Record<string, unknown>): RuleExplanation;
}

// In-memory Rule Engine implementation
export function createRuleEngine(): RuleEngine {
  const registeredRules = new Map<string, RuleExpr>();

  function evaluateInternal(
    expr: RuleExpr,
    context: Record<string, unknown>,
  ): boolean {
    // Handle reference
    if ("ref" in expr) {
      const ref = registeredRules.get(expr.ref);
      if (!ref) return false;
      return evaluateInternal(ref, context);
    }

    // Handle negation
    if ("not" in expr) {
      return !evaluateInternal(expr.not, context);
    }

    // Handle conjunction
    if ("and" in expr) {
      return expr.and.every((e) => evaluateInternal(e, context));
    }

    // Handle disjunction
    if ("or" in expr) {
      return expr.or.some((e) => evaluateInternal(e, context));
    }

    // Handle field comparison
    if ("field" in expr && "op" in expr) {
      const actual = getNestedValue(context, expr.field);
      return compare(actual, expr.op, expr.value);
    }

    return false;
  }

  function explainInternal(
    expr: RuleExpr,
    context: Record<string, unknown>,
    details: RuleExplanation["details"],
  ): boolean {
    // Handle reference
    if ("ref" in expr) {
      const ref = registeredRules.get(expr.ref);
      if (!ref) {
        details.push({
          field: expr.ref,
          operator: "ref",
          expected: "registered rule",
          actual: "not found",
          passed: false,
        });
        return false;
      }
      return explainInternal(ref, context, details);
    }

    // Handle negation
    if ("not" in expr) {
      const result = !explainInternal(expr.not, context, details);
      details.push({
        field: "not",
        operator: "not",
        expected: "false",
        actual: result.toString(),
        passed: result,
      });
      return result;
    }

    // Handle conjunction
    if ("and" in expr) {
      const results = expr.and.map((e) => explainInternal(e, context, details));
      return results.every((r) => r);
    }

    // Handle disjunction
    if ("or" in expr) {
      const results = expr.or.map((e) => explainInternal(e, context, details));
      return results.some((r) => r);
    }

    // Handle field comparison
    if ("field" in expr && "op" in expr) {
      const actual = getNestedValue(context, expr.field);
      const passed = compare(actual, expr.op, expr.value);
      details.push({
        field: expr.field,
        operator: expr.op,
        expected: expr.value,
        actual,
        passed,
      });
      return passed;
    }

    return false;
  }

  return {
    evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean {
      return evaluateInternal(expr, context);
    },

    compile(expr: RuleExpr): {
      evaluate(ctx: Record<string, unknown>): boolean;
    } {
      return {
        evaluate: (ctx: Record<string, unknown>) => evaluateInternal(expr, ctx),
      };
    },

    register(id: string, expr: RuleExpr): void {
      registeredRules.set(id, expr);
    },

    resolve(id: string): RuleExpr | undefined {
      return registeredRules.get(id);
    },

    explain(expr: RuleExpr, context: Record<string, unknown>): RuleExplanation {
      const details: RuleExplanation["details"] = [];
      const passed = explainInternal(expr, context, details);
      return { passed, details };
    },
  };
}
