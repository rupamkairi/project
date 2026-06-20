import Elysia from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { bearer } from "@elysiajs/bearer";
import { env } from "./infra/env";
import {
  createModuleRegistry,
  createMediator,
  createSystemContext,
  createEntitySchemaRegistry,
  createFSMEngine,
  createStateMachineRegistry,
  createRuleEngine,
  createAdapterRegistry,
  createInMemoryBridge,
  InMemoryEventBus,
  InMemoryEventStore,
  InMemoryQueue,
  InMemoryScheduler,
  generateId,
  type BootRegistry,
  type StateMachineRegistry,
} from "@core";
import type { Command } from "@core";
import { IdentityModule } from "./modules/identity";
import { CatalogModule } from "./modules/catalog";
import { InventoryModule } from "./modules/inventory";
import { LedgerModule } from "./modules/ledger";
import { WorkflowModule } from "./modules/workflow";
import { SchedulingModule } from "./modules/scheduling";
import { DocumentModule } from "./modules/document";
import { NotificationModule } from "./modules/notification";
import { GeoModule } from "./modules/geo";
import { AnalyticsModule } from "./modules/analytics";
import { CoreError, getHttpStatus } from "@core";
import { createPgSearchAdapter } from "./infra/search";

// Core Layer definitions for introspection
const coreLayer = [
  {
    id: "errors",
    name: "Errors",
    description: "Core error hierarchy and error handling utilities",
    types: [
      "CoreError",
      "NotFoundError",
      "ValidationError",
      "AuthenticationError",
      "AuthorizationError",
      "ConflictError",
      "BusinessError",
      "IntegrationError",
      "Result",
    ],
    filePath: "./core/errors",
  },
  {
    id: "primitives",
    name: "Primitives",
    description: "Basic types like Money and Pagination",
    types: ["Money", "PaginatedResult", "PageOptions", "SortSpec"],
    filePath: "./core/primitives",
  },
  {
    id: "entity",
    name: "Entity",
    description: "Base entity interface, ID generation, and entity utilities",
    types: [
      "Entity",
      "ID",
      "Timestamp",
      "Meta",
      "generateId",
      "generatePrefixedId",
      "createEntity",
      "softDelete",
      "updateEntity",
    ],
    filePath: "./core/entity",
  },
  {
    id: "event",
    name: "Event",
    description: "Domain events, event bus, and event store",
    types: [
      "DomainEvent",
      "EventBus",
      "EventStore",
      "EventHandler",
      "InMemoryEventBus",
      "InMemoryEventStore",
      "createDomainEvent",
    ],
    filePath: "./core/event",
  },
  {
    id: "state",
    name: "State",
    description: "State machine and FSM engine",
    types: [
      "StateMachine",
      "StateNode",
      "Transition",
      "FSMEngine",
      "createFSMEngine",
      "Action",
      "TransitionResult",
    ],
    filePath: "./core/state",
  },
  {
    id: "rule",
    name: "Rule",
    description: "Rule engine for expression evaluation",
    types: [
      "RuleEngine",
      "RuleExpr",
      "RuleExplanation",
      "createRuleEngine",
      "Op",
    ],
    filePath: "./core/rule",
  },
  {
    id: "cqrs",
    name: "CQRS",
    description:
      "Command Query Responsibility Segregation - mediator and handlers",
    types: [
      "Command",
      "Query",
      "CommandHandler",
      "QueryHandler",
      "Mediator",
      "createMediator",
      "MediatorMiddleware",
    ],
    filePath: "./core/cqrs",
  },
  {
    id: "context",
    name: "Context",
    description: "System context and runtime environment",
    types: [
      "SystemContext",
      "SystemContextOptions",
      "createSystemContext",
      "Logger",
      "Queue",
      "Job",
      "JobOptions",
    ],
    filePath: "./core/context",
  },
  {
    id: "repository",
    name: "Repository",
    description: "Repository interfaces for data access",
    types: ["Repository", "Filter", "QueryOptions", "BaseRepository"],
    filePath: "./core/repository",
  },
  {
    id: "realtime",
    name: "Realtime",
    description: "Real-time communication interfaces",
    types: [
      "RealTimeGateway",
      "RealTimeBridge",
      "RealTimeClient",
      "RealtimeMessage",
      "RealtimeServerMessage",
    ],
    filePath: "./core/realtime",
  },
  {
    id: "queue",
    name: "Queue",
    description: "Background job processing interfaces",
    types: [
      "Queue",
      "Worker",
      "Scheduler",
      "Job",
      "JobOptions",
      "JobStatus",
      "BulkJob",
    ],
    filePath: "./core/queue",
  },
  {
    id: "module",
    name: "Module",
    description: "Module system and registry",
    types: [
      "ModuleManifest",
      "AppModule",
      "ModuleRegistry",
      "BootRegistry",
      "createModuleRegistry",
    ],
    filePath: "./core/module",
  },
];

// Database schema definitions
const dbSchemas = [
  {
    id: "identity",
    name: "Identity",
    tables: [
      "organizations",
      "actors",
      "roles",
      "actor_roles",
      "sessions",
      "api_keys",
    ],
    filePath: "./infra/db/schema/identity",
  },
  {
    id: "catalog",
    name: "Catalog",
    tables: [
      "cat_categories",
      "cat_items",
      "cat_variants",
      "cat_price_lists",
      "cat_price_rules",
    ],
    filePath: "./infra/db/schema/catalog",
  },
  {
    id: "inventory",
    name: "Inventory",
    tables: ["inv_stocks", "inv_movements", "inv_locations"],
    filePath: "./infra/db/schema/inventory",
  },
  {
    id: "ledger",
    name: "Ledger",
    tables: ["led_accounts", "led_transactions", "led_journals"],
    filePath: "./infra/db/schema/ledger",
  },
  {
    id: "workflow",
    name: "Workflow",
    tables: ["wf_workflows", "wf_instances", "wf_tasks"],
    filePath: "./infra/db/schema/workflow",
  },
  {
    id: "scheduling",
    name: "Scheduling",
    tables: ["sch_calendars", "sch_events", "sch_recurring"],
    filePath: "./infra/db/schema/scheduling",
  },
  {
    id: "document",
    name: "Document",
    tables: ["doc_documents", "doc_versions", "doc_folders"],
    filePath: "./infra/db/schema/document",
  },
  {
    id: "notification",
    name: "Notification",
    tables: ["not_notifications", "not_channels", "not_preferences"],
    filePath: "./infra/db/schema/notification",
  },
  {
    id: "geo",
    name: "Geo",
    tables: ["geo_locations", "geo_regions", "geo_boundaries"],
    filePath: "./infra/db/schema/geo",
  },
  {
    id: "analytics",
    name: "Analytics",
    tables: ["ana_events", "ana_metrics", "ana_reports"],
    filePath: "./infra/db/schema/analytics",
  },
  {
    id: "events",
    name: "Events",
    tables: ["domain_events"],
    filePath: "./infra/db/schema/events",
  },
  {
    id: "outbox",
    name: "Outbox",
    tables: ["outbox"],
    filePath: "./infra/db/schema/outbox",
  },
  {
    id: "storage",
    name: "Storage",
    tables: ["storage_files"],
    filePath: "./infra/db/schema/storage",
  },
];

// All module layers
const moduleLayers = [
  IdentityModule,
  CatalogModule,
  InventoryModule,
  LedgerModule,
  WorkflowModule,
  SchedulingModule,
  DocumentModule,
  NotificationModule,
  GeoModule,
  AnalyticsModule,
];

async function main() {
  // --- Build BootRegistry ---
  const fsmEngine = createFSMEngine();

  // FSM registry adapter — routes fsms.register() into the engine so
  // context.fsm.transition() finds the same machines
  const fsmRegistry: StateMachineRegistry = {
    register: (m) => fsmEngine.register(m),
    resolve: (id) => fsmEngine.resolve(id),
    list: () => [],
  };

  const bus = new InMemoryEventBus();
  const store = new InMemoryEventStore();
  const realtimeBridge = createInMemoryBridge();

  const mediator = createMediator({
    contextFactory: (req) =>
      createSystemContext({
        actorId: req.actorId,
        orgId: req.orgId,
        correlationId: "correlationId" in req ? (req as Command).correlationId : generateId(),
        eventBus: bus,
        fsm: fsmEngine,
        logger: console as any,
      }),
  });

  // Minimal DatabaseAdapter stub — identity module imports @db/client directly,
  // so registry.db is unused. Other modules may swap this for a real adapter.
  const dbAdapter: BootRegistry["db"] = {
    select: async () => [],
    insert: async () => ({} as any),
    update: async () => ({} as any),
    deleteRow: async () => {},
    transaction: async (fn) => fn({ commit: async () => {}, rollback: async () => {} }),
    raw: async () => [],
  };

  const bootRegistry: BootRegistry = {
    mediator,
    bus,
    store,
    schemas: createEntitySchemaRegistry(),
    fsms: fsmRegistry,
    rules: createRuleEngine(),
    queue: new InMemoryQueue(),
    scheduler: new InMemoryScheduler(),
    realtime: realtimeBridge,
    db: dbAdapter,
    adapters: (() => {
      const registry = createAdapterRegistry();
      registry.register("search", createPgSearchAdapter());
      return registry;
    })(),
    logger: console as any,
  };

  const moduleRegistry = createModuleRegistry(bootRegistry);
  moduleRegistry.registerMany(moduleLayers);

  try {
    await moduleRegistry.boot();
    console.log("✓ All modules booted");
  } catch (error) {
    console.error("Failed to boot modules:", error);
    process.exit(1);
  }

  // Dynamic import to avoid circular dependency with platform-compose
  const { createPlatformCompose } = await import("@projectx/platform-server");
  const platformCompose = createPlatformCompose(mediator);

  let app: any = new Elysia()
    // Plugins
    .use(cors())
    .use(swagger())
    .use(bearer())
    // Platform Compose plugin
    .use(platformCompose)
    // Health check
    .get("/health", () => ({
      status: "ok",
      version: env.APP_VERSION,
      timestamp: Date.now(),
    }))
    // List module layers
    .get("/modules", () => ({
      modules: moduleRegistry.getManifests(),
    }))
    // Get core layer
    .get("/core", () => ({
      layers: coreLayer,
    }))
    // Get database schemas
    .get("/schemas", () => ({
      schemas: dbSchemas,
    }))
    // Global error handler
    .onError(({ error, set }) => {
      if (error instanceof CoreError) {
        const status = getHttpStatus(error);
        set.status = status;
        return {
          error: error.name,
          code: error.code,
          message:
            env.NODE_ENV === "production" && status === 500
              ? "Internal server error"
              : error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(error instanceof CoreError && "failures" in error
            ? { failures: (error as any).failures }
            : {}),
        };
      }

      // Unknown error
      set.status = 500;
      return {
        error: "InternalServerError",
        code: "INTERNAL_ERROR",
        message:
          env.NODE_ENV === "production"
            ? "Internal server error"
            : String(error),
      };
    });

  // Start server
  app.listen(env.PORT, () => {
    console.log(`
🚀 Server running at http://localhost:${env.PORT}
📦 Environment: ${env.NODE_ENV}
🔖 Version: ${env.APP_VERSION}
📚 API Docs: http://localhost:${env.PORT}/swagger
    `);
  });
}

main().catch(console.error);
