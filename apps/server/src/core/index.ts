// Core Layer - Public API
// This is the ONLY file that modules should import from

// Errors & Results
export * from "./errors";

// Primitives
export * from "./primitives";

// Entity & ID
export * from "./entity";

// Event Sourcing
export * from "./event";

// State Machine - re-export with explicit names to avoid conflicts
export type {
  StateMachine,
  StateNode,
  Transition,
  TimedTransition,
  Action,
  FSMContext,
  TransitionResult,
  FSMEngine,
} from "./state";
export { createFSMEngine } from "./state";

// Rules Engine - re-export with explicit names to avoid conflicts
export type { RuleExpr, RuleExplanation, RuleEngine } from "./rule";
export { createRuleEngine } from "./rule";

// CQRS
export type {
  Command,
  Query,
  CommandHandler,
  QueryHandler,
  MediatorMiddleware,
  Mediator,
} from "./cqrs";
export { createMediator } from "./cqrs";

// Context - use SystemContext from context (not cqrs)
export type { SystemContext } from "./context";
export { createSystemContext } from "./context";

// Repository
export * from "./repository";

// Module System
export type {
  ModuleManifest,
  BootRegistry,
  AppModule,
  ModuleRegistry,
} from "./module";
export { createModuleRegistry } from "./module";

// Real-time
export * from "./realtime";

// Queue - re-export with explicit names to avoid conflicts
export type {
  Queue,
  Worker,
  Scheduler,
  Job,
  JobOptions,
  JobStatus,
  BulkJob,
} from "./queue";
