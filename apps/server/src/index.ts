// Elysia HTTP Server Entry Point

import Elysia from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { bearer } from "@elysiajs/bearer";
import { env } from "./infra/env";
import { createModuleRegistry } from "./core/module";
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
import { EcommerceModule } from "./modules/ecommerce";
import { adminRoutes, storefrontRoutes } from "./modules/ecommerce/routes";
import { CoreError, getHttpStatus } from "./core/errors";

// All modules
const modules = [
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
  EcommerceModule,
];

// Create module registry
const moduleRegistry = createModuleRegistry();

// Register all modules in registry
for (const mod of modules) {
  // Use any cast to avoid complex type issues
  const registry = moduleRegistry as any;
  if (registry.modules) {
    registry.modules.set(mod.manifest.id, mod);
  }
}

// Create Elysia app
const app = new Elysia()
  // Plugins
  .use(cors())
  .use(swagger())
  .use(bearer())
  // Ecommerce routes
  .use(adminRoutes)
  .use(storefrontRoutes)
  // Health check
  .get("/health", () => ({
    status: "ok",
    version: env.APP_VERSION,
    timestamp: Date.now(),
  }))
  // List modules
  .get("/modules", () => {
    return modules.map((m) => m.manifest);
  })
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
        env.NODE_ENV === "production" ? "Internal server error" : String(error),
    };
  });

async function main() {
  // Boot all modules
  try {
    await moduleRegistry.bootAll();
    console.log("✓ All modules booted");
  } catch (error) {
    console.error("Failed to boot modules:", error);
    process.exit(1);
  }

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
