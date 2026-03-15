# Platform Compose Implementation Plan

> **Compose ID:** platform  
> **Version:** 1.0.0  
> **Last Updated:** 2026-03-15  
> **Based on:** [`platform-dashboard.md`](./platform-dashboard.md)

---

## Overview

This document provides a detailed implementation plan for the **Platform Compose** — the management layer for the architecture platform itself. The compose handles user authentication, authorization, and notification management across the entire platform.

### Prerequisites

- [ ] Read [`platform-dashboard.md`](./platform-dashboard.md) for architectural context
- [ ] Understand the module system in [`docs/architecture/module.md`](../../architecture/module.md)
- [ ] Review compose standards in [`docs/architecture/compose-standards.md`](../../architecture/compose-standards.md)

---

## 1. Database Schema (`plt_` prefix)

The platform compose requires platform-specific tables in addition to the shared identity and notification module tables.

### 1.1 Platform Settings (`plt_settings`)

Stores platform-wide configuration that applies across all organizations.

```typescript
// File: apps/server/src/infra/db/schema/platform.ts

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

export const pltSettings = pgTable(
  "plt_settings",
  {
    ...baseColumns,
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(false), // visible to unauthenticated users
  },
  (table) => [uniqueIndex("plt_settings_key_idx").on(table.key)],
);

// Example settings
// - platform.name: "ProjectX Platform"
// - platform.logoUrl: "https://..."
// - auth.allowSelfRegistration: false
// - auth.sessionTTLSeconds: 28800
// - auth.maxSessionsPerActor: 3
// - notifications.defaultChannel: "email"
// - notifications.supportedChannels: ["email", "in_app"]
```

### 1.2 Compose Config (`plt_compose_config`)

Stores configuration for active compose deployments.

```typescript
export const pltComposeConfig = pgTable(
  "plt_compose_config",
  {
    ...baseColumns,
    composeId: text("compose_id").notNull(), // e.g., "platform", "lms", "ecommerce"
    version: text("version").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    config: jsonb("config").notNull().default("{}"), // compose-specific settings
  },
  (table) => [uniqueIndex("plt_compose_compose_id_idx").on(table.composeId)],
);
```

### 1.3 Organization Platform Settings (`plt_organization_settings`)

Stores organization-specific platform overrides.

```typescript
export const pltOrganizationSettings = pgTable(
  "plt_organization_settings",
  {
    ...baseColumns,
    organizationId: text("organization_id").notNull(), // references identity.organizations
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
  },
  (table) => [
    uniqueIndex("plt_org_settings_org_key_idx").on(
      table.organizationId,
      table.key,
    ),
  ],
);

// Example: Per-org notification overrides, custom branding, etc.
```

### 1.4 Schema Export

```typescript
// File: apps/server/src/infra/db/schema/index.ts

// Add platform schema export
export * from "./platform";

// Update the combined schema export
export const tables = {
  // ... existing tables
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
};
```

---

## 2. Module Configuration

### 2.1 Identity Module Config

The platform compose configures the identity module with specific settings:

```typescript
// File: apps/server/src/compose/platform/config.ts

export const platformModuleConfig = {
  identity: {
    // Auth behavior
    allowSelfRegistration: false, // invite-only
    requireEmailVerification: true,
    requireOrganization: false, // platform-level, no org required for initial setup

    // Session settings
    sessionTTLSeconds: 60 * 60 * 8, // 8 hours
    maxSessionsPerActor: 3,
    refreshTokenTTLSeconds: 60 * 60 * 24 * 30, // 30 days

    // Password policy
    minPasswordLength: 12,
    requirePasswordUppercase: true,
    requirePasswordLowercase: true,
    requirePasswordNumber: true,
    requirePasswordSpecial: true,

    // Invite settings
    inviteTTLSeconds: 60 * 60 * 72, // 72 hours
    inviteMaxAttempts: 3,
  },
  notification: {
    defaultChannel: "email",
    supportedChannels: ["email", "in_app"],
    templateEngine: "handlebars",

    // Retry settings
    maxRetryCount: 3,
    retryDelaySeconds: 60,
  },
};
```

### 2.2 Configuration Storage

Settings should be stored in `plt_settings` and read at runtime:

```typescript
// File: apps/server/src/compose/platform/settings.ts

import { db } from "../../infra/db/client";
import { pltSettings } from "../../infra/db/schema/platform";
import { eq } from "drizzle-orm";

export async function getPlatformSetting<T>(key: string): Promise<T | null> {
  const result = await db.query.pltSettings.findFirst({
    where: eq(pltSettings.key, key),
  });
  return result?.value as T | null;
}

export async function setPlatformSetting<T>(
  key: string,
  value: T,
  description?: string,
): Promise<void> {
  await db
    .insert(pltSettings)
    .values({
      id: generateId(),
      key,
      value,
      description,
      isPublic: false,
    })
    .onConflictDoUpdate({
      target: pltSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
```

---

## 3. Server Implementation

### 3.1 Compose Entry Point Structure

Create a compose-specific entry point that wires modules together:

```
apps/server/src/compose/
└── platform/
    ├── index.ts              # Compose entry point
    ├── config.ts             # Module configuration
    ├── settings.ts           # Settings helpers
    ├── commands/
    │   ├── index.ts
    │   ├── invite-actor.ts
    │   ├── suspend-actor.ts
    │   ├── activate-actor.ts
    │   └── send-notification.ts
    ├── queries/
    │   ├── index.ts
    │   ├── list-actors.ts
    │   ├── get-actor.ts
    │   ├── list-sessions.ts
    │   └── get-notification-logs.ts
    ├── routes/
    │   ├── index.ts
    │   ├── auth.ts
    │   ├── users.ts
    │   ├── roles.ts
    │   └── notifications.ts
    ├── hooks/
    │   ├── index.ts
    │   └── identity-events.ts  # Wire identity events → notification triggers
    ├── seed/
    │   ├── index.ts
    │   ├── roles.ts
    │   ├── users.ts
    │   └── templates.ts
    └── types.ts              # Compose-specific types
```

### 3.2 Compose Entry Point

```typescript
// File: apps/server/src/compose/platform/index.ts

import type { AppModule, BootRegistry } from "../../core/module";
import { IdentityModule } from "../../modules/identity";
import { NotificationModule } from "../../modules/notification";
import { platformModuleConfig } from "./config";
import { registerPlatformCommands } from "./commands";
import { registerPlatformQueries } from "./queries";
import { registerPlatformHooks } from "./hooks";
import { seedPlatform } from "./seed";

export const PlatformCompose: AppModule = {
  manifest: {
    id: "platform",
    version: "1.0.0",
    dependsOn: ["identity", "notification"],
    entities: ["PlatformSettings", "ComposeConfig", "OrganizationSettings"],
    events: [],
    commands: [
      "platform.inviteActor",
      "platform.suspendActor",
      "platform.activateActor",
      "platform.deleteActor",
      "platform.sendNotification",
    ],
    queries: [
      "platform.listActors",
      "platform.getActor",
      "platform.listSessions",
      "platform.getNotificationLogs",
    ],
    fsms: [],
    migrations: ["001_platform_schema", "002_seed_data"],
  },

  async boot(registry: BootRegistry): Promise<void> {
    // Register compose-specific commands
    registerPlatformCommands(registry);

    // Register compose-specific queries
    registerPlatformQueries(registry);

    // Register event hooks (identity → notification)
    registerPlatformHooks(registry);

    // Seed initial data
    await seedPlatform();
  },

  async shutdown(): Promise<void> {
    // Cleanup if needed
  },
};

// Export module config for external access
export const config = platformModuleConfig;
```

### 3.3 Command Handlers

```typescript
// File: apps/server/src/compose/platform/commands/invite-actor.ts

import type { Command, CommandHandler } from "../../../core/cqrs";
import type { SystemContext } from "../../../core/cqrs";
import { db } from "../../../infra/db/client";
import { actors, actorRoles, roles } from "../../../infra/db/schema/identity";
import { generateId } from "../../../core/entity";
import { createDomainEvent } from "../../../core/event";
import { eq } from "drizzle-orm";

interface InviteActorPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  roleIds: string[];
}

export const InviteActorCommand: Command<InviteActorPayload> = {
  type: "platform.inviteActor",
} as const;

export const inviteActorHandler: CommandHandler<
  typeof InviteActorCommand,
  { actorId: string; inviteToken: string }
> = async (command, context) => {
  const { email, firstName, lastName, roleIds } = command.payload;
  const actorId = generateId();
  const inviteToken = generateId(); // In production, use crypto

  // Create actor in pending status
  await db.insert(actors).values({
    id: actorId,
    organizationId: context.org.id,
    email,
    firstName,
    lastName,
    status: "pending",
    type: "human",
    meta: {
      inviteToken,
      inviteExpiresAt: Date.now() + 72 * 60 * 60 * 1000, // 72 hours
      invitedBy: context.actor.id,
    },
  });

  // Assign roles
  for (const roleId of roleIds) {
    await db.insert(actorRoles).values({
      actorId,
      roleId,
      assignedBy: context.actor.id,
    });
  }

  // Emit event for notification trigger
  const event = createDomainEvent(
    "actor.invite.sent",
    actorId,
    "Actor",
    { email, inviteToken, invitedBy: context.actor.id },
    context.org.id,
    { actorId: context.actor.id, source: "platform" },
  );

  return { actorId, inviteToken };
};
```

```typescript
// File: apps/server/src/compose/platform/commands/suspend-actor.ts

import type { Command, CommandHandler } from "../../../core/cqrs";
import { db } from "../../../infra/db/client";
import { actors } from "../../../infra/db/schema/identity";
import { eq } from "drizzle-orm";
import { createDomainEvent } from "../../../core/event";

interface SuspendActorPayload {
  actorId: string;
  reason?: string;
}

export const SuspendActorCommand: Command<SuspendActorPayload> = {
  type: "platform.suspendActor",
} as const;

export const suspendActorHandler: CommandHandler<
  typeof SuspendActorCommand,
  void
> = async (command, context) => {
  await db
    .update(actors)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(actors.id, command.payload.actorId));

  // Emit event for notification
  const event = createDomainEvent(
    "actor.suspended",
    command.payload.actorId,
    "Actor",
    { reason: command.payload.reason },
    context.org.id,
    { actorId: context.actor.id, source: "platform" },
  );
};
```

### 3.4 Query Handlers

```typescript
// File: apps/server/src/compose/platform/queries/list-actors.ts

import type { Query, QueryHandler } from "../../../core/cqrs";
import { db } from "../../../infra/db/client";
import { actors, actorRoles, roles } from "../../../infra/db/schema/identity";
import { eq, like, and, inArray } from "drizzle-orm";

interface ListActorsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  roleId?: string;
}

export const ListActorsQuery: Query<ListActorsParams> = {
  type: "platform.listActors",
} as const;

interface ListActorsResult {
  actors: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
    roles: string[];
    createdAt: Date;
    lastLoginAt: Date | null;
  }>;
  total: number;
}

export const listActorsHandler: QueryHandler<
  typeof ListActorsQuery,
  ListActorsResult
> = async (query, context) => {
  const { page = 1, pageSize = 20, status, search, roleId } = query.params;
  const offset = (page - 1) * pageSize;

  // Build filters
  const conditions = [eq(actors.organizationId, context.org.id)];

  if (status) {
    conditions.push(eq(actors.status, status as any));
  }

  if (search) {
    conditions.push(
      or(
        like(actors.email, `%${search}%`),
        like(actors.firstName, `%${search}%`),
        like(actors.lastName, `%${search}%`),
      ),
    );
  }

  // Get actors
  const actorsResult = await db.query.actors.findMany({
    where: and(...conditions),
    limit: pageSize,
    offset,
    orderBy: (actors, { desc }) => [desc(actors.createdAt)],
  });

  // Get roles for each actor
  const actorIds = actorsResult.map((a) => a.id);
  const rolesResult = await db
    .select()
    .from(actorRoles)
    .leftJoin(roles, eq(actorRoles.roleId, roles.id))
    .where(inArray(actorRoles.actorId, actorIds));

  // Group roles by actor
  const rolesByActor = new Map<string, string[]>();
  for (const r of rolesResult) {
    const existing = rolesByActor.get(r.actor_roles.actorId) || [];
    existing.push(r.roles.name);
    rolesByActor.set(r.actor_roles.actorId, existing);
  }

  // Filter by role if specified
  let filteredActors = actorsResult;
  if (roleId) {
    filteredActors = actorsResult.filter((a) =>
      rolesByActor.get(a.id)?.includes(roleId),
    );
  }

  return {
    actors: filteredActors.map((a) => ({
      id: a.id,
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      status: a.status,
      roles: rolesByActor.get(a.id) || [],
      createdAt: a.createdAt,
      lastLoginAt: a.lastLoginAt,
    })),
    total: filteredActors.length, // Note: should use proper count query
  };
};
```

### 3.5 Event Hooks (Identity → Notification)

```typescript
// File: apps/server/src/compose/platform/hooks/identity-events.ts

import type { BootRegistry } from "../../../core/module";
import type { DomainEvent } from "../../../core/event";
import { db } from "../../../infra/db/client";
import {
  ntfTriggers,
  ntfTemplates,
} from "../../../infra/db/schema/notification";
import { eq } from "drizzle-orm";

// Event → Notification trigger mapping
const EVENT_NOTIFICATION_MAP = [
  {
    eventPattern: "actor.registered",
    templateKey: "actor.welcome",
    channel: "email",
  },
  {
    eventPattern: "actor.invite.sent",
    templateKey: "actor.invite",
    channel: "email",
  },
  {
    eventPattern: "actor.password-reset-requested",
    templateKey: "actor.password-reset",
    channel: "email",
  },
  {
    eventPattern: "actor.suspended",
    templateKey: "actor.suspended",
    channel: "email",
  },
  {
    eventPattern: "actor.suspended",
    templateKey: "actor.suspended",
    channel: "in_app",
  },
  {
    eventPattern: "actor.activated",
    templateKey: "actor.activated",
    channel: "email",
  },
];

export function registerPlatformHooks(registry: BootRegistry): void {
  // Register handlers for identity events that trigger notifications
  for (const mapping of EVENT_NOTIFICATION_MAP) {
    registry.registerEventHandler(
      mapping.eventPattern,
      async (event: DomainEvent) => {
        await handleIdentityEvent(event, mapping.templateKey, mapping.channel);
      },
    );
  }

  // Handle notification failures - alert platform admin
  registry.registerEventHandler(
    "notification.failed",
    async (event: DomainEvent) => {
      await handleNotificationFailure(event);
    },
  );
}

async function handleIdentityEvent(
  event: DomainEvent,
  templateKey: string,
  channel: string,
): Promise<void> {
  // Look up the template
  const template = await db.query.ntfTemplates.findFirst({
    where: eq(ntfTemplates.key, templateKey),
  });

  if (!template) {
    console.warn(`Template not found: ${templateKey}`);
    return;
  }

  // Determine recipient from event payload
  const recipient = determineRecipient(event, channel);

  if (!recipient) {
    console.warn(`Could not determine recipient for event: ${event.type}`);
    return;
  }

  // Create notification log entry (notification module will process)
  // This would call a notification module command
  // await notificationModule.sendNotification(...)
}

function determineRecipient(
  event: DomainEvent,
  channel: string,
): string | null {
  const payload = event.payload as Record<string, unknown>;

  if (channel === "email") {
    // For email, look in payload or aggregate
    if (payload.email) return payload.email as string;
    if (payload.recipientEmail) return payload.recipientEmail as string;
  }

  if (channel === "in_app") {
    // For in-app, return actor ID
    if (event.actorId) return event.actorId;
  }

  return null;
}

async function handleNotificationFailure(event: DomainEvent): Promise<void> {
  // Create in-app notification for platform admin
  // Look up admin role and send notification
}
```

### 3.6 API Routes

```typescript
// File: apps/server/src/compose/platform/routes/index.ts

import Elysia from "elysia";
import { authRoutes } from "./auth";
import { usersRoutes } from "./users";
import { rolesRoutes } from "./roles";
import { notificationsRoutes } from "./notifications";

export function platformRoutes(): Elysia {
  return new Elysia({ prefix: "/api/platform" })
    .use(authRoutes())
    .use(usersRoutes())
    .use(rolesRoutes())
    .use(notificationsRoutes());
}
```

```typescript
// File: apps/server/src/compose/platform/routes/auth.ts

import Elysia from "elysia";
import type { Command, Query } from "../../../core/cqrs";

// Note: These would call identity module commands/queries
// This is the API layer that adapts HTTP to CQRS

export function authRoutes(): Elysia {
  return new Elysia({ prefix: "/auth" })
    .post("/login", async ({ body }) => {
      // Call identity.login command
      return { token: "..." };
    })
    .post("/logout", async ({ headers }) => {
      // Call identity.logout command
      return { success: true };
    })
    .post("/refresh", async ({ body }) => {
      // Call identity.refreshSession command
      return { token: "..." };
    })
    .post("/register", async ({ body }) => {
      // platform.inviteActor - admin only
      return { actorId: "..." };
    })
    .post("/verify-email", async ({ body }) => {
      // Call identity.activate command
      return { success: true };
    })
    .post("/forgot-password", async ({ body }) => {
      // Call identity.requestPasswordReset command
      return { success: true };
    })
    .post("/reset-password", async ({ body }) => {
      // Call identity.resetPassword command
      return { success: true };
    })
    .get("/me", async ({ headers }) => {
      // Call identity.getActor query
      return { actor: {} };
    });
}
```

```typescript
// File: apps/server/src/compose/platform/routes/users.ts

import Elysia from "elysia";

export function usersRoutes(): Elysia {
  return new Elysia({ prefix: "/users" })
    .get("", async () => {
      // platform.listActors query
      return { actors: [], total: 0 };
    })
    .post("/invite", async ({ body }) => {
      // platform.inviteActor command
      return { actorId: "..." };
    })
    .get("/:id", async ({ params }) => {
      // platform.getActor query
      return { actor: {} };
    })
    .patch("/:id", async ({ params, body }) => {
      // identity.updateActor command
      return { actor: {} };
    })
    .post("/:id/suspend", async ({ params }) => {
      // platform.suspendActor command
      return { success: true };
    })
    .post("/:id/activate", async ({ params }) => {
      // platform.activateActor command
      return { success: true };
    })
    .delete("/:id", async ({ params }) => {
      // platform.deleteActor command
      return { success: true };
    })
    .get("/:id/sessions", async ({ params }) => {
      // platform.listSessions query
      return { sessions: [] };
    })
    .delete("/:id/sessions/:sid", async ({ params }) => {
      // identity.revokeSession command
      return { success: true };
    });
}
```

```typescript
// File: apps/server/src/compose/platform/routes/roles.ts

import Elysia from "elysia";

export function rolesRoutes(): Elysia {
  return new Elysia({ prefix: "/roles" })
    .get("", async () => {
      // identity.listRoles query
      return { roles: [] };
    })
    .post("", async ({ body }) => {
      // identity.createRole command
      return { role: {} };
    })
    .get("/:id", async ({ params }) => {
      // identity.getRole query
      return { role: {} };
    })
    .patch("/:id", async ({ params, body }) => {
      // identity.updateRole command
      return { role: {} };
    })
    .post("/:id/assign", async ({ params, body }) => {
      // identity.assignRole command
      return { success: true };
    })
    .delete("/:id/revoke", async ({ params, body }) => {
      // identity.revokeRole command
      return { success: true };
    });
}
```

```typescript
// File: apps/server/src/compose/platform/routes/notifications.ts

import Elysia from "elysia";

export function notificationsRoutes(): Elysia {
  return (
    new Elysia({ prefix: "/notifications" })
      // Templates
      .get("/templates", async () => {
        // notification.listTemplates query
        return { templates: [] };
      })
      .post("/templates", async ({ body }) => {
        // notification.createTemplate command
        return { template: {} };
      })
      .get("/templates/:id", async ({ params }) => {
        // notification.getTemplate query
        return { template: {} };
      })
      .put("/templates/:id", async ({ params, body }) => {
        // notification.updateTemplate command
        return { template: {} };
      })
      .delete("/templates/:id", async ({ params }) => {
        // notification.deleteTemplate command
        return { success: true };
      })
      .post("/templates/:id/preview", async ({ params, body }) => {
        // notification.previewTemplate query
        return { html: "..." };
      })

      // Triggers
      .get("/triggers", async () => {
        // notification.listTriggers query
        return { triggers: [] };
      })
      .post("/triggers", async ({ body }) => {
        // notification.createTrigger command
        return { trigger: {} };
      })
      .delete("/triggers/:id", async ({ params }) => {
        // notification.deleteTrigger command
        return { success: true };
      })

      // Logs
      .get("/logs", async ({ query }) => {
        // notification.getLog query
        return { logs: [], total: 0 };
      })

      // Manual send
      .post("/send", async ({ body }) => {
        // notification.send command (admin only)
        return { notificationId: "..." };
      })
  );
}
```

### 3.7 Integration with Server Entry Point

Update the main server entry point to include the platform compose:

```typescript
// File: apps/server/src/index.ts (partial)

import { PlatformCompose } from "./compose/platform";
// ... existing imports

// Replace moduleLayers with platform compose
const moduleLayers = [
  PlatformCompose, // This will internally boot identity & notification
  // ... other modules for other composes
];
```

---

## 4. Web Implementation

### 4.1 Route Structure

Using TanStack Router with the following structure:

```
apps/web/src/routes/
├── __root.tsx                  # Root route
├── _auth/
│   ├── login.tsx               # /auth/login
│   ├── register.tsx           # /auth/register (admin only)
│   ├── forgot-password.tsx    # /auth/forgot-password
│   ├── reset-password.tsx     # /auth/reset-password
│   └── verify-email.tsx      # /auth/verify-email
├── _dashboard/
│   ├── layout.tsx             # Dashboard layout with sidebar
│   ├── index.tsx             # /dashboard (overview)
│   ├── users/
│   │   ├── index.tsx         # /dashboard/users
│   │   ├── $userId.tsx       # /dashboard/users/:userId
│   │   └── invite.tsx        # /dashboard/users/invite
│   ├── roles/
│   │   ├── index.tsx         # /dashboard/roles
│   │   └── $roleId.tsx       # /dashboard/roles/:roleId
│   ├── notifications/
│   │   ├── templates/
│   │   │   ├── index.tsx     # /dashboard/notifications/templates
│   │   │   └── $templateId.tsx
│   │   ├── triggers/
│   │   │   └── index.tsx     # /dashboard/notifications/triggers
│   │   └── logs/
│   │       └── index.tsx     # /dashboard/notifications/logs
│   └── settings/
│       └── index.tsx         # /dashboard/settings
└── index.tsx                  # Redirect to /dashboard or /auth/login
```

### 4.2 Router Configuration

```typescript
// File: apps/web/src/router.ts

import { createRouter, createWebHistory } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { authRoutes } from "./routes/_auth";
import { dashboardRoutes } from "./routes/_dashboard";

const routeTree = rootRoute.addChildren([...authRoutes, ...dashboardRoutes]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: {
    auth: undefined, // Will be set by auth provider
  },
});

// Type-safe route navigation
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

### 4.3 Auth Layout

```typescript
// File: apps/web/src/routes/_auth/layout.tsx

import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const AuthLayout = () => {
  const navigate = useNavigate();

  // Check if already authenticated
  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    if (token) {
      navigate({ to: "/dashboard" });
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
};
```

### 4.4 Login Page

```typescript
// File: apps/web/src/routes/_auth/login.tsx

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface LoginForm {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const form = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    const response = await api.post("/api/platform/auth/login", data);
    localStorage.setItem("auth_token", response.token);
    // Redirect to dashboard
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password", { required: true })}
            />
          </div>
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

### 4.5 Dashboard Layout

```typescript
// File: apps/web/src/routes/_dashboard/layout.tsx

import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/roles", label: "Roles", icon: Shield },
  { href: "/dashboard/notifications/templates", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication
  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    if (!token) {
      navigate({ to: "/auth/login" });
    }
  }, [token]);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50">
        <div className="p-4">
          <h1 className="text-xl font-bold">Platform</h1>
        </div>
        <nav className="p-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                location.pathname === item.href
                  ? "bg-gray-200"
                  : "hover:bg-gray-100"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <header className="border-b p-4 flex justify-between items-center">
          <div>{/* Breadcrumb or title */}</div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem("auth_token");
                navigate({ to: "/auth/login" });
              }}
            >
              Sign Out
            </Button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
```

### 4.6 Users Page (Data Table)

```typescript
// File: apps/web/src/routes/_dashboard/users/index.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { columns } from "./columns";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_dashboard/users/")({
  component: UsersPage,
});

export function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/api/platform/users"),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button asChild>
          <a href="/dashboard/users/invite">Invite User</a>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.actors || []}
        isLoading={isLoading}
      />
    </div>
  );
}
```

```typescript
// File: apps/web/src/routes/_dashboard/users/columns.tsx

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "firstName",
    header: "Name",
    cell: ({ row }) => {
      const firstName = row.original.firstName || "";
      const lastName = row.original.lastName || "";
      return firstName || lastName ? `${firstName} ${lastName}` : "-";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = status === "active" ? "default" : status === "suspended" ? "destructive" : "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "roles",
    header: "Roles",
    cell: ({ row }) => {
      return row.original.roles.map((role) => (
        <Badge key={role} variant="outline" className="mr-1">
          {role}
        </Badge>
      ));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={`/dashboard/users/${row.original.id}`}>Edit</a>
          </Button>
        </div>
      );
    },
  },
];
```

### 4.7 API Client Setup

```typescript
// File: apps/web/src/lib/api.ts

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE);
```

### 4.8 Shared Layout Components

The web app already has shared components in `apps/web/src/components/shared/`:

- `confirm-dialog.tsx` - For delete confirmations
- `date-display.tsx` - For formatting dates
- `empty-state.tsx` - For empty lists
- `page-header.tsx` - For page titles
- `spinner.tsx` - For loading states
- `status-badge.tsx` - For status indicators

Use these in the compose-specific pages.

---

## 5. Seed Data

### 5.1 Platform Roles

```typescript
// File: apps/server/src/compose/platform/seed/roles.ts

import { db } from "../../../infra/db/client";
import { roles } from "../../../infra/db/schema/identity";
import { generateId } from "../../../core/entity";

export const PLATFORM_ROLES = [
  {
    name: "platform-admin",
    isSystem: true,
    isDefault: false,
    permissions: ["*:*"], // All permissions
    description: "Full platform administration access",
  },
  {
    name: "platform-ops",
    isSystem: true,
    isDefault: false,
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
    description: "Operations team - manages users and templates",
  },
  {
    name: "platform-viewer",
    isSystem: true,
    isDefault: false,
    permissions: [
      "actor:read",
      "role:read",
      "notification.template:read",
      "notification.trigger:read",
      "notification.log:read",
      "settings:read",
    ],
    description: "Read-only access for auditing",
  },
];

export async function seedPlatformRoles(orgId: string): Promise<void> {
  for (const role of PLATFORM_ROLES) {
    await db
      .insert(roles)
      .values({
        id: generateId(),
        organizationId: orgId,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
        isDefault: role.isDefault,
      })
      .onConflictDoNothing();
  }
}
```

### 5.2 Bootstrap Admin Actor

```typescript
// File: apps/server/src/compose/platform/seed/users.ts

import { db } from "../../../infra/db/client";
import { actors, actorRoles, roles } from "../../../infra/db/schema/identity";
import { generateId } from "../../../core/entity";
import { eq } from "drizzle-orm";

export const BOOTSTRAP_ADMIN = {
  email: "admin@platform.local",
  firstName: "Platform",
  lastName: "Admin",
  type: "human" as const,
  status: "active" as const,
};

export async function seedBootstrapAdmin(orgId: string): Promise<string> {
  // Check if admin already exists
  const existing = await db.query.actors.findFirst({
    where: eq(actors.email, BOOTSTRAP_ADMIN.email),
  });

  if (existing) {
    return existing.id;
  }

  const adminId = generateId();
  const passwordHash = "TODO: hash from environment or generate"; // In production, use env var

  await db.insert(actors).values({
    id: adminId,
    organizationId: orgId,
    email: BOOTSTRAP_ADMIN.email,
    firstName: BOOTSTRAP_ADMIN.firstName,
    lastName: BOOTSTRAP_ADMIN.lastName,
    type: BOOTSTRAP_ADMIN.type,
    status: BOOTSTRAP_ADMIN.status,
    passwordHash,
  });

  // Get platform-admin role
  const adminRole = await db.query.roles.findFirst({
    where: eq(roles.name, "platform-admin"),
  });

  if (adminRole) {
    await db.insert(actorRoles).values({
      actorId: adminId,
      roleId: adminRole.id,
      assignedBy: adminId, // Self-assigned during bootstrap
    });
  }

  return adminId;
}
```

### 5.3 Default Notification Templates

```typescript
// File: apps/server/src/compose/platform/seed/templates.ts

import { db } from "../../../infra/db/client";
import { ntfTemplates } from "../../../infra/db/schema/notification";
import { generateId } from "../../../core/entity";

export const PLATFORM_NOTIFICATION_TEMPLATES = [
  {
    key: "actor.welcome",
    channel: "email",
    subject: "Welcome to {{orgName}}",
    body: `Hi {{firstName}},

Your account on {{orgName}} has been created. 

Click here to get started: {{loginUrl}}

If you have any questions, please contact your administrator.`,
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.invite",
    channel: "email",
    subject: "You've been invited to {{orgName}}",
    body: `{{invitedByName}} invited you to join {{orgName}}.

Accept this invitation before {{expiresAt}}: {{inviteUrl}}

If you didn't expect this invitation, please ignore this email.`,
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.password-reset",
    channel: "email",
    subject: "Reset your password",
    body: `You requested a password reset.

This link expires in 30 minutes: {{resetUrl}}

If you didn't request this, please ignore this email.`,
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.suspended",
    channel: "email",
    subject: "Your account has been suspended",
    body: `Your account on {{orgName}} has been suspended.

Reason: {{reason}}

Contact your administrator for more information.`,
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.suspended",
    channel: "in_app",
    body: `Your account has been suspended. Reason: {{reason}}. Contact your administrator.`,
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.activated",
    channel: "email",
    subject: "Your account is now active",
    body: `Your account on {{orgName}} has been reactivated.

Log in here: {{loginUrl}}

Welcome back!`,
    locale: "en",
    isSystem: true,
  },
  {
    key: "system.notification-fail",
    channel: "in_app",
    body: `Notification delivery failed for template {{templateKey}} → {{recipientEmail}}. Check logs.`,
    locale: "en",
    isSystem: true,
  },
];

export async function seedNotificationTemplates(orgId: string): Promise<void> {
  for (const template of PLATFORM_NOTIFICATION_TEMPLATES) {
    await db
      .insert(ntfTemplates)
      .values({
        id: generateId(),
        organizationId: orgId,
        ...template,
      })
      .onConflictDoNothing();
  }
}
```

### 5.4 Default Settings

```typescript
// File: apps/server/src/compose/platform/seed/settings.ts

import { db } from "../../../infra/db/client";
import { pltSettings } from "../../../infra/db/schema/platform";
import { generateId } from "../../../core/entity";

export const PLATFORM_SETTINGS = [
  {
    key: "platform.name",
    value: "ProjectX Platform",
    description: "Display name for the platform",
    isPublic: true,
  },
  {
    key: "auth.allowSelfRegistration",
    value: false,
    description: "Whether users can self-register",
    isPublic: false,
  },
  {
    key: "auth.sessionTTLSeconds",
    value: 28800,
    description: "Session time-to-live in seconds (8 hours)",
    isPublic: false,
  },
  {
    key: "auth.maxSessionsPerActor",
    value: 3,
    description: "Maximum concurrent sessions per actor",
    isPublic: false,
  },
  {
    key: "notifications.defaultChannel",
    value: "email",
    description: "Default notification channel",
    isPublic: false,
  },
  {
    key: "notifications.supportedChannels",
    value: ["email", "in_app"],
    description: "Supported notification channels",
    isPublic: false,
  },
];

export async function seedPlatformSettings(): Promise<void> {
  for (const setting of PLATFORM_SETTINGS) {
    await db
      .insert(pltSettings)
      .values({
        id: generateId(),
        ...setting,
      })
      .onConflictDoUpdate({
        target: pltSettings.key,
        set: { value: setting.value },
      });
  }
}
```

### 5.5 Master Seed Function

```typescript
// File: apps/server/src/compose/platform/seed/index.ts

import { db } from "../../../infra/db/client";
import { organizations } from "../../../infra/db/schema/identity";
import { generateId } from "../../../core/entity";
import { eq } from "drizzle-or";
import { seedPlatformRoles } from "./roles";
import { seedBootstrapAdmin } from "./users";
import { seedNotificationTemplates } from "./templates";
import { seedPlatformSettings } from "./settings";

const PLATFORM_ORG = {
  id: "org-platform",
  name: "Platform",
  slug: "platform",
  plan: "enterprise",
};

export async function seedPlatform(): Promise<void> {
  // Ensure platform organization exists
  const existingOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, PLATFORM_ORG.slug),
  });

  const orgId = existingOrg?.id;

  if (!orgId) {
    await db.insert(organizations).values(PLATFORM_ORG);
    console.log("✓ Created platform organization");
  }

  // Seed roles
  await seedPlatformRoles(orgId);
  console.log("✓ Seeded platform roles");

  // Seed bootstrap admin
  await seedBootstrapAdmin(orgId);
  console.log("✓ Seeded bootstrap admin");

  // Seed notification templates
  await seedNotificationTemplates(orgId);
  console.log("✓ Seeded notification templates");

  // Seed settings
  await seedPlatformSettings();
  console.log("✓ Seeded platform settings");

  console.log("✓ Platform seed complete");
}
```

---

## 6. Implementation Order

### Phase 1: Database Schema + Seed (Week 1)

- [ ] **1.1** Create platform schema files (`plt_settings`, `plt_compose_config`, `plt_organization_settings`)
- [ ] **1.2** Generate Drizzle migration
- [ ] **1.3** Run migration
- [ ] **1.4** Create seed functions (roles, admin, templates, settings)
- [ ] **1.5** Test seed execution

### Phase 2: Server Compose Entry + Basic Auth (Week 1-2)

- [ ] **2.1** Create compose directory structure
- [ ] **2.2** Implement `PlatformCompose` entry point
- [ ] **2.3** Implement settings helpers
- [ ] **2.4** Wire identity module commands (login, logout, register, refresh)
- [ ] **2.5** Create auth routes
- [ ] **2.6** Test authentication flow

### Phase 3: User Management API (Week 2)

- [ ] **3.1** Implement `platform.inviteActor` command
- [ ] **3.2** Implement `platform.suspendActor` command
- [ ] **3.3** Implement `platform.activateActor` command
- [ ] **3.4** Implement `platform.deleteActor` command
- [ ] **3.5** Implement `platform.listActors` query
- [ ] **3.6** Implement `platform.getActor` query
- [ ] **3.7** Implement session management queries
- [ ] **3.8** Create users routes
- [ ] **3.9** Test user CRUD operations

### Phase 4: Role Management API (Week 2-3)

- [ ] **4.1** Implement `identity.createRole` command
- [ ] **4.2** Implement `identity.assignRole` command
- [ ] **4.3** Implement `identity.revokeRole` command
- [ ] **4.4** Implement role queries
- [ ] **4.5** Create roles routes
- [ ] **4.6** Test role management

### Phase 5: Notification Management API (Week 3)

- [ ] **5.1** Implement notification template commands/queries
- [ ] **5.2** Implement notification trigger commands/queries
- [ ] **5.3** Implement notification log queries
- [ ] **5.4** Create notification routes
- [ ] **5.5** Wire identity event hooks → notification triggers
- [ ] **5.6** Test notification flow

### Phase 6: Web Auth Pages (Week 3-4)

- [ ] **6.1** Set up TanStack Router structure
- [ ] **6.2** Create auth layout
- [ ] **6.3** Implement login page
- [ ] **6.4** Implement forgot-password page
- [ ] **6.5** Implement reset-password page
- [ ] **6.6** Implement verify-email page
- [ ] **6.7** Set up API client with auth token handling

### Phase 7: Web Dashboard + Management Pages (Week 4-5)

- [ ] **7.1** Create dashboard layout with sidebar
- [ ] **7.2** Implement users list page with data table
- [ ] **7.3** Implement user invite modal/page
- [ ] **7.4** Implement user edit page
- [ ] **7.5** Implement roles list page
- [ ] **7.6** Implement roles create/edit page
- [ ] **7.7** Implement notification templates page
- [ ] **7.8** Implement notification triggers page
- [ ] **7.9** Implement notification logs page
- [ ] **7.10** Implement settings page

### Phase 8: Testing & Polish (Week 5)

- [ ] **8.1** Integration testing
- [ ] **8.2** Error handling
- [ ] **8.3** Loading states
- [ ] **8.4** Edge cases (empty states, permissions)
- [ ] **8.5** Documentation

---

## 7. Technical Considerations

### 7.1 Authentication Flow

```
1. User submits login credentials
2. Server validates and creates session
3. Server returns JWT token
4. Client stores token in localStorage
5. Client includes token in Authorization header
6. Server validates token on each request
7. Token expires after 8 hours (configurable)
8. Client can refresh token using refresh token
```

### 7.2 Permission Check Pattern

```typescript
// Example: Check permission in command handler
function requirePermission(context: SystemContext, permission: string): void {
  const hasPermission = context.actor.roles.some((role) => {
    // Check role permissions
    return true; // TODO: Implement permission check
  });

  if (!hasPermission) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}
```

### 7.3 Event-Driven Notifications

```
Identity Module          Event Bus           Platform Compose          Notification Module
     │                       │                      │                          │
     │──actor.registered──►  │                      │                          │
     │                       │──► (hook) ──────────►│                          │
     │                       │                      │──trigger lookup────────►│
     │                       │                      │◄──template──────────────│
     │                       │                      │──send notification─────►│
     │                       │                      │                          │
```

### 7.4 Environment Variables

```env
# Platform Compose
PLATFORM_ADMIN_EMAIL=admin@platform.local
PLATFORM_ADMIN_PASSWORD=  # Set via secure method

# Session
JWT_SECRET=your-secret-key
JWT_EXPIRY=8h

# Email (Resend - example)
RESEND_API_KEY=
EMAIL_FROM=noreply@platform.local
```

---

## 8. File Reference Summary

| File                                             | Description                       |
| ------------------------------------------------ | --------------------------------- |
| `apps/server/src/infra/db/schema/platform.ts`    | Platform-specific database schema |
| `apps/server/src/compose/platform/index.ts`      | Compose entry point               |
| `apps/server/src/compose/platform/config.ts`     | Module configuration              |
| `apps/server/src/compose/platform/settings.ts`   | Settings helpers                  |
| `apps/server/src/compose/platform/commands/*.ts` | Command handlers                  |
| `apps/server/src/compose/platform/queries/*.ts`  | Query handlers                    |
| `apps/server/src/compose/platform/routes/*.ts`   | API routes                        |
| `apps/server/src/compose/platform/hooks/*.ts`    | Event hooks                       |
| `apps/server/src/compose/platform/seed/*.ts`     | Seed data                         |
| `apps/web/src/routes/_auth/*.tsx`                | Auth pages                        |
| `apps/web/src/routes/_dashboard/*.tsx`           | Dashboard pages                   |
| `apps/web/src/lib/api.ts`                        | API client                        |

---

## 9. Next Steps

1. **Begin Phase 1**: Create the database schema and run migrations
2. **Set up seed data**: Ensure bootstrap admin can be created
3. **Build incrementally**: Start with auth, then users, then roles, then notifications
4. **Test each phase**: Verify functionality before moving to next phase

---

_Document generated for Platform Compose v1.0.0_
