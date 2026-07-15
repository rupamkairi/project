import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import { workplacePayslip } from '../../db/schema/workplace'
import { hasPermission, WORKPLACE_ROLES } from '../../permissions/matrix'

export function createPayslipRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/payslips' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:payroll:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplacePayslip)
        .where(eq(workplacePayslip.organizationId, actor.orgId))
        .orderBy(desc(workplacePayslip.publishedAt))
        .limit(100)
      return { payslips: rows }
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [slip] = await db.select().from(workplacePayslip).where(eq(workplacePayslip.id, id))
      if (!slip) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      const canView =
        hasPermission(actor, 'workplace:payroll:read') ||
        hasPermission(actor, 'workplace:payslip:self')
      if (!canView) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      return { payslip: slip }
    })
}
