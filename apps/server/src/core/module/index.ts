// Module system interfaces

import type { Entity } from "../entity";
import type { DomainEvent } from "../event";
import type { Command, Query } from "../cqrs";
import type { StateMachine } from "../state";
import type { ID } from "../entity";

// Module manifest - metadata about a module
export interface ModuleManifest {
  id: string;
  version: string;
  dependsOn: string[];
  entities: string[]; // entity class names
  events: string[]; // event types
  commands: string[]; // command types
  queries: string[]; // query types
  fsms: string[]; // FSM IDs
  migrations: string[]; // migration files
}

// Boot registry - what modules can use during boot
export interface BootRegistry {
  registerCommand(
    type: string,
    handler: (cmd: Command, ctx: SystemContext) => Promise<unknown>,
  ): void;
  registerQuery(
    type: string,
    handler: (q: Query, ctx: SystemContext) => Promise<unknown>,
  ): void;
  registerEventHandler(
    pattern: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void;
  registerFSM<S extends string, E extends string>(
    machine: StateMachine<S, E>,
  ): void;
  registerEntity(name: string, schema: unknown): void;
}

// Forward declare SystemContext
export interface SystemContext {
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };
  org: { id: ID; slug: string; settings: Record<string, unknown> };
  correlationId: ID;
  requestId: ID;
  startedAt: number;
}

// App Module interface
export interface AppModule {
  manifest: ModuleManifest;
  boot(registry: BootRegistry): Promise<void>;
  shutdown(): Promise<void>;
}

// Module Registry - manages all modules in the system
export interface ModuleRegistry {
  register(module: AppModule): void;
  registerMany(modules: AppModule[]): void;
  getModule(id: string): AppModule | undefined;
  getAllModules(): AppModule[];
  getManifests(): ModuleManifest[];
  bootRegistered(): Promise<void>;
  bootAll(): Promise<void>;
  shutdownAll(): Promise<void>;
}

// Create a module registry
export function createModuleRegistry(options?: {
  bootRegistry?:
    | Partial<BootRegistry>
    | (() => Partial<BootRegistry> | undefined);
}): ModuleRegistry {
  const modules = new Map<string, AppModule>();

  function createBootRegistry(): BootRegistry {
    const provided =
      typeof options?.bootRegistry === "function"
        ? options.bootRegistry() ?? {}
        : options?.bootRegistry ?? {};

    return {
      registerCommand: provided.registerCommand ?? (() => {}),
      registerQuery: provided.registerQuery ?? (() => {}),
      registerEventHandler: provided.registerEventHandler ?? (() => {}),
      registerFSM: provided.registerFSM ?? (() => {}),
      registerEntity: provided.registerEntity ?? (() => {}),
    };
  }

  // Sort modules by dependencies
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
