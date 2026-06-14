import Elysia, { t } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { actors, actorRoles, sessions } from "@db/schema/identity";
import { eq, and, desc, isNull } from "drizzle-orm";
import type { AuthActor } from "@projectx/plugin-auth-server";

export function createUserRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/users" })
  .get("/", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const q = (ctx as any).query ?? {};
      const page = parseInt(q.page as string) || 1;
      const limit = parseInt(q.limit as string) || 20;
      const status = (q.status as string) || undefined;
      const offset = (page - 1) * limit;

      const result = await mediator.query<{ items: any[]; total: number }>({
        type: "identity.listActors",
        params: { status, limit, offset },
        actorId: actor.id,
        orgId: actor.orgId,
      });

      return {
        data: result.items.map((u: any) => ({
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
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      };
    })
  .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, set } = ctx as any;

      const user = await mediator.query<any>({
        type: "identity.getActor",
        params: { actorId: params.id },
        actorId: actor.id,
        orgId: actor.orgId,
      });

      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }

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
        roles: userRoles.map((r: any) => r.roleId),
      };
    })
  .post(
    "/",
    async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { body, set } = ctx as any;
      const { email, firstName, lastName, password } = body as {
        email: string;
        firstName?: string;
        lastName?: string;
        password?: string;
      };

      try {
        const { actorId } = await mediator.dispatch<{ actorId: string }>({
          type: "identity.register",
          payload: { email, password: password ?? generateId(), firstName, lastName },
          actorId: actor.id,
          orgId: actor.orgId,
          correlationId: generateId(),
        });

        // Auto-activate for platform admin creation
        await mediator.dispatch({
          type: "identity.activate",
          payload: { actorId },
          actorId: actor.id,
          orgId: actor.orgId,
          correlationId: generateId(),
        });

        const user = await mediator.query<any>({
          type: "identity.getActor",
          params: { actorId },
          actorId: actor.id,
          orgId: actor.orgId,
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          createdAt: user.createdAt,
        };
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "Failed to create user" };
      }
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
  .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, body, set } = ctx as any;
      const { firstName, lastName, avatarUrl } = body as {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
      };

      const [existing] = await db
        .select()
        .from(actors)
        .where(
          and(
            eq(actors.id, params.id),
            eq(actors.organizationId, actor.orgId),
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

      return {
        id: updated!.id,
        email: updated!.email,
        firstName: updated!.firstName,
        lastName: updated!.lastName,
        avatarUrl: updated!.avatarUrl,
      };
    })
  .post("/:id/suspend", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, set } = ctx as any;

      try {
        await mediator.dispatch({
          type: "identity.suspendActor",
          payload: { actorId: params.id },
          actorId: actor.id,
          orgId: actor.orgId,
          correlationId: generateId(),
        });

        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(sessions.actorId, params.id), isNull(sessions.revokedAt)));

        return { id: params.id, status: "suspended" };
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "Failed to suspend user" };
      }
    })
  .post("/:id/activate", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, set } = ctx as any;

      try {
        await mediator.dispatch({
          type: "identity.activateActor",
          payload: { actorId: params.id },
          actorId: actor.id,
          orgId: actor.orgId,
          correlationId: generateId(),
        });

        return { id: params.id, status: "active" };
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "Failed to activate user" };
      }
    })
  .delete("/:id", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params, set } = ctx as any;

      const [existing] = await db
        .select()
        .from(actors)
        .where(
          and(
            eq(actors.id, params.id),
            eq(actors.organizationId, actor.orgId),
            isNull(actors.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "User not found" };
      }

      await db
        .update(actors)
        .set({ deletedAt: new Date(), status: "deleted", updatedAt: new Date() })
        .where(eq(actors.id, params.id));

      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.actorId, params.id), isNull(sessions.revokedAt)));

      return { success: true };
    })
  .get("/:id/sessions", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params } = ctx as any;
      const now = new Date();

      const userSessions = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.actorId, params.id),
            eq(sessions.organizationId, actor.orgId),
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
    .delete("/:id/sessions/:sessionId", async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const { params } = ctx as any;

      await mediator.dispatch({
        type: "identity.logout",
        payload: { sessionId: params.sessionId },
        actorId: actor.id,
        orgId: actor.orgId,
        correlationId: generateId(),
      });

      return { success: true };
    });
}

export type UserRoutes = ReturnType<typeof createUserRoutes>;
