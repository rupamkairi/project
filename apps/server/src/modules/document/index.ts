// Document Module

import type { AppModule, BootRegistry } from "../../core/module";

export const DocumentModule: AppModule = {
  manifest: {
    id: "document",
    version: "0.1.0",
    dependsOn: ["identity"],
    entities: [],
    events: [],
    commands: [],
    queries: [],
    fsms: [],
    migrations: [],
  },

  async boot(_registry: BootRegistry): Promise<void> {
    // Register command handlers
    // Register query handlers
    // Register event listeners
    // Register FSMs
  },

  async shutdown(): Promise<void> {
    // Cleanup
  },
};
