import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import {
  workplaceLeaveType,
  workplaceShift,
  workplacePayComponent,
  workplaceSalaryStructure,
  workplaceDepartment,
  workplacePosition,
  workplaceReviewCycle,
  workplacePolicy,
  workplaceRoom,
} from '../db/schema/workplace'
import { hasPermission } from '../permissions/matrix'
import { eq } from 'drizzle-orm'

export function createSettingsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/settings' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:settings:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      return {
        settings: {
          modules: [
            'people',
            'recruitment',
            'time',
            'performance',
            'payroll',
            'expenses',
            'office',
            'reports',
          ],
        },
      }
    })
    .get('/organization', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:settings:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const departments = await db
        .select()
        .from(workplaceDepartment)
        .where(eq(workplaceDepartment.organizationId, actor.orgId))
      const positions = await db
        .select()
        .from(workplacePosition)
        .where(eq(workplacePosition.organizationId, actor.orgId))
      return { departments, positions }
    })
    .get('/leave-policy', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:settings:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const leaveTypes = await db
        .select()
        .from(workplaceLeaveType)
        .where(eq(workplaceLeaveType.organizationId, actor.orgId))
      return { leaveTypes }
    })
    .get('/shifts', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:settings:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const shifts = await db
        .select()
        .from(workplaceShift)
        .where(eq(workplaceShift.organizationId, actor.orgId))
      return { shifts }
    })
    .get('/payroll-config', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:settings:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const payComponents = await db
        .select()
        .from(workplacePayComponent)
        .where(eq(workplacePayComponent.organizationId, actor.orgId))
      const salaryStructures = await db
        .select()
        .from(workplaceSalaryStructure)
        .where(eq(workplaceSalaryStructure.organizationId, actor.orgId))
      return {
        payComponents,
        salaryStructures,
        defaultCurrency: 'INR',
        payrollFrequency: 'monthly',
      }
    })
}
