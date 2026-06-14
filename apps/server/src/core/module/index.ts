/**
 * Module System
 *
 * Module registry and boot system for pluggable bounded contexts.
 *
 * @category Core
 * @packageDocumentation
 */

import type { EntitySchema } from "../entity";
import type { EntitySchemaRegistry } from "../entity";
import type { Mediator } from "../cqrs";
import type { EventBus, EventStore } from "../event";
import type { RuleEngine } from "../rule";
import type { Queue, Scheduler } from "../queue";
import type { RealTimeBridge } from "../realtime";
import type { AdapterRegistry } from "../adapters";
import type { Logger, SystemContext } from "../context";
import type { StateMachine } from "../state";
import type { StateMachineRegistry } from "../state";
import type { DatabaseAdapter } from "../repository";
import { NotFoundError } from "../errors";

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/**
 * Database migration definition.
 *
 * @category Core
 */
export interface Migration {
  /** Unique migration identifier (e.g., "001_create_users") */
  id: string;
  /** Apply migration */
  up(): Promise<void>;
  /** Roll back migration */
  down(): Promise<void>;
}

/**
 * Scheduled job definition for cron-based tasks.
 *
 * @category Core
 */
export interface JobDefinition {
  /** Human-readable job name */
  name: string;
  /** Cron expression (e.g., "0 * * * *") */
  cron: string;
}

/**
 * Queue worker definition.
 *
 * @category Core
 */
export interface WorkerDefinition {
  /** Worker name matching the queue name */
  name: string;
  /** Maximum concurrent jobs processed (default: 1) */
  concurrency?: number;
}

// ---------------------------------------------------------------------------
// ModuleManifest
// ---------------------------------------------------------------------------

/**
 * Module manifest declaring module metadata and capabilities.
 *
 * @example
 * ```typescript
 * const manifest: ModuleManifest = {
 *   id: "identity",
 *   version: "1.0.0",
 *   entities: [],
 *   idPrefixes: { User: "usr_", Organization: "org_" },
 *   events: ["user.created", "user.deleted"],
 *   commands: ["user.create", "user.update"],
 *   queries: ["user.get", "user.list"],
 *   fsms: ["user:lifecycle"],
 *   migrations: []
 * };
 * ```
 *
 * @category Core
 */
export interface ModuleManifest {
  /** Unique module identifier */
  id: string;

  /** Module version (semver) */
  version: string;

  /** List of module IDs this module depends on (optional — treated as [] when absent) */
  dependsOn?: string[];

  /** Entity schemas provided by this module */
  entities: EntitySchema[];

  /**
   * ID prefix map for entities owned by this module.
   * @example { Product: 'prod_', Category: 'cat_' }
   */
  idPrefixes: Record<string, string>;

  /** Event types emitted by this module */
  events: string[];

  /** Command types handled by this module */
  commands: string[];

  /** Query types handled by this module */
  queries: string[];

  /** FSM IDs defined by this module */
  fsms: string[];

  /** Database migrations, run in version order */
  migrations: Migration[];

  /** Cron jobs to register on boot */
  scheduledJobs?: JobDefinition[];

  /** Queue workers to register on boot */
  queueWorkers?: WorkerDefinition[];

  /** Defaults for module-level config overrides */
  defaultConfig?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// BootRegistry — service-instance bundle (C4 redesign)
// ---------------------------------------------------------------------------

/**
 * Service-instance bundle passed to each module's boot() function.
 *
 * Modules receive this during startup and wire themselves to the services
 * they need (register command handlers, subscribe to events, etc.).
 *
 * @category Core
 */
export interface BootRegistry {
  mediator: Mediator;
  bus: EventBus;
  store: EventStore;
  schemas: EntitySchemaRegistry;
  fsms: StateMachineRegistry;
  rules: RuleEngine;
  queue: Queue;
  scheduler: Scheduler;
  realtime: RealTimeBridge;
  db: DatabaseAdapter;
  adapters: AdapterRegistry;
  logger: Logger;
}

// ---------------------------------------------------------------------------
// Re-export SystemContext (C3 compat — canonical def lives in ../context)
// ---------------------------------------------------------------------------

/**
 * Re-export SystemContext so that existing imports of
 * `SystemContext` from "../module" continue to resolve.
 * The canonical definition lives in ../context.
 */
export type { SystemContext };

// ---------------------------------------------------------------------------
// AppModule
// ---------------------------------------------------------------------------

/**
 * Application module interface.
 *
 * All modules must implement this interface.
 *
 * @example
 * ```typescript
 * const IdentityModule: AppModule = {
 *   manifest: {
 *     id: "identity",
 *     version: "1.0.0",
 *     entities: [],
 *     idPrefixes: { User: "usr_" },
 *     events: ["user.created"],
 *     commands: ["user.create"],
 *     queries: ["user.get"],
 *     fsms: ["user:lifecycle"],
 *     migrations: []
 *   },
 *
 *   async boot(registry) {
 *     registry.mediator.registerCommand("user.create", handleCreateUser);
 *   },
 *
 *   async shutdown() {
 *     // Cleanup resources
 *   }
 * };
 * ```
 *
 * @category Core
 */
export interface AppModule {
  /** Module manifest with metadata */
  manifest: ModuleManifest;

  /**
   * Bootstraps the module.
   *
   * Called during application startup in dependency order.
   * The registry bundle provides all platform services.
   *
   * @param registry - Service-instance bundle
   */
  boot(registry: BootRegistry): Promise<void>;

  /**
   * Shuts down the module.
   *
   * Called during application shutdown in reverse dependency order.
   */
  shutdown(): Promise<void>;
}

// ---------------------------------------------------------------------------
// ModuleRegistry
// ---------------------------------------------------------------------------

/**
 * Module registry interface for managing module lifecycle.
 *
 * @category Core
 */
export interface ModuleRegistry {
  /** Registers a single module. */
  register(module: AppModule): void;

  /**
   * Resolves a registered module by ID.
   *
   * @throws {NotFoundError} if the module is not registered
   */
  resolve(id: string): AppModule;

  /**
   * Boots registered modules in topological (dependency) order.
   *
   * @param ids - If provided, boot only these modules plus their transitive deps.
   *              If omitted, boot all registered modules.
   * @throws Error if BootRegistry services were not provided to createModuleRegistry
   */
  boot(ids?: string[]): Promise<void>;

  /** Shuts down all booted modules in reverse boot order. */
  shutdown(): Promise<void>;

  // -----------------------------------------------------------------------
  // Deprecated aliases — Wave 2 removes these
  // -----------------------------------------------------------------------

  /**
   * @deprecated Use register() instead. Will be removed in Wave 2.
   */
  registerMany(modules: AppModule[]): void;

  /**
   * @deprecated Use resolve() instead (resolve throws on missing). Will be removed in Wave 2.
   */
  getModule(id: string): AppModule | undefined;

  /**
   * @deprecated Use resolve() or iterate boot order instead. Will be removed in Wave 2.
   */
  getAllModules(): AppModule[];

  /**
   * @deprecated Use resolve().manifest or iterate modules. Will be removed in Wave 2.
   */
  getManifests(): ModuleManifest[];

  /**
   * @deprecated Use boot() instead. Will be removed in Wave 2.
   */
  bootRegistered(): Promise<void>;

  /**
   * @deprecated Use boot() instead. Will be removed in Wave 2.
   */
  bootAll(): Promise<void>;

  /**
   * @deprecated Use shutdown() instead. Will be removed in Wave 2.
   */
  shutdownAll(): Promise<void>;
}

// ---------------------------------------------------------------------------
// createModuleRegistry
// ---------------------------------------------------------------------------

/**
 * Creates a module registry with dependency-ordered boot/shutdown.
 *
 * @param services - Service-instance bundle (BootRegistry) to pass to modules on boot.
 *                   Can be omitted during construction and provided later — but boot()
 *                   will throw if called without services.
 * @returns Module registry instance
 *
 * @example
 * ```typescript
 * const registry = createModuleRegistry(services);
 *
 * registry.register(IdentityModule);
 * registry.register(CatalogModule);
 * registry.register(InventoryModule);
 *
 * // Boot all modules in dependency order
 * await registry.boot();
 *
 * // Boot a subset (+ their transitive deps)
 * await registry.boot(["inventory"]);
 *
 * // Shutdown in reverse order
 * await registry.shutdown();
 * ```
 *
 * @category Core
 */
export function createModuleRegistry(services?: BootRegistry): ModuleRegistry {
  const modules = new Map<string, AppModule>();
  const bootedOrder: string[] = [];

  // Topological sort helper. If `subset` is given, only include those ids
  // plus their transitive dependencies.
  function topologicalSort(subset?: string[]): AppModule[] {
    const sorted: AppModule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function visit(id: string) {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected: ${id}`);
      }

      visiting.add(id);
      const module = modules.get(id);
      if (module) {
        for (const dep of module.manifest.dependsOn ?? []) {
          visit(dep);
        }
        visited.add(id);
        visiting.delete(id);
        sorted.push(module);
      } else {
        visiting.delete(id);
      }
    }

    const roots = subset ?? Array.from(modules.keys());
    for (const id of roots) {
      visit(id);
    }

    return sorted;
  }

  return {
    register(module: AppModule): void {
      modules.set(module.manifest.id, module);
    },

    resolve(id: string): AppModule {
      const module = modules.get(id);
      if (!module) {
        throw new NotFoundError(`Module "${id}" is not registered`);
      }
      return module;
    },

    async boot(ids?: string[]): Promise<void> {
      if (!services) {
        throw new Error(
          "ModuleRegistry.boot: services (BootRegistry) not provided — wire them at bootstrap",
        );
      }

      const sorted = topologicalSort(ids);
      for (const module of sorted) {
        await module.boot(services);
        bootedOrder.push(module.manifest.id);
      }
    },

    async shutdown(): Promise<void> {
      // Shutdown in reverse boot order
      const order = [...bootedOrder].reverse();
      for (const id of order) {
        const module = modules.get(id);
        if (module) {
          await module.shutdown();
        }
      }
      bootedOrder.length = 0;
    },

    // -----------------------------------------------------------------------
    // Deprecated aliases — kept for Wave 1 backward compat
    // -----------------------------------------------------------------------

    /** @deprecated Use register() instead. Will be removed in Wave 2. */
    registerMany(entries: AppModule[]): void {
      for (const module of entries) {
        modules.set(module.manifest.id, module);
      }
    },

    /** @deprecated Use resolve() instead. Will be removed in Wave 2. */
    getModule(id: string): AppModule | undefined {
      return modules.get(id);
    },

    /** @deprecated Use resolve() or boot() for ordering. Will be removed in Wave 2. */
    getAllModules(): AppModule[] {
      return Array.from(modules.values());
    },

    /** @deprecated Use resolve().manifest instead. Will be removed in Wave 2. */
    getManifests(): ModuleManifest[] {
      if (modules.size === 0) return [];
      return topologicalSort().map((m) => m.manifest);
    },

    /** @deprecated Use boot() instead. Will be removed in Wave 2. */
    async bootRegistered(): Promise<void> {
      await this.boot();
    },

    /** @deprecated Use boot() instead. Will be removed in Wave 2. */
    async bootAll(): Promise<void> {
      await this.boot();
    },

    /** @deprecated Use shutdown() instead. Will be removed in Wave 2. */
    async shutdownAll(): Promise<void> {
      await this.shutdown();
    },
  };
}
