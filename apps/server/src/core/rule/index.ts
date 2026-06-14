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
  | "contains" // Array/string field contains value
  | "containsAll" // Array field contains all values
  | "matches" // Regex match
  | "exists" // Field exists
  | "empty" // Array or string is empty
  | "withinDays" // Date field within N days of now
  | "spatialWithin"; // Geo point within polygon (uses PostGIS)

/**
 * Rule expression definition.
 *
 * Can be a field comparison, logical operator, reference to a registered rule,
 * or a template rule with injectable parameters.
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
 *
 * // Template rule with injectable params
 * const tmplRule: RuleExpr = { template: "hasRole", params: { role: "admin" } };
 * ```
 *
 * @category Core
 */
export type RuleExpr =
  | { field: string; op: Op; value: unknown }
  | { and: RuleExpr[] }
  | { or: RuleExpr[] }
  | { not: RuleExpr }
  | { ref: string }
  | { kind: "template"; template: string; params: Record<string, unknown> };

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
   * List of conditions that failed
   */
  failures: Array<{
    /**
     * Field being evaluated
     */
    field: string;

    /**
     * Operator used
     */
    op: Op | string;

    /**
     * Expected value
     */
    expected: unknown;

    /**
     * Actual value from context
     */
    actual: unknown;

    /**
     * Human-readable failure message
     */
    message: string;
  }>;
}

/**
 * A compiled rule ready for repeated evaluation.
 *
 * @category Core
 */
export interface CompiledRule {
  /**
   * Evaluates the compiled rule against a context.
   */
  evaluate(context: Record<string, unknown>): boolean;

  /**
   * Explains which conditions failed for the given context.
   */
  explain(context: Record<string, unknown>): RuleExplanation;
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
   * @returns Compiled rule with evaluate and explain methods
   */
  compile(expr: RuleExpr): CompiledRule;

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
   * Removes a registered rule by ID.
   *
   * @param id - Rule ID to remove
   */
  unregister(id: string): void;

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
 * console.log(explanation.failures);
 * // [{ field: "user.age", op: "gte", expected: 18, actual: 16, message: "..." }]
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

    // Handle template rule — evaluate by looking up by template name with params
    if ("kind" in expr && expr.kind === "template") {
      const tmpl = registeredRules.get(expr.template);
      if (!tmpl) return false;
      // Merge params into context for template evaluation
      const merged = { ...context, ...expr.params };
      return evaluateInternal(tmpl, merged);
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
    failures: RuleExplanation["failures"],
  ): boolean {
    // Handle reference
    if ("ref" in expr) {
      const ref = registeredRules.get(expr.ref);
      if (!ref) {
        failures.push({
          field: expr.ref,
          op: "ref",
          expected: "registered rule",
          actual: "not found",
          message: `Rule "${expr.ref}" is not registered`,
        });
        return false;
      }
      return explainInternal(ref, context, failures);
    }

    // Handle template rule
    if ("kind" in expr && expr.kind === "template") {
      const tmpl = registeredRules.get(expr.template);
      if (!tmpl) {
        failures.push({
          field: expr.template,
          op: "template",
          expected: "registered template",
          actual: "not found",
          message: `Template "${expr.template}" is not registered`,
        });
        return false;
      }
      const merged = { ...context, ...expr.params };
      return explainInternal(tmpl, merged, failures);
    }

    // Handle negation
    if ("not" in expr) {
      const innerFailures: RuleExplanation["failures"] = [];
      const innerPassed = explainInternal(expr.not, context, innerFailures);
      const result = !innerPassed;
      if (!result) {
        failures.push({
          field: "not",
          op: "not",
          expected: "inner rule to fail",
          actual: "inner rule passed",
          message: "NOT condition failed: inner rule passed when it should not",
        });
      }
      return result;
    }

    // Handle conjunction
    if ("and" in expr) {
      const results = expr.and.map((e) => explainInternal(e, context, failures));
      return results.every((r) => r);
    }

    // Handle disjunction
    if ("or" in expr) {
      const results = expr.or.map((e) => explainInternal(e, context, failures));
      return results.some((r) => r);
    }

    // Handle field comparison
    if ("field" in expr && "op" in expr) {
      const actual = getNestedValue(context, expr.field);
      const passed = compare(actual, expr.op, expr.value);
      if (!passed) {
        failures.push({
          field: expr.field,
          op: expr.op,
          expected: expr.value,
          actual,
          message: `Field "${expr.field}" failed op "${expr.op}": expected ${JSON.stringify(expr.value)}, got ${JSON.stringify(actual)}`,
        });
      }
      return passed;
    }

    return false;
  }

  return {
    evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean {
      return evaluateInternal(expr, context);
    },

    compile(expr: RuleExpr): CompiledRule {
      return {
        evaluate: (ctx: Record<string, unknown>) => evaluateInternal(expr, ctx),
        explain: (ctx: Record<string, unknown>) => {
          const failures: RuleExplanation["failures"] = [];
          const passed = explainInternal(expr, ctx, failures);
          return { passed, failures };
        },
      };
    },

    register(id: string, expr: RuleExpr): void {
      registeredRules.set(id, expr);
    },

    resolve(id: string): RuleExpr | undefined {
      return registeredRules.get(id);
    },

    unregister(id: string): void {
      registeredRules.delete(id);
    },

    explain(expr: RuleExpr, context: Record<string, unknown>): RuleExplanation {
      const failures: RuleExplanation["failures"] = [];
      const passed = explainInternal(expr, context, failures);
      return { passed, failures };
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
      if (Array.isArray(actual)) return actual.includes(expected);
      return (
        typeof actual === "string" &&
        typeof expected === "string" &&
        actual.includes(expected)
      );
    case "containsAll":
      // Array field must contain all values in expected array
      if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
      return expected.every((v) => actual.includes(v));
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
    case "withinDays": {
      // Check that actual (a date string or timestamp) is within N days of now
      if (typeof expected !== "number") return false;
      const date =
        actual instanceof Date
          ? actual
          : new Date(actual as string | number);
      if (isNaN(date.getTime())) return false;
      const diffMs = Math.abs(Date.now() - date.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= expected;
    }
    case "spatialWithin":
      // TODO: geo engine not available yet — always false until PostGIS integration
      return false;
    default:
      return false;
  }
}
