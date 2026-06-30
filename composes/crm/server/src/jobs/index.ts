// CRM Compose — scheduled jobs.
//
// Jobs are registered at compose boot and executed by the server's job runner
// (see docs/composes/crm.md §10). Each job is a pure async function that
// receives the DB client and an orgId context — no mediator coupling.
//
// Registration: call `registerCrmJobs(scheduler)` in compose index.ts boot.
// The scheduler interface is the Core `JobScheduler` (cron string + handler).

import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { activities } from "@db/schema/activity";
import { crmDeal, crmLead, crmSegment } from "../db/schema/crm";
import { eq, and, isNull, lt, isNotNull, lte, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// crm.check-deal-rotting — daily
// Find open deals where rottingAt < now. Log a notification stub per deal.
// ---------------------------------------------------------------------------

export async function checkDealRotting(orgId: string): Promise<{ rotting: number }> {
  const now = new Date();
  const rottingDeals = await db
    .select({
      id: crmDeal.id,
      title: crmDeal.title,
      ownerId: crmDeal.ownerId,
      rottingAt: crmDeal.rottingAt,
    })
    .from(crmDeal)
    .where(
      and(
        eq(crmDeal.organizationId, orgId),
        eq(crmDeal.status, "open"),
        isNull(crmDeal.deletedAt),
        isNotNull(crmDeal.rottingAt),
        lt(crmDeal.rottingAt, now),
      ),
    );

  // Tag rotting deals in meta so the UI can surface them.
  if (rottingDeals.length > 0) {
    await Promise.all(
      rottingDeals.map((d) =>
        db
          .update(crmDeal)
          .set({ meta: { rotting: true, rottingDetectedAt: now.toISOString() } })
          .where(eq(crmDeal.id, d.id)),
      ),
    );
  }

  return { rotting: rottingDeals.length };
}

// ---------------------------------------------------------------------------
// crm.lead-score-decay — weekly
// Reduce leadScore by 5 for contacts with no activity in the last 30 days.
// Score floor is 0.
// ---------------------------------------------------------------------------

export async function leadScoreDecay(orgId: string): Promise<{ updated: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find contacts with leadScore > 0 and lastContactedAt older than 30 days (or null).
  const contacts = await db
    .select({ id: persons.id, meta: persons.meta })
    .from(persons)
    .where(
      and(
        eq(persons.organizationId, orgId),
        eq(persons.type, "contact"),
        isNull(persons.deletedAt),
        sql`COALESCE((meta->>'leadScore')::int, 0) > 0`,
        sql`(meta->>'lastContactedAt')::timestamptz < ${thirtyDaysAgo} OR meta->>'lastContactedAt' IS NULL`,
      ),
    );

  if (!contacts.length) return { updated: 0 };

  await Promise.all(
    contacts.map((c) => {
      const meta = (c.meta ?? {}) as Record<string, any>;
      const current = typeof meta.leadScore === "number" ? meta.leadScore : 0;
      const next = Math.max(0, current - 5);
      return db
        .update(persons)
        .set({ meta: { ...meta, leadScore: next }, updatedAt: new Date() })
        .where(eq(persons.id, c.id));
    }),
  );

  return { updated: contacts.length };
}

// ---------------------------------------------------------------------------
// crm.refresh-segment-counts — every 4 hours
// Recount contactCount for all segments in the org.
// ---------------------------------------------------------------------------

export async function refreshSegmentCounts(orgId: string): Promise<{ refreshed: number }> {
  const segments = await db
    .select()
    .from(crmSegment)
    .where(and(eq(crmSegment.organizationId, orgId), isNull(crmSegment.deletedAt)));

  await Promise.all(
    segments.map(async (seg) => {
      const filters = (seg.filters as Record<string, any>[]) ?? [];
      const baseConds = [
        eq(persons.organizationId, orgId),
        eq(persons.type, "contact"),
        isNull(persons.deletedAt),
      ];
      for (const f of filters) {
        if (f.field && f.value != null) {
          baseConds.push(eq(persons[f.field as keyof typeof persons] as any, String(f.value)));
        }
      }
      const [c] = await db
        .select({ value: sql<number>`count(*)` })
        .from(persons)
        .where(and(...baseConds));

      await db
        .update(crmSegment)
        .set({ contactCount: Number(c?.value ?? 0), lastComputedAt: new Date(), updatedAt: new Date() })
        .where(eq(crmSegment.id, seg.id));
    }),
  );

  return { refreshed: segments.length };
}

// ---------------------------------------------------------------------------
// crm.follow-up-reminders — every 30 minutes
// Find pending tasks due within the next 2 hours. Return them for notification.
// ---------------------------------------------------------------------------

export async function followUpReminders(orgId: string): Promise<{ due: { activityId: string; actorId: string | null; subject: string | null }[] }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const due = await db
    .select({
      activityId: activities.id,
      actorId: activities.actorId,
      subject: activities.subject,
    })
    .from(activities)
    .where(
      and(
        eq(activities.organizationId, orgId),
        isNull(activities.deletedAt),
        eq(activities.type, "task"),
        eq(activities.status, "pending"),
        isNotNull(activities.dueAt),
        lte(activities.dueAt, windowEnd),
      ),
    );

  return { due };
}

// ---------------------------------------------------------------------------
// Job registration helper — accepts a minimal scheduler interface.
// Compose index.ts calls registerCrmJobs(scheduler) at boot.
// ---------------------------------------------------------------------------

export interface CrmJobScheduler {
  define(id: string, cron: string, handler: () => Promise<void>): void;
}

export function registerCrmJobs(scheduler: CrmJobScheduler, orgIds: string[]): void {
  // daily 08:00
  scheduler.define("crm.check-deal-rotting", "0 8 * * *", async () => {
    for (const orgId of orgIds) await checkDealRotting(orgId);
  });

  // weekly Sunday 00:00
  scheduler.define("crm.lead-score-decay", "0 0 * * 0", async () => {
    for (const orgId of orgIds) await leadScoreDecay(orgId);
  });

  // every 4 hours
  scheduler.define("crm.refresh-segment-counts", "0 */4 * * *", async () => {
    for (const orgId of orgIds) await refreshSegmentCounts(orgId);
  });

  // every 30 minutes — callers handle notification dispatch
  scheduler.define("crm.follow-up-reminders", "*/30 * * * *", async () => {
    for (const orgId of orgIds) {
      const { due } = await followUpReminders(orgId);
      // Notification dispatch is left to the notification plugin integration.
      // Surface as a log for now; wire notification.send in Phase 5.
      if (due.length > 0) {
        console.log(`[crm.follow-up-reminders] org=${orgId} due=${due.length}`);
      }
    }
  });
}
