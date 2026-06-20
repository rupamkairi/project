// Core Layer — Public API
// Single import point for all modules. Never import from internal core paths.
// Grouped by spec section (core.md §"Core Public API").

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------
export type { Entity, ID, Timestamp, Meta } from "./entity";
export {
  generateId,
  generatePrefixedId,
  isValidId,
  extractTimestamp,
  createEntity,
  isDeleted,
  softDelete,
  updateEntity,
} from "./entity";

// IDGenerator
export type { IDGenerator } from "./entity/id";
export { createIdGenerator, defaultIdGenerator } from "./entity/id";

// Schema system
export type {
  FieldType,
  FieldSchema,
  EntitySchema,
  EntityHooks,
  Validator,
  ValidatorFn,
  ValidationContext,
  ValidationResult,
  GeoPoint,
  GeoPolygon,
  GeoLinestring,
} from "./entity/schema";
export { Validators } from "./entity/schema";

// EntitySchemaRegistry
export type { EntitySchemaRegistry } from "./entity/registry";
export { createEntitySchemaRegistry } from "./entity/registry";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export type {
  DomainEvent,
  EventHandler,
  SubscribeOptions,
  Unsubscribe,
  EventBus,
  ReadOptions,
  EventFilter,
  EventStore,
  OutboxRecord,
  EventOutbox,
  CreateDomainEventOptions,
} from "./event";
export {
  createDomainEvent,
  InMemoryEventBus,
  InMemoryEventStore,
  InMemoryEventOutbox,
} from "./event";

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------
export type {
  StateMachine,
  StateNode,
  Transition,
  TimedTransition,
  Action,
  FSMContext,
  TransitionResult,
  FSMEngine,
  StateMachineRegistry,
} from "./state";
export { createFSMEngine, createStateMachineRegistry } from "./state";

// ---------------------------------------------------------------------------
// Rules Engine
// ---------------------------------------------------------------------------
export type { RuleExpr, Op, RuleExplanation, RuleEngine, CompiledRule } from "./rule";
export { createRuleEngine } from "./rule";

// ---------------------------------------------------------------------------
// CQRS
// ---------------------------------------------------------------------------
export type {
  Command,
  Query,
  CommandHandler,
  QueryHandler,
  MediatorMiddleware,
  Mediator,
  MediatorOptions,
} from "./cqrs";
export {
  createMediator,
  AuthorizationMiddleware,
  ValidationMiddleware,
  IdempotencyMiddleware,
  LoggingMiddleware,
  TracingMiddleware,
  RateLimitMiddleware,
  tracingStore,
} from "./cqrs";

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------
export type {
  Transaction,
  DbQuery,
  DatabaseAdapter,
  FilterOperator,
  Filter,
  QueryOptions,
  PaginatedResult,
  Repository,
} from "./repository";
export { BaseRepository } from "./repository";

// ---------------------------------------------------------------------------
// Module System
// ---------------------------------------------------------------------------
export type {
  Migration,
  JobDefinition,
  WorkerDefinition,
  ModuleManifest,
  BootRegistry,
  AppModule,
  ModuleRegistry,
} from "./module";
export { createModuleRegistry } from "./module";

// ---------------------------------------------------------------------------
// Queue and Scheduler
// ---------------------------------------------------------------------------
export type {
  JobStatus,
  JobOptions,
  Job,
  JobHandler,
  Queue,
  ScheduledJob,
  SchedulerOptions,
  Scheduler,
  BulkJob,
  Worker,
} from "./queue";
export { InMemoryQueue, InMemoryScheduler } from "./queue";

// ---------------------------------------------------------------------------
// Real-Time
// ---------------------------------------------------------------------------
export type {
  RealTimeClient,
  RealTimeGateway,
  RealTimeBridge,
  RealtimeMessageType,
  RealtimeMessage,
  RealtimeServerMessageType,
  RealtimeServerMessage,
} from "./realtime";
export { createInMemoryGateway, createInMemoryBridge } from "./realtime";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export type { SystemContext, SystemContextOptions } from "./context";
export type { Logger } from "./context";
export { createSystemContext } from "./context";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export {
  CoreError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  BusinessError,
  IntegrationError,
  isOk,
  isErr,
  getHttpStatus,
} from "./errors";
export type { Result } from "./errors";
export { Ok, Err } from "./errors";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
export type {
  Money,
  SortSpec,
  PageOptions,
} from "./primitives";
export {
  moneyAdd,
  moneySubtract,
  moneyMultiply,
  moneyFormat,
  createPaginatedResult,
  getDefaultPageOptions,
} from "./primitives";

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------
export type {
  AdapterType,
  AdapterRegistry,
  FileMeta,
  StoredFile,
  StorageAdapter,
  NotificationPayload,
  NotificationResult,
  NotificationAdapter,
  PaymentAdapter,
  GeoAdapter,
  SearchAdapter,
  TaxLineItem,
  TaxLine,
  TaxAdapter,
  FulfillmentPackage,
  FulfillmentResult,
  TrackingEvent,
  FulfillmentAdapter,
  EmailMessage,
  EmailSyncAdapter,
  CalendarEvent,
  CalendarSyncAdapter,
  CallRecord,
  TelephonyAdapter,
} from "./adapters";
export { createAdapterRegistry } from "./adapters";
