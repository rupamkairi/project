import { db } from "@db/client";
import { pltSettings } from "../schema/platform";
import { organizations, actors, roles, actorRoles } from "@db/schema/identity";
import { ntfTemplates } from "@db/schema/notification";

// Platform settings seed data
const platformSettings = [
  {
    key: "platform.name",
    value: { value: "Platform" },
    isPublic: true,
    description: "Platform display name",
  },
  {
    key: "platform.logo",
    value: { value: "" },
    isPublic: true,
    description: "Platform logo URL",
  },
  {
    key: "auth.allowSelfRegistration",
    value: { value: false },
    isPublic: false,
    description: "Allow users to self-register",
  },
  {
    key: "auth.requireEmailVerification",
    value: { value: true },
    isPublic: false,
    description: "Require email verification before activation",
  },
  {
    key: "auth.sessionTTLSeconds",
    value: { value: 28800 }, // 8 hours
    isPublic: false,
    description: "Session time-to-live in seconds",
  },
  {
    key: "auth.maxSessionsPerActor",
    value: { value: 3 },
    isPublic: false,
    description: "Maximum sessions per actor",
  },
  {
    key: "auth.passwordPolicy.minLength",
    value: { value: 8 },
    isPublic: false,
    description: "Minimum password length",
  },
  {
    key: "notification.defaultChannel",
    value: { value: "email" },
    isPublic: false,
    description: "Default notification channel",
  },
  {
    key: "notification.supportedChannels",
    value: { value: ["email", "in_app"] },
    isPublic: false,
    description: "Supported notification channels",
  },
];

// Platform notification templates seed data
const notificationTemplates = [
  {
    key: "actor.welcome",
    channel: "email" as const,
    subject: "Welcome to {{orgName}}",
    body: "Hi {{firstName}}, your account on {{orgName}} has been created. Click here to get started: {{loginUrl}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.invite",
    channel: "email" as const,
    subject: "You've been invited to {{orgName}}",
    body: "{{invitedByName}} invited you to join {{orgName}}. Accept before {{expiresAt}}: {{inviteUrl}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.password-reset",
    channel: "email" as const,
    subject: "Reset your password",
    body: "You requested a password reset. This link expires in 30 minutes: {{resetUrl}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.suspended",
    channel: "email" as const,
    subject: "Your account has been suspended",
    body: "Your account on {{orgName}} has been suspended. Contact your administrator for details.",
    locale: "en",
    isSystem: true,
  },
  {
    key: "actor.activated",
    channel: "email" as const,
    subject: "Your account is now active",
    body: "Your account on {{orgName}} has been reactivated. Log in here: {{loginUrl}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "system.notification-fail",
    channel: "in_app" as const,
    subject: "",
    body: "Notification delivery failed for template {{templateKey}} → {{recipientEmail}}. Check logs.",
    locale: "en",
    isSystem: true,
  },
];

// Platform roles seed data
const platformRoles = [
  {
    name: "platform-admin",
    description: "Platform Administrator - Full system access",
    permissions: ["*:*"],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "platform-ops",
    description: "Platform Operations - User and template management",
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
    isSystem: true,
    isDefault: false,
  },
  {
    name: "platform-viewer",
    description: "Platform Viewer - Read-only access",
    permissions: [
      "actor:read",
      "role:read",
      "notification.template:read",
      "notification.trigger:read",
      "notification.log:read",
      "settings:read",
    ],
    isSystem: true,
    isDefault: false,
  },
];

export async function seedPlatform() {
  console.log("Seeding platform data...");

  const now = new Date();

  // Check if already seeded
  const existingSettings = await db.select().from(pltSettings).limit(1);
  if (existingSettings.length > 0) {
    console.log("Platform data already seeded, skipping...");
    return;
  }

  // Create default organization
  const orgResult = await db
    .insert(organizations)
    .values({
      id: "org_platform_default",
      name: "Platform",
      slug: "platform",
      plan: "enterprise",
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .then((rows) => rows[0]);

  if (!orgResult) {
    throw new Error("Failed to create default organization");
  }

  console.log("Created default organization:", orgResult.id);

  // Seed platform settings
  await db.insert(pltSettings).values(
    platformSettings.map((s) => ({
      ...s,
      id: `plt_set_${s.key.replace(/\./g, "_")}`,
      organizationId: orgResult.id,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
      deletedAt: null,
    })),
  );
  console.log("Seeded platform settings");

  // Seed notification templates
  await db.insert(ntfTemplates).values(
    notificationTemplates.map((t) => ({
      ...t,
      id: `ntf_tpl_${t.key.replace(/\./g, "_")}`,
      organizationId: orgResult.id,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
      deletedAt: null,
    })),
  );
  console.log("Seeded notification templates");

  // Seed platform roles
  const seededRoles = await db
    .insert(roles)
    .values(
      platformRoles.map((r) => ({
        ...r,
        id: `plt_role_${r.name}`,
        organizationId: orgResult.id,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
        deletedAt: null,
      })),
    )
    .returning();
  console.log(
    "Seeded platform roles:",
    seededRoles.map((r) => r.name),
  );

  // Create bootstrap admin actor (password: admin123)
  // Note: In production, use proper password hashing
  const passwordHash = await Bun.password.hash("admin123");
  const adminActorResult = await db
    .insert(actors)
    .values({
      id: "actor_platform_admin",
      organizationId: orgResult.id,
      email: "admin@platform.local",
      passwordHash,
      type: "human",
      status: "active",
      firstName: "Platform",
      lastName: "Admin",
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
      meta: {},
    })
    .returning()
    .then((rows) => rows[0]);

  if (!adminActorResult) {
    throw new Error("Failed to create bootstrap admin actor");
  }

  // Assign admin role
  const adminRole = seededRoles.find((r) => r.name === "platform-admin");
  if (adminRole) {
    await db.insert(actorRoles).values({
      actorId: adminActorResult.id,
      roleId: adminRole.id,
      assignedAt: now,
      assignedBy: adminActorResult.id,
    });
    console.log("Assigned platform-admin role to bootstrap actor");
  }

  console.log("Platform seed completed!");
}
