// CRM Compose — /crm/deals routes.
//
// Deals are CRM-owned (crm_deals detail table). A deal links multiple masters:
// persons, parties, pipeline_stages, transactions, cat_items.
// Deal FSM: open → won | lost | abandoned.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons, parties } from "@db/schema/party";
import { activities } from "@db/schema/activity";
import { crmDeal } from "../db/schema/crm";
import { eq, and, isNull, desc, sql, count, lt, isNotNull } from "drizzle-orm";
import { requirePermission, isManager, CRM_MANAGER_ROLES } from "../permissions";
import { assertDealTransition, type DealState } from "../lib/fsms";
import { parsePagination, listResponse, getActor } from "./helpers";

export function createDealsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/deals" })
    // --- Static routes first (before /:id) ----------------------------------
    .get("/rotting", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:read");
      const now = new Date();

      const conds = [
        eq(crmDeal.organizationId, actor.orgId),
        eq(crmDeal.status, "open"),
        isNull(crmDeal.deletedAt),
        isNotNull(crmDeal.rottingAt),
        lt(crmDeal.rottingAt, now),
      ];

      const scoped = isManager(actor) ? conds : [...conds, eq(crmDeal.ownerId, actor.id)];
      const deals = await db.select().from(crmDeal).where(and(...scoped)).orderBy(crmDeal.rottingAt);
      return listResponse(deals, deals.length, 1, deals.length);
    })
    .get("/pipeline/view", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:read");
      const q = (ctx as any).query ?? {};

      const { pipelines, pipelineStages } = await import("@db/schema/pipeline");

      let pipelineFilter = q.pipelineId ? String(q.pipelineId) : null;
      if (!pipelineFilter) {
        const [defaultPipeline] = await db
          .select()
          .from(pipelines)
          .where(and(eq(pipelines.entityType, "crm.deal"), eq(pipelines.organizationId, actor.orgId)))
          .limit(1);
        pipelineFilter = defaultPipeline?.id ?? null;
      }

      if (!pipelineFilter) return { stages: [] };

      const stages = await db
        .select()
        .from(pipelineStages)
        .where(and(eq(pipelineStages.pipelineId, pipelineFilter), eq(pipelineStages.organizationId, actor.orgId)))
        .orderBy(pipelineStages.position);

      const dealConds = [
        eq(crmDeal.pipelineId, pipelineFilter),
        eq(crmDeal.organizationId, actor.orgId),
        isNull(crmDeal.deletedAt),
      ];
      if (!isManager(actor)) dealConds.push(eq(crmDeal.ownerId, actor.id));

      const deals = await db.select().from(crmDeal).where(and(...dealConds));

      const dealsByStage = new Map<string, any[]>();
      for (const d of deals) {
        const list = dealsByStage.get(d.stageId ?? "") ?? [];
        list.push(d);
        dealsByStage.set(d.stageId ?? "", list);
      }

      return {
        stages: stages.map((s) => ({
          ...s,
          deals: dealsByStage.get(s.id) ?? [],
        })),
      };
    })
    .post("/bulk/move", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:update");
      const body = (ctx as any).body ?? {};
      const { dealIds, stageId } = body as { dealIds: string[]; stageId: string };

      if (!dealIds?.length || !stageId) {
        (ctx as any).set.status = 400;
        return { error: "dealIds and stageId required" };
      }

      const results = await Promise.all(
        dealIds.map(async (dealId) => {
          const [existing] = await db
            .select()
            .from(crmDeal)
            .where(and(eq(crmDeal.id, dealId), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
            .limit(1);
          if (!existing) return { dealId, error: "not found" };
          return db
            .update(crmDeal)
            .set({ stageId, updatedAt: new Date() })
            .where(eq(crmDeal.id, dealId))
            .returning({ id: crmDeal.id });
        }),
      );
      return { moved: results.length };
    })
    // --- CRUD ---------------------------------------------------------------
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:read");
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds = [
        eq(crmDeal.organizationId, actor.orgId),
        isNull(crmDeal.deletedAt),
      ];
      if (q.status) conds.push(eq(crmDeal.status, String(q.status)));
      if (q.stageId) conds.push(eq(crmDeal.stageId, String(q.stageId)));
      if (q.pipelineId) conds.push(eq(crmDeal.pipelineId, String(q.pipelineId)));
      if (q.ownerId) conds.push(eq(crmDeal.ownerId, String(q.ownerId)));

      const [items, [c]] = await Promise.all([
        db.select().from(crmDeal).where(and(...conds)).orderBy(desc(crmDeal.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(crmDeal).where(and(...conds)),
      ]);

      const scoped = isManager(actor) ? items : items.filter((d) => d.ownerId === actor.id);
      return listResponse(scoped, c?.value ?? 0, page, limit);
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:read");
      const { id } = (ctx as any).params;

      const [deal] = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.id, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .limit(1);
      if (!deal) {
        (ctx as any).set.status = 404;
        return { error: "Deal not found" };
      }

      const [person] = deal.personId
        ? await db.select({ firstName: persons.firstName, lastName: persons.lastName }).from(persons).where(eq(persons.id, deal.personId)).limit(1)
        : [null];
      const [party] = deal.partyId
        ? await db.select({ name: parties.name }).from(parties).where(eq(parties.id, deal.partyId)).limit(1)
        : [null];

      return {
        ...deal,
        contactName: person ? `${person.firstName} ${person.lastName}` : null,
        accountName: party?.name ?? null,
      };
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:create");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      const [deal] = await db
        .insert(crmDeal)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          title: body.title,
          personId: body.personId ?? null,
          partyId: body.partyId ?? null,
          stageId: body.stageId ?? null,
          pipelineId: body.pipelineId ?? null,
          transactionId: body.transactionId ?? null,
          itemId: body.itemId ?? null,
          ownerId: body.ownerId ?? actor.id,
          status: "open",
          value: body.value ?? null,
          probability: body.probability ?? null,
          expectedCloseDate: body.expectedCloseDate ?? null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning();
      (ctx as any).set.status = 201;
      return deal;
    })
    .patch("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [existing] = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.id, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Deal not found" };
      }
      if (!isManager(actor) && existing.ownerId !== actor.id) {
        (ctx as any).set.status = 403;
        return { error: "Not your deal" };
      }

      if (body.status && body.status !== existing.status) {
        assertDealTransition(existing.status, body.status as DealState);
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      const editableFields = [
        "title", "personId", "partyId", "stageId", "pipelineId",
        "transactionId", "itemId", "ownerId", "value", "probability",
        "expectedCloseDate", "approvalStatus",
      ];
      for (const f of editableFields) {
        if (body[f] != null) updates[f] = body[f];
      }
      if (body.status) {
        updates.status = body.status;
        if (body.status === "won" || body.status === "lost") {
          updates.actualCloseDate = new Date();
        }
        if (body.status === "lost") updates.lostReason = body.lostReason ?? "No reason provided";
      }
      // Reset rottingAt when stage changes
      if (body.stageId && body.stageId !== existing.stageId) {
        updates.rottingAt = null;
      }

      const [updated] = await db.update(crmDeal).set(updates).where(eq(crmDeal.id, id)).returning();
      return updated;
    })
    .delete("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:delete");
      const { id } = (ctx as any).params;
      await db.update(crmDeal).set({ deletedAt: new Date() }).where(eq(crmDeal.id, id));
      return { success: true };
    })
    // --- FSM: win -----------------------------------------------------------
    .post("/:id/win", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [deal] = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.id, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .limit(1);
      if (!deal) {
        (ctx as any).set.status = 404;
        return { error: "Deal not found" };
      }
      if (!isManager(actor) && deal.ownerId !== actor.id) {
        (ctx as any).set.status = 403;
        return { error: "Not your deal" };
      }

      assertDealTransition(deal.status, "won");

      // Guard: high-value deals require manager approval
      const dealValue = (deal.value as any)?.amount ?? 0;
      if (dealValue >= 50000 && deal.approvalStatus !== "approved") {
        (ctx as any).set.status = 422;
        return { error: "High-value deal requires manager approval before closing as won" };
      }

      const now = new Date();
      const [updated] = await db
        .update(crmDeal)
        .set({
          status: "won",
          actualCloseDate: body.actualCloseDate ? new Date(body.actualCloseDate) : now,
          updatedAt: now,
        })
        .where(eq(crmDeal.id, id))
        .returning();
      return updated;
    })
    // --- FSM: lose ----------------------------------------------------------
    .post("/:id/lose", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      if (!body.lostReason) {
        (ctx as any).set.status = 400;
        return { error: "lostReason is required" };
      }

      const [deal] = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.id, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .limit(1);
      if (!deal) {
        (ctx as any).set.status = 404;
        return { error: "Deal not found" };
      }
      if (!isManager(actor) && deal.ownerId !== actor.id) {
        (ctx as any).set.status = 403;
        return { error: "Not your deal" };
      }

      assertDealTransition(deal.status, "lost");

      const now = new Date();
      const [updated] = await db
        .update(crmDeal)
        .set({
          status: "lost",
          lostReason: String(body.lostReason),
          actualCloseDate: now,
          updatedAt: now,
        })
        .where(eq(crmDeal.id, id))
        .returning();
      return updated;
    })
    // --- Stage move ---------------------------------------------------------
    .post("/:id/move", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      if (!body.stageId) {
        (ctx as any).set.status = 400;
        return { error: "stageId is required" };
      }

      const [deal] = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.id, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .limit(1);
      if (!deal) {
        (ctx as any).set.status = 404;
        return { error: "Deal not found" };
      }
      if (!isManager(actor) && deal.ownerId !== actor.id) {
        (ctx as any).set.status = 403;
        return { error: "Not your deal" };
      }
      if (deal.status !== "open") {
        (ctx as any).set.status = 422;
        return { error: "Cannot move a closed deal" };
      }

      const [updated] = await db
        .update(crmDeal)
        .set({ stageId: String(body.stageId), rottingAt: null, updatedAt: new Date() })
        .where(eq(crmDeal.id, id))
        .returning();
      return updated;
    })
    // --- Approval -----------------------------------------------------------
    .post("/:id/approve", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:approve");
      const { id } = (ctx as any).params;

      const [deal] = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.id, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .limit(1);
      if (!deal) {
        (ctx as any).set.status = 404;
        return { error: "Deal not found" };
      }
      if ((CRM_MANAGER_ROLES as readonly string[]).every((r) => !actor.roles.includes(r))) {
        (ctx as any).set.status = 403;
        return { error: "Only managers can approve deals" };
      }

      const [updated] = await db
        .update(crmDeal)
        .set({ approvalStatus: "approved", approvedById: actor.id, updatedAt: new Date() })
        .where(eq(crmDeal.id, id))
        .returning();
      return updated;
    })
    .post("/:id/reject", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:approve");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [updated] = await db
        .update(crmDeal)
        .set({
          approvalStatus: "rejected",
          approvedById: actor.id,
          updatedAt: new Date(),
          meta: { rejectionReason: body.reason ?? "No reason provided" },
        })
        .where(and(eq(crmDeal.id, id), eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .returning();
      if (!updated) {
        (ctx as any).set.status = 404;
        return { error: "Deal not found" };
      }
      return updated;
    })
    // --- Sub-resources ------------------------------------------------------
    .get("/:id/activities", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "deal:read");
      const { id } = (ctx as any).params;
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds = [
        eq(activities.organizationId, actor.orgId),
        isNull(activities.deletedAt),
        eq(activities.entityType, "crm_deal"),
        eq(activities.entityId, id),
      ];
      const [items, [c]] = await Promise.all([
        db.select().from(activities).where(and(...conds)).orderBy(desc(activities.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(activities).where(and(...conds)),
      ]);
      return listResponse(items, c?.value ?? 0, page, limit);
    });
}
