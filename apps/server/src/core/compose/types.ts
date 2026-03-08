// Compose system types for the Ecommerce Compose

import type { ID, Timestamp } from "../entity";

// ============================================================================
// Module Configuration Types
// ============================================================================

/**
 * Catalog module configuration overrides
 */
export interface CatalogModuleConfig {
  itemLabel?: string; // rename generic "Item" to "Product" in this Compose
  enableVariants?: boolean;
  enablePriceLists?: boolean;
  enableBundles?: boolean;
  maxItemsPerOrder?: number;
}

/**
 * Inventory module configuration overrides
 */
export interface InventoryModuleConfig {
  trackingMode?: "variant" | "product" | "location";
  allowBackorder?: boolean;
  lowStockThreshold?: number;
  autoReserveStock?: boolean;
  defaultWarehouseId?: ID;
}

/**
 * Ledger module configuration overrides
 */
export interface LedgerModuleConfig {
  baseCurrency: string;
  supportedCurrencies: string[];
  defaultAccounts?: {
    revenue: string;
    tax: string;
    refunds: string;
    paymentReceivable: string;
  };
  enableMultiCurrency?: boolean;
  autoReconcile?: boolean;
}

/**
 * Geo module configuration overrides
 */
export interface GeoModuleConfig {
  enableDeliveryZones?: boolean;
  enablePickupLocations?: boolean;
  defaultCountry?: string;
  supportedCountries?: string[];
  enableTaxCalculation?: boolean;
}

/**
 * Workflow module configuration overrides
 */
export interface WorkflowModuleConfig {
  defaultTimeout?: number;
  maxRetries?: number;
  enableManualApproval?: boolean;
}

/**
 * Notification module configuration overrides
 */
export interface NotificationModuleConfig {
  enabledChannels?: ("email" | "sms" | "push" | "webhook")[];
  defaultSender?: string;
  retryAttempts?: number;
}

/**
 * Identity module configuration overrides
 */
export interface IdentityModuleConfig {
  requireEmailVerification?: boolean;
  requirePhoneVerification?: boolean;
  allowSocialLogin?: boolean;
  mfaEnabled?: boolean;
  sessionTimeout?: number;
}

/**
 * All module configuration types
 */
export type ModuleConfig =
  | CatalogModuleConfig
  | InventoryModuleConfig
  | LedgerModuleConfig
  | GeoModuleConfig
  | WorkflowModuleConfig
  | NotificationModuleConfig
  | IdentityModuleConfig;

/**
 * Per-module configuration overrides for a Compose
 */
export interface ComposeModuleConfig {
  catalog?: CatalogModuleConfig;
  inventory?: InventoryModuleConfig;
  ledger?: LedgerModuleConfig;
  geo?: GeoModuleConfig;
  workflow?: WorkflowModuleConfig;
  notification?: NotificationModuleConfig;
  identity?: IdentityModuleConfig;
}

// ============================================================================
// Actor Roles & Permissions
// ============================================================================

/**
 * Actor roles in the ecommerce system
 */
export type ActorRole =
  | "super-admin" // Platform owner - Global all orgs
  | "store-admin" // Merchant / Store manager - Org-scoped, full store access
  | "store-staff" // Warehouse, support staff - Org-scoped, limited
  | "customer" // Registered buyer - Self-scoped, own data only
  | "guest" // Anonymous visitor - Public, read-only catalog
  | "api-integration"; // External system API key - Declared scopes only

/**
 * Permission level for access control
 */
export type PermissionLevel = "allowed" | "denied" | "own-only";

/**
 * Single permission entry mapping resource:action to permission level
 */
export interface PermissionEntry {
  resource: string;
  action: string;
  level: PermissionLevel;
}

/**
 * Permission mapping for a specific role
 */
export interface RolePermissions {
  role: ActorRole;
  permissions: PermissionEntry[];
}

/**
 * Complete permission matrix across all roles
 */
export interface PermissionMatrix {
  roles: RolePermissions[];
  // Helper to check permission quickly
  checkPermission(
    role: ActorRole,
    resource: string,
    action: string,
  ): PermissionLevel;
}

// ============================================================================
// Compose Definition
// ============================================================================

/**
 * Supported modules in the ecommerce compose
 */
export type ComposeModuleId =
  | "identity"
  | "catalog"
  | "inventory"
  | "ledger"
  | "workflow"
  | "geo"
  | "notification"
  | "analytics";

/**
 * Main compose configuration
 */
export interface ComposeDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  modules: ComposeModuleId[];
  moduleConfig?: ComposeModuleConfig;
  permissions?: PermissionMatrix;
  hooks?: ComposeHookDefinition[];
  rules?: ComposeRuleDefinition[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Hook definition within a compose
 */
export interface ComposeHookDefinition {
  id?: string;
  on: string; // event pattern
  filter?: Record<string, unknown>;
  handler: string; // handler reference or inline
}

/**
 * Rule definition within a compose
 */
export interface ComposeRuleDefinition {
  id: string;
  scope: string;
  guard?: Record<string, unknown>;
  condition?: Record<string, unknown>;
  action?: string;
  approverRole?: ActorRole;
}

// ============================================================================
// Default Permission Matrix Factory
// ============================================================================

/**
 * Creates the default ecommerce permission matrix
 */
export function createDefaultPermissionMatrix(): PermissionMatrix {
  const roles: RolePermissions[] = [
    {
      role: "super-admin",
      permissions: [
        { resource: "catalog", action: "read", level: "allowed" },
        { resource: "catalog", action: "create", level: "allowed" },
        { resource: "catalog", action: "update", level: "allowed" },
        { resource: "catalog", action: "delete", level: "allowed" },
        { resource: "catalog", action: "publish", level: "allowed" },
        { resource: "inventory", action: "read", level: "allowed" },
        { resource: "inventory", action: "adjust", level: "allowed" },
        { resource: "inventory", action: "transfer", level: "allowed" },
        { resource: "order", action: "create", level: "allowed" },
        { resource: "order", action: "read", level: "allowed" },
        { resource: "order", action: "update-status", level: "allowed" },
        { resource: "order", action: "cancel", level: "allowed" },
        { resource: "order", action: "refund", level: "allowed" },
        { resource: "ledger", action: "read", level: "allowed" },
        { resource: "ledger", action: "post", level: "allowed" },
        { resource: "actor", action: "manage", level: "allowed" },
        { resource: "actor", action: "read-self", level: "denied" },
        { resource: "analytics", action: "read", level: "allowed" },
        { resource: "notification", action: "manage", level: "allowed" },
        { resource: "address", action: "manage", level: "allowed" },
        { resource: "coupon", action: "create", level: "allowed" },
        { resource: "coupon", action: "apply", level: "allowed" },
        { resource: "review", action: "create", level: "allowed" },
        { resource: "review", action: "read", level: "allowed" },
        { resource: "review", action: "moderate", level: "allowed" },
      ],
    },
    {
      role: "store-admin",
      permissions: [
        { resource: "catalog", action: "read", level: "allowed" },
        { resource: "catalog", action: "create", level: "allowed" },
        { resource: "catalog", action: "update", level: "allowed" },
        { resource: "catalog", action: "delete", level: "allowed" },
        { resource: "catalog", action: "publish", level: "allowed" },
        { resource: "inventory", action: "read", level: "allowed" },
        { resource: "inventory", action: "adjust", level: "allowed" },
        { resource: "inventory", action: "transfer", level: "allowed" },
        { resource: "order", action: "create", level: "allowed" },
        { resource: "order", action: "read", level: "allowed" },
        { resource: "order", action: "update-status", level: "allowed" },
        { resource: "order", action: "cancel", level: "allowed" },
        { resource: "order", action: "refund", level: "allowed" },
        { resource: "ledger", action: "read", level: "allowed" },
        { resource: "ledger", action: "post", level: "denied" },
        { resource: "actor", action: "manage", level: "allowed" },
        { resource: "actor", action: "read-self", level: "denied" },
        { resource: "analytics", action: "read", level: "allowed" },
        { resource: "notification", action: "manage", level: "allowed" },
        { resource: "address", action: "manage", level: "allowed" },
        { resource: "coupon", action: "create", level: "allowed" },
        { resource: "coupon", action: "apply", level: "allowed" },
        { resource: "review", action: "create", level: "denied" },
        { resource: "review", action: "read", level: "allowed" },
        { resource: "review", action: "moderate", level: "allowed" },
      ],
    },
    {
      role: "store-staff",
      permissions: [
        { resource: "catalog", action: "read", level: "allowed" },
        { resource: "catalog", action: "create", level: "denied" },
        { resource: "catalog", action: "update", level: "denied" },
        { resource: "catalog", action: "delete", level: "denied" },
        { resource: "catalog", action: "publish", level: "denied" },
        { resource: "inventory", action: "read", level: "allowed" },
        { resource: "inventory", action: "adjust", level: "allowed" },
        { resource: "inventory", action: "transfer", level: "allowed" },
        { resource: "order", action: "create", level: "denied" },
        { resource: "order", action: "read", level: "allowed" },
        { resource: "order", action: "update-status", level: "allowed" },
        { resource: "order", action: "cancel", level: "denied" },
        { resource: "order", action: "refund", level: "denied" },
        { resource: "ledger", action: "read", level: "denied" },
        { resource: "ledger", action: "post", level: "denied" },
        { resource: "actor", action: "manage", level: "denied" },
        { resource: "actor", action: "read-self", level: "denied" },
        { resource: "analytics", action: "read", level: "denied" },
        { resource: "notification", action: "manage", level: "denied" },
        { resource: "address", action: "manage", level: "denied" },
        { resource: "coupon", action: "create", level: "denied" },
        { resource: "coupon", action: "apply", level: "denied" },
        { resource: "review", action: "create", level: "denied" },
        { resource: "review", action: "read", level: "allowed" },
        { resource: "review", action: "moderate", level: "denied" },
      ],
    },
    {
      role: "customer",
      permissions: [
        { resource: "catalog", action: "read", level: "allowed" },
        { resource: "catalog", action: "create", level: "denied" },
        { resource: "catalog", action: "update", level: "denied" },
        { resource: "catalog", action: "delete", level: "denied" },
        { resource: "catalog", action: "publish", level: "denied" },
        { resource: "inventory", action: "read", level: "denied" },
        { resource: "inventory", action: "adjust", level: "denied" },
        { resource: "inventory", action: "transfer", level: "denied" },
        { resource: "order", action: "create", level: "allowed" },
        { resource: "order", action: "read", level: "own-only" },
        { resource: "order", action: "update-status", level: "denied" },
        { resource: "order", action: "cancel", level: "own-only" },
        { resource: "order", action: "refund", level: "denied" },
        { resource: "ledger", action: "read", level: "denied" },
        { resource: "ledger", action: "post", level: "denied" },
        { resource: "actor", action: "manage", level: "denied" },
        { resource: "actor", action: "read-self", level: "allowed" },
        { resource: "analytics", action: "read", level: "denied" },
        { resource: "notification", action: "manage", level: "denied" },
        { resource: "address", action: "manage", level: "own-only" },
        { resource: "coupon", action: "create", level: "denied" },
        { resource: "coupon", action: "apply", level: "allowed" },
        { resource: "review", action: "create", level: "allowed" },
        { resource: "review", action: "read", level: "allowed" },
        { resource: "review", action: "moderate", level: "denied" },
      ],
    },
    {
      role: "guest",
      permissions: [
        { resource: "catalog", action: "read", level: "allowed" },
        { resource: "catalog", action: "create", level: "denied" },
        { resource: "catalog", action: "update", level: "denied" },
        { resource: "catalog", action: "delete", level: "denied" },
        { resource: "catalog", action: "publish", level: "denied" },
        { resource: "inventory", action: "read", level: "denied" },
        { resource: "inventory", action: "adjust", level: "denied" },
        { resource: "inventory", action: "transfer", level: "denied" },
        { resource: "order", action: "create", level: "denied" },
        { resource: "order", action: "read", level: "denied" },
        { resource: "order", action: "update-status", level: "denied" },
        { resource: "order", action: "cancel", level: "denied" },
        { resource: "order", action: "refund", level: "denied" },
        { resource: "ledger", action: "read", level: "denied" },
        { resource: "ledger", action: "post", level: "denied" },
        { resource: "actor", action: "manage", level: "denied" },
        { resource: "actor", action: "read-self", level: "denied" },
        { resource: "analytics", action: "read", level: "denied" },
        { resource: "notification", action: "manage", level: "denied" },
        { resource: "address", action: "manage", level: "denied" },
        { resource: "coupon", action: "create", level: "denied" },
        { resource: "coupon", action: "apply", level: "denied" },
        { resource: "review", action: "create", level: "denied" },
        { resource: "review", action: "read", level: "allowed" },
        { resource: "review", action: "moderate", level: "denied" },
      ],
    },
    {
      role: "api-integration",
      permissions: [], // Scopes declared at API key creation time
    },
  ];

  const matrix: PermissionMatrix = {
    roles,
    checkPermission(role: ActorRole, resource: string, action: string) {
      const rolePerms = this.roles.find((r) => r.role === role);
      if (!rolePerms) return "denied";

      const perm = rolePerms.permissions.find(
        (p) => p.resource === resource && p.action === action,
      );
      return perm?.level ?? "denied";
    },
  };

  return matrix;
}

// ============================================================================
// Common Ecommerce Events
// ============================================================================

/**
 * Common ecommerce events that can be used in hooks
 */
export const EcommerceEvents = {
  ORDER_PLACED: "order.placed",
  PAYMENT_RECEIVED: "payment.received",
  PAYMENT_FAILED: "payment.failed",
  PAYMENT_REFUNDED: "payment.refunded",
  SHIPMENT_DISPATCHED: "shipment.dispatched",
  SHIPMENT_DELIVERED: "shipment.delivered",
  SHIPMENT_RETURNED: "shipment.returned",
  ORDER_CANCELLED: "order.cancelled",
  ORDER_REFUNDED: "order.refunded",
  RETURN_REQUESTED: "return.requested",
  REFUND_ISSUED: "refund.issued",
  INVENTORY_RESERVED: "inventory.reserved",
  INVENTORY_RELEASED: "inventory.released",
  INVENTORY_LOW_STOCK: "inventory.low-stock",
  CUSTOMER_REGISTERED: "customer.registered",
  CUSTOMER_UPDATED: "customer.updated",
  REVIEW_CREATED: "review.created",
  REVIEW_MODERATED: "review.moderated",
  COUPON_APPLIED: "coupon.applied",
  COUPON_CREATED: "coupon.created",
  WORKFLOW_TASK_COMPLETED: "workflow.task.completed",
  WORKFLOW_TASK_FAILED: "workflow.task.failed",
} as const;

export type EcommerceEventType =
  (typeof EcommerceEvents)[keyof typeof EcommerceEvents];
