import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import { workplaceGoal } from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createGoalRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/goals' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:performance:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { employeeId } = (ctx as any).query ?? {}
      const rows = await db
        .select()
        .from(workplaceGoal)
        .where(
          and(
            eq(workplaceGoal.organizationId, actor.orgId),
            employeeId ? eq(workplaceGoal.employeeId, employeeId) : undefined,
          ),
        )
        .orderBy(desc(workplaceGoal.createdAt))
      return { goals: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:performance:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [goal] = await db
        .insert(workplaceGoal)
        .values({
          organizationId: actor.orgId,
          title: body.title,
          description: body.description,
          type: body.type ?? 'individual',
          employeeId: body.employeeId,
          departmentId: body.departmentId,
          parentGoalId: body.parentGoalId,
          category: body.category,
          weight: body.weight,
          targetValue: body.targetValue,
          unit: body.unit,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          status: 'active',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { goal }
    })
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:performance:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceGoal)
        .set({
          title: body.title,
          description: body.description,
          status: body.status,
          progress: body.progress,
          currentValue: body.currentValue,
        })
        .where(eq(workplaceGoal.id, id))
      return { success: true }
    })
}
