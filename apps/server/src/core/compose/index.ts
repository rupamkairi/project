// Compose system - Layer 3 of Core → Module → Compose
// Provides compose-level orchestration for ecommerce applications

// Types
export type {
  // Module configuration
  CatalogModuleConfig,
  InventoryModuleConfig,
  LedgerModuleConfig,
  GeoModuleConfig,
  WorkflowModuleConfig,
  NotificationModuleConfig,
  IdentityModuleConfig,
  ModuleConfig,
  ComposeModuleConfig,
  ComposeModuleId,

  // Actor roles & permissions
  ActorRole,
  PermissionLevel,
  PermissionEntry,
  RolePermissions,
  PermissionMatrix,

  // Compose definition
  ComposeDefinition,
  ComposeHookDefinition,
  ComposeRuleDefinition,

  // Events
  EcommerceEventType,
} from "./types";

export {
  // Default permission matrix
  createDefaultPermissionMatrix,

  // Common ecommerce events
  EcommerceEvents,
} from "./types";

// Hooks
export type {
  HookContext,
  HookHandler,
  HookFilter,
  ComposeHook,
  CreateHookOptions,
} from "./hooks";

export {
  // Hook registry
  HookRegistry,
  HookBuilder,

  // Factory functions
  createHookRegistry,
  createHook,
} from "./hooks";

// Rules
export type {
  ComposeRuleScope,
  ComposeRuleAction,
  ComposeRule,
  ComposeRuleResult,
  CreateComposeRuleOptions,
} from "./rules";

export {
  // Rule registry
  ComposeRuleRegistry,

  // Common rules
  CommonComposeRules,

  // Factory function
  createComposeRuleRegistry,
} from "./rules";
