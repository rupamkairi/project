import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceReviewCycle,
  workplaceReview,
  workplaceReviewCriteria,
  workplaceFeedback,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createReviewRoutes(mediator: Mediator) {
  return new Elysia()
    .get('/review-cycles', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reviews:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceReviewCycle)
        .where(eq(workplaceReviewCycle.organizationId, actor.orgId))
        .orderBy(desc(workplaceReviewCycle.createdAt))
      return { reviewCycles: rows }
    })
    .post('/review-cycles', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reviews:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [cycle] = await db
        .insert(workplaceReviewCycle)
        .values({
          organizationId: actor.orgId,
          name: body.name,
          type: body.type ?? 'annual',
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          selfReviewDeadline: body.selfReviewDeadline
            ? new Date(body.selfReviewDeadline)
            : undefined,
          managerReviewDeadline: body.managerReviewDeadline
            ? new Date(body.managerReviewDeadline)
            : undefined,
          status: 'draft',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { reviewCycle: cycle }
    })
    .get('/reviews', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reviews:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { cycleId, employeeId } = (ctx as any).query ?? {}
      const rows = await db
        .select()
        .from(workplaceReview)
        .where(
          and(
            eq(workplaceReview.organizationId, actor.orgId),
            cycleId ? eq(workplaceReview.reviewCycleId, cycleId) : undefined,
            employeeId ? eq(workplaceReview.employeeId, employeeId) : undefined,
          ),
        )
        .orderBy(desc(workplaceReview.createdAt))
      return { reviews: rows }
    })
    .post('/reviews', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reviews:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [review] = await db
        .insert(workplaceReview)
        .values({
          organizationId: actor.orgId,
          reviewCycleId: body.reviewCycleId,
          employeeId: body.employeeId,
          reviewerId: body.reviewerId,
          type: body.type,
          status: 'pending',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { review }
    })
    .patch('/reviews/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reviews:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceReview)
        .set({
          overallRating: body.overallRating,
          strengths: body.strengths,
          improvements: body.improvements,
          comments: body.comments,
          status: body.status,
          submittedAt: body.status === 'submitted' ? new Date() : undefined,
        })
        .where(eq(workplaceReview.id, id))
      return { success: true }
    })
    .post('/reviews/:id/acknowledge', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceReview)
        .set({
          status: 'acknowledged',
          acknowledgedAt: new Date(),
        })
        .where(eq(workplaceReview.id, id))
      return { success: true }
    })
    .get('/feedback', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:performance:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { toEmployeeId } = (ctx as any).query ?? {}
      const rows = await db
        .select()
        .from(workplaceFeedback)
        .where(
          and(
            eq(workplaceFeedback.organizationId, actor.orgId),
            toEmployeeId ? eq(workplaceFeedback.toEmployeeId, toEmployeeId) : undefined,
          ),
        )
        .orderBy(desc(workplaceFeedback.createdAt))
      return { feedback: rows }
    })
    .post('/feedback', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [fb] = await db
        .insert(workplaceFeedback)
        .values({
          organizationId: actor.orgId,
          fromEmployeeId: body.fromEmployeeId,
          toEmployeeId: body.toEmployeeId,
          context: body.context,
          feedback: body.feedback,
          isAnonymous: body.isAnonymous ?? false,
          isPublic: body.isPublic ?? false,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { feedback: fb }
    })
}
