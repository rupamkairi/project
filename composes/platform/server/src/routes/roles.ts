import Elysia, { t } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { roles, actorRoles, actors } from "@db/schema/identity";
import { eq, and, isNull, desc } from "drizzle-orm";
import type { AuthActor } from "@projectx/plugin-auth-server";

export function createRoleRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/roles" })
  .get("/", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const q = (ctx as any).query ?? {};
      const page = parseInt(q.page as string) || 1;
      const limit = parseInt(q.limit as string) || 20;
      const offset = (page - 1) * limit;

      const roleList = await mediator.query<any[]>({
        type: "identity.listRoles",
        params: {},
        actorId: actor.id,
        orgId: actor.orgId,
      });

      const paged = roleList.slice(offset, offset + limit);

      return {
        data: paged.map((r: any) => ({
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
          total: roleList.length,
          totalPages: Math.ceil(roleList.length / limit),
        },
      };
    })
  .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, set } = ctx as any;

      const [role] = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.id, params.id),
            eq(roles.organizationId, actor.orgId),
            isNull(roles.deletedAt),
          ),
        )
        .limit(1);

      if (!role) {
        set.status = 404;
        return { error: "Role not found" };
      }

      const roleAssignments = await db
        .select()
        .from(actorRoles)
        .where(eq(actorRoles.roleId, role.id));

      const assignedActors = roleAssignments.length
        ? await db
            .select({ id: actors.id, email: actors.email, firstName: actors.firstName, lastName: actors.lastName })
            .from(actors)
            .where(and(eq(actors.organizationId, actor.orgId), isNull(actors.deletedAt)))
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
        members: assignedActors.map((a) => ({ id: a.id, email: a.email, firstName: a.firstName, lastName: a.lastName })),
      };
    })
  .post(
    "/",
    async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { body, set } = ctx as any;
      const { name, description, permissions, isDefault } = body as {
        name: string;
        description?: string;
        permissions?: string[];
        isDefault?: boolean;
      };

      const now = new Date();

      const [existing] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.name, name), eq(roles.organizationId, actor.orgId), isNull(roles.deletedAt)))
        .limit(1);

      if (existing) {
        set.status = 409;
        return { error: "Role name already exists" };
      }

      const [role] = await db
        .insert(roles)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
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

      return {
        id: role!.id,
        name: role!.name,
        description: role!.description,
        permissions: role!.permissions,
        isDefault: role!.isDefault,
        createdAt: role!.createdAt,
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
  .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, body, set } = ctx as any;
      const { name, description, permissions } = body as {
        name?: string;
        description?: string;
        permissions?: string[];
      };

      const [existing] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, params.id), eq(roles.organizationId, actor.orgId), isNull(roles.deletedAt)))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Role not found" };
      }

      if (existing.isSystem) {
        set.status = 403;
        return { error: "Cannot modify system roles" };
      }

      if (name && name !== existing.name) {
        const [dup] = await db
          .select()
          .from(roles)
          .where(and(eq(roles.name, name), eq(roles.organizationId, actor.orgId), isNull(roles.deletedAt)))
          .limit(1);
        if (dup) {
          set.status = 409;
          return { error: "Role name already exists" };
        }
      }

      const [updated] = await db
        .update(roles)
        .set({ name: name ?? existing.name, description: description ?? existing.description, permissions: permissions ?? existing.permissions, updatedAt: new Date() })
        .where(eq(roles.id, params.id))
        .returning();

      return {
        id: updated!.id,
        name: updated!.name,
        description: updated!.description,
        permissions: updated!.permissions,
        isDefault: updated!.isDefault,
        isSystem: updated!.isSystem,
      };
    })
  .delete("/:id", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, set } = ctx as any;

      const [existing] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, params.id), eq(roles.organizationId, actor.orgId), isNull(roles.deletedAt)))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Role not found" };
      }

      if (existing.isSystem) {
        set.status = 403;
        return { error: "Cannot delete system roles" };
      }

      if (existing.isDefault) {
        set.status = 403;
        return { error: "Cannot delete default roles" };
      }

      const roleAssignments = await db.select().from(actorRoles).where(eq(actorRoles.roleId, params.id));

      if (roleAssignments.length > 0) {
        set.status = 400;
        return { error: "Cannot delete role with assigned members" };
      }

      await db
        .update(roles)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(roles.id, params.id));

      return { success: true };
    })
  .post(
    "/:id/assign",
    async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, body, set } = ctx as any;
      const { actorIds } = body as { actorIds: string[] };

      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, params.id), eq(roles.organizationId, actor.orgId), isNull(roles.deletedAt)))
        .limit(1);

      if (!role) {
        set.status = 404;
        return { error: "Role not found" };
      }

      for (const actorId of actorIds) {
        await mediator.dispatch({
          type: "identity.assignRole",
          payload: { actorId, roleId: params.id },
          actorId: actor.id,
          orgId: actor.orgId,
          correlationId: generateId(),
        });
      }

      return { success: true, assignedCount: actorIds.length };
    },
    {
      body: t.Object({
        actorIds: t.Array(t.String()),
      }),
    },
  )
  .post(
    "/:id/revoke",
    async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, body, set } = ctx as any;
      const { actorIds } = body as { actorIds: string[] };

      if (!actorIds.length) {
        set.status = 400;
        return { error: "At least one actor ID is required" };
      }

      for (const actorId of actorIds) {
        await mediator.dispatch({
          type: "identity.revokeRole",
          payload: { actorId, roleId: params.id },
          actorId: actor.id,
          orgId: actor.orgId,
          correlationId: generateId(),
        });
      }

      return { success: true, revokedCount: actorIds.length };
    },
    {
      body: t.Object({
        actorIds: t.Array(t.String()),
      }),
    },
  );
}

export type RoleRoutes = ReturnType<typeof createRoleRoutes>;
