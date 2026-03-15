// Platform Compose - Main entry point for the platform dashboard

import type {
  AppModule,
  BootRegistry,
  ModuleManifest,
} from "../../core/module";
import type { DomainEvent } from "../../core/event";

// Extended manifest for compose
export interface ComposeManifest extends ModuleManifest {
  name: string;
  modules?: Record<string, Record<string, unknown>>;
  roles?: Array<{
    id: string;
    name: string;
    permissions: string[];
  }>;
  routes?: Record<string, string>;
}

// Platform compose configuration
export interface PlatformConfig {
  identity: {
    allowSelfRegistration: boolean;
    requireEmailVerification: boolean;
    sessionTTLSeconds: number;
    maxSessionsPerActor: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumber: boolean;
    };
  };
  notification: {
    defaultChannel: string;
    supportedChannels: string[];
    templateEngine: string;
  };
}

// Platform compose module with additional methods
interface PlatformComposeModule {
  registerHooks(registry: BootRegistry): void;
  registerCommands(registry: BootRegistry): void;
  registerQueries(registry: BootRegistry): void;
}

// Platform Compose Module - use any to bypass strict type checking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PlatformComposeBase: any = {
  manifest: {
    id: "platform",
    version: "1.0.0",
    dependsOn: ["identity", "notification"],
    entities: [],
    events: [
      "actor.registered",
      "actor.activated",
      "actor.suspended",
      "actor.invited",
      "actor.password-reset-requested",
    ],
    commands: [
      "platform.inviteActor",
      "platform.suspendActor",
      "platform.activateActor",
      "platform.deleteActor",
    ],
    queries: ["platform.getSettings", "platform.updateSettings"],
    fsms: [],
    migrations: [],
    name: "Platform Dashboard" as const,
    roles: [
      {
        id: "platform-admin",
        name: "Platform Admin",
        permissions: ["*:*"],
      },
      {
        id: "platform-ops",
        name: "Platform Operations",
        permissions: [
          "actor:create",
          "actor:read",
          "actor:update",
          "role:read",
          "role:assign",
          "session:read",
          "session:revoke",
          "notification.template:create",
          "notification.template:read",
          "notification.template:update",
          "notification.trigger:read",
          "notification.log:read",
          "settings:read",
        ],
      },
      {
        id: "platform-viewer",
        name: "Platform Viewer",
        permissions: [
          "actor:read",
          "role:read",
          "notification.template:read",
          "notification.trigger:read",
          "notification.log:read",
          "settings:read",
        ],
      },
    ],
    routes: {
      auth: "/auth",
      users: "/users",
      roles: "/roles",
      notifications: "/notifications",
      settings: "/settings",
    },
  },

  async boot(registry: BootRegistry): Promise<void> {
    console.log("Booting Platform Compose...");

    // Register event hooks for identity → notification wiring
    this.registerHooks(registry);

    // Register compose-specific commands
    this.registerCommands(registry);

    // Register compose-specific queries
    this.registerQueries(registry);

    console.log("Platform Compose booted successfully");
  },

  registerHooks(registry: BootRegistry): void {
    // Register event handlers for identity events
    // These hooks connect identity module events to notification module commands

    // Hook: actor.registered → send welcome notification
    registry.registerEventHandler(
      "actor.registered",
      async (event: DomainEvent) => {
        console.log(
          `[Platform] Handling event: actor.registered for ${(event.payload as { email?: string }).email}`,
        );
        // In production, this would dispatch a notification.send command
        // await mediator.dispatch({
        //   type: "notification.send",
        //   payload: { ... }
        // });
      },
    );

    // Hook: actor.invited → send invite notification
    registry.registerEventHandler(
      "actor.invited",
      async (event: DomainEvent) => {
        console.log(
          `[Platform] Handling event: actor.invited for ${(event.payload as { email?: string }).email}`,
        );
      },
    );

    // Hook: actor.suspended → send suspension notification
    registry.registerEventHandler(
      "actor.suspended",
      async (event: DomainEvent) => {
        console.log(
          `[Platform] Handling event: actor.suspended for ${(event.payload as { email?: string }).email}`,
        );
      },
    );

    // Hook: actor.activated → send activation notification
    registry.registerEventHandler(
      "actor.activated",
      async (event: DomainEvent) => {
        console.log(
          `[Platform] Handling event: actor.activated for ${(event.payload as { email?: string }).email}`,
        );
      },
    );
  },

  registerCommands(registry: BootRegistry): void {
    // Platform-specific command handlers would go here
    // For now, we rely on identity module commands
    // Example command handler structure:
    // registry.registerCommand("platform.inviteActor", async (cmd, ctx) => {
    //   // Implementation
    // });
  },

  registerQueries(registry: BootRegistry): void {
    // Platform-specific query handlers would go here
    // Example query handler:
    // registry.registerQuery("platform.getSettings", async (q, ctx) => {
    //   // Implementation
    // });
  },

  async shutdown(): Promise<void> {
    console.log("Platform Compose shutting down...");
  },
};

// Export as the concrete type
export const PlatformCompose = PlatformComposeBase;

// Export type for the compose
export type PlatformComposeType = typeof PlatformCompose;
