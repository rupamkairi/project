import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceTimesheet,
  workplaceTimesheetEntry,
  workplaceEmployee,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createTimesheetRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/timesheets' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:timesheets:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceTimesheet)
        .where(eq(workplaceTimesheet.organizationId, actor.orgId))
        .orderBy(desc(workplaceTimesheet.createdAt))
        .limit(100)
      return { timesheets: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [ts] = await db
        .insert(workplaceTimesheet)
        .values({
          organizationId: actor.orgId,
          employeeId: body.employeeId,
          weekStartDate: new Date(body.weekStartDate),
          weekEndDate: new Date(body.weekEndDate),
          status: 'draft',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { timesheet: ts }
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:timesheets:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [ts] = await db.select().from(workplaceTimesheet).where(eq(workplaceTimesheet.id, id))
      if (!ts) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      const entries = await db
        .select()
        .from(workplaceTimesheetEntry)
        .where(eq(workplaceTimesheetEntry.timesheetId, id))
        .orderBy(desc(workplaceTimesheetEntry.date))
      return { timesheet: ts, entries }
    })
    .post('/:id/entries', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      const [entry] = await db
        .insert(workplaceTimesheetEntry)
        .values({
          timesheetId: id,
          date: new Date(body.date),
          projectId: body.projectId,
          taskId: body.taskId,
          description: body.description,
          hours: String(body.hours),
          billable: body.billable ?? true,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { entry }
    })
    .post('/:id/submit', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceTimesheet)
        .set({
          status: 'submitted',
          submittedAt: new Date(),
        })
        .where(eq(workplaceTimesheet.id, id))
      return { success: true }
    })
    .post('/:id/approve', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:timesheets:approve')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceTimesheet)
        .set({
          status: 'approved',
          approvedById: actor.actorId,
          approvedAt: new Date(),
        })
        .where(eq(workplaceTimesheet.id, id))
      return { success: true }
    })
}
