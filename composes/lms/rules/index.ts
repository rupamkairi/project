import type { RuleExpr, RuleEngine } from "../../../apps/server/src/core/rule";

export type RuleScope =
  | "enrollment:create"
  | "enrollment:complete"
  | "enrollment:cancel"
  | "submission:create"
  | "course:submit-review"
  | "module:start"
  | "cohort:enroll";

export interface LMSRule {
  id: string;
  scope: RuleScope;
  guard?: RuleExpr;
  condition?: RuleExpr;
  action?: string;
  value?: unknown;
}

const freeCourseSkipPayment: LMSRule = {
  id: "freeCourseSkipPayment",
  scope: "enrollment:create",
  condition: { field: "course.price.amount", op: "eq", value: 0 },
  action: "set-status",
  value: "active",
};

const noDuplicateActiveEnrollment: LMSRule = {
  id: "noDuplicateActiveEnrollment",
  scope: "enrollment:create",
  guard: { field: "existingActiveEnrollmentCount", op: "eq", value: 0 },
};

const certificateRequiresThreshold: LMSRule = {
  id: "certificateRequiresThreshold",
  scope: "enrollment:complete",
  guard: {
    field: "enrollment.completionPct",
    op: "gte",
    value: { ref: "course.completionThreshold" },
  },
};

const assignmentNoLateSubmission: LMSRule = {
  id: "assignmentNoLateSubmission",
  scope: "submission:create",
  guard: {
    or: [
      { field: "allowLateSubmission", op: "eq", value: true },
      { field: "now", op: "lte", value: { ref: "absoluteDueDate" } },
    ],
  },
};

const assignmentMaxAttempts: LMSRule = {
  id: "assignmentMaxAttempts",
  scope: "submission:create",
  guard: {
    field: "attemptNumber",
    op: "lte",
    value: { ref: "maxAttempts" },
  },
};

const coursePublishRequiresModule: LMSRule = {
  id: "coursePublishRequiresModule",
  scope: "course:submit-review",
  guard: { field: "course.moduleCount", op: "gt", value: 0 },
};

const coursePublishRequiresPrice: LMSRule = {
  id: "coursePublishRequiresPrice",
  scope: "course:submit-review",
  guard: { field: "course.price", op: "exists" as const, value: true },
};

const moduleSequentialLock: LMSRule = {
  id: "moduleSequentialLock",
  scope: "module:start",
  guard: {
    or: [
      { field: "requiredPrevious", op: "eq", value: false },
      { field: "previousModuleProgress.status", op: "eq", value: "completed" },
    ],
  },
};

const cohortCapacityLimit: LMSRule = {
  id: "cohortCapacityLimit",
  scope: "cohort:enroll",
  guard: {
    field: "cohort.enrolledCount",
    op: "lt",
    value: { ref: "cohort.capacity" },
  },
};

const refundWithinWindow: LMSRule = {
  id: "refundWithinWindow",
  scope: "enrollment:cancel",
  condition: {
    field: "daysSinceEnrollment",
    op: "lte",
    value: { ref: "config.refundWindowDays" },
  },
  action: "allow-refund",
};

export const lmsRules: LMSRule[] = [
  freeCourseSkipPayment,
  noDuplicateActiveEnrollment,
  certificateRequiresThreshold,
  assignmentNoLateSubmission,
  assignmentMaxAttempts,
  coursePublishRequiresModule,
  coursePublishRequiresPrice,
  moduleSequentialLock,
  cohortCapacityLimit,
  refundWithinWindow,
];

export function registerLMSRules(engine: RuleEngine): void {
  for (const rule of lmsRules) {
    if (rule.guard) {
      engine.register(rule.id, rule.guard);
    }
    if (rule.condition) {
      engine.register(`${rule.id}:condition`, rule.condition);
    }
  }
}

export function getRulesForScope(scope: RuleScope): LMSRule[] {
  return lmsRules.filter((rule) => rule.scope === scope);
}

export function evaluateGuard(
  engine: RuleEngine,
  ruleId: string,
  context: Record<string, unknown>,
): boolean {
  const expr = engine.resolve(ruleId);
  if (!expr) return true;
  return engine.evaluate(expr, context);
}

export function evaluateCondition(
  engine: RuleEngine,
  ruleId: string,
  context: Record<string, unknown>,
): boolean {
  const expr = engine.resolve(`${ruleId}:condition`);
  if (!expr) return false;
  return engine.evaluate(expr, context);
}

export function evaluateRule(
  engine: RuleEngine,
  rule: LMSRule,
  context: Record<string, unknown>,
): { guardPassed: boolean; conditionMet: boolean } {
  const guardPassed = rule.guard
    ? evaluateGuard(engine, rule.id, context)
    : true;
  const conditionMet = rule.condition
    ? evaluateCondition(engine, rule.id, context)
    : false;
  return { guardPassed, conditionMet };
}

export function explainRule(
  engine: RuleEngine,
  rule: LMSRule,
  context: Record<string, unknown>,
): {
  guardExplanation?: ReturnType<RuleEngine["explain"]>;
  conditionExplanation?: ReturnType<RuleEngine["explain"]>;
} {
  const result: {
    guardExplanation?: ReturnType<RuleEngine["explain"]>;
    conditionExplanation?: ReturnType<RuleEngine["explain"]>;
  } = {};

  if (rule.guard) {
    const expr = engine.resolve(rule.id);
    if (expr) {
      result.guardExplanation = engine.explain(expr, context);
    }
  }

  if (rule.condition) {
    const expr = engine.resolve(`${rule.id}:condition`);
    if (expr) {
      result.conditionExplanation = engine.explain(expr, context);
    }
  }

  return result;
}
