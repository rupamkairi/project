// Platform Notification Management Routes - Templates, Triggers, Logs

import Elysia from "elysia";
import { t } from "elysia";
import { db } from "@projectx/server/infra/db/client";
import {
  ntfTemplates,
  ntfTriggers,
  ntfLogs,
  ntfPreferences,
} from "@projectx/server/infra/db/schema/notification";
import { eq, and, desc, like, or, isNull } from "drizzle-orm";
import { generateId } from "@projectx/server/core/entity";

export const notificationRoutes = new Elysia({ prefix: "/notifications" })
  // ==================== Templates ====================
  .get("/templates", async ({ query, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;
    const search = (query.search as string) || "";
    const channel = (query.channel as string) || "";

    const orgId = "org_platform_default";
    const offset = (page - 1) * limit;

    const conditions = [
      eq(ntfTemplates.organizationId, orgId),
      isNull(ntfTemplates.deletedAt),
    ];

    if (search) {
      conditions.push(like(ntfTemplates.key, `%${search}%`));
    }

    if (channel) {
      conditions.push(eq(ntfTemplates.channel, channel as any));
    }

    const [templates, countResult] = await Promise.all([
      db
        .select()
        .from(ntfTemplates)
        .where(and(...conditions))
        .orderBy(desc(ntfTemplates.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: ntfTemplates.id })
        .from(ntfTemplates)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: templates.map((t) => ({
        id: t.id,
        key: t.key,
        channel: t.channel,
        subject: t.subject,
        body: t.body,
        locale: t.locale,
        isSystem: t.isSystem,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  })
  .get("/templates/:id", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const orgId = "org_platform_default";

    const [template] = await db
      .select()
      .from(ntfTemplates)
      .where(
        and(
          eq(ntfTemplates.id, params.id),
          eq(ntfTemplates.organizationId, orgId),
          isNull(ntfTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!template) {
      set.status = 404;
      return { error: "Template not found" };
    }

    return {
      id: template.id,
      key: template.key,
      channel: template.channel,
      subject: template.subject,
      body: template.body,
      locale: template.locale,
      isSystem: template.isSystem,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  })
  .post(
    "/templates",
    async ({ body, headers, set }) => {
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const {
        key,
        channel,
        subject,
        body: templateBody,
        locale,
      } = body as {
        key: string;
        channel: string;
        subject?: string;
        body: string;
        locale?: string;
      };

      const orgId = "org_platform_default";
      const now = new Date();

      // Check if key already exists
      const [existing] = await db
        .select()
        .from(ntfTemplates)
        .where(
          and(
            eq(ntfTemplates.key, key),
            eq(ntfTemplates.channel, channel as any),
            eq(ntfTemplates.organizationId, orgId),
            isNull(ntfTemplates.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        set.status = 409;
        return { error: "Template with this key and channel already exists" };
      }

      const [template] = await db
        .insert(ntfTemplates)
        .values({
          id: generateId(),
          organizationId: orgId,
          key,
          channel: channel as any,
          subject: subject || null,
          body: templateBody,
          locale: locale || "en",
          isSystem: false,
          createdAt: now,
          updatedAt: now,
          version: 1,
          deletedAt: null,
          meta: {},
        })
        .returning();

      if (!template) {
        set.status = 500;
        return { error: "Failed to create template" };
      }

      return {
        id: template.id,
        key: template.key,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        locale: template.locale,
        createdAt: template.createdAt,
      };
    },
    {
      body: t.Object({
        key: t.String({ minLength: 1 }),
        channel: t.Union([
          t.Literal("email"),
          t.Literal("sms"),
          t.Literal("push"),
          t.Literal("in_app"),
        ]),
        subject: t.Optional(t.String()),
        body: t.String({ minLength: 1 }),
        locale: t.Optional(t.String({ default: "en" })),
      }),
    },
  )
  .put("/templates/:id", async ({ params, body, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { subject, body: templateBody } = body as {
      subject?: string;
      body?: string;
    };

    const orgId = "org_platform_default";

    const [existing] = await db
      .select()
      .from(ntfTemplates)
      .where(
        and(
          eq(ntfTemplates.id, params.id),
          eq(ntfTemplates.organizationId, orgId),
          isNull(ntfTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "Template not found" };
    }

    if (existing.isSystem) {
      set.status = 403;
      return { error: "Cannot modify system template" };
    }

    const [updated] = await db
      .update(ntfTemplates)
      .set({
        subject: subject ?? existing.subject,
        body: templateBody ?? existing.body,
        updatedAt: new Date(),
      })
      .where(eq(ntfTemplates.id, params.id))
      .returning();

    if (!updated) {
      set.status = 500;
      return { error: "Failed to update template" };
    }

    return {
      id: updated.id,
      key: updated.key,
      subject: updated.subject,
      body: updated.body,
      updatedAt: updated.updatedAt,
    };
  })
  .delete("/templates/:id", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const orgId = "org_platform_default";

    const [existing] = await db
      .select()
      .from(ntfTemplates)
      .where(
        and(
          eq(ntfTemplates.id, params.id),
          eq(ntfTemplates.organizationId, orgId),
          isNull(ntfTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "Template not found" };
    }

    if (existing.isSystem) {
      set.status = 403;
      return { error: "Cannot delete system template" };
    }

    await db
      .update(ntfTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(ntfTemplates.id, params.id));

    return { success: true };
  })

  // ==================== Triggers ====================
  .get("/triggers", async ({ query, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;

    const orgId = "org_platform_default";
    const offset = (page - 1) * limit;

    const [triggers, countResult] = await Promise.all([
      db
        .select()
        .from(ntfTriggers)
        .where(
          and(
            eq(ntfTriggers.organizationId, orgId),
            isNull(ntfTriggers.deletedAt),
          ),
        )
        .orderBy(desc(ntfTriggers.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: ntfTriggers.id })
        .from(ntfTriggers)
        .where(
          and(
            eq(ntfTriggers.organizationId, orgId),
            isNull(ntfTriggers.deletedAt),
          ),
        ),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: triggers.map((t) => ({
        id: t.id,
        eventPattern: t.eventPattern,
        templateKey: t.templateKey,
        channel: t.channel,
        recipientExpr: t.recipientExpr,
        conditions: t.conditions,
        isActive: t.isActive,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  })
  .post("/triggers", async ({ body, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { eventPattern, templateKey, channel, recipientExpr, conditions } =
      body as {
        eventPattern: string;
        templateKey: string;
        channel: string;
        recipientExpr?: object;
        conditions?: object;
      };

    const orgId = "org_platform_default";
    const now = new Date();

    const [trigger] = await db
      .insert(ntfTriggers)
      .values({
        id: generateId(),
        organizationId: orgId,
        eventPattern,
        templateKey,
        channel: channel as any,
        recipientExpr: recipientExpr || {},
        conditions: conditions || {},
        isActive: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: null,
        meta: {},
      })
      .returning();

    if (!trigger) {
      set.status = 500;
      return { error: "Failed to create trigger" };
    }

    return {
      id: trigger.id,
      eventPattern: trigger.eventPattern,
      templateKey: trigger.templateKey,
      channel: trigger.channel,
      isActive: trigger.isActive,
      createdAt: trigger.createdAt,
    };
  })
  .delete("/triggers/:id", async ({ params, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const orgId = "org_platform_default";

    await db
      .update(ntfTriggers)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(ntfTriggers.id, params.id),
          eq(ntfTriggers.organizationId, orgId),
        ),
      );

    return { success: true };
  })

  // ==================== Logs ====================
  .get("/logs", async ({ query, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;
    const status = (query.status as string) || "";
    const templateKey = (query.templateKey as string) || "";

    const orgId = "org_platform_default";
    const offset = (page - 1) * limit;

    const conditions = [eq(ntfLogs.organizationId, orgId)];

    if (status) {
      conditions.push(eq(ntfLogs.status, status as any));
    }

    if (templateKey) {
      conditions.push(eq(ntfLogs.templateKey, templateKey));
    }

    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(ntfLogs)
        .where(and(...conditions))
        .orderBy(desc(ntfLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: ntfLogs.id })
        .from(ntfLogs)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: logs.map((l) => ({
        id: l.id,
        templateKey: l.templateKey,
        channel: l.channel,
        recipient: l.recipient,
        status: l.status,
        sentAt: l.sentAt,
        error: l.error,
        metadata: l.metadata,
        createdAt: l.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

export type NotificationRoutes = typeof notificationRoutes;
