// CRM Compose — /crm/contacts routes.
//
// Contacts are backed by the `persons` master table (type = "contact"). Per
// docs/master-tables.md §Compose extension contract, composes read/write master
// tables directly via @db/client (filtered by organization_id + type) and stash
// sparse CRM fields in the master row's `meta` jsonb. The party module mediator
// handlers don't carry CRM-specific fields, so direct access is the documented,
// authoritative path. See also architectural-rules.md (composes consume master
// tables via @db/client).

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons, parties } from "@db/schema/party";
import { crmDeal } from "../db/schema/crm";
import { eq, and, isNull, desc, ilike, or, count } from "drizzle-orm";
import { requirePermission, isManager } from "../permissions";
import { parsePagination, listResponse, getActor } from "./helpers";

export function createContactsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/contacts" })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:read");
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds = [
        eq(persons.organizationId, actor.orgId),
        eq(persons.type, "contact"),
        isNull(persons.deletedAt),
      ];
      if (q.accountId) conds.push(eq(persons.partyId, String(q.accountId)));
      if (q.ownerId) conds.push(eq(persons.id, String(q.ownerId))); // owner is in meta; narrow below
      if (q.search)
        conds.push(
          or(
            ilike(persons.email, `%${q.search}%`),
            ilike(persons.firstName, `%${q.search}%`),
            ilike(persons.lastName, `%${q.search}%`),
          )!,
        );

      const [items, [c]] = await Promise.all([
        db.select().from(persons).where(and(...conds)).orderBy(desc(persons.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(persons).where(and(...conds)),
      ]);

      // Sales-rep scope (owner in meta): managers see all, reps see their own.
      const scoped = isManager(actor)
        ? items
        : items.filter((p) => (p.meta as any)?.ownerId === actor.id);

      return listResponse(scoped.map(shapeContact), scoped.length, page, limit);
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:read");
      const { id } = (ctx as any).params;

      const [person] = await db
        .select()
        .from(persons)
        .where(and(eq(persons.id, id), eq(persons.organizationId, actor.orgId), isNull(persons.deletedAt)))
        .limit(1);
      if (!person) {
        (ctx as any).set.status = 404;
        return { error: "Contact not found" };
      }
      const [dealCount] = await db
        .select({ value: count() })
        .from(crmDeal)
        .where(and(eq(crmDeal.personId, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)));
      return { ...shapeContact(person), dealCount: dealCount?.value ?? 0 };
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:create");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      // Optional: auto-create an account (party) if accountName supplied.
      let partyId = body.accountId ?? null;
      if (!partyId && body.accountName) {
        [partyId] = (await db
          .insert(parties)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            type: "company",
            name: body.accountName,
            domain: body.domain ?? null,
            industry: body.industry ?? null,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning({ id: parties.id })).map((r) => r.id);
      }

      const [person] = await db
        .insert(persons)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          type: "contact",
          firstName: body.firstName ?? null,
          lastName: body.lastName ?? null,
          email: body.email ?? null,
          phone: body.phone ?? null,
          source: body.source ?? null,
          partyId: partyId ?? null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {
            title: body.title,
            department: body.department,
            ownerId: body.ownerId ?? actor.id,
            tags: body.tags ?? [],
            status: body.status ?? "active",
            mobile: body.mobile,
            leadScore: 0,
          },
        })
        .returning();
      (ctx as any).set.status = 201;
      return shapeContact(person!);
    })
    .patch("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [existing] = await db
        .select()
        .from(persons)
        .where(and(eq(persons.id, id), eq(persons.organizationId, actor.orgId), isNull(persons.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Contact not found" };
      }
      if (!isManager(actor) && (existing.meta as any)?.ownerId !== actor.id) {
        (ctx as any).set.status = 403;
        return { error: "Not your contact" };
      }

      const meta = mergeMeta(existing.meta, body, [
        "title", "department", "ownerId", "status", "mobile", "leadScore", "lastContactedAt",
      ]);
      if (Array.isArray(body.tags)) meta.tags = body.tags;

      const [updated] = await db
        .update(persons)
        .set({
          ...(body.firstName != null && { firstName: body.firstName }),
          ...(body.lastName != null && { lastName: body.lastName }),
          ...(body.email != null && { email: body.email }),
          ...(body.phone != null && { phone: body.phone }),
          ...(body.accountId != null && { partyId: body.accountId }),
          ...(body.source != null && { source: body.source }),
          meta,
          updatedAt: new Date(),
        })
        .where(eq(persons.id, id))
        .returning();
      return shapeContact(updated!);
    })
    .delete("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:delete");
      const { id } = (ctx as any).params;
      await db.update(persons).set({ deletedAt: new Date() }).where(eq(persons.id, id));
      return { success: true };
    })
    .post("/:id/tags", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};
      const [existing] = await db.select().from(persons).where(eq(persons.id, id)).limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Contact not found" };
      }
      const meta = { ...(existing.meta ?? {}) };
      const tags = new Set([...((meta as any).tags ?? []), ...(body.tags ?? [])]);
      (meta as any).tags = [...tags];
      await db.update(persons).set({ meta, updatedAt: new Date() }).where(eq(persons.id, id));
      return { id, tags: (meta as any).tags };
    })
    .delete("/:id/tags/:tag", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:update");
      const { id, tag } = (ctx as any).params;
      const [existing] = await db.select().from(persons).where(eq(persons.id, id)).limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Contact not found" };
      }
      const meta = { ...(existing.meta ?? {}) };
      (meta as any).tags = ((meta as any).tags ?? []).filter((t: string) => t !== tag);
      await db.update(persons).set({ meta, updatedAt: new Date() }).where(eq(persons.id, id));
      return { id, tags: (meta as any).tags };
    })
    .get("/:id/activities", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:read");
      const { id } = (ctx as any).params;
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);
      const { activities } = await import("@db/schema/activity");
      const conds = [
        eq(activities.organizationId, actor.orgId),
        isNull(activities.deletedAt),
        eq(activities.entityType, "person"),
        eq(activities.entityId, id),
      ];
      const [items, [c]] = await Promise.all([
        db.select().from(activities).where(and(...conds)).orderBy(desc(activities.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(activities).where(and(...conds)),
      ]);
      return listResponse(items, c?.value ?? 0, page, limit);
    })
    .get("/:id/deals", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:read");
      const { id } = (ctx as any).params;
      const items = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.personId, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .orderBy(desc(crmDeal.createdAt));
      return listResponse(items, items.length, 1, items.length);
    })
    .post("/:id/reassign", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:reassign");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      if (!body.ownerId) {
        (ctx as any).set.status = 400;
        return { error: "ownerId is required" };
      }

      const [existing] = await db
        .select()
        .from(persons)
        .where(and(eq(persons.id, id), eq(persons.organizationId, actor.orgId), isNull(persons.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Contact not found" };
      }

      const meta = { ...(existing.meta ?? {}), ownerId: String(body.ownerId) };
      const [updated] = await db
        .update(persons)
        .set({ meta, updatedAt: new Date() })
        .where(eq(persons.id, id))
        .returning();
      return shapeContact(updated!);
    });
}

// Flatten the person master row + its meta into the CRM contact shape.
function shapeContact(person: any) {
  const meta = person.meta ?? {};
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    phone: person.phone,
    source: person.source,
    accountId: person.partyId,
    title: meta.title,
    department: meta.department,
    ownerId: meta.ownerId,
    tags: meta.tags ?? [],
    status: meta.status ?? "active",
    mobile: meta.mobile,
    leadScore: meta.leadScore ?? 0,
    lastContactedAt: meta.lastContactedAt ?? null,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
  };
}

/** Shallow-merge only the provided keys from body into meta. */
function mergeMeta(
  existing: unknown,
  body: Record<string, any>,
  keys: string[],
): Record<string, any> {
  const meta: Record<string, any> = { ...(existing ?? {}) };
  for (const k of keys) if (body[k] != null) meta[k] = body[k];
  return meta;
}
