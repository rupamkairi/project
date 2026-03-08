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
];

async function main() {
  const moduleRegistry = createModuleRegistry();
  moduleRegistry.registerMany(modules);

  // Boot all modules
  try {
    await moduleRegistry.bootRegistered();
    console.log("✓ All modules booted");
  } catch (error) {
    console.error("Failed to boot modules:", error);
    process.exit(1);
  }

  let app: any = new Elysia()
    // Plugins
    .use(cors())
    .use(swagger())
    .use(bearer())
    // Health check
    .get("/health", () => ({
      status: "ok",
      version: env.APP_VERSION,
      timestamp: Date.now(),
    }))
    // List modules
    .get("/modules", () => ({
      modules: moduleRegistry.getManifests(),
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
