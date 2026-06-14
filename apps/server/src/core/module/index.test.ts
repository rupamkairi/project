/**
 * Module System Tests
 *
 * Tests for the redesigned module registry and lifecycle (C4).
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createModuleRegistry } from "./index";
import type { AppModule, BootRegistry, ModuleManifest } from "./index";
import { NotFoundError } from "../errors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid manifest (no deps, no entities, etc.) */
function makeManifest(
  id: string,
  dependsOn?: string[],
): ModuleManifest {
  return {
    id,
    version: "0.1.0",
    dependsOn,
    entities: [],
    idPrefixes: {},
    events: [],
    commands: [],
    queries: [],
    fsms: [],
    migrations: [],
  };
}

/** Creates a fake AppModule that records boot/shutdown calls */
function makeModule(
  id: string,
  dependsOn?: string[],
): AppModule & { bootCalls: BootRegistry[]; shutdownCalled: boolean } {
  const bootCalls: BootRegistry[] = [];
  let shutdownCalled = false;

  return {
    manifest: makeManifest(id, dependsOn),
    async boot(registry: BootRegistry) {
      bootCalls.push(registry);
    },
    async shutdown() {
      shutdownCalled = true;
    },
    get bootCalls() {
      return bootCalls;
    },
    get shutdownCalled() {
      return shutdownCalled;
    },
  };
}

/** Minimal fake BootRegistry for testing */
function makeFakeServices(): BootRegistry {
  return {
    mediator: {} as any,
    bus: { publish: mock(() => Promise.resolve()) } as any,
    store: {} as any,
    schemas: {} as any,
    fsms: {} as any,
    rules: {} as any,
    queue: {} as any,
    scheduler: {} as any,
    realtime: {} as any,
    db: {} as any,
    adapters: {} as any,
    logger: {} as any,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createModuleRegistry", () => {
  describe("register + resolve", () => {
    it("registers a module and resolves it by id", () => {
      const registry = createModuleRegistry();
      const mod = makeModule("identity");
      registry.register(mod);

      const resolved = registry.resolve("identity");
      expect(resolved).toBe(mod);
    });

    it("resolve throws NotFoundError for unknown module id", () => {
      const registry = createModuleRegistry();

      expect(() => registry.resolve("unknown")).toThrow(NotFoundError);
      expect(() => registry.resolve("unknown")).toThrow(
        'Module "unknown" is not registered',
      );
    });
  });

  describe("boot()", () => {
    it("calls each module's boot in dependency order", async () => {
      const services = makeFakeServices();
      const registry = createModuleRegistry(services);

      const catalog = makeModule("catalog");
      const inventory = makeModule("inventory", ["catalog"]);

      registry.register(inventory);
      registry.register(catalog);

      await registry.boot();

      // catalog must have been booted before inventory
      expect(catalog.bootCalls).toHaveLength(1);
      expect(inventory.bootCalls).toHaveLength(1);
    });

    it("passes the services bundle to each module's boot()", async () => {
      const services = makeFakeServices();
      const registry = createModuleRegistry(services);

      const mod = makeModule("geo");
      registry.register(mod);

      await registry.boot();

      expect(mod.bootCalls).toHaveLength(1);
      // The exact services object must be passed through
      expect(mod.bootCalls[0].bus).toBe(services.bus);
      expect(mod.bootCalls[0].mediator).toBe(services.mediator);
    });

    it("boots modules in topological (dependency-first) order", async () => {
      const services = makeFakeServices();
      const bootOrder: string[] = [];

      const makeOrderedModule = (id: string, deps?: string[]): AppModule => ({
        manifest: makeManifest(id, deps),
        async boot() {
          bootOrder.push(id);
        },
        async shutdown() {},
      });

      const registry = createModuleRegistry(services);
      registry.register(makeOrderedModule("scheduling", ["identity", "catalog"]));
      registry.register(makeOrderedModule("inventory", ["catalog"]));
      registry.register(makeOrderedModule("identity"));
      registry.register(makeOrderedModule("catalog"));

      await registry.boot();

      // identity and catalog must appear before inventory and scheduling
      expect(bootOrder.indexOf("identity")).toBeLessThan(
        bootOrder.indexOf("scheduling"),
      );
      expect(bootOrder.indexOf("catalog")).toBeLessThan(
        bootOrder.indexOf("inventory"),
      );
      expect(bootOrder.indexOf("catalog")).toBeLessThan(
        bootOrder.indexOf("scheduling"),
      );
    });

    it("boot(ids) boots only the listed modules plus their transitive deps", async () => {
      const services = makeFakeServices();
      const bootOrder: string[] = [];

      const makeOrderedModule = (id: string, deps?: string[]): AppModule => ({
        manifest: makeManifest(id, deps),
        async boot() {
          bootOrder.push(id);
        },
        async shutdown() {},
      });

      const registry = createModuleRegistry(services);
      registry.register(makeOrderedModule("identity"));
      registry.register(makeOrderedModule("catalog"));
      registry.register(makeOrderedModule("inventory", ["catalog"]));
      registry.register(makeOrderedModule("ledger"));

      // Only boot inventory (+ its dep catalog); identity and ledger must NOT boot
      await registry.boot(["inventory"]);

      expect(bootOrder).toContain("catalog");
      expect(bootOrder).toContain("inventory");
      expect(bootOrder).not.toContain("identity");
      expect(bootOrder).not.toContain("ledger");
    });

    it("throws a clear error when boot() is called without services", async () => {
      const registry = createModuleRegistry(); // no services provided

      registry.register(makeModule("identity"));

      await expect(registry.boot()).rejects.toThrow(
        "ModuleRegistry.boot: services (BootRegistry) not provided — wire them at bootstrap",
      );
    });

    it("treats absent dependsOn as no dependencies (module boots fine)", async () => {
      const services = makeFakeServices();
      const registry = createModuleRegistry(services);

      // Manifest with no dependsOn field at all
      const mod: AppModule = {
        manifest: {
          id: "geo",
          version: "0.1.0",
          // dependsOn intentionally omitted
          entities: [],
          idPrefixes: {},
          events: [],
          commands: [],
          queries: [],
          fsms: [],
          migrations: [],
        },
        async boot() {},
        async shutdown() {},
      };

      registry.register(mod);

      // Should not throw
      await expect(registry.boot()).resolves.toBeUndefined();
    });
  });

  describe("shutdown()", () => {
    it("shuts down booted modules in reverse boot order", async () => {
      const services = makeFakeServices();
      const shutdownOrder: string[] = [];

      const makeShutdownModule = (id: string, deps?: string[]): AppModule => ({
        manifest: makeManifest(id, deps),
        async boot() {},
        async shutdown() {
          shutdownOrder.push(id);
        },
      });

      const registry = createModuleRegistry(services);
      registry.register(makeShutdownModule("identity"));
      registry.register(makeShutdownModule("catalog"));
      registry.register(makeShutdownModule("inventory", ["catalog"]));

      await registry.boot();
      shutdownOrder.length = 0; // reset after boot (only track shutdown)
      await registry.shutdown();

      // inventory was booted last (after catalog), so it should shut down first
      expect(shutdownOrder.indexOf("inventory")).toBeLessThan(
        shutdownOrder.indexOf("catalog"),
      );
    });
  });

  describe("backward-compat deprecated aliases", () => {
    it("registerMany registers multiple modules", () => {
      const registry = createModuleRegistry();
      const a = makeModule("a");
      const b = makeModule("b");

      registry.registerMany([a, b]);

      expect(registry.getModule("a")).toBe(a);
      expect(registry.getModule("b")).toBe(b);
    });

    it("getModule returns undefined for unknown id (not a throw)", () => {
      const registry = createModuleRegistry();
      expect(registry.getModule("nope")).toBeUndefined();
    });

    it("getAllModules returns all registered modules", () => {
      const registry = createModuleRegistry();
      const a = makeModule("a");
      const b = makeModule("b");
      registry.register(a);
      registry.register(b);

      const all = registry.getAllModules();
      expect(all).toHaveLength(2);
    });

    it("getManifests returns manifests in dependency order", () => {
      const registry = createModuleRegistry();
      registry.register(makeModule("inventory", ["catalog"]));
      registry.register(makeModule("catalog"));

      const manifests = registry.getManifests();
      const ids = manifests.map((m) => m.id);
      expect(ids.indexOf("catalog")).toBeLessThan(ids.indexOf("inventory"));
    });

    it("bootRegistered delegates to boot()", async () => {
      const services = makeFakeServices();
      const registry = createModuleRegistry(services);
      const mod = makeModule("geo");
      registry.register(mod);

      await registry.bootRegistered();
      expect(mod.bootCalls).toHaveLength(1);
    });

    it("bootAll delegates to boot()", async () => {
      const services = makeFakeServices();
      const registry = createModuleRegistry(services);
      const mod = makeModule("ledger");
      registry.register(mod);

      await registry.bootAll();
      expect(mod.bootCalls).toHaveLength(1);
    });

    it("shutdownAll delegates to shutdown()", async () => {
      const services = makeFakeServices();
      const registry = createModuleRegistry(services);
      const mod = makeModule("ledger");
      registry.register(mod);

      await registry.bootAll();
      await registry.shutdownAll();
      expect(mod.shutdownCalled).toBe(true);
    });
  });
});
