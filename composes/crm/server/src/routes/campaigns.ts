// CRM Compose — /crm/campaigns routes.
//
// Campaigns are CRM-owned (crm_campaigns + crm_campaign_contacts). FSM:
// draft → scheduled → sending → sent | paused → cancelled.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { crmCampaign, crmCampaignContact, crmSegment } from "../db/schema/crm";
import { eq, and, isNull, desc, count, inArray } from "drizzle-orm";
import { requirePermission } from "../permissions";
import {
  assertCampaignTransition,
  type CampaignState,
} from "../lib/fsms";
import { parsePagination, listResponse, getActor } from "./helpers";

/** Evaluate segment filters → return matching contact person rows. */
async function resolveSegmentContacts(segmentId: string, orgId: string): Promise<{ id: string; email: string | null; firstName: string | null }[]> {
  const [segment] = await db
    .select()
    .from(crmSegment)
    .where(and(eq(crmSegment.id, segmentId), eq(crmSegment.organizationId, orgId), isNull(crmSegment.deletedAt)))
    .limit(1);

  if (!segment) return [];

  const filters = (segment.filters as Record<string, any>[]) ?? [];
  const { eq: drizzleEq, and: drizzleAnd } = await import("drizzle-orm");

  const baseConds = [
    drizzleEq(persons.organizationId, orgId),
    drizzleEq(persons.type, "contact"),
    isNull(persons.deletedAt),
  ];

  // Simple flat equality filter evaluation
  for (const f of filters) {
    if (f.field && f.value != null) {
      baseConds.push(drizzleEq(persons[f.field as keyof typeof persons] as any, String(f.value)));
    }
  }

  return db
    .select({ id: persons.id, email: persons.email, firstName: persons.firstName })
    .from(persons)
    .where(drizzleAnd(...baseConds));
}

export function createCampaignsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/campaigns" })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:read");
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds = [
        eq(crmCampaign.organizationId, actor.orgId),
        isNull(crmCampaign.deletedAt),
      ];
      if (q.status) conds.push(eq(crmCampaign.status, String(q.status)));
      if (q.type) conds.push(eq(crmCampaign.type, String(q.type)));
      if (q.segmentId) conds.push(eq(crmCampaign.segmentId, String(q.segmentId)));

      const [items, [c]] = await Promise.all([
        db.select().from(crmCampaign).where(and(...conds)).orderBy(desc(crmCampaign.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(crmCampaign).where(and(...conds)),
      ]);
      return listResponse(items, c?.value ?? 0, page, limit);
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:read");
      const { id } = (ctx as any).params;

      const [campaign] = await db
        .select()
        .from(crmCampaign)
        .where(and(eq(crmCampaign.id, id), eq(crmCampaign.organizationId, actor.orgId), isNull(crmCampaign.deletedAt)))
        .limit(1);
      if (!campaign) {
        (ctx as any).set.status = 404;
        return { error: "Campaign not found" };
      }
      return campaign;
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:manage");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      const [campaign] = await db
        .insert(crmCampaign)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          name: body.name,
          type: body.type ?? "email",
          status: "draft",
          segmentId: body.segmentId ?? null,
          templateId: body.templateId ?? null,
          subject: body.subject ?? null,
          fromName: body.fromName ?? null,
          fromEmail: body.fromEmail ?? null,
          body: body.body ?? null,
          scheduledAt: body.scheduledAt ?? null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning();
      (ctx as any).set.status = 201;
      return campaign;
    })
    .patch("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:manage");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [existing] = await db
        .select()
        .from(crmCampaign)
        .where(and(eq(crmCampaign.id, id), eq(crmCampaign.organizationId, actor.orgId), isNull(crmCampaign.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Campaign not found" };
      }
      if (existing.status !== "draft") {
        (ctx as any).set.status = 422;
        return { error: "Only draft campaigns can be edited" };
      }

      if (body.status && body.status !== existing.status) {
        assertCampaignTransition(existing.status, body.status as CampaignState);
        if (body.status === "sent") body.sentAt = new Date();
        if (body.status === "scheduled") body.scheduledAt = body.scheduledAt ?? new Date();
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      const editable = [
        "name", "type", "status", "segmentId", "templateId",
        "subject", "fromName", "fromEmail", "body", "scheduledAt",
        "sentAt", "recipientCount", "deliveredCount", "openedCount",
        "clickedCount", "bouncedCount", "unsubscribedCount",
      ];
      for (const f of editable) {
        if (body[f] != null) updates[f] = body[f];
      }

      const [updated] = await db
        .update(crmCampaign)
        .set(updates)
        .where(eq(crmCampaign.id, id))
        .returning();
      return updated;
    })
    .delete("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:manage");
      const { id } = (ctx as any).params;
      await db.update(crmCampaign).set({ deletedAt: new Date() }).where(eq(crmCampaign.id, id));
      return { success: true };
    })
    // --- FSM: schedule ------------------------------------------------------
    .post("/:id/schedule", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:manage");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [campaign] = await db
        .select()
        .from(crmCampaign)
        .where(and(eq(crmCampaign.id, id), eq(crmCampaign.organizationId, actor.orgId), isNull(crmCampaign.deletedAt)))
        .limit(1);
      if (!campaign) {
        (ctx as any).set.status = 404;
        return { error: "Campaign not found" };
      }

      assertCampaignTransition(campaign.status, "scheduled");

      if (!campaign.segmentId) {
        (ctx as any).set.status = 422;
        return { error: "Campaign requires a segment before scheduling" };
      }
      if (!campaign.templateId && !campaign.body) {
        (ctx as any).set.status = 422;
        return { error: "Campaign requires a template or body before scheduling" };
      }

      const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date();
      const [updated] = await db
        .update(crmCampaign)
        .set({ status: "scheduled", scheduledAt, updatedAt: new Date() })
        .where(eq(crmCampaign.id, id))
        .returning();
      return updated;
    })
    // --- FSM: send (immediate) -----------------------------------------------
    .post("/:id/send", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:manage");
      const { id } = (ctx as any).params;

      const [campaign] = await db
        .select()
        .from(crmCampaign)
        .where(and(eq(crmCampaign.id, id), eq(crmCampaign.organizationId, actor.orgId), isNull(crmCampaign.deletedAt)))
        .limit(1);
      if (!campaign) {
        (ctx as any).set.status = 404;
        return { error: "Campaign not found" };
      }

      assertCampaignTransition(campaign.status, "sending");

      if (!campaign.segmentId) {
        (ctx as any).set.status = 422;
        return { error: "Campaign requires a segment" };
      }

      // Resolve segment → contacts
      const contacts = await resolveSegmentContacts(campaign.segmentId, actor.orgId);

      // Exclude unsubscribed contacts
      const eligible = contacts.filter((c) => c.email);

      // Upsert campaign_contacts rows
      if (eligible.length > 0) {
        const now = new Date();
        await db
          .insert(crmCampaignContact)
          .values(
            eligible.map((c) => ({
              id: generateId(),
              organizationId: actor.orgId,
              campaignId: id,
              personId: c.id,
              status: "pending",
              createdAt: now,
              updatedAt: now,
              version: 1,
              meta: {},
            })),
          )
          .onConflictDoNothing();
      }

      const [updated] = await db
        .update(crmCampaign)
        .set({
          status: "sending",
          recipientCount: eligible.length,
          updatedAt: new Date(),
        })
        .where(eq(crmCampaign.id, id))
        .returning();

      return { ...updated, resolvedContacts: eligible.length };
    })
    // --- FSM: pause ---------------------------------------------------------
    .post("/:id/pause", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:manage");
      const { id } = (ctx as any).params;

      const [campaign] = await db
        .select()
        .from(crmCampaign)
        .where(and(eq(crmCampaign.id, id), eq(crmCampaign.organizationId, actor.orgId), isNull(crmCampaign.deletedAt)))
        .limit(1);
      if (!campaign) {
        (ctx as any).set.status = 404;
        return { error: "Campaign not found" };
      }

      assertCampaignTransition(campaign.status, "paused");

      const [updated] = await db
        .update(crmCampaign)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(crmCampaign.id, id))
        .returning();
      return updated;
    })
    // --- FSM: cancel --------------------------------------------------------
    .post("/:id/cancel", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:manage");
      const { id } = (ctx as any).params;

      const [campaign] = await db
        .select()
        .from(crmCampaign)
        .where(and(eq(crmCampaign.id, id), eq(crmCampaign.organizationId, actor.orgId), isNull(crmCampaign.deletedAt)))
        .limit(1);
      if (!campaign) {
        (ctx as any).set.status = 404;
        return { error: "Campaign not found" };
      }

      assertCampaignTransition(campaign.status, "cancelled");

      const [updated] = await db
        .update(crmCampaign)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(crmCampaign.id, id))
        .returning();
      return updated;
    })
    // --- Campaign contacts --------------------------------------------------
    .get("/:id/contacts", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:read");
      const { id } = (ctx as any).params;
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds = [
        eq(crmCampaignContact.organizationId, actor.orgId),
        eq(crmCampaignContact.campaignId, id),
        isNull(crmCampaignContact.deletedAt),
      ];
      const [items, [c]] = await Promise.all([
        db.select().from(crmCampaignContact).where(and(...conds)).limit(limit).offset(offset),
        db.select({ value: count() }).from(crmCampaignContact).where(and(...conds)),
      ]);
      return listResponse(items, c?.value ?? 0, page, limit);
    })
    .get("/:id/stats", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "campaign:read");
      const { id } = (ctx as any).params;

      const [campaign] = await db
        .select()
        .from(crmCampaign)
        .where(and(eq(crmCampaign.id, id), eq(crmCampaign.organizationId, actor.orgId), isNull(crmCampaign.deletedAt)))
        .limit(1);
      if (!campaign) {
        (ctx as any).set.status = 404;
        return { error: "Campaign not found" };
      }

      return {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          type: campaign.type,
        },
        stats: {
          recipientCount: campaign.recipientCount,
          deliveredCount: campaign.deliveredCount,
          openedCount: campaign.openedCount,
          clickedCount: campaign.clickedCount,
          bouncedCount: campaign.bouncedCount,
          unsubscribedCount: campaign.unsubscribedCount,
          openRate:
            campaign.deliveredCount > 0
              ? Math.round((campaign.openedCount / campaign.deliveredCount) * 100)
              : 0,
          clickRate:
            campaign.deliveredCount > 0
              ? Math.round((campaign.clickedCount / campaign.deliveredCount) * 100)
              : 0,
        },
      };
    });
}
