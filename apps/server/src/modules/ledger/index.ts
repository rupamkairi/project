// Ledger Module

import type { AppModule, BootRegistry } from "../../core/module";

export const LedgerModule: AppModule = {
  manifest: {
    id: "ledger",
    version: "0.1.0",
    dependsOn: [],
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
