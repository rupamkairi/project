// CRM Compose — /crm/segments routes.
//
// Segments are CRM-owned (crm_segments). A segment defines a filter rule
// expression evaluated against persons (contacts). `contactCount` is a cached
// count refreshed when the segment is saved or via a compute endpoint.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { crmSegment } from "../db/schema/crm";
import { eq, and, isNull, desc, count } from "drizzle-orm";
import { requirePermission } from "../permissions";
import { parsePagination, listResponse, getActor } from "./helpers";

export function createSegmentsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/segments" })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "segment:read");
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds = [
        eq(crmSegment.organizationId, actor.orgId),
        isNull(crmSegment.deletedAt),
      ];

      const [items, [c]] = await Promise.all([
        db.select().from(crmSegment).where(and(...conds)).orderBy(desc(crmSegment.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(crmSegment).where(and(...conds)),
      ]);
      return listResponse(items, c?.value ?? 0, page, limit);
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "segment:read");
      const { id } = (ctx as any).params;

      const [segment] = await db
        .select()
        .from(crmSegment)
        .where(and(eq(crmSegment.id, id), eq(crmSegment.organizationId, actor.orgId), isNull(crmSegment.deletedAt)))
        .limit(1);
      if (!segment) {
        (ctx as any).set.status = 404;
        return { error: "Segment not found" };
      }
      return segment;
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "segment:manage");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      const [segment] = await db
        .insert(crmSegment)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          name: body.name,
          description: body.description ?? null,
          filters: body.filters ?? [],
          contactCount: 0,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning();

      (ctx as any).set.status = 201;
      return segment;
    })
    .patch("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "segment:manage");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [existing] = await db
        .select()
        .from(crmSegment)
        .where(and(eq(crmSegment.id, id), eq(crmSegment.organizationId, actor.orgId), isNull(crmSegment.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Segment not found" };
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (body.name != null) updates.name = body.name;
      if (body.description != null) updates.description = body.description;
      if (body.filters != null) updates.filters = body.filters;

      const [updated] = await db
        .update(crmSegment)
        .set(updates)
        .where(eq(crmSegment.id, id))
        .returning();
      return updated;
    })
    .delete("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "segment:manage");
      const { id } = (ctx as any).params;
      await db.update(crmSegment).set({ deletedAt: new Date() }).where(eq(crmSegment.id, id));
      return { success: true };
    })
    .post("/:id/compute", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "segment:read");
      const { id } = (ctx as any).params;

      const [segment] = await db
        .select()
        .from(crmSegment)
        .where(and(eq(crmSegment.id, id), eq(crmSegment.organizationId, actor.orgId), isNull(crmSegment.deletedAt)))
        .limit(1);
      if (!segment) {
        (ctx as any).set.status = 404;
        return { error: "Segment not found" };
      }

      const filters = segment.filters as Record<string, any>[];
      const conds = [
        eq(persons.organizationId, actor.orgId),
        eq(persons.type, "contact"),
        isNull(persons.deletedAt),
      ];

      for (const f of filters) {
        if (f.field && f.value != null) {
          conds.push(eq(persons[f.field as keyof typeof persons] as any, String(f.value)));
        }
      }

      const [c] = await db
        .select({ value: count() })
        .from(persons)
        .where(and(...conds));

      const contactCount = c?.value ?? 0;
      await db
        .update(crmSegment)
        .set({ contactCount, lastComputedAt: new Date(), updatedAt: new Date() })
        .where(eq(crmSegment.id, id));

      return { id, contactCount, lastComputedAt: new Date() };
    })
    // --- Preview: evaluate filters → return matching contacts (paginated) ---
    .post("/:id/preview", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "segment:read");
      const { id } = (ctx as any).params;
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const [segment] = await db
        .select()
        .from(crmSegment)
        .where(and(eq(crmSegment.id, id), eq(crmSegment.organizationId, actor.orgId), isNull(crmSegment.deletedAt)))
        .limit(1);
      if (!segment) {
        (ctx as any).set.status = 404;
        return { error: "Segment not found" };
      }

      const filters = segment.filters as Record<string, any>[];
      const conds = [
        eq(persons.organizationId, actor.orgId),
        eq(persons.type, "contact"),
        isNull(persons.deletedAt),
      ];

      for (const f of filters) {
        if (f.field && f.value != null) {
          conds.push(eq(persons[f.field as keyof typeof persons] as any, String(f.value)));
        }
      }

      const [items, [c]] = await Promise.all([
        db
          .select({ id: persons.id, firstName: persons.firstName, lastName: persons.lastName, email: persons.email })
          .from(persons)
          .where(and(...conds))
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(persons).where(and(...conds)),
      ]);

      return listResponse(items, c?.value ?? 0, page, limit);
    });
}
