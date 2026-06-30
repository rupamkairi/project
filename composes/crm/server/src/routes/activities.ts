// CRM Compose — /crm/activities routes.
//
// Activities use the `activities` master table.
// Status enum: pending | done | cancelled  (no "completed" — use "done").
// Type enum: call | email | meeting | note | task | log | service_request | visit_note.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { activities } from "@db/schema/activity";
import { eq, and, isNull, desc, count, gte, lte, sql } from "drizzle-orm";
import { requirePermission } from "../permissions";
import { parsePagination, listResponse, getActor } from "./helpers";

const CRM_ACTIVITY_TYPES = ["call", "email", "meeting", "note", "task", "log"] as const;

export function createActivitiesRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/activities" })
    // Static routes FIRST (before parameterized `/:id`)
    .get("/types", async () => CRM_ACTIVITY_TYPES)
    .get("/upcoming", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "activity:read");
      const now = new Date();
      const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h

      const items = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.organizationId, actor.orgId),
            isNull(activities.deletedAt),
            sql`${activities.status} = 'pending'`,
            eq(activities.actorId, actor.id),
            gte(activities.dueAt, now),
            lte(activities.dueAt, windowEnd),
          ),
        )
        .orderBy(activities.dueAt);

      return listResponse(items, items.length, 1, items.length);
    })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "activity:read");
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds: any[] = [
        eq(activities.organizationId, actor.orgId),
        isNull(activities.deletedAt),
      ];
      if (q.type) conds.push(sql`${activities.type} = ${String(q.type)}`);
      if (q.entityType) conds.push(eq(activities.entityType, String(q.entityType)));
      if (q.entityId) conds.push(eq(activities.entityId, String(q.entityId)));
      if (q.status) conds.push(sql`${activities.status} = ${String(q.status)}`);
      if (q.actorId) conds.push(eq(activities.actorId, String(q.actorId)));
      if (q.dueFrom) conds.push(gte(activities.dueAt, new Date(String(q.dueFrom))));
      if (q.dueTo) conds.push(lte(activities.dueAt, new Date(String(q.dueTo))));

      const [items, [c]] = await Promise.all([
        db.select().from(activities).where(and(...conds)).orderBy(desc(activities.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(activities).where(and(...conds)),
      ]);
      return listResponse(items, c?.value ?? 0, page, limit);
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "activity:read");
      const { id } = (ctx as any).params;

      const [activity] = await db
        .select()
        .from(activities)
        .where(and(eq(activities.id, id), eq(activities.organizationId, actor.orgId), isNull(activities.deletedAt)))
        .limit(1);
      if (!activity) {
        (ctx as any).set.status = 404;
        return { error: "Activity not found" };
      }
      return activity;
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "activity:create");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      const [activity] = await db
        .insert(activities)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          type: (body.type ?? "note") as any,
          subject: body.subject ?? null,
          body: body.body ?? null,
          status: (body.status ?? "pending") as any,
          actorId: body.actorId ?? actor.id,
          entityType: body.entityType ?? null,
          entityId: body.entityId ?? null,
          dueAt: body.dueAt ?? null,
          completedAt: body.completedAt ?? null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning();
      (ctx as any).set.status = 201;
      return activity;
    })
    .patch("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "activity:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const updates: Record<string, any> = { updatedAt: new Date() };
      const editable = ["type", "subject", "body", "status", "entityType", "entityId", "dueAt", "outcome"];
      for (const f of editable) {
        if (body[f] != null) updates[f] = body[f];
      }
      // Map "completed" to canonical "done" for callers that send the old value
      if (updates.status === "completed") {
        updates.status = "done";
        updates.completedAt = new Date();
      }

      const [updated] = await db
        .update(activities)
        .set(updates)
        .where(and(eq(activities.id, id), eq(activities.organizationId, actor.orgId)))
        .returning();
      if (!updated) {
        (ctx as any).set.status = 404;
        return { error: "Activity not found" };
      }
      return updated;
    })
    .delete("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "activity:delete");
      const { id } = (ctx as any).params;
      await db
        .update(activities)
        .set({ deletedAt: new Date() })
        .where(and(eq(activities.id, id), eq(activities.organizationId, actor.orgId)));
      return { success: true };
    })
    // --- Complete -----------------------------------------------------------
    .post("/:id/complete", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "activity:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [existing] = await db
        .select()
        .from(activities)
        .where(and(eq(activities.id, id), eq(activities.organizationId, actor.orgId), isNull(activities.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Activity not found" };
      }

      const now = new Date();
      const [updated] = await db
        .update(activities)
        .set({
          status: "done" as any,
          completedAt: now,
          ...(body.outcome != null && { meta: { ...(existing.meta ?? {}), outcome: body.outcome } }),
          updatedAt: now,
        })
        .where(eq(activities.id, id))
        .returning();
      return updated;
    });
}
