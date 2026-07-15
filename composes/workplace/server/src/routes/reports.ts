import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq } from 'drizzle-orm'
import { hasPermission } from '../permissions/matrix'

export function createReportRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/reports' })
    .get('/headcount', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reports:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { workplaceEmployee } = await import('../db/schema/workplace')
      const employees = await db
        .select()
        .from(workplaceEmployee)
        .where(eq(workplaceEmployee.organizationId, actor.orgId))
      return {
        total: employees.length,
        active: employees.filter((e: any) => e.employmentStatus === 'active').length,
        onLeave: employees.filter((e: any) => e.employmentStatus === 'on_leave').length,
        terminated: employees.filter((e: any) => e.employmentStatus === 'terminated').length,
      }
    })
    .get('/attendance-summary', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reports:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { month, year } = (ctx as any).query ?? {}
      return { summary: 'Attendance summary' }
    })
    .get('/payroll-summary', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reports:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      return { summary: 'Payroll summary' }
    })
    .get('/leave-utilization', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reports:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      return { utilization: 'Leave utilization report' }
    })
    .get('/expense-summary', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:reports:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      return { summary: 'Expense summary' }
    })
}
