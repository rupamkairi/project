// CRM Compose — event hooks.
//
// Hooks subscribe to EventBus events and perform CRM side-effects.
// registerCrmHooks(bus, mediator) is called at compose boot in index.ts.
// All DB access uses Drizzle directly (CRM-owned tables) or mediator for
// cross-module concerns (notifications, analytics).
//
// Phase 4 logic from plans/crm/04-backend-logic.md §4.2.

import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { crmDeal, crmCampaign, crmCampaignContact, crmLead } from "../db/schema/crm";
import { eq, and, isNull } from "drizzle-orm";
import type { Mediator } from "@core";

export interface EventBus {
  on(event: string, handler: (payload: any) => Promise<void>): void;
}

export function registerCrmHooks(bus: EventBus, mediator: Mediator): void {
  // -------------------------------------------------------------------------
  // activity.created — update lastContactedAt + increment lead score
  // -------------------------------------------------------------------------
  bus.on("activity.created", async (event) => {
    const { actorId, entityId, entityType, type } = event.payload ?? {};
    if (!entityId || entityType !== "person") return;

    const scoreDeltas: Record<string, number> = {
      call: 10, meeting: 15, demo: 20, email: 5, note: 2,
    };
    const delta = scoreDeltas[type] ?? 0;

    const [person] = await db
      .select({ id: persons.id, meta: persons.meta })
      .from(persons)
      .where(and(eq(persons.id, entityId), eq(persons.organizationId, event.orgId), isNull(persons.deletedAt)))
      .limit(1);

    if (!person) return;

    const meta = (person.meta ?? {}) as Record<string, any>;
    const updatedMeta = {
      ...meta,
      lastContactedAt: new Date().toISOString(),
      ...(delta > 0 && { leadScore: Math.min(100, (meta.leadScore ?? 0) + delta) }),
    };

    await db
      .update(persons)
      .set({ meta: updatedMeta, updatedAt: new Date() })
      .where(eq(persons.id, entityId));
  });

  // -------------------------------------------------------------------------
  // crm.deal.stageChanged — reset rottingAt based on stage rotPeriodDays
  // -------------------------------------------------------------------------
  bus.on("crm.deal.stageChanged", async (event) => {
    const { dealId, stageId } = event.payload ?? {};
    if (!dealId || !stageId) return;

    try {
      const { pipelineStages } = await import("@db/schema/pipeline");
      const [stage] = await db
        .select({ meta: pipelineStages.meta })
        .from(pipelineStages)
        .where(eq(pipelineStages.id, stageId))
        .limit(1);

      const rotPeriodDays = (stage?.meta as any)?.rotPeriodDays;
      if (!rotPeriodDays) return;

      const rottingAt = new Date(Date.now() + rotPeriodDays * 24 * 60 * 60 * 1000);
      await db
        .update(crmDeal)
        .set({ rottingAt, updatedAt: new Date() })
        .where(eq(crmDeal.id, dealId));
    } catch {
      // Pipeline module not available — skip rotting reset
    }
  });

  // -------------------------------------------------------------------------
  // crm.deal.won — update contact stage → customer + analytics
  // -------------------------------------------------------------------------
  bus.on("crm.deal.won", async (event) => {
    const { dealId, personId, value } = event.payload ?? {};

    if (personId) {
      const [person] = await db
        .select({ meta: persons.meta })
        .from(persons)
        .where(and(eq(persons.id, personId), isNull(persons.deletedAt)))
        .limit(1);

      if (person) {
        const meta = { ...(person.meta ?? {}), status: "customer" } as Record<string, any>;
        await db.update(persons).set({ meta, updatedAt: new Date() }).where(eq(persons.id, personId));
      }
    }

    // Analytics event capture (non-blocking)
    try {
      await mediator.dispatch({
        type: "analytics.captureEvent",
        name: "crm.deal.won",
        props: { dealId, value, orgId: event.orgId },
      } as any);
    } catch {
      // Analytics module optional — ignore if not wired
    }
  });

  // -------------------------------------------------------------------------
  // crm.lead.converted — analytics + notification stub
  // -------------------------------------------------------------------------
  bus.on("crm.lead.converted", async (event) => {
    const { leadId, dealId, orgId } = event.payload ?? {};

    try {
      await mediator.dispatch({
        type: "analytics.captureEvent",
        name: "crm.lead.converted",
        props: { leadId, dealId, orgId },
      } as any);
    } catch {
      // Analytics module optional — ignore if not wired
    }
  });

  // -------------------------------------------------------------------------
  // campaign.email.opened — increment lead score + campaign stats
  // -------------------------------------------------------------------------
  bus.on("campaign.email.opened", async (event) => {
    const { campaignId, contactId } = event.payload ?? {};
    if (!campaignId || !contactId) return;

    await Promise.all([
      // Update campaign_contacts status
      db
        .update(crmCampaignContact)
        .set({ status: "opened", openedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(crmCampaignContact.campaignId, campaignId), eq(crmCampaignContact.personId, contactId))),

      // Increment campaign openedCount
      db
        .update(crmCampaign)
        .set({ openedCount: db.$count(crmCampaignContact) as any, updatedAt: new Date() })
        .where(eq(crmCampaign.id, campaignId)),
    ]).catch(() => null);

    // Lead score +5 for email open
    const [person] = await db
      .select({ meta: persons.meta })
      .from(persons)
      .where(and(eq(persons.id, contactId), isNull(persons.deletedAt)))
      .limit(1);

    if (person) {
      const meta = (person.meta ?? {}) as Record<string, any>;
      await db
        .update(persons)
        .set({ meta: { ...meta, leadScore: Math.min(100, (meta.leadScore ?? 0) + 5) }, updatedAt: new Date() })
        .where(eq(persons.id, contactId));
    }
  });

  // -------------------------------------------------------------------------
  // campaign.email.clicked — update campaign_contacts + stats
  // -------------------------------------------------------------------------
  bus.on("campaign.email.clicked", async (event) => {
    const { campaignId, contactId } = event.payload ?? {};
    if (!campaignId || !contactId) return;

    await db
      .update(crmCampaignContact)
      .set({ status: "clicked", clickedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(crmCampaignContact.campaignId, campaignId), eq(crmCampaignContact.personId, contactId)))
      .catch(() => null);
  });
}
