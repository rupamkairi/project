// Platform Role Management Routes - CRUD operations for roles

import Elysia from "elysia";
import { t } from "elysia";
import { db } from "../../../../apps/server/src/infra/db/client";
import {
  roles,
  actorRoles,
  actors,
} from "../../../../apps/server/src/infra/db/schema/identity";
import { eq, and, isNull, desc } from "drizzle-orm";
import { generateId } from "../../../../apps/server/src/core/entity";

export const roleRoutes = new Elysia({ prefix: "/roles" })
  .get("/", async ({ query, headers, set }) => {
    // Auth check - simplified for demo
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;

    const orgId = "org_platform_default"; // In real app, get from token

    const offset = (page - 1) * limit;

    const [roleList, countResult] = await Promise.all([
      db
        .select()
        .from(roles)
        .where(and(eq(roles.organizationId, orgId), isNull(roles.deletedAt)))
        .orderBy(desc(roles.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: roles.id })
        .from(roles)
        .where(and(eq(roles.organizationId, orgId), isNull(roles.deletedAt))),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: roleList.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        isDefault: r.isDefault,
        isSystem: r.isSystem,
        createdAt: r.createdAt,
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

    const [role] = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, params.id),
          eq(roles.organizationId, orgId),
          isNull(roles.deletedAt),
        ),
      )
      .limit(1);

    if (!role) {
      set.status = 404;
      return { error: "Role not found" };
    }

    // Get actors with this role
    const roleAssignments = await db
      .select()
      .from(actorRoles)
      .where(eq(actorRoles.roleId, role.id));

    const actorIds = roleAssignments.map((ra) => ra.actorId);

    const assignedActors = actorIds.length
      ? await db
          .select({
            id: actors.id,
            email: actors.email,
            firstName: actors.firstName,
            lastName: actors.lastName,
          })
          .from(actors)
          .where(
            and(eq(actors.organizationId, orgId), isNull(actors.deletedAt)),
          )
      : [];

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isDefault: role.isDefault,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      memberCount: roleAssignments.length,
      members: assignedActors.map((a) => ({
        id: a.id,
        email: a.email,
        firstName: a.firstName,
        lastName: a.lastName,
      })),
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

      const { name, description, permissions, isDefault } = body as {
        name: string;
        description?: string;
        permissions?: string[];
        isDefault?: boolean;
      };

      const orgId = "org_platform_default";
      const now = new Date();

      // Check if role name already exists
      const [existing] = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.name, name),
            eq(roles.organizationId, orgId),
            isNull(roles.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        set.status = 409;
        return { error: "Role name already exists" };
      }

      // Create role
      const [role] = await db
        .insert(roles)
        .values({
          id: generateId(),
          organizationId: orgId,
          name,
          description: description || null,
          permissions: permissions || [],
          isDefault: isDefault || false,
          isSystem: false,
          createdAt: now,
          updatedAt: now,
          version: 1,
          deletedAt: null,
          meta: {},
        })
        .returning();

      if (!role) {
        set.status = 500;
        return { error: "Failed to create role" };
      }

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isDefault: role.isDefault,
        createdAt: role.createdAt,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String()),
        permissions: t.Optional(t.Array(t.String())),
        isDefault: t.Optional(t.Boolean()),
      }),
    },
  )
  .patch("/:id", async ({ params, body, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { name, description, permissions } = body as {
      name?: string;
      description?: string;
      permissions?: string[];
    };

    const orgId = "org_platform_default";

    const [existing] = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, params.id),
          eq(roles.organizationId, orgId),
          isNull(roles.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "Role not found" };
    }

    // Cannot modify system roles
    if (existing.isSystem) {
      set.status = 403;
      return { error: "Cannot modify system roles" };
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const [duplicate] = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.name, name),
            eq(roles.organizationId, orgId),
            isNull(roles.deletedAt),
          ),
        )
        .limit(1);

      if (duplicate) {
        set.status = 409;
        return { error: "Role name already exists" };
      }
    }

    const [updated] = await db
      .update(roles)
      .set({
        name: name ?? existing.name,
        description: description ?? existing.description,
        permissions: permissions ?? existing.permissions,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, params.id))
      .returning();

    if (!updated) {
      set.status = 500;
      return { error: "Failed to update role" };
    }

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      permissions: updated.permissions,
      isDefault: updated.isDefault,
      isSystem: updated.isSystem,
    };
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
      .from(roles)
      .where(
        and(
          eq(roles.id, params.id),
          eq(roles.organizationId, orgId),
          isNull(roles.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "Role not found" };
    }

    // Cannot delete system roles or default roles
    if (existing.isSystem) {
      set.status = 403;
      return { error: "Cannot delete system roles" };
    }

    if (existing.isDefault) {
      set.status = 403;
      return { error: "Cannot delete default roles" };
    }

    // Check if role has members
    const roleAssignments = await db
      .select()
      .from(actorRoles)
      .where(eq(actorRoles.roleId, params.id));

    if (roleAssignments.length > 0) {
      set.status = 400;
      return { error: "Cannot delete role with assigned members" };
    }

    // Soft delete
    await db
      .update(roles)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(roles.id, params.id));

    return { success: true };
  })
  .post(
    "/:id/assign",
    async ({ params, body, headers, set }) => {
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const { actorIds } = body as {
        actorIds: string[];
      };

      const orgId = "org_platform_default";

      // Verify role exists
      const [role] = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.id, params.id),
            eq(roles.organizationId, orgId),
            isNull(roles.deletedAt),
          ),
        )
        .limit(1);

      if (!role) {
        set.status = 404;
        return { error: "Role not found" };
      }

      // Verify actors exist and belong to org
      const validActors = await db
        .select({ id: actors.id })
        .from(actors)
        .where(and(eq(actors.organizationId, orgId), isNull(actors.deletedAt)));

      const validActorIds = validActors.map((a) => a.id);
      const actorIdsToAssign = actorIds.filter((id) =>
        validActorIds.includes(id),
      );

      // Assign roles to actors
      const assignments = actorIdsToAssign.map((actorId) => ({
        actorId,
        roleId: role.id,
        assignedAt: new Date(),
        assignedBy: null, // Would come from authenticated user
      }));

      // Use INSERT ... ON CONFLICT DO NOTHING to avoid duplicates
      for (const assignment of assignments) {
        await db
          .insert(actorRoles)
          .values(assignment)
          .onConflictDoNothing({
            target: [actorRoles.actorId, actorRoles.roleId],
          });
      }

      return {
        success: true,
        assignedCount: actorIdsToAssign.length,
      };
    },
    {
      body: t.Object({
        actorIds: t.Array(t.String()),
      }),
    },
  )
  .post(
    "/:id/revoke",
    async ({ params, body, headers, set }) => {
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const { actorIds } = body as {
        actorIds: string[];
      };

      const orgId = "org_platform_default";

      // Verify role exists
      const [role] = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.id, params.id),
            eq(roles.organizationId, orgId),
            isNull(roles.deletedAt),
          ),
        )
        .limit(1);

      if (!role) {
        set.status = 404;
        return { error: "Role not found" };
      }

      // Revoke role from actors
      const firstActorId = actorIds[0];
      if (!firstActorId) {
        set.status = 400;
        return { error: "At least one actor ID is required" };
      }

      const revokedCount = await db
        .delete(actorRoles)
        .where(
          and(
            eq(actorRoles.roleId, params.id),
            eq(actorRoles.actorId, firstActorId),
          ),
        )
        .returning();

      return {
        success: true,
        revokedCount: revokedCount.length,
      };
    },
    {
      body: t.Object({
        actorIds: t.Array(t.String()),
      }),
    },
  );

export type RoleRoutes = typeof roleRoutes;
