// Platform Invite Management Routes - CRUD operations for user invites

import Elysia from "elysia";
import { t } from "elysia";
import { db } from "@db/client";
import { pltInvites } from "../db/schema/platform";
import { eq, and, isNull, desc, like, or } from "drizzle-orm";
import { generateId } from "@core/entity";
import { randomBytes } from "crypto";

const INVITE_EXPIRY_DAYS = 7;

function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

function generateInviteLink(token: string): string {
  return `/invite/${token}`;
}

export const inviteRoutes = new Elysia({ prefix: "/invites" })
  .get("/", async ({ query, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;
    const search = (query.search as string) || "";
    const status = (query.status as string) || "";

    const orgId = "org_platform_default";

    const conditions = [
      eq(pltInvites.organizationId, orgId),
      isNull(pltInvites.deletedAt),
    ];

    if (search) {
      conditions.push(like(pltInvites.email, `%${search}%`));
    }

    if (status) {
      conditions.push(eq(pltInvites.status, status as any));
    }

    const offset = (page - 1) * limit;

    const [invites, countResult] = await Promise.all([
      db
        .select()
        .from(pltInvites)
        .where(and(...conditions))
        .orderBy(desc(pltInvites.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: pltInvites.id })
        .from(pltInvites)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      data: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        roleIds: invite.roleIds,
        invitedBy: invite.invitedBy,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
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

    const [invite] = await db
      .select()
      .from(pltInvites)
      .where(
        and(
          eq(pltInvites.id, params.id),
          eq(pltInvites.organizationId, orgId),
          isNull(pltInvites.deletedAt),
        ),
      )
      .limit(1);

    if (!invite) {
      set.status = 404;
      return { error: "Invite not found" };
    }

    return {
      id: invite.id,
      email: invite.email,
      roleIds: invite.roleIds,
      invitedBy: invite.invitedBy,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
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

      const { email, roleIds } = body as {
        email: string;
        roleIds?: string[];
      };

      const orgId = "org_platform_default";
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

      const [existing] = await db
        .select()
        .from(pltInvites)
        .where(
          and(
            eq(pltInvites.email, email),
            eq(pltInvites.organizationId, orgId),
            eq(pltInvites.status, "pending"),
            isNull(pltInvites.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        set.status = 409;
        return { error: "Pending invite already exists for this email" };
      }

      const token = generateInviteToken();

      const [invite] = await db
        .insert(pltInvites)
        .values({
          id: generateId(),
          organizationId: orgId,
          email,
          roleIds: roleIds || [],
          invitedBy: "admin", // In real app, get from token
          token,
          expiresAt,
          status: "pending",
          createdAt: now,
          updatedAt: now,
          version: 1,
          deletedAt: null,
          meta: {},
        })
        .returning();

      if (!invite) {
        set.status = 500;
        return { error: "Failed to create invite" };
      }

      return {
        id: invite.id,
        email: invite.email,
        roleIds: invite.roleIds,
        invitedBy: invite.invitedBy,
        status: invite.status,
        expiresAt: invite.expiresAt,
        inviteLink: generateInviteLink(invite.token),
        createdAt: invite.createdAt,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        roleIds: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .post("/:id/resend", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const orgId = "org_platform_default";

    const [existing] = await db
      .select()
      .from(pltInvites)
      .where(
        and(
          eq(pltInvites.id, params.id),
          eq(pltInvites.organizationId, orgId),
          isNull(pltInvites.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "Invite not found" };
    }

    if (existing.status !== "pending") {
      set.status = 400;
      return { error: "Can only resend pending invites" };
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const newToken = generateInviteToken();

    const [updated] = await db
      .update(pltInvites)
      .set({
        token: newToken,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(pltInvites.id, params.id))
      .returning();

    if (!updated) {
      set.status = 500;
      return { error: "Failed to resend invite" };
    }

    return {
      id: updated.id,
      email: updated.email,
      roleIds: updated.roleIds,
      status: updated.status,
      expiresAt: updated.expiresAt,
      inviteLink: generateInviteLink(updated.token),
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
      .from(pltInvites)
      .where(
        and(
          eq(pltInvites.id, params.id),
          eq(pltInvites.organizationId, orgId),
          isNull(pltInvites.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "Invite not found" };
    }

    if (existing.status === "accepted") {
      set.status = 400;
      return { error: "Cannot revoke accepted invites" };
    }

    await db
      .update(pltInvites)
      .set({
        status: "revoked",
        updatedAt: new Date(),
      })
      .where(eq(pltInvites.id, params.id));

    return { success: true };
  });

export type InviteRoutes = typeof inviteRoutes;
