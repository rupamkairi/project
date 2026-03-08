// Ecommerce Compose Rules
// Business rules specific to the ecommerce compose

import type {
  CreateComposeRuleOptions,
  ComposeRuleScope,
  ComposeRuleAction,
} from "../../../core/compose/rules";
import { CommonComposeRules } from "../../../core/compose/rules";
import type { RuleExpr } from "../../../core/rule";

// ============================================================================
// Rule: No Out of Stock Orders
// ============================================================================

/**
 * Rule: Products cannot be ordered if out of stock
 * Scope: order:create
 */
export function createNoOutOfStockOrdersRule(
  composeId: string = "ecommerce",
): CreateComposeRuleOptions {
  return {
    ...CommonComposeRules.noOutOfStockOrders(composeId),
    id: "ecommerce.no-out-of-stock-orders",
  };
}

// ============================================================================
// Rule: High Value Order Review
// ============================================================================

/**
 * Rule: Orders above ₹10,000 require manual review
 * Scope: workflow.stage:pick-pack
 */
export function createHighValueOrderReviewRule(
  composeId: string = "ecommerce",
  threshold: number = 10000,
  approverRole: string = "store-admin",
): CreateComposeRuleOptions {
  return {
    ...CommonComposeRules.highValueOrderReview(
      composeId,
      threshold,
      approverRole,
    ),
    id: "ecommerce.high-value-order-review",
  };
}

// ============================================================================
// Rule: Return Window
// ============================================================================

/**
 * Rule: Returns must be requested within 7 days of delivery
 * Scope: ecommerce.refund-requested
 */
export function createReturnWindowRule(
  composeId: string = "ecommerce",
  days: number = 7,
): CreateComposeRuleOptions {
  return {
    ...CommonComposeRules.returnWindow(composeId, days),
    id: "ecommerce.return-window",
  };
}

// ============================================================================
// Rule: Coupon Single Use Per Customer
// ============================================================================

/**
 * Rule: Coupons can only be applied once per customer
 * Scope: coupon:apply
 */
export function createCouponSingleUsePerCustomerRule(
  composeId: string = "ecommerce",
): CreateComposeRuleOptions {
  return {
    ...CommonComposeRules.couponSingleUsePerCustomer(composeId),
    id: "ecommerce.coupon-single-use-per-customer",
  };
}

// ============================================================================
// Rule: Flash Sale Validity
// ============================================================================

/**
 * Rule: Flash sale prices are only valid during the specified window
 * Scope: catalog:resolvePrice
 */
export function createFlashSaleValidityRule(
  composeId: string = "ecommerce",
): CreateComposeRuleOptions {
  return {
    ...CommonComposeRules.flashSaleValidity(composeId),
    id: "ecommerce.flash-sale-validity",
  };
}

// ============================================================================
// Additional Ecommerce Rules
// ============================================================================

/**
 * Rule: Minimum order amount for checkout
 */
export function createMinimumOrderAmountRule(
  composeId: string = "ecommerce",
  minimumAmount: number = 100,
): CreateComposeRuleOptions {
  return {
    id: "ecommerce.minimum-order-amount",
    composeId,
    scope: "order:create",
    name: "Minimum Order Amount",
    description: `Orders must be at least ${minimumAmount}`,
    guard: {
      field: "order.subtotal",
      op: "gte",
      value: minimumAmount,
    },
    action: "deny",
    priority: 90,
  };
}

/**
 * Rule: Maximum order amount for guest checkout
 */
export function createGuestOrderLimitRule(
  composeId: string = "ecommerce",
  maxAmount: number = 50000,
): CreateComposeRuleOptions {
  return {
    id: "ecommerce.guest-order-limit",
    composeId,
    scope: "order:create",
    name: "Guest Order Limit",
    description: `Guest orders cannot exceed ${maxAmount}`,
    guard: {
      and: [
        { field: "actor.type", op: "eq", value: "guest" },
        { field: "order.total", op: "gt", value: maxAmount },
      ],
    },
    action: "deny",
    priority: 80,
  };
}

/**
 * Rule: Require shipping address for physical products
 */
export function createShippingAddressRequiredRule(
  composeId: string = "ecommerce",
): CreateComposeRuleOptions {
  return {
    id: "ecommerce.shipping-address-required",
    composeId,
    scope: "order:create",
    name: "Shipping Address Required",
    description: "Orders with physical items require a shipping address",
    guard: {
      field: "order.hasPhysicalItems",
      op: "eq",
      value: true,
    },
    condition: {
      field: "order.shippingAddressId",
      op: "exists",
      value: false,
    },
    action: "deny",
    priority: 85,
  };
}

/**
 * Rule: Validate coupon expiry
 */
export function createCouponExpiryRule(
  composeId: string = "ecommerce",
): CreateComposeRuleOptions {
  return {
    id: "ecommerce.coupon-expiry",
    composeId,
    scope: "coupon:apply",
    name: "Coupon Expiry Validation",
    description: "Coupons must be within their valid date range",
    guard: {
      and: [
        { field: "coupon.validFrom", op: "lte", value: { ref: "now" } },
        { field: "coupon.validTo", op: "gte", value: { ref: "now" } },
      ],
    },
    action: "deny",
    priority: 100,
  };
}

/**
 * Rule: Check coupon usage limits
 */
export function createCouponUsageLimitRule(
  composeId: string = "ecommerce",
): CreateComposeRuleOptions {
  return {
    id: "ecommerce.coupon-usage-limit",
    composeId,
    scope: "coupon:apply",
    name: "Coupon Usage Limit",
    description: "Coupons cannot exceed their usage limit",
    guard: {
      field: "coupon.usageCount",
      op: "lt",
      value: { ref: "coupon.usageLimit" },
    },
    action: "deny",
    priority: 90,
  };
}

/**
 * Rule: Check per-customer coupon usage limit
 */
export function createCouponPerCustomerLimitRule(
  composeId: string = "ecommerce",
): CreateComposeRuleOptions {
  return {
    id: "ecommerce.coupon-per-customer-limit",
    composeId,
    scope: "coupon:apply",
    name: "Coupon Per Customer Limit",
    description:
      "Customers cannot use a coupon more than the per-customer limit",
    guard: {
      field: "coupon.customerUsageCount",
      op: "lt",
      value: { ref: "coupon.perCustomerLimit" },
    },
    action: "deny",
    priority: 95,
  };
}

// ============================================================================
// All Ecommerce Rules
// ============================================================================

/**
 * All business rules for the ecommerce compose
 */
export const EcommerceComposeRules: CreateComposeRuleOptions[] = [
  // Core rules from CommonComposeRules
  createNoOutOfStockOrdersRule(),
  createHighValueOrderReviewRule(),
  createReturnWindowRule(),
  createCouponSingleUsePerCustomerRule(),
  createFlashSaleValidityRule(),
  // Additional ecommerce rules
  createMinimumOrderAmountRule(),
  createGuestOrderLimitRule(),
  createShippingAddressRequiredRule(),
  createCouponExpiryRule(),
  createCouponUsageLimitRule(),
  createCouponPerCustomerLimitRule(),
];

/**
 * Get all ecommerce compose rules
 */
export function getEcommerceRules(): CreateComposeRuleOptions[] {
  return EcommerceComposeRules;
}

/**
 * Get a rule by ID
 */
export function getRuleById(id: string): CreateComposeRuleOptions | undefined {
  return EcommerceComposeRules.find((rule) => rule.id === id);
}

/**
 * Get rules by scope
 */
export function getRulesByScope(
  scope: ComposeRuleScope,
): CreateComposeRuleOptions[] {
  return EcommerceComposeRules.filter((rule) => rule.scope === scope);
}

/**
 * Register all rules with a rule registry
 */
export function registerEcommerceRules(registry: {
  register: (options: CreateComposeRuleOptions) => void;
}): void {
  for (const rule of EcommerceComposeRules) {
    registry.register(rule);
  }
}

export default EcommerceComposeRules;
