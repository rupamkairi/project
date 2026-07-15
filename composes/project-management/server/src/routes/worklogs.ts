// Project Management Compose — /projects/worklogs routes

import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { pjmWorklog, pjmWorkItem } from '../db/schema/project-management'
import { eq, and, isNull, desc, count, sql } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createWorklogsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/worklogs' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'worklog:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      const conds = [eq(pjmWorklog.organizationId, actor.orgId), isNull(pjmWorklog.deletedAt)]
      if (q.workItemId) conds.push(eq(pjmWorklog.workItemId, String(q.workItemId)))
      if (q.actorId) conds.push(eq(pjmWorklog.actorId, String(q.actorId)))
      if (q.approved != null) conds.push(eq(pjmWorklog.approved, q.approved === 'true'))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(pjmWorklog)
          .where(and(...conds))
          .orderBy(desc(pjmWorklog.date))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(pjmWorklog)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'worklog:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()

      const [worklog] = await db
        .insert(pjmWorklog)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          workItemId: body.workItemId,
          actorId: actor.id,
          timeSpent: body.timeSpent,
          description: body.description,
          date: body.date ? new Date(body.date) : now,
          billable: body.billable ?? true,
          approved: false,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning()

      // Update work item logged time
      await db
        .update(pjmWorkItem)
        .set({
          loggedTime: sql`${pjmWorkItem.loggedTime} + ${body.timeSpent}`,
          updatedAt: now,
        })
        .where(eq(pjmWorkItem.id, body.workItemId))
      ;(ctx as any).set.status = 201
      return worklog
    })
    .patch('/:id/approve', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'worklog:approve')
      const { id } = (ctx as any).params
      const now = new Date()
      const [worklog] = await db
        .update(pjmWorklog)
        .set({
          approved: true,
          approvedById: actor.id,
          approvedAt: now,
          updatedAt: now,
        })
        .where(eq(pjmWorklog.id, id))
        .returning()
      return worklog
    })
    .post('/:id/export-workplace', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'worklog:approve')
      const { id } = (ctx as any).params

      // Check worklog is approved
      const [wl] = await db.select().from(pjmWorklog).where(eq(pjmWorklog.id, id)).limit(1)
      if (!wl) {
        ;(ctx as any).set.status = 404
        return { error: 'Worklog not found' }
      }
      if (!wl.approved) {
        ;(ctx as any).set.status = 400
        return { error: 'Worklog must be approved first' }
      }

      // Mark exported to workplace
      await db
        .update(pjmWorklog)
        .set({ exportedToWorkplace: true, updatedAt: new Date() })
        .where(eq(pjmWorklog.id, id))

      // Workplace integration is optional — emit event for the Workplace compose to consume
      try {
        await mediator.dispatch({
          type: 'pjm.worklog.exported',
          worklogId: id,
          actorId: wl.actorId,
          timeSpent: wl.timeSpent,
          date: wl.date,
          description: wl.description,
          orgId: actor.orgId,
        } as any)
      } catch {
        /* Workplace integration optional */
      }

      return { success: true }
    })
    .delete('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'worklog:delete')
      const { id } = (ctx as any).params
      const [wl] = await db.select().from(pjmWorklog).where(eq(pjmWorklog.id, id)).limit(1)
      if (wl) {
        await db
          .update(pjmWorkItem)
          .set({
            loggedTime: sql`GREATEST(0, ${pjmWorkItem.loggedTime} - ${wl.timeSpent})`,
            updatedAt: new Date(),
          })
          .where(eq(pjmWorkItem.id, wl.workItemId))
      }
      await db.update(pjmWorklog).set({ deletedAt: new Date() }).where(eq(pjmWorklog.id, id))
      return { success: true }
    })
}
