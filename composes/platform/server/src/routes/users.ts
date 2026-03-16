// Platform User Management Routes - CRUD operations for users

import Elysia from "elysia";
import { t } from "elysia";
import { db } from "../../../../apps/server/src/infra/db/client";
import {
  actors,
  sessions,
  actorRoles,
} from "../../../../apps/server/src/infra/db/schema/identity";
import { eq, and, asc, desc, like, or, gt, isNull } from "drizzle-orm";
import { generateId } from "../../../../apps/server/src/core/entity";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get("/", async ({ query, headers, set }) => {
    // Auth check - simplified for demo
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;
    const search = (query.search as string) || "";
    const status = (query.status as string) || "";

    const orgId = "org_platform_default"; // In real app, get from token

    const conditions = [
      eq(actors.organizationId, orgId),
      isNull(actors.deletedAt),
    ];

    if (search) {
      conditions.push(
        or(
          like(actors.email, `%${search}%`),
          like(actors.firstName, `%${search}%`),
          like(actors.lastName, `%${search}%`),
        )!,
      );
    }

    if (status) {
      conditions.push(eq(actors.status, status as any));
    }

    const offset = (page - 1) * limit;

    const [users, countResult] = await Promise.all([
      db
        .select()
        .from(actors)
        .where(and(...conditions))
        .orderBy(desc(actors.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: actors.id })
        .from(actors)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        status: u.status,
        type: u.type,
        avatarUrl: u.avatarUrl,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  })
  .get("/:id", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const orgId = "org_platform_default";

    const [user] = await db
      .select()
      .from(actors)
      .where(
        and(
          eq(actors.id, params.id),
          eq(actors.organizationId, orgId),
          isNull(actors.deletedAt),
        ),
      )
      .limit(1);

    if (!user) {
      set.status = 404;
      return { error: "User not found" };
    }

    // Get roles
    const userRoles = await db
      .select()
      .from(actorRoles)
      .where(eq(actorRoles.actorId, user.id));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      type: user.type,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: userRoles.map((r) => r.roleId),
    };
  })
  .post(
    "/",
    async ({ body, headers, set }) => {
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const { email, firstName, lastName, password } = body as {
        email: string;
        firstName?: string;
        lastName?: string;
        password?: string;
      };

      const orgId = "org_platform_default";
      const now = new Date();

      // Check if email already exists
      const [existing] = await db
        .select()
        .from(actors)
        .where(
          and(
            eq(actors.email, email),
            eq(actors.organizationId, orgId),
            isNull(actors.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        set.status = 409;
        return { error: "Email already exists" };
      }

      // Create actor
      const [actor] = await db
        .insert(actors)
        .values({
          id: generateId(),
          organizationId: orgId,
          email,
          passwordHash: password
            ? Buffer.from(password).toString("base64")
            : null,
          type: "human",
          status: "active", // Auto-activate for platform
          firstName: firstName || null,
          lastName: lastName || null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          deletedAt: null,
          meta: {},
        })
        .returning();

      if (!actor) {
        set.status = 500;
        return { error: "Failed to create user" };
      }

      return {
        id: actor.id,
        email: actor.email,
        firstName: actor.firstName,
        lastName: actor.lastName,
        status: actor.status,
        createdAt: actor.createdAt,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        password: t.Optional(t.String({ minLength: 8 })),
      }),
    },
  )
  .patch("/:id", async ({ params, body, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { firstName, lastName, avatarUrl } = body as {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };

    const orgId = "org_platform_default";

    const [existing] = await db
      .select()
      .from(actors)
      .where(
        and(
          eq(actors.id, params.id),
          eq(actors.organizationId, orgId),
          isNull(actors.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "User not found" };
    }

    const [updated] = await db
      .update(actors)
      .set({
        firstName: firstName ?? existing.firstName,
        lastName: lastName ?? existing.lastName,
        avatarUrl: avatarUrl ?? existing.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(actors.id, params.id))
      .returning();

    if (!updated) {
      set.status = 500;
      return { error: "Failed to update user" };
    }

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      avatarUrl: updated.avatarUrl,
    };
  })
  .post("/:id/suspend", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const orgId = "org_platform_default";

    const [existing] = await db
      .select()
      .from(actors)
      .where(
        and(
          eq(actors.id, params.id),
          eq(actors.organizationId, orgId),
          isNull(actors.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "User not found" };
    }

    if (existing.status === "suspended") {
      set.status = 400;
      return { error: "User is already suspended" };
    }

    const [updated] = await db
      .update(actors)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(actors.id, params.id))
      .returning();

    if (!updated) {
      set.status = 500;
      return { error: "Failed to suspend user" };
    }

    // Revoke all sessions
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.actorId, params.id),
          eq(sessions.revokedAt, null as any),
        ),
      );

    return { id: updated.id, status: updated.status };
  })
  .post("/:id/activate", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const orgId = "org_platform_default";

    const [existing] = await db
      .select()
      .from(actors)
      .where(
        and(
          eq(actors.id, params.id),
          eq(actors.organizationId, orgId),
          isNull(actors.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "User not found" };
    }

    if (existing.status === "active") {
      set.status = 400;
      return { error: "User is already active" };
    }

    const [updated] = await db
      .update(actors)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(actors.id, params.id))
      .returning();

    if (!updated) {
      set.status = 500;
      return { error: "Failed to activate user" };
    }

    return { id: updated.id, status: updated.status };
  })
  .delete("/:id", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const orgId = "org_platform_default";

    const [existing] = await db
      .select()
      .from(actors)
      .where(
        and(
          eq(actors.id, params.id),
          eq(actors.organizationId, orgId),
          isNull(actors.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "User not found" };
    }

    // Soft delete
    await db
      .update(actors)
      .set({
        deletedAt: new Date(),
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(actors.id, params.id));

    // Revoke all sessions
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.actorId, params.id),
          eq(sessions.revokedAt, null as any),
        ),
      );

    return { success: true };
  })
  .get("/:id/sessions", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const now = new Date();

    const userSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.actorId, params.id),
          eq(sessions.organizationId, "org_platform_default"),
        ),
      )
      .orderBy(desc(sessions.createdAt));

    return userSessions.map((s) => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      isActive: !s.revokedAt && s.expiresAt > now,
      createdAt: s.createdAt,
    }));
  })
  .delete("/:id/sessions/:sessionId", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, params.sessionId));

    return { success: true };
  });

export type UserRoutes = typeof userRoutes;
