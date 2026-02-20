// Worker Entry Point - Queue processor

import { env } from "./infra/env";
import {
  createQueue,
  createWorker,
  closeQueueConnections,
} from "./infra/queue/client";
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

// All modules with their queue names
const moduleQueues = [
  { module: IdentityModule, queues: ["identity"] },
  { module: CatalogModule, queues: ["catalog"] },
  { module: InventoryModule, queues: ["inventory", "catalog"] },
  { module: LedgerModule, queues: ["ledger"] },
  { module: WorkflowModule, queues: ["workflow"] },
  { module: SchedulingModule, queues: ["scheduling"] },
  { module: DocumentModule, queues: ["document"] },
  { module: NotificationModule, queues: ["notification"] },
  { module: GeoModule, queues: ["geo"] },
  { module: AnalyticsModule, queues: ["analytics"] },
];

// Create module registry
const moduleRegistry = createModuleRegistry();

// Register all modules in registry
for (const { module: mod } of moduleQueues) {
  const registry = moduleRegistry as any;
  if (registry.modules) {
    registry.modules.set(mod.manifest.id, mod);
  }
}

// Track workers
const workers: Array<{
  name: string;
  worker: ReturnType<typeof createWorker>;
}> = [];

async function main() {
  console.log("Starting worker process...");
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Version: ${env.APP_VERSION}`);

  // Boot all modules
  try {
    await moduleRegistry.bootAll();
    console.log("✓ All modules booted");
  } catch (error) {
    console.error("Failed to boot modules:", error);
    process.exit(1);
  }

  // Create queues and workers for each module
  for (const { module: _mod, queues } of moduleQueues) {
    for (const queueName of queues) {
      // Create queue
      const queue = createQueue(queueName);
      console.log(`✓ Created queue: ${queueName}`);

      // Create worker
      const worker = createWorker(queueName, async (job) => {
        console.log(`Processing job ${job.id} (${job.name})`);
        // TODO: Route to actual handler based on job name
        return { processed: true };
      });

      workers.push({ name: queueName, worker });
      console.log(`✓ Created worker: ${queueName}`);
    }
  }

  console.log("\nWorker is running. Press Ctrl+C to stop.");

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);

    // Close all workers
    await closeQueueConnections();

    // Shutdown all modules
    await moduleRegistry.shutdownAll();

    console.log("✓ Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch(console.error);
