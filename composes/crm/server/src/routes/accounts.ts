// CRM Compose — /crm/accounts routes.
//
// Accounts are backed by the `parties` master table (type = "company"). Compose
// reads/writes directly via @db/client per master-tables.md.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { parties, persons } from "@db/schema/party";
import { eq, and, isNull, desc, ilike, or, count } from "drizzle-orm";
import { requirePermission, isManager } from "../permissions";
import { parsePagination, listResponse, getActor } from "./helpers";

export function createAccountsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/accounts" })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "account:read");
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds = [
        eq(parties.organizationId, actor.orgId),
        eq(parties.type, "company"),
        isNull(parties.deletedAt),
      ];
      if (q.industry) conds.push(eq(parties.industry, String(q.industry)));
      if (q.search)
        conds.push(
          or(
            ilike(parties.name, `%${q.search}%`),
            ilike(parties.domain, `%${q.search}%`),
          )!,
        );

      const [items, [c]] = await Promise.all([
        db.select().from(parties).where(and(...conds)).orderBy(desc(parties.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(parties).where(and(...conds)),
      ]);
      return listResponse(items.map(shapeAccount), c?.value ?? 0, page, limit);
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "account:read");
      const { id } = (ctx as any).params;

      const [account] = await db
        .select()
        .from(parties)
        .where(and(eq(parties.id, id), eq(parties.organizationId, actor.orgId), isNull(parties.deletedAt)))
        .limit(1);
      if (!account) {
        (ctx as any).set.status = 404;
        return { error: "Account not found" };
      }

      const [contactCount] = await db
        .select({ value: count() })
        .from(persons)
        .where(and(eq(persons.partyId, id), eq(persons.organizationId, actor.orgId), isNull(persons.deletedAt)));
      return { ...shapeAccount(account), contactCount: contactCount?.value ?? 0 };
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "account:create");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      const [account] = await db
        .insert(parties)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          type: "company",
          name: body.name,
          domain: body.domain ?? null,
          industry: body.industry ?? null,
          employeeCount: body.employeeCount ?? null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {
            ownerId: body.ownerId ?? actor.id,
            tags: body.tags ?? [],
            website: body.website ?? null,
          },
        })
        .returning();
      (ctx as any).set.status = 201;
      return shapeAccount(account!);
    })
    .patch("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "account:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [existing] = await db
        .select()
        .from(parties)
        .where(and(eq(parties.id, id), eq(parties.organizationId, actor.orgId), isNull(parties.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Account not found" };
      }

      const meta: Record<string, any> = { ...(existing.meta ?? {}) };
      if (body.ownerId != null) meta.ownerId = body.ownerId;
      if (Array.isArray(body.tags)) meta.tags = body.tags;
      if (body.website != null) meta.website = body.website;

      const [updated] = await db
        .update(parties)
        .set({
          ...(body.name != null && { name: body.name }),
          ...(body.domain != null && { domain: body.domain }),
          ...(body.industry != null && { industry: body.industry }),
          ...(body.employeeCount != null && { employeeCount: body.employeeCount }),
          meta,
          updatedAt: new Date(),
        })
        .where(eq(parties.id, id))
        .returning();
      return shapeAccount(updated!);
    })
    .delete("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "account:delete");
      const { id } = (ctx as any).params;
      await db.update(parties).set({ deletedAt: new Date() }).where(eq(parties.id, id));
      return { success: true };
    })
    .get("/:id/contacts", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "contact:read");
      const { id } = (ctx as any).params;
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);
      const conds = [
        eq(persons.organizationId, actor.orgId),
        eq(persons.partyId, id),
        isNull(persons.deletedAt),
      ];
      const [items, [c]] = await Promise.all([
        db.select().from(persons).where(and(...conds)).orderBy(desc(persons.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(persons).where(and(...conds)),
      ]);
      return listResponse(items, c?.value ?? 0, page, limit);
    })
    .get("/:id/deals", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:read");
      const { id } = (ctx as any).params;
      const { crmDeal } = await import("../db/schema/crm");
      const items = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.partyId, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .orderBy(desc(crmDeal.createdAt));
      return listResponse(items, items.length, 1, items.length);
    });
}

function shapeAccount(account: any) {
  const meta = account.meta ?? {};
  return {
    id: account.id,
    name: account.name,
    domain: account.domain,
    industry: account.industry,
    employeeCount: account.employeeCount,
    ownerId: meta.ownerId ?? null,
    tags: meta.tags ?? [],
    website: meta.website ?? null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
