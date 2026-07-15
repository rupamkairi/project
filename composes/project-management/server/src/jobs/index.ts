// Project Management Compose — scheduled jobs

import { generateId } from '@core'
import { db } from '@db/client'
import {
  pjmProject,
  pjmWorkItem,
  pjmSprint,
  pjmRetainer,
  pjmBillingSchedule,
  pjmBillingDraft,
} from '../db/schema/project-management'
import { eq, and, isNull, lt, lte, gte, sql } from 'drizzle-orm'

// Daily: check overdue work items and mark projects at risk
export async function checkOverdueWork(orgId: string): Promise<{ overdue: number }> {
  const now = new Date()
  const overdue = await db
    .select({ id: pjmWorkItem.id, title: pjmWorkItem.title, projectId: pjmWorkItem.projectId })
    .from(pjmWorkItem)
    .where(
      and(
        eq(pjmWorkItem.organizationId, orgId),
        isNull(pjmWorkItem.deletedAt),
        isNull(pjmWorkItem.archivedAt),
        sql`${pjmWorkItem.resolution} IS DISTINCT FROM 'done'`,
        lte(pjmWorkItem.dueDate, now),
      ),
    )

  return { overdue: overdue.length }
}

// Weekly: check sprint status — warn on overdue sprints
export async function checkSprintHealth(orgId: string): Promise<{ overdueSprints: number }> {
  const now = new Date()
  const overdue = await db
    .select({ id: pjmSprint.id })
    .from(pjmSprint)
    .where(
      and(
        eq(pjmSprint.organizationId, orgId),
        eq(pjmSprint.status, 'active'),
        isNull(pjmSprint.deletedAt),
        lte(pjmSprint.endDate, now),
      ),
    )

  return { overdueSprints: overdue.length }
}

// Daily: expire retainers past end date
export async function expireRetainers(orgId: string): Promise<{ expired: number }> {
  const now = new Date()
  const expired = await db
    .update(pjmRetainer)
    .set({ status: 'cancelled', updatedAt: now })
    .where(
      and(
        eq(pjmRetainer.organizationId, orgId),
        eq(pjmRetainer.status, 'active'),
        isNull(pjmRetainer.deletedAt),
        lte(pjmRetainer.endDate, now),
      ),
    )
    .returning({ id: pjmRetainer.id })

  return { expired: expired.length }
}

// Weekly: generate billing drafts from schedules
export async function generateBillingDrafts(orgId: string): Promise<{ generated: number }> {
  const now = new Date()
  const schedules = await db
    .select()
    .from(pjmBillingSchedule)
    .where(
      and(
        eq(pjmBillingSchedule.organizationId, orgId),
        isNull(pjmBillingSchedule.deletedAt),
        lte(pjmBillingSchedule.nextRunDate, now),
      ),
    )

  let generated = 0
  for (const schedule of schedules) {
    await db.insert(pjmBillingDraft).values({
      id: generateId(),
      organizationId: orgId,
      projectId: schedule.projectId,
      scheduleId: schedule.id,
      totalAmount: 0,
      status: 'draft',
      periodStart: now,
      periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })

    // Update next run date
    const nextRun = new Date(
      now.getTime() +
        (schedule.frequency === 'weekly'
          ? 7
          : schedule.frequency === 'monthly'
            ? 30
            : schedule.frequency === 'milestone'
              ? 90
              : 30) *
          24 *
          60 *
          60 *
          1000,
    )

    await db
      .update(pjmBillingSchedule)
      .set({ nextRunDate: nextRun, updatedAt: now })
      .where(eq(pjmBillingSchedule.id, schedule.id))

    generated++
  }

  return { generated }
}

// Job registration helper
export interface PjmJobScheduler {
  define(id: string, cron: string, handler: () => Promise<void>): void
}

export function registerProjectManagementJobs(scheduler: PjmJobScheduler, orgIds: string[]): void {
  scheduler.define('pjm.check-overdue-work', '0 6 * * *', async () => {
    for (const orgId of orgIds) await checkOverdueWork(orgId)
  })

  scheduler.define('pjm.check-sprint-health', '0 6 * * 1', async () => {
    for (const orgId of orgIds) await checkSprintHealth(orgId)
  })

  scheduler.define('pjm.expire-retainers', '0 0 * * *', async () => {
    for (const orgId of orgIds) {
      const { expired } = await expireRetainers(orgId)
      if (expired > 0) console.log(`[pjm.expire-retainers] org=${orgId} expired=${expired}`)
    }
  })

  scheduler.define('pjm.generate-billing-drafts', '0 2 * * 1', async () => {
    for (const orgId of orgIds) {
      const { generated } = await generateBillingDrafts(orgId)
      if (generated > 0)
        console.log(`[pjm.generate-billing-drafts] org=${orgId} generated=${generated}`)
    }
  })
}
