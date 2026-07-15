import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and } from 'drizzle-orm'
import { workplaceContract } from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createContractRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/contracts' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:contracts:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { employeeId } = (ctx as any).query ?? {}
      const rows = await db
        .select()
        .from(workplaceContract)
        .where(
          and(
            eq(workplaceContract.organizationId, actor.orgId),
            employeeId ? eq(workplaceContract.employeeId, employeeId) : undefined,
          ),
        )
      return { contracts: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:contracts:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [contract] = await db
        .insert(workplaceContract)
        .values({
          organizationId: actor.orgId,
          employeeId: body.employeeId,
          type: body.type ?? 'permanent',
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          probationMonths: body.probationMonths ?? 6,
          noticePeriodDays: body.noticePeriodDays ?? 30,
          ctc: body.ctc,
          status: 'draft',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { contract }
    })
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:contracts:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceContract)
        .set({
          type: body.type,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          ctc: body.ctc,
          status: body.status,
        })
        .where(eq(workplaceContract.id, id))
      return { success: true }
    })
}
