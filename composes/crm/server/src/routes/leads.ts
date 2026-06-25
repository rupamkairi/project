// CRM Compose — /crm/leads routes.
//
// Leads are a dual-master entity: `persons` (type = "lead") + `crm_leads` (detail).
// The person row stores name/email/phone; the lead detail stores sequencing,
// qualification, ownership, and stage linkage.
// Lead FSM: new → contacted → qualified → disqualified | converted.
// disqualified → new (reopen) is also supported.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { activities } from "@db/schema/activity";
import { crmLead } from "../db/schema/crm";
import { eq, and, isNull, desc, ilike, or, count, inArray } from "drizzle-orm";
import { requirePermission, isManager } from "../permissions";
import {
  assertLeadTransition,
  leadCanConvert,
  type LeadState,
} from "../lib/fsms";
import { parsePagination, listResponse, getActor } from "./helpers";

export function createLeadsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/leads" })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:read");
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const leadConds = [
        eq(crmLead.organizationId, actor.orgId),
        isNull(crmLead.deletedAt),
      ];
      if (q.status) leadConds.push(eq(crmLead.status, String(q.status)));
      if (q.ownerId) leadConds.push(eq(crmLead.ownerId, String(q.ownerId)));
      if (q.stageId) leadConds.push(eq(crmLead.stageId, String(q.stageId)));

      const [leads, [c]] = await Promise.all([
        db
          .select()
          .from(crmLead)
          .where(and(...leadConds))
          .orderBy(desc(crmLead.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(crmLead).where(and(...leadConds)),
      ]);

      const personIds = leads.map((l) => l.personId);
      const people = personIds.length
        ? await db
            .select()
            .from(persons)
            .where(and(inArray(persons.id, personIds)))
        : [];

      const personMap = new Map(people.map((p) => [p.id, p]));
      const scoped = isManager(actor)
        ? leads
        : leads.filter((l) => l.ownerId === actor.id);

      return listResponse(
        scoped.map((l) => shapeLead(l, personMap.get(l.personId))),
        scoped.length,
        page,
        limit,
      );
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:read");
      const { id } = (ctx as any).params;

      const [lead] = await db
        .select()
        .from(crmLead)
        .where(and(eq(crmLead.id, id), eq(crmLead.organizationId, actor.orgId), isNull(crmLead.deletedAt)))
        .limit(1);
      if (!lead) {
        (ctx as any).set.status = 404;
        return { error: "Lead not found" };
      }
      const [person] = lead.personId
        ? await db.select().from(persons).where(eq(persons.id, lead.personId)).limit(1)
        : [null];
      return shapeLead(lead, person);
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:create");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      const [person] = await db
        .insert(persons)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          type: "lead",
          firstName: body.firstName ?? null,
          lastName: body.lastName ?? null,
          email: body.email ?? null,
          phone: body.phone ?? null,
          source: body.source ?? null,
          partyId: body.accountId ?? null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: { source: body.source, score: 0 },
        })
        .returning();

      const [lead] = await db
        .insert(crmLead)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          personId: person!.id,
          partyId: body.accountId ?? null,
          stageId: body.stageId ?? null,
          ownerId: body.ownerId ?? actor.id,
          status: "new",
          interest: body.interest ?? null,
          estimatedValue: body.estimatedValue ?? null,
          notes: body.notes ?? null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning();
      (ctx as any).set.status = 201;
      return shapeLead(lead!, person);
    })
    .patch("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:update");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [existing] = await db
        .select()
        .from(crmLead)
        .where(and(eq(crmLead.id, id), eq(crmLead.organizationId, actor.orgId), isNull(crmLead.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Lead not found" };
      }
      if (!isManager(actor) && existing.ownerId !== actor.id) {
        (ctx as any).set.status = 403;
        return { error: "Not your lead" };
      }

      if (body.status && body.status !== existing.status) {
        assertLeadTransition(existing.status, body.status as LeadState);
        if (body.status === "converted" && !leadCanConvert(existing.estimatedValue)) {
          (ctx as any).set.status = 422;
          return { error: "Lead must have an estimated value to convert" };
        }
      }

      const updates: Record<string, any> = {
        ...(body.stageId != null && { stageId: body.stageId }),
        ...(body.ownerId != null && { ownerId: body.ownerId }),
        ...(body.interest != null && { interest: body.interest }),
        ...(body.estimatedValue != null && { estimatedValue: body.estimatedValue }),
        ...(body.notes != null && { notes: body.notes }),
        ...(body.partyId != null && { partyId: body.partyId }),
        ...(body.status && { status: body.status }),
        updatedAt: new Date(),
      };

      if (body.status === "qualified") updates.qualifiedAt = new Date();
      if (body.status === "converted") updates.convertedAt = new Date();

      if (body.firstName || body.lastName || body.email || body.phone) {
        await db
          .update(persons)
          .set({
            ...(body.firstName != null && { firstName: body.firstName }),
            ...(body.lastName != null && { lastName: body.lastName }),
            ...(body.email != null && { email: body.email }),
            ...(body.phone != null && { phone: body.phone }),
            updatedAt: new Date(),
          })
          .where(eq(persons.id, existing.personId));
      }

      const [updated] = await db
        .update(crmLead)
        .set(updates)
        .where(eq(crmLead.id, id))
        .returning();

      const [person] = await db.select().from(persons).where(eq(persons.id, existing.personId)).limit(1);
      return shapeLead(updated!, person);
    })
    .delete("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:delete");
      const { id } = (ctx as any).params;
      const [lead] = await db.select().from(crmLead).where(eq(crmLead.id, id)).limit(1);
      if (lead) {
        await Promise.all([
          db.update(crmLead).set({ deletedAt: new Date() }).where(eq(crmLead.id, id)),
          db.update(persons).set({ deletedAt: new Date() }).where(eq(persons.id, lead.personId)),
        ]);
      }
      return { success: true };
    })
    // --- FSM: qualify -------------------------------------------------------
    .post("/:id/qualify", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:qualify");
      const { id } = (ctx as any).params;

      const [lead] = await db
        .select()
        .from(crmLead)
        .where(and(eq(crmLead.id, id), eq(crmLead.organizationId, actor.orgId), isNull(crmLead.deletedAt)))
        .limit(1);
      if (!lead) {
        (ctx as any).set.status = 404;
        return { error: "Lead not found" };
      }
      if (!isManager(actor) && lead.ownerId !== actor.id) {
        (ctx as any).set.status = 403;
        return { error: "Not your lead" };
      }

      assertLeadTransition(lead.status, "qualified");

      const [updated] = await db
        .update(crmLead)
        .set({ status: "qualified", qualifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(crmLead.id, id))
        .returning();

      const [person] = await db.select().from(persons).where(eq(persons.id, lead.personId)).limit(1);
      return shapeLead(updated!, person);
    })
    // --- FSM: disqualify ----------------------------------------------------
    .post("/:id/disqualify", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:disqualify");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [lead] = await db
        .select()
        .from(crmLead)
        .where(and(eq(crmLead.id, id), eq(crmLead.organizationId, actor.orgId), isNull(crmLead.deletedAt)))
        .limit(1);
      if (!lead) {
        (ctx as any).set.status = 404;
        return { error: "Lead not found" };
      }
      if (!isManager(actor) && lead.ownerId !== actor.id) {
        (ctx as any).set.status = 403;
        return { error: "Not your lead" };
      }

      assertLeadTransition(lead.status, "disqualified");

      const meta = { ...(lead.meta ?? {}), disqualificationReason: body.reason ?? "No reason provided" };
      const [updated] = await db
        .update(crmLead)
        .set({ status: "disqualified", meta, updatedAt: new Date() })
        .where(eq(crmLead.id, id))
        .returning();

      const [person] = await db.select().from(persons).where(eq(persons.id, lead.personId)).limit(1);
      return shapeLead(updated!, person);
    })
    // --- FSM: reopen (disqualified → new) -----------------------------------
    .post("/:id/reopen", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:update");
      const { id } = (ctx as any).params;

      const [lead] = await db
        .select()
        .from(crmLead)
        .where(and(eq(crmLead.id, id), eq(crmLead.organizationId, actor.orgId), isNull(crmLead.deletedAt)))
        .limit(1);
      if (!lead) {
        (ctx as any).set.status = 404;
        return { error: "Lead not found" };
      }

      assertLeadTransition(lead.status, "new");

      const [updated] = await db
        .update(crmLead)
        .set({ status: "new", updatedAt: new Date() })
        .where(eq(crmLead.id, id))
        .returning();

      const [person] = await db.select().from(persons).where(eq(persons.id, lead.personId)).limit(1);
      return shapeLead(updated!, person);
    })
    // --- FSM: convert (qualified → converted + create Deal) ----------------
    .post("/:id/convert", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:convert");
      const { id } = (ctx as any).params;

      const [lead] = await db
        .select()
        .from(crmLead)
        .where(and(eq(crmLead.id, id), eq(crmLead.organizationId, actor.orgId), isNull(crmLead.deletedAt)))
        .limit(1);
      if (!lead) {
        (ctx as any).set.status = 404;
        return { error: "Lead not found" };
      }

      assertLeadTransition(lead.status, "converted");
      if (!leadCanConvert(lead.estimatedValue)) {
        (ctx as any).set.status = 422;
        return { error: "Lead must have an estimated value to convert" };
      }

      const now = new Date();
      const body = (ctx as any).body ?? {};

      await db
        .update(persons)
        .set({ type: "contact", updatedAt: now, meta: { ...(lead.meta ?? {}), convertedAt: now.toISOString() } })
        .where(eq(persons.id, lead.personId));

      let dealId: string | null = null;
      if (body.createDeal !== false) {
        const { crmDeal } = await import("../db/schema/crm");
        const dealIdVal = generateId();
        [dealId] = (await db
          .insert(crmDeal)
          .values({
            id: dealIdVal,
            organizationId: actor.orgId,
            title: `Deal from lead: ${lead.interest ?? "No title"}`,
            personId: lead.personId,
            partyId: lead.partyId,
            stageId: body.stageId ?? null,
            pipelineId: body.pipelineId ?? null,
            ownerId: lead.ownerId,
            status: "open",
            value: lead.estimatedValue,
            expectedCloseDate: body.expectedCloseDate ?? null,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning({ id: crmDeal.id })).map((r) => r.id);
      }

      await db
        .update(crmLead)
        .set({ status: "converted", convertedAt: now, dealId, updatedAt: now })
        .where(eq(crmLead.id, id));

      return { success: true, dealId };
    })
    // --- Sub-resource: activities -------------------------------------------
    .get("/:id/activities", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "lead:read");
      const { id } = (ctx as any).params;
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      // Lead activities link via the person row (entityType=person, entityId=lead.personId)
      const [lead] = await db
        .select({ personId: crmLead.personId })
        .from(crmLead)
        .where(and(eq(crmLead.id, id), eq(crmLead.organizationId, actor.orgId), isNull(crmLead.deletedAt)))
        .limit(1);
      if (!lead) {
        (ctx as any).set.status = 404;
        return { error: "Lead not found" };
      }

      const conds = [
        eq(activities.organizationId, actor.orgId),
        isNull(activities.deletedAt),
        eq(activities.entityType, "person"),
        eq(activities.entityId, lead.personId),
      ];
      const [items, [c]] = await Promise.all([
        db.select().from(activities).where(and(...conds)).orderBy(desc(activities.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(activities).where(and(...conds)),
      ]);
      return listResponse(items, c?.value ?? 0, page, limit);
    });
}

function shapeLead(lead: any, person: any | null) {
  return {
    id: lead.id,
    firstName: person?.firstName ?? null,
    lastName: person?.lastName ?? null,
    email: person?.email ?? null,
    phone: person?.phone ?? null,
    source: person?.source ?? null,
    accountId: lead.partyId,
    stageId: lead.stageId,
    ownerId: lead.ownerId,
    status: lead.status,
    interest: lead.interest,
    estimatedValue: lead.estimatedValue,
    notes: lead.notes,
    disqualificationReason: (lead.meta as any)?.disqualificationReason ?? null,
    qualifiedAt: lead.qualifiedAt,
    convertedAt: lead.convertedAt,
    dealId: lead.dealId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}
