// Compose Rules - Business rules specific to a compose

import type { RuleExpr, RuleEngine } from "../rule";
import type { ComposeDefinition } from "./types";

// ============================================================================
// Compose Rule Types
// ============================================================================

/**
 * Scope where a compose rule applies
 */
export type ComposeRuleScope =
  | "order:create"
  | "order:read"
  | "order:update-status"
  | "order:cancel"
  | "order:refund"
  | "coupon:apply"
  | "coupon:create"
  | "catalog:resolvePrice"
  | "checkout:validate"
  | `workflow.stage:${string}`
  | `ecommerce.${string}`;

/**
 * Rule action to take when rule passes
 */
export type ComposeRuleAction =
  | "allow"
  | "deny"
  | "require-approval"
  | "log"
  | "notify";

/**
 * A business rule specific to a compose
 */
export interface ComposeRule {
  id: string;
  composeId: string;
  scope: ComposeRuleScope;
  name?: string;
  description?: string;
  guard?: RuleExpr; // Rule expression for authorization
  condition?: RuleExpr; // Additional condition to check
  action: ComposeRuleAction;
  approverRole?: string; // Required for require-approval action
  priority?: number; // Higher = evaluated first, default 0
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Result of evaluating a compose rule
 */
export interface ComposeRuleResult {
  ruleId: string;
  passed: boolean;
  action: ComposeRuleAction;
  reason?: string;
  approverRole?: string;
}

/**
 * Options for creating a compose rule
 */
export interface CreateComposeRuleOptions {
  id?: string;
  composeId: string;
  scope: ComposeRuleScope;
  name?: string;
  description?: string;
  guard?: RuleExpr;
  condition?: RuleExpr;
  action: ComposeRuleAction;
  approverRole?: string;
  priority?: number;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Compose Rule Registry
// ============================================================================

/**
 * ComposeRuleRegistry - manages compose-level business rules
 */
export class ComposeRuleRegistry {
  private rules: Map<string, ComposeRule> = new Map();
  private scopeIndex: Map<ComposeRuleScope, Set<string>> = new Map();
  private composeIndex: Map<string, Set<string>> = new Map();
  private ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.ruleEngine = ruleEngine;
  }

  /**
   * Register a new compose rule
   */
  register(options: CreateComposeRuleOptions): ComposeRule {
    const rule: ComposeRule = {
      id: options.id ?? this.generateRuleId(),
      composeId: options.composeId,
      scope: options.scope,
      name: options.name,
      description: options.description,
      guard: options.guard,
      condition: options.condition,
      action: options.action,
      approverRole: options.approverRole,
      priority: options.priority ?? 0,
      enabled: options.enabled ?? true,
      metadata: options.metadata,
    };

    this.rules.set(rule.id, rule);
    this.indexRule(rule);
    this.addToComposeIndex(rule);

    return rule;
  }

  /**
   * Unregister a rule by ID
   */
  unregister(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.removeFromIndex(rule);
    this.removeFromComposeIndex(rule);
    this.rules.delete(ruleId);

    return true;
  }

  /**
   * Get a rule by ID
   */
  get(ruleId: string): ComposeRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules for a specific compose
   */
  getByCompose(composeId: string): ComposeRule[] {
    const ruleIds = this.composeIndex.get(composeId);
    if (!ruleIds) return [];

    return Array.from(ruleIds)
      .map((id) => this.rules.get(id))
      .filter((r): r is ComposeRule => r !== undefined);
  }

  /**
   * Find rules matching a scope
   */
  findByScope(scope: ComposeRuleScope): ComposeRule[] {
    const ruleIds = this.scopeIndex.get(scope);
    if (!ruleIds) return [];

    return Array.from(ruleIds)
      .map((id) => this.rules.get(id))
      .filter((r): r is ComposeRule => r !== undefined && r.enabled);
  }

  /**
   * Evaluate all rules for a given scope and context
   */
  evaluate(
    scope: ComposeRuleScope,
    context: Record<string, unknown>,
  ): ComposeRuleResult[] {
    const rules = this.findByScope(scope);
    const results: ComposeRuleResult[] = [];

    // Sort by priority (higher = first)
    rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const rule of rules) {
      const result = this.evaluateRule(rule, context);
      results.push(result);

      // If rule denies and is blocking, we can stop
      if (result.action === "deny" && !result.passed) {
        break;
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule against context
   */
  evaluateRule(
    rule: ComposeRule,
    context: Record<string, unknown>,
  ): ComposeRuleResult {
    // Evaluate guard condition
    if (rule.guard) {
      const passed = this.ruleEngine.evaluate(rule.guard, context);
      if (!passed) {
        return {
          ruleId: rule.id,
          passed: false,
          action: rule.action,
          reason: "Guard condition failed",
        };
      }
    }

    // Evaluate additional condition
    if (rule.condition) {
      const passed = this.ruleEngine.evaluate(rule.condition, context);
      if (!passed) {
        return {
          ruleId: rule.id,
          passed: false,
          action: "allow", // If condition doesn't match, rule doesn't apply
          reason: "Condition not met",
        };
      }
    }

    return {
      ruleId: rule.id,
      passed: true,
      action: rule.action,
      approverRole: rule.approverRole,
    };
  }

  /**
   * Check if an action is allowed for a given scope and context
   */
  checkPermission(
    scope: ComposeRuleScope,
    context: Record<string, unknown>,
  ): {
    allowed: boolean;
    action?: ComposeRuleAction;
    reason?: string;
    requiresApproval?: boolean;
    approverRole?: string;
  } {
    const results = this.evaluate(scope, context);

    // Check for explicit deny
    const denyResult = results.find((r) => r.action === "deny" && !r.passed);
    if (denyResult) {
      return {
        allowed: false,
        action: "deny",
        reason: denyResult.reason,
      };
    }

    // Check for require-approval
    const approvalResult = results.find(
      (r) => r.action === "require-approval" && r.passed,
    );
    if (approvalResult) {
      return {
        allowed: true,
        action: "require-approval",
        requiresApproval: true,
        approverRole: approvalResult.approverRole,
      };
    }

    // Check for explicit allow
    const allowResult = results.find((r) => r.action === "allow" && r.passed);
    if (allowResult) {
      return {
        allowed: true,
        action: "allow",
      };
    }

    // Default allow if no rules matched
    return { allowed: true, action: "allow" };
  }

  /**
   * Enable or disable a rule
   */
  setEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    return true;
  }

  /**
   * Get all registered rules
   */
  getAll(): ComposeRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Clear all rules for a compose
   */
  clearCompose(composeId: string): void {
    const rules = this.getByCompose(composeId);
    for (const rule of rules) {
      this.unregister(rule.id);
    }
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private indexRule(rule: ComposeRule): void {
    let ruleIds = this.scopeIndex.get(rule.scope);
    if (!ruleIds) {
      ruleIds = new Set();
      this.scopeIndex.set(rule.scope, ruleIds);
    }
    ruleIds.add(rule.id);

    // Also index by scope prefix for pattern matching
    const parts = rule.scope.split(":");
    if (parts.length > 1) {
      const prefix = parts[0];
      let prefixIds = this.scopeIndex.get(prefix as ComposeRuleScope);
      if (!prefixIds) {
        prefixIds = new Set();
        this.scopeIndex.set(prefix as ComposeRuleScope, prefixIds);
      }
      prefixIds.add(rule.id);
    }
  }

  private removeFromIndex(rule: ComposeRule): void {
    const ruleIds = this.scopeIndex.get(rule.scope);
    if (ruleIds) {
      ruleIds.delete(rule.id);
      if (ruleIds.size === 0) {
        this.scopeIndex.delete(rule.scope);
      }
    }

    // Remove from prefix index
    const parts = rule.scope.split(":");
    if (parts.length > 1) {
      const prefixIds = this.scopeIndex.get(parts[0] as ComposeRuleScope);
      if (prefixIds) {
        prefixIds.delete(rule.id);
        if (prefixIds.size === 0) {
          this.scopeIndex.delete(parts[0] as ComposeRuleScope);
        }
      }
    }
  }

  private addToComposeIndex(rule: ComposeRule): void {
    let ruleIds = this.composeIndex.get(rule.composeId);
    if (!ruleIds) {
      ruleIds = new Set();
      this.composeIndex.set(rule.composeId, ruleIds);
    }
    ruleIds.add(rule.id);
  }

  private removeFromComposeIndex(rule: ComposeRule): void {
    const ruleIds = this.composeIndex.get(rule.composeId);
    if (ruleIds) {
      ruleIds.delete(rule.id);
      if (ruleIds.size === 0) {
        this.composeIndex.delete(rule.composeId);
      }
    }
  }
}

// ============================================================================
// Common Ecommerce Rules
// ============================================================================

/**
 * Common ecommerce business rules
 */
export const CommonComposeRules = {
  /**
   * Products cannot be ordered if out of stock
   */
  noOutOfStockOrders: (composeId: string): CreateComposeRuleOptions => ({
    composeId,
    scope: "order:create",
    name: "No Out of Stock Orders",
    description: "Products cannot be ordered if out of stock",
    guard: {
      field: "item.inventory.available",
      op: "gt",
      value: 0,
    },
    action: "deny",
    priority: 100,
  }),

  /**
   * Orders above threshold require manual review
   */
  highValueOrderReview: (
    composeId: string,
    threshold: number,
    approverRole: string = "store-admin",
  ): CreateComposeRuleOptions => ({
    composeId,
    scope: "workflow.stage:pick-pack",
    name: "High Value Order Review",
    description: `Orders above ${threshold} require manual review`,
    condition: {
      field: "order.total",
      op: "gte",
      value: threshold,
    },
    action: "require-approval",
    approverRole,
    priority: 50,
  }),

  /**
   * Return window - 7 days from delivery
   */
  returnWindow: (
    composeId: string,
    days: number = 7,
  ): CreateComposeRuleOptions => ({
    composeId,
    scope: "ecommerce.refund-requested",
    name: "Return Window",
    description: `Returns must be requested within ${days} days of delivery`,
    guard: {
      field: "order.deliveredAt",
      op: "gt",
      value: { relative: `-${days}d` },
    },
    action: "deny",
    priority: 100,
  }),

  /**
   * Coupons can only be applied once per customer
   */
  couponSingleUsePerCustomer: (
    composeId: string,
  ): CreateComposeRuleOptions => ({
    composeId,
    scope: "coupon:apply",
    name: "Coupon Single Use Per Customer",
    description: "Coupons can only be applied once per customer",
    guard: {
      not: {
        field: "coupon.usedByCustomer",
        op: "eq",
        value: { ref: "actor.id" },
      },
    },
    action: "deny",
    priority: 50,
  }),

  /**
   * Flash sale price only valid during window
   */
  flashSaleValidity: (composeId: string): CreateComposeRuleOptions => ({
    composeId,
    scope: "catalog:resolvePrice",
    name: "Flash Sale Validity",
    description: "Flash sale prices are only valid during the specified window",
    guard: {
      and: [
        { field: "priceList.validFrom", op: "lte", value: { ref: "now" } },
        { field: "priceList.validTo", op: "gte", value: { ref: "now" } },
      ],
    },
    action: "deny",
    priority: 100,
  }),
} as const;

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a new ComposeRuleRegistry with a default rule engine
 */
export function createComposeRuleRegistry(
  ruleEngine: RuleEngine,
): ComposeRuleRegistry {
  return new ComposeRuleRegistry(ruleEngine);
}
