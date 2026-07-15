import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import { workplaceShift, workplaceShiftAssignment } from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createShiftRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/shifts' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:shifts:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceShift)
        .where(eq(workplaceShift.organizationId, actor.orgId))
      return { shifts: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:shifts:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [shift] = await db
        .insert(workplaceShift)
        .values({
          organizationId: actor.orgId,
          name: body.name,
          startTime: body.startTime,
          endTime: body.endTime,
          breakMinutes: body.breakMinutes ?? 60,
          color: body.color,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { shift }
    })
    .get('/assignments', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:shifts:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { employeeId } = (ctx as any).query ?? {}
      const rows = await db
        .select()
        .from(workplaceShiftAssignment)
        .where(
          and(
            eq(workplaceShiftAssignment.organizationId, actor.orgId),
            employeeId ? eq(workplaceShiftAssignment.employeeId, employeeId) : undefined,
          ),
        )
        .orderBy(desc(workplaceShiftAssignment.fromDate))
      return { assignments: rows }
    })
    .post('/assignments', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:shifts:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [assignment] = await db
        .insert(workplaceShiftAssignment)
        .values({
          organizationId: actor.orgId,
          employeeId: body.employeeId,
          shiftId: body.shiftId,
          fromDate: new Date(body.fromDate),
          toDate: body.toDate ? new Date(body.toDate) : undefined,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { assignment }
    })
}
