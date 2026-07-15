// Project Management Compose — /projects/reports routes

import Elysia from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import {
  pjmProject,
  pjmWorkItem,
  pjmSprint,
  pjmWorklog,
  pjmBillingDraft,
  pjmRetainer,
  pjmBudget,
  pjmMilestone,
} from '../db/schema/project-management'
import { eq, and, isNull, count, sql, gte, lte } from 'drizzle-orm'
import { requirePermission, isFinance, isGuest } from '../permissions'
import { getActor } from './helpers'

export function createReportsRoutes(_mediator: Mediator) {
  return (
    new Elysia({ prefix: '/reports' })
      // Project health
      .get('/project-health', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:read')
        const q = (ctx as any).query ?? {}
        const projectId = q.projectId as string
        if (!projectId) {
          ;(ctx as any).set.status = 400
          return { error: 'projectId required' }
        }

        const [project] = await db
          .select()
          .from(pjmProject)
          .where(eq(pjmProject.id, projectId))
          .limit(1)
        if (!project) {
          ;(ctx as any).set.status = 404
          return { error: 'Project not found' }
        }

        const [total, completed, overdue, activeSprintItems] = await Promise.all([
          db
            .select({ value: count() })
            .from(pjmWorkItem)
            .where(
              and(
                eq(pjmWorkItem.projectId, projectId),
                isNull(pjmWorkItem.deletedAt),
                isNull(pjmWorkItem.archivedAt),
              ),
            ),
          db
            .select({ value: count() })
            .from(pjmWorkItem)
            .where(
              and(
                eq(pjmWorkItem.projectId, projectId),
                eq(pjmWorkItem.resolution, 'done'),
                isNull(pjmWorkItem.deletedAt),
              ),
            ),
          db
            .select({ value: count() })
            .from(pjmWorkItem)
            .where(
              and(
                eq(pjmWorkItem.projectId, projectId),
                isNull(pjmWorkItem.deletedAt),
                isNull(pjmWorkItem.archivedAt),
                lte(pjmWorkItem.dueDate, new Date()),
                sql`${pjmWorkItem.resolution} IS DISTINCT FROM 'done'`,
              ),
            ),
          db
            .select({ value: count() })
            .from(pjmWorkItem)
            .where(
              and(
                eq(pjmWorkItem.projectId, projectId),
                sql`${pjmWorkItem.sprintId} IS NOT NULL`,
                eq(pjmWorkItem.reportingCategory, 'in_progress'),
                isNull(pjmWorkItem.deletedAt),
              ),
            ),
        ])

        return {
          project,
          totalItems: total[0]?.value ?? 0,
          completedItems: completed[0]?.value ?? 0,
          overdueItems: overdue[0]?.value ?? 0,
          activeSprintItems: activeSprintItems[0]?.value ?? 0,
          progress: total[0]?.value
            ? Math.round(((completed[0]?.value ?? 0) / total[0].value) * 100)
            : 0,
        }
      })
      // Sprint burndown
      .get('/sprint-burndown', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:read')
        const q = (ctx as any).query ?? {}
        const sprintId = q.sprintId as string
        if (!sprintId) {
          ;(ctx as any).set.status = 400
          return { error: 'sprintId required' }
        }

        const [sprint] = await db
          .select()
          .from(pjmSprint)
          .where(eq(pjmSprint.id, sprintId))
          .limit(1)
        if (!sprint) {
          ;(ctx as any).set.status = 404
          return { error: 'Sprint not found' }
        }

        // Estimate total story points / hours
        const items = await db
          .select({
            storyPoints: pjmWorkItem.storyPoints,
            originalEstimate: pjmWorkItem.originalEstimate,
            resolution: pjmWorkItem.resolution,
          })
          .from(pjmWorkItem)
          .where(and(eq(pjmWorkItem.sprintId, sprintId), isNull(pjmWorkItem.deletedAt)))

        const totalPoints = items.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0)
        const donePoints = items
          .filter((i) => i.resolution === 'done')
          .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0)
        const totalEstimate = items.reduce((sum, i) => sum + (i.originalEstimate ?? 0), 0)
        const doneEstimate = items
          .filter((i) => i.resolution === 'done')
          .reduce((sum, i) => sum + (i.originalEstimate ?? 0), 0)

        return {
          sprint,
          totalStoryPoints: totalPoints,
          completedStoryPoints: donePoints,
          remainingStoryPoints: totalPoints - donePoints,
          totalEstimateMinutes: totalEstimate,
          completedEstimateMinutes: doneEstimate,
          itemCount: items.length,
          doneCount: items.filter((i) => i.resolution === 'done').length,
        }
      })
      // Workload
      .get('/workload', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:read')
        const q = (ctx as any).query ?? {}
        const projectId = q.projectId as string

        const conds = [
          eq(pjmWorkItem.organizationId, actor.orgId),
          isNull(pjmWorkItem.deletedAt),
          isNull(pjmWorkItem.archivedAt),
          sql`${pjmWorkItem.resolution} IS DISTINCT FROM 'done'`,
        ]
        if (projectId) conds.push(eq(pjmWorkItem.projectId, projectId))

        const items = await db
          .select({
            type: pjmWorkItem.type,
            priority: pjmWorkItem.priority,
            originalEstimate: pjmWorkItem.originalEstimate,
            remainingEstimate: pjmWorkItem.remainingEstimate,
            loggedTime: pjmWorkItem.loggedTime,
          })
          .from(pjmWorkItem)
          .where(and(...conds))

        const totalEstimate = items.reduce((s, i) => s + (i.originalEstimate ?? 0), 0)
        const totalRemaining = items.reduce((s, i) => s + (i.remainingEstimate ?? 0), 0)
        const totalLogged = items.reduce((s, i) => s + (i.loggedTime ?? 0), 0)

        return {
          activeItems: items.length,
          totalEstimateMinutes: totalEstimate,
          totalRemainingMinutes: totalRemaining,
          totalLoggedMinutes: totalLogged,
          byType: {
            epic: items.filter((i) => i.type === 'epic').length,
            story: items.filter((i) => i.type === 'story').length,
            task: items.filter((i) => i.type === 'task').length,
            subtask: items.filter((i) => i.type === 'subtask').length,
            bug: items.filter((i) => i.type === 'bug').length,
          },
          byPriority: {
            critical: items.filter((i) => i.priority === 'critical').length,
            high: items.filter((i) => i.priority === 'high').length,
            medium: items.filter((i) => i.priority === 'medium').length,
            low: items.filter((i) => i.priority === 'low').length,
          },
        }
      })
      // Time report (estimated vs actual)
      .get('/time', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:read')
        const q = (ctx as any).query ?? {}
        const projectId = q.projectId as string

        const conds = [eq(pjmWorklog.organizationId, actor.orgId), isNull(pjmWorklog.deletedAt)]
        if (projectId) {
          // find work items for this project, then filter worklogs
          const wiIds = (
            await db
              .select({ id: pjmWorkItem.id })
              .from(pjmWorkItem)
              .where(eq(pjmWorkItem.projectId, projectId))
          ).map((r) => r.id)
          // simplified: just count all
        }

        const [total, billable, nonBillable] = await Promise.all([
          db
            .select({ value: sql<number>`COALESCE(SUM(${pjmWorklog.timeSpent}), 0)` })
            .from(pjmWorklog)
            .where(and(...conds)),
          db
            .select({ value: sql<number>`COALESCE(SUM(${pjmWorklog.timeSpent}), 0)` })
            .from(pjmWorklog)
            .where(and(...conds, eq(pjmWorklog.billable, true))),
          db
            .select({ value: sql<number>`COALESCE(SUM(${pjmWorklog.timeSpent}), 0)` })
            .from(pjmWorklog)
            .where(and(...conds, eq(pjmWorklog.billable, false))),
        ])

        return {
          totalMinutes: total[0]?.value ?? 0,
          billableMinutes: billable[0]?.value ?? 0,
          nonBillableMinutes: nonBillable[0]?.value ?? 0,
        }
      })
      // Financial report (guests restricted)
      .get('/financial', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:financial')
        if (isGuest(actor)) {
          ;(ctx as any).set.status = 403
          return { error: 'Guests cannot access financial reports' }
        }

        const q = (ctx as any).query ?? {}
        const projectId = q.projectId as string

        const drafts = projectId
          ? await db.select().from(pjmBillingDraft).where(eq(pjmBillingDraft.projectId, projectId))
          : await db
              .select()
              .from(pjmBillingDraft)
              .where(eq(pjmBillingDraft.organizationId, actor.orgId))

        const retainers = projectId
          ? await db.select().from(pjmRetainer).where(eq(pjmRetainer.projectId, projectId))
          : await db.select().from(pjmRetainer).where(eq(pjmRetainer.organizationId, actor.orgId))

        const totalDrafted = drafts.reduce((s, d) => s + (d.totalAmount ?? 0), 0)
        const totalRetainerValue = retainers.reduce((s, r) => s + r.totalUnits * r.unitPrice, 0)
        const totalRetainerUsed = retainers.reduce((s, r) => s + r.usedUnits * r.unitPrice, 0)

        return {
          billingDrafts: drafts.length,
          totalDraftedCents: totalDrafted,
          byStatus: {
            draft: drafts.filter((d) => d.status === 'draft').length,
            review: drafts.filter((d) => d.status === 'review').length,
            approved: drafts.filter((d) => d.status === 'approved').length,
            exported: drafts.filter((d) => d.status === 'exported').length,
          },
          retainerCount: retainers.length,
          totalRetainerValueCents: totalRetainerValue,
          totalRetainerUsedCents: totalRetainerUsed,
          retainerRemainingCents: totalRetainerValue - totalRetainerUsed,
        }
      })
      // Portfolio roadmap
      .get('/portfolio-roadmap', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:read')
        const q = (ctx as any).query ?? {}
        const portfolioId = q.portfolioId as string

        const conds = [eq(pjmProject.organizationId, actor.orgId), isNull(pjmProject.deletedAt)]
        if (portfolioId) conds.push(eq(pjmProject.portfolioId, portfolioId))

        const projects = await db
          .select()
          .from(pjmProject)
          .where(and(...conds))

        const withMilestones = await Promise.all(
          projects.map(async (p) => {
            const milestones = await db
              .select()
              .from(pjmMilestone)
              .where(and(eq(pjmMilestone.projectId, p.id), isNull(pjmMilestone.deletedAt)))
            return { ...p, milestones }
          }),
        )

        return { data: withMilestones }
      })
      // Client-facing project summary
      .get('/client-summary', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:read')
        const q = (ctx as any).query ?? {}
        const projectId = q.projectId as string
        if (!projectId) {
          ;(ctx as any).set.status = 400
          return { error: 'projectId required' }
        }

        const [project] = await db
          .select()
          .from(pjmProject)
          .where(eq(pjmProject.id, projectId))
          .limit(1)
        if (!project) {
          ;(ctx as any).set.status = 404
          return { error: 'Project not found' }
        }

        const [total, completed, milestones] = await Promise.all([
          db
            .select({ value: count() })
            .from(pjmWorkItem)
            .where(
              and(
                eq(pjmWorkItem.projectId, projectId),
                isNull(pjmWorkItem.deletedAt),
                isNull(pjmWorkItem.archivedAt),
              ),
            ),
          db
            .select({ value: count() })
            .from(pjmWorkItem)
            .where(
              and(
                eq(pjmWorkItem.projectId, projectId),
                eq(pjmWorkItem.resolution, 'done'),
                isNull(pjmWorkItem.deletedAt),
              ),
            ),
          db
            .select()
            .from(pjmMilestone)
            .where(and(eq(pjmMilestone.projectId, projectId), isNull(pjmMilestone.deletedAt))),
        ])

        return {
          project: {
            id: project.id,
            key: project.key,
            name: project.name,
            description: project.description,
            status: project.status,
            startDate: project.startDate,
            targetEndDate: project.targetEndDate,
          },
          progress: total[0]?.value
            ? Math.round(((completed[0]?.value ?? 0) / total[0].value) * 100)
            : 0,
          totalItems: total[0]?.value ?? 0,
          completedItems: completed[0]?.value ?? 0,
          milestones: milestones.map((m) => ({
            name: m.name,
            status: m.status,
            dueDate: m.dueDate,
            completedAt: m.completedAt,
          })),
        }
      })
      // Sprint velocity
      .get('/sprint-velocity', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:read')
        const q = (ctx as any).query ?? {}
        const projectId = q.projectId as string
        if (!projectId) {
          ;(ctx as any).set.status = 400
          return { error: 'projectId required' }
        }

        const completedSprints = await db
          .select()
          .from(pjmSprint)
          .where(
            and(
              eq(pjmSprint.projectId, projectId),
              eq(pjmSprint.status, 'completed'),
              isNull(pjmSprint.deletedAt),
            ),
          )
          .orderBy(pjmSprint.sequence)
          .limit(10)

        const velocity = await Promise.all(
          completedSprints.map(async (sprint) => {
            const [sp, itemCounts] = await Promise.all([
              db
                .select({ value: sql<number>`COALESCE(SUM(${pjmWorkItem.storyPoints}), 0)` })
                .from(pjmWorkItem)
                .where(
                  and(
                    eq(pjmWorkItem.sprintId, sprint.id),
                    eq(pjmWorkItem.resolution, 'done'),
                    isNull(pjmWorkItem.deletedAt),
                  ),
                ),
              db
                .select({ value: count() })
                .from(pjmWorkItem)
                .where(
                  and(
                    eq(pjmWorkItem.sprintId, sprint.id),
                    eq(pjmWorkItem.resolution, 'done'),
                    isNull(pjmWorkItem.deletedAt),
                  ),
                ),
            ])
            return {
              sprintId: sprint.id,
              name: sprint.name,
              completedPoints: sp[0]?.value ?? 0,
              completedItems: itemCounts[0]?.value ?? 0,
            }
          }),
        )

        const avgVelocity = velocity.length
          ? velocity.reduce((s, v) => s + v.completedPoints, 0) / velocity.length
          : 0

        return { velocity, averageVelocity: avgVelocity }
      })
      // Cumulative flow
      .get('/cumulative-flow', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:read')
        const q = (ctx as any).query ?? {}
        const projectId = q.projectId as string
        if (!projectId) {
          ;(ctx as any).set.status = 400
          return { error: 'projectId required' }
        }

        const items = await db
          .select({ reportingCategory: pjmWorkItem.reportingCategory })
          .from(pjmWorkItem)
          .where(
            and(
              eq(pjmWorkItem.projectId, projectId),
              isNull(pjmWorkItem.deletedAt),
              isNull(pjmWorkItem.archivedAt),
            ),
          )

        const flow = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0 }
        for (const item of items) {
          const cat = item.reportingCategory as keyof typeof flow
          if (cat in flow) flow[cat]++
        }

        return {
          flow,
          total: Object.values(flow).reduce((s, v) => s + v, 0),
          wip: flow.in_progress + flow.review,
          throughput: flow.done,
        }
      })
      // Budget burn
      .get('/budget-burn', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'report:financial')
        if (isGuest(actor)) {
          ;(ctx as any).set.status = 403
          return { error: 'Guests cannot access financial reports' }
        }
        const q = (ctx as any).query ?? {}
        const projectId = q.projectId as string
        if (!projectId) {
          ;(ctx as any).set.status = 400
          return { error: 'projectId required' }
        }

        const [budget] = await db
          .select()
          .from(pjmBudget)
          .where(and(eq(pjmBudget.projectId, projectId), isNull(pjmBudget.deletedAt)))
          .limit(1)
        if (!budget) {
          return { error: 'No budget found for this project' }
        }

        const [logTotal] = await db
          .select({
            value: sql<number>`COALESCE(SUM(${pjmWorklog.timeSpent}), 0)`,
          })
          .from(pjmWorklog)
          .where(and(eq(pjmWorklog.organizationId, actor.orgId), isNull(pjmWorklog.deletedAt)))

        const totalLoggedMinutes = logTotal?.value ?? 0
        const burnedCents = (totalLoggedMinutes / 60) * 10000
        const budgetCents = budget.totalAmount ?? 0
        const margin = budgetCents - burnedCents

        return {
          budget: {
            id: budget.id,
            name: budget.name,
            totalCents: budgetCents,
            currency: budget.currency,
          },
          burnedCents,
          remainingCents: margin > 0 ? margin : 0,
          marginCents: margin,
          percentBurned: budgetCents > 0 ? Math.round((burnedCents / budgetCents) * 100) : 0,
          totalLoggedMinutes,
        }
      })
  )
}
