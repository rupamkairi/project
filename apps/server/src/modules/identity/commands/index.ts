import type { CommandHandler } from "@core";
import { generateId } from "@core";
import { createHash } from "node:crypto";
import { db } from "@db/client";
import { actors, actorRoles, organizations, sessions } from "@db/schema/identity";
import { eq, and, isNull } from "drizzle-orm";
import { IdentityEvents } from "../events";

// ---------------------------------------------------------------------------
// identity.login
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
  expiresAt?: Date;
}

export interface LoginResult {
  actorId: string;
  orgId: string;
  sessionId: string;
}

export const loginHandler: CommandHandler<LoginPayload, LoginResult> = async (
  command,
  context,
) => {
  const { email, password, ip, userAgent, expiresAt } = command.payload;
  const orgId = command.orgId;

  const [actor] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.email, email), eq(actors.organizationId, orgId), isNull(actors.deletedAt)))
    .limit(1);

  if (!actor) throw new Error("Invalid credentials");
  if (actor.status !== "active") throw new Error("Account is not active");

  const valid = actor.passwordHash
    ? await Bun.password.verify(password, actor.passwordHash)
    : false;
  if (!valid) throw new Error("Invalid credentials");

  const now = new Date();
  const sessionId = generateId();
  // tokenHash stored as sha256(sessionId) — session looked up by sessionId via JWT claims
  const tokenHash = createHash("sha256").update(sessionId).digest("hex");
  const sessionExpiresAt = expiresAt ?? new Date(now.getTime() + 8 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    organizationId: orgId,
    actorId: actor.id,
    tokenHash,
    expiresAt: sessionExpiresAt,
    ip: ip ?? "unknown",
    userAgent: userAgent ?? "unknown",
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: {},
  });

  await db
    .update(actors)
    .set({ lastLoginAt: now, updatedAt: now })
    .where(eq(actors.id, actor.id));

  await context.publish(IdentityEvents.actorLogin(actor.id, sessionId));

  return { actorId: actor.id, orgId, sessionId };
};

// ---------------------------------------------------------------------------
// identity.logout
// ---------------------------------------------------------------------------

export interface LogoutPayload {
  sessionId: string;
}

export const logoutHandler: CommandHandler<LogoutPayload, void> = async (
  command,
  context,
) => {
  const { sessionId } = command.payload;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return;

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, session.id));

  await context.publish(IdentityEvents.actorLogout(session.actorId, session.id));
};

// ---------------------------------------------------------------------------
// identity.register
// ---------------------------------------------------------------------------

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RegisterResult {
  actorId: string;
}

export const registerHandler: CommandHandler<RegisterPayload, RegisterResult> = async (
  command,
  context,
) => {
  const { email, password, firstName, lastName } = command.payload;
  const orgId = command.orgId;

  const passwordHash = await Bun.password.hash(password);
  const now = new Date();
  const actorId = generateId();

  await db.insert(actors).values({
    id: actorId,
    organizationId: orgId,
    email,
    passwordHash,
    type: "human",
    status: "pending",
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    avatarUrl: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: {},
  });

  await context.publish(IdentityEvents.actorRegistered(actorId, email));

  return { actorId };
};

// ---------------------------------------------------------------------------
// identity.activate
// ---------------------------------------------------------------------------

export interface ActivatePayload {
  actorId: string;
}

export const activateHandler: CommandHandler<ActivatePayload, void> = async (
  command,
  context,
) => {
  const { actorId } = command.payload;

  const [actor] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.id, actorId), isNull(actors.deletedAt)))
    .limit(1);

  if (!actor) throw new Error(`Actor ${actorId} not found`);

  const result = await context.fsm.transition(
    "actor:lifecycle",
    actor.status,
    "activate",
    { entity: { ...actor }, actor: { id: command.actorId, roles: [], orgId: command.orgId } },
  );

  await db
    .update(actors)
    .set({ status: result.nextState as "active", updatedAt: new Date() })
    .where(eq(actors.id, actorId));

  await context.publish(IdentityEvents.actorActivated(actorId));
};

// ---------------------------------------------------------------------------
// identity.suspendActor
// ---------------------------------------------------------------------------

export interface SuspendActorPayload {
  actorId: string;
}

export const suspendActorHandler: CommandHandler<SuspendActorPayload, void> = async (
  command,
  context,
) => {
  const { actorId } = command.payload;

  const [actor] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.id, actorId), isNull(actors.deletedAt)))
    .limit(1);

  if (!actor) throw new Error(`Actor ${actorId} not found`);

  const result = await context.fsm.transition(
    "actor:lifecycle",
    actor.status,
    "suspend",
    { entity: { ...actor }, actor: { id: command.actorId, roles: [], orgId: command.orgId } },
  );

  await db
    .update(actors)
    .set({ status: result.nextState as "suspended", updatedAt: new Date() })
    .where(eq(actors.id, actorId));

  await context.publish(IdentityEvents.actorSuspended(actorId, command.actorId));
};

// ---------------------------------------------------------------------------
// identity.activateActor (reactivate from suspended)
// ---------------------------------------------------------------------------

export interface ActivateActorPayload {
  actorId: string;
}

export const activateActorHandler: CommandHandler<ActivateActorPayload, void> = async (
  command,
  context,
) => {
  const { actorId } = command.payload;

  const [actor] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.id, actorId), isNull(actors.deletedAt)))
    .limit(1);

  if (!actor) throw new Error(`Actor ${actorId} not found`);

  const result = await context.fsm.transition(
    "actor:lifecycle",
    actor.status,
    "reactivate",
    { entity: { ...actor }, actor: { id: command.actorId, roles: [], orgId: command.orgId } },
  );

  await db
    .update(actors)
    .set({ status: result.nextState as "active", updatedAt: new Date() })
    .where(eq(actors.id, actorId));

  await context.publish(IdentityEvents.actorReactivated(actorId));
};

// ---------------------------------------------------------------------------
// identity.assignRole
// ---------------------------------------------------------------------------

export interface AssignRolePayload {
  actorId: string;
  roleId: string;
}

export const assignRoleHandler: CommandHandler<AssignRolePayload, void> = async (
  command,
  context,
) => {
  const { actorId, roleId } = command.payload;

  await db
    .insert(actorRoles)
    .values({ actorId, roleId, assignedAt: new Date(), assignedBy: command.actorId })
    .onConflictDoNothing();

  await context.publish(IdentityEvents.roleAssigned(actorId, roleId, command.actorId));
};

// ---------------------------------------------------------------------------
// identity.revokeRole
// ---------------------------------------------------------------------------

export interface RevokeRolePayload {
  actorId: string;
  roleId: string;
}

export const revokeRoleHandler: CommandHandler<RevokeRolePayload, void> = async (
  command,
  context,
) => {
  const { actorId, roleId } = command.payload;

  await db
    .delete(actorRoles)
    .where(and(eq(actorRoles.actorId, actorId), eq(actorRoles.roleId, roleId)));

  await context.publish(IdentityEvents.roleRevoked(actorId, roleId, command.actorId));
};

// ---------------------------------------------------------------------------
// identity.createOrg
// ---------------------------------------------------------------------------

export interface CreateOrgPayload {
  name: string;
  slug: string;
  plan?: string;
}

export interface CreateOrgResult {
  orgId: string;
}

export const createOrgHandler: CommandHandler<CreateOrgPayload, CreateOrgResult> = async (
  command,
  context,
) => {
  const { name, slug, plan = "free" } = command.payload;
  const orgId = generateId();
  const now = new Date();

  await db.insert(organizations).values({
    id: orgId,
    name,
    slug,
    plan,
    settings: {},
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  await context.publish(IdentityEvents.orgCreated(orgId, name));

  return { orgId };
};
