/**
 * Rule Engine
 *
 * Expression evaluation and rule compilation for business logic validation.
 *
 * @category Core
 * @packageDocumentation
 */

/**
 * Supported comparison operators.
 *
 * @category Core
 */
export type Op =
  | "eq" // Equal
  | "neq" // Not equal
  | "gt" // Greater than
  | "gte" // Greater than or equal
  | "lt" // Less than
  | "lte" // Less than or equal
  | "in" // In array
  | "nin" // Not in array
  | "contains" // String contains
  | "matches" // Regex match
  | "exists" // Field exists
  | "empty"; // Field is empty

/**
 * Rule expression definition.
 *
 * Can be a field comparison, logical operator, or reference to a registered rule.
 *
 * @example
 * ```typescript
 * // Simple comparison
 * const rule: RuleExpr = {
 *   field: "user.age",
 *   op: "gte",
 *   value: 18
 * };
 *
 * // Logical AND
 * const andRule: RuleExpr = {
 *   and: [
 *     { field: "user.age", op: "gte", value: 18 },
 *     { field: "user.verified", op: "eq", value: true }
 *   ]
 * };
 *
 * // Reference to registered rule
 * const refRule: RuleExpr = { ref: "isAdult" };
 * ```
 *
 * @category Core
 */
export type RuleExpr =
  | { field: string; op: Op; value: unknown }
  | { and: RuleExpr[] }
  | { or: RuleExpr[] }
  | { not: RuleExpr }
  | { ref: string };

/**
 * Rule evaluation explanation with detailed breakdown.
 *
 * @category Core
 */
export interface RuleExplanation {
  /**
   * Whether the rule passed overall
   */
  passed: boolean;

  /**
   * Detailed breakdown of each condition
   */
  details: Array<{
    /**
     * Field being evaluated
     */
    field: string;

    /**
     * Operator used
     */
    operator: string;

    /**
     * Expected value
     */
    expected: unknown;

    /**
     * Actual value from context
     */
    actual: unknown;

    /**
     * Whether this condition passed
     */
    passed: boolean;
  }>;
}

/**
 * Rule engine interface for evaluating expressions.
 *
 * @category Core
 */
export interface RuleEngine {
  /**
   * Evaluates a rule expression against context.
   *
   * @param expr - Rule expression to evaluate
   * @param context - Context object with field values
   * @returns True if rule passes
   */
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;

  /**
   * Compiles a rule expression for repeated evaluation.
   *
   * @param expr - Rule expression to compile
   * @returns Compiled rule with evaluate method
   */
  compile(expr: RuleExpr): { evaluate(ctx: Record<string, unknown>): boolean };

  /**
   * Registers a reusable rule.
   *
   * @param id - Rule identifier
   * @param expr - Rule expression
   */
  register(id: string, expr: RuleExpr): void;

  /**
   * Resolves a registered rule by ID.
   *
   * @param id - Rule ID
   * @returns Rule expression or undefined
   */
  resolve(id: string): RuleExpr | undefined;

  /**
   * Explains why a rule passed or failed.
   *
   * @param expr - Rule expression
   * @param context - Context object
   * @returns Detailed explanation
   */
  explain(expr: RuleExpr, context: Record<string, unknown>): RuleExplanation;
}

/**
 * Creates an in-memory rule engine.
 *
 * @returns Rule engine instance
 *
 * @example
 * ```typescript
 * const engine = createRuleEngine();
 *
 * // Register reusable rule
 * engine.register("isAdult", {
 *   field: "user.age",
 *   op: "gte",
 *   value: 18
 * });
 *
 * // Evaluate rule
 * const passed = engine.evaluate(
 *   { ref: "isAdult" },
 *   { user: { age: 21 } }
 * ); // true
 *
 * // Get explanation
 * const explanation = engine.explain(
 *   { field: "user.age", op: "gte", value: 18 },
 *   { user: { age: 16 } }
 * );
 * console.log(explanation.details);
 * // [{ field: "user.age", operator: "gte", expected: 18, actual: 16, passed: false }]
 * ```
 *
 * @category Core
 */
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

/**
 * Gets a nested value from an object using dot notation.
 *
 * @param obj - Source object
 * @param path - Dot-notation path (e.g., "user.profile.age")
 * @returns Value at path or undefined
 *
 * @internal
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Compares two values using the specified operator.
 *
 * @param actual - Actual value from context
 * @param op - Comparison operator
 * @param expected - Expected value
 * @returns Comparison result
 *
 * @internal
 */
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
