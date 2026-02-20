import { db } from "./client";
import { organizations, roles, actors, actorRoles } from "./schema/identity";
import { invLocations } from "./schema/inventory";
import { ntfTemplates } from "./schema/notification";
import { ulid } from "ulid";

function generateId(): string {
  return ulid();
}

async function seed() {
  console.log("Starting seed...");

  console.log("Step 1: Creating default organization...");
  const defaultOrgId = generateId();
  await db
    .insert(organizations)
    .values({
      id: defaultOrgId,
      name: "Default Org",
      slug: "default",
      plan: "free",
      status: "active",
    })
    .onConflictDoNothing()
    .returning();
  console.log(`✓ Default organization created: ${defaultOrgId}`);

  console.log("Step 2: Creating system roles...");
  const systemRoles = [
    { name: "super-admin", permissions: ["*:*"], isSystem: true },
    {
      name: "admin",
      permissions: ["*:read", "*:create", "*:update", "*:delete"],
      isSystem: true,
    },
    { name: "member", permissions: ["*:read"], isSystem: true },
    { name: "viewer", permissions: ["*:read"], isSystem: true },
  ];

  const roleIds: Record<string, string> = {};
  for (const role of systemRoles) {
    const result = await db
      .insert(roles)
      .values({
        id: generateId(),
        organizationId: defaultOrgId,
        name: role.name,
        permissions: role.permissions,
        isSystem: role.isSystem,
      })
      .onConflictDoNothing()
      .returning();
    if (result[0]) {
      roleIds[role.name] = result[0].id;
    }
  }
  console.log("✓ System roles created");

  console.log("Step 3: Creating system actor...");
  const passwordHash = await Bun.password.hash("changeme");
  const systemActorId = generateId();
  await db
    .insert(actors)
    .values({
      id: systemActorId,
      organizationId: defaultOrgId,
      email: "system@platform.local",
      passwordHash,
      type: "system",
      status: "active",
      firstName: "System",
      lastName: "User",
    })
    .onConflictDoNothing();

  if (roleIds["super-admin"]) {
    await db
      .insert(actorRoles)
      .values({
        actorId: systemActorId,
        roleId: roleIds["super-admin"],
      })
      .onConflictDoNothing();
  }
  console.log("✓ System actor created with super-admin role");

  console.log("Step 4: Creating default inventory location...");
  await db
    .insert(invLocations)
    .values({
      id: generateId(),
      organizationId: defaultOrgId,
      name: "Default Location",
      type: "warehouse",
      isDefault: true,
    })
    .onConflictDoNothing();
  console.log("✓ Default inventory location created");

  console.log("Step 5: Creating system notification templates...");
  const notificationTemplates = [
    {
      key: "actor.welcome",
      channel: "email" as const,
      subject: "Welcome to {{orgName}}",
      body: "Hi {{firstName}}, your account has been created.",
    },
    {
      key: "actor.password-reset",
      channel: "email" as const,
      subject: "Reset your password",
      body: "Click here to reset: {{resetUrl}}",
    },
    {
      key: "actor.invite",
      channel: "email" as const,
      subject: "You have been invited to {{orgName}}",
      body: "Accept your invitation: {{inviteUrl}}",
    },
    {
      key: "task.assigned",
      channel: "in_app" as const,
      subject: "",
      body: "You have been assigned: {{taskTitle}}",
    },
    {
      key: "task.overdue",
      channel: "in_app" as const,
      subject: "",
      body: "Task overdue: {{taskTitle}}",
    },
  ];

  for (const template of notificationTemplates) {
    await db
      .insert(ntfTemplates)
      .values({
        id: generateId(),
        organizationId: defaultOrgId,
        key: template.key,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        locale: "en",
        isSystem: true,
      })
      .onConflictDoNothing();
  }
  console.log("✓ System notification templates created");

  console.log("✓ Core + Module seed complete");
}

seed().catch(console.error);
