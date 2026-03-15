/**
 * Module System
 *
 * Module registry and boot system for pluggable bounded contexts.
 *
 * @category Core
 * @packageDocumentation
 */

import type { Entity } from "../entity";
import type { DomainEvent } from "../event";
import type { Command, Query } from "../cqrs";
import type { StateMachine } from "../state";
import type { ID } from "../entity";

/**
 * Module manifest declaring module metadata and capabilities.
 *
 * @example
 * ```typescript
 * const manifest: ModuleManifest = {
 *   id: "identity",
 *   version: "1.0.0",
 *   dependsOn: [],
 *   entities: ["User", "Organization", "Role"],
 *   events: ["user.created", "user.deleted"],
 *   commands: ["user.create", "user.update"],
 *   queries: ["user.get", "user.list"],
 *   fsms: ["user:lifecycle"],
 *   migrations: ["001_create_users", "002_create_roles"]
 * };
 * ```
 *
 * @category Core
 */
export interface ModuleManifest {
  /**
   * Unique module identifier
   */
  id: string;

  /**
   * Module version (semver)
   */
  version: string;

  /**
   * List of module IDs this module depends on
   */
  dependsOn: string[];

  /**
   * Entity class names provided by this module
   */
  entities: string[];

  /**
   * Event types emitted by this module
   */
  events: string[];

  /**
   * Command types handled by this module
   */
  commands: string[];

  /**
   * Query types handled by this module
   */
  queries: string[];

  /**
   * FSM IDs defined by this module
   */
  fsms: string[];

  /**
   * Database migration files
   */
  migrations: string[];
}

/**
 * Boot registry for module initialization.
 *
 * Provided to modules during boot phase for registration.
 *
 * @category Core
 */
export interface BootRegistry {
  /**
   * Registers a command handler.
   *
   * @param type - Command type
   * @param handler - Command handler function
   */
  registerCommand(
    type: string,
    handler: (cmd: Command, ctx: SystemContext) => Promise<unknown>,
  ): void;

  /**
   * Registers a query handler.
   *
   * @param type - Query type
   * @param handler - Query handler function
   */
  registerQuery(
    type: string,
    handler: (q: Query, ctx: SystemContext) => Promise<unknown>,
  ): void;

  /**
   * Registers an event handler with pattern matching.
   *
   * @param pattern - Event pattern (e.g., "user.*", "*.created")
   * @param handler - Event handler function
   */
  registerEventHandler(
    pattern: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void;

  /**
   * Registers a state machine.
   *
   * @param machine - State machine definition
   */
  registerFSM<S extends string, E extends string>(
    machine: StateMachine<S, E>,
  ): void;

  /**
   * Registers an entity schema.
   *
   * @param name - Entity name
   * @param schema - Entity schema
   */
  registerEntity(name: string, schema: unknown): void;
}

/**
 * System context for module execution.
 *
 * @category Core
 */
export interface SystemContext {
  /**
   * Current actor information
   */
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };

  /**
   * Organization information
   */
  org: { id: ID; slug: string; settings: Record<string, unknown> };

  /**
   * Correlation ID for tracing
   */
  correlationId: ID;

  /**
   * Request ID for this operation
   */
  requestId: ID;

  /**
   * Timestamp when execution started
   */
  startedAt: number;
}

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
 *     dependsOn: [],
 *     entities: ["User", "Organization"],
 *     events: ["user.created"],
 *     commands: ["user.create"],
 *     queries: ["user.get"],
 *     fsms: ["user:lifecycle"],
 *     migrations: ["001_create_users"]
 *   },
 *
 *   async boot(registry) {
 *     registry.registerCommand("user.create", handleCreateUser);
 *     registry.registerQuery("user.get", handleGetUser);
 *     registry.registerEventHandler("user.*", handleUserEvents);
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
  /**
   * Module manifest with metadata
   */
  manifest: ModuleManifest;

  /**
   * Bootstraps the module.
   *
   * Called during application startup in dependency order.
   *
   * @param registry - Boot registry for registrations
   */
  boot(registry: BootRegistry): Promise<void>;

  /**
   * Shuts down the module.
   *
   * Called during application shutdown in reverse dependency order.
   */
  shutdown(): Promise<void>;
}

/**
 * Module registry interface for managing module lifecycle.
 *
 * @category Core
 */
export interface ModuleRegistry {
  /**
   * Registers a single module.
   *
   * @param module - Module to register
   */
  register(module: AppModule): void;

  /**
   * Registers multiple modules.
   *
   * @param modules - Modules to register
   */
  registerMany(modules: AppModule[]): void;

  /**
   * Gets a module by ID.
   *
   * @param id - Module ID
   * @returns Module or undefined
   */
  getModule(id: string): AppModule | undefined;

  /**
   * Gets all registered modules.
   *
   * @returns Array of modules
   */
  getAllModules(): AppModule[];

  /**
   * Gets manifests of all modules in dependency order.
   *
   * @returns Array of manifests
   */
  getManifests(): ModuleManifest[];

  /**
   * Boots all registered modules in dependency order.
   */
  bootRegistered(): Promise<void>;

  /**
   * Boots all modules (alias for bootRegistered).
   */
  bootAll(): Promise<void>;

  /**
   * Shuts down all modules in reverse dependency order.
   */
  shutdownAll(): Promise<void>;
}

/**
 * Options for creating a module registry.
 *
 * @category Core
 */
export interface CreateModuleRegistryOptions {
  /**
   * Custom boot registry or factory
   */
  bootRegistry?:
    | Partial<BootRegistry>
    | (() => Partial<BootRegistry> | undefined);
}

/**
 * Creates a module registry with dependency-ordered boot/shutdown.
 *
 * @param options - Registry options
 * @returns Module registry instance
 *
 * @example
 * ```typescript
 * const registry = createModuleRegistry();
 *
 * // Register modules
 * registry.registerMany([
 *   IdentityModule,
 *   CatalogModule,
 *   OrderModule
 * ]);
 *
 * // Boot all modules (in dependency order)
 * await registry.bootRegistered();
 *
 * // Get module info
 * const manifests = registry.getManifests();
 * console.log(`Loaded ${manifests.length} modules`);
 *
 * // Shutdown
 * await registry.shutdownAll();
 * ```
 *
 * @category Core
 */
export function createModuleRegistry(
  options?: CreateModuleRegistryOptions,
): ModuleRegistry {
  const modules = new Map<string, AppModule>();

  function createBootRegistry(): BootRegistry {
    const provided =
      typeof options?.bootRegistry === "function"
        ? (options.bootRegistry() ?? {})
        : (options?.bootRegistry ?? {});

    return {
      registerCommand: provided.registerCommand ?? (() => {}),
      registerQuery: provided.registerQuery ?? (() => {}),
      registerEventHandler: provided.registerEventHandler ?? (() => {}),
      registerFSM: provided.registerFSM ?? (() => {}),
      registerEntity: provided.registerEntity ?? (() => {}),
    };
  }

  /**
   * Sorts modules by dependencies using topological sort.
   *
   * @returns Modules in boot order (dependencies first)
   *
   * @throws Error if circular dependency detected
   *
   * @internal
   */
  function topologicalSort(): AppModule[] {
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
        for (const dep of module.manifest.dependsOn) {
          visit(dep);
        }
        visited.add(id);
        sorted.push(module);
      }
      visiting.delete(id);
    }

    for (const id of modules.keys()) {
      visit(id);
    }

    return sorted;
  }

  return {
    register(module: AppModule): void {
      modules.set(module.manifest.id, module);
    },

    registerMany(entries: AppModule[]): void {
      for (const module of entries) {
        modules.set(module.manifest.id, module);
      }
    },

    getModule(id: string): AppModule | undefined {
      return modules.get(id);
    },

    getAllModules(): AppModule[] {
      return Array.from(modules.values());
    },

    getManifests(): ModuleManifest[] {
      return modules.values().next().value
        ? topologicalSort().map((m) => m.manifest)
        : [];
    },

    async bootRegistered(): Promise<void> {
      const sorted = topologicalSort();
      for (const module of sorted) {
        const registry = createBootRegistry();
        await module.boot(registry);
      }
    },

    async bootAll(): Promise<void> {
      await this.bootRegistered();
    },

    async shutdownAll(): Promise<void> {
      const sorted = topologicalSort().reverse();
      for (const module of sorted) {
        await module.shutdown();
      }
    },
  };
}
