// CRM Compose — /crm/analytics routes.
//
// Read-only aggregation endpoints restricted to admin + sales-manager roles.
// Queries the CRM detail tables + master tables directly via @db/client.

import Elysia from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { crmDeal, crmLead, crmCampaign } from "../db/schema/crm";
import { eq, and, isNull, sql, count, sum, avg, gte, lte } from "drizzle-orm";
import { requirePermission, isManager } from "../permissions";
import { getActor } from "./helpers";

export function createAnalyticsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/analytics" })
    .get("/overview", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "analytics:read");

      const orgId = actor.orgId;

      const [
        [contacts],
        [accounts],
        [leads],
        [openDeals],
        [wonDeals],
        [activeCampaigns],
      ] = await Promise.all([
        db.select({ value: count() }).from(persons).where(
          and(eq(persons.organizationId, orgId), eq(persons.type, "contact"), isNull(persons.deletedAt)),
        ),
        db.select({ value: count() }).from(persons).where(
          and(eq(persons.organizationId, orgId), eq(persons.type, "contact"), isNull(persons.deletedAt)),
        ),
        db.select({ value: count() }).from(crmLead).where(
          and(eq(crmLead.organizationId, orgId), isNull(crmLead.deletedAt)),
        ),
        db.select({ value: count() }).from(crmDeal).where(
          and(eq(crmDeal.organizationId, orgId), eq(crmDeal.status, "open"), isNull(crmDeal.deletedAt)),
        ),
        db.select({ value: count() }).from(crmDeal).where(
          and(eq(crmDeal.organizationId, orgId), eq(crmDeal.status, "won"), isNull(crmDeal.deletedAt)),
        ),
        db.select({ value: count() }).from(crmCampaign).where(
          and(eq(crmCampaign.organizationId, orgId), eq(crmCampaign.status, "sending"), isNull(crmCampaign.deletedAt)),
        ),
      ]);

      // Account count via parties
      const { parties } = await import("@db/schema/party");
      const [accountCount] = await db.select({ value: count() }).from(parties).where(
        and(eq(parties.organizationId, orgId), eq(parties.type, "company"), isNull(parties.deletedAt)),
      );

      return {
        totalContacts: contacts?.value ?? 0,
        totalAccounts: accountCount?.value ?? 0,
        totalLeads: leads?.value ?? 0,
        openDeals: openDeals?.value ?? 0,
        wonDeals: wonDeals?.value ?? 0,
        activeCampaigns: activeCampaigns?.value ?? 0,
      };
    })
    .get("/pipeline", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "analytics:read");

      // Deals grouped by stage with aggregated value
      const { pipelineStages } = await import("@db/schema/pipeline");
      const stages = await db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.organizationId, actor.orgId));

      const results = await Promise.all(
        stages.map(async (stage) => {
          const [stats] = await db
            .select({
              count: count(),
              totalValue: sum(sql`CAST(crm_deals.value->>'amount' AS NUMERIC)`),
              weightedValue: sum(
                sql`CAST(crm_deals.value->>'amount' AS NUMERIC) * (crm_deals.probability::numeric / 100)`,
              ),
            })
            .from(crmDeal)
            .where(
              and(
                eq(crmDeal.organizationId, actor.orgId),
                eq(crmDeal.stageId, stage.id),
                isNull(crmDeal.deletedAt),
              ),
            );
          return {
            stageId: stage.id,
            stageName: stage.name,
            position: stage.position,
            dealCount: stats?.count ?? 0,
            totalValue: stats?.totalValue ?? "0",
            weightedValue: stats?.weightedValue ?? "0",
          };
        }),
      );

      return results;
    })
    .get("/leads/funnel", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "analytics:read");

      const orgId = actor.orgId;
      const statuses = ["new", "contacted", "qualified", "disqualified", "converted"] as const;

      const results = await Promise.all(
        statuses.map(async (status) => {
          const [c] = await db
            .select({ value: count() })
            .from(crmLead)
            .where(
              and(
                eq(crmLead.organizationId, orgId),
                eq(crmLead.status, status),
                isNull(crmLead.deletedAt),
              ),
            );
          return { status, count: c?.value ?? 0 };
        }),
      );

      return results;
    })
    .get("/revenue", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "analytics:read");

      const q = (ctx as any).query ?? {};
      const from = q.from ? new Date(String(q.from)) : new Date(new Date().getFullYear(), 0, 1);
      const to = q.to ? new Date(String(q.to)) : new Date();

      const [stats] = await db
        .select({
          totalWon: sum(sql`CAST(crm_deals.value->>'amount' AS NUMERIC)`),
          dealCount: count(),
          avgDealValue: avg(sql`CAST(crm_deals.value->>'amount' AS NUMERIC)`),
          wonCount: count(),
        })
        .from(crmDeal)
        .where(
          and(
            eq(crmDeal.organizationId, actor.orgId),
            eq(crmDeal.status, "won"),
            isNull(crmDeal.deletedAt),
            gte(crmDeal.actualCloseDate, from),
            lte(crmDeal.actualCloseDate, to),
          ),
        );

      return {
        period: { from, to },
        totalWon: stats?.totalWon ?? "0",
        dealCount: stats?.dealCount ?? 0,
        avgDealValue: stats?.avgDealValue ?? "0",
      };
    })
    .get("/activities/summary", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "analytics:read");

      const { activities } = await import("@db/schema/activity");
      const results = await db
        .select({
          type: activities.type,
          count: count(),
        })
        .from(activities)
        .where(
          and(
            eq(activities.organizationId, actor.orgId),
            isNull(activities.deletedAt),
          ),
        )
        .groupBy(activities.type);

      return results;
    });
}
