// Project Management Compose — /projects/sprints routes

import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { pjmSprint, pjmWorkItem } from '../db/schema/project-management'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { requirePermission } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createSprintsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/sprints' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'sprint:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      const conds = [eq(pjmSprint.organizationId, actor.orgId), isNull(pjmSprint.deletedAt)]
      if (q.projectId) conds.push(eq(pjmSprint.projectId, String(q.projectId)))
      if (q.status) conds.push(eq(pjmSprint.status, String(q.status)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(pjmSprint)
          .where(and(...conds))
          .orderBy(desc(pjmSprint.sequence))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(pjmSprint)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'sprint:read')
      const { id } = (ctx as any).params
      const [sprint] = await db
        .select()
        .from(pjmSprint)
        .where(
          and(
            eq(pjmSprint.id, id),
            eq(pjmSprint.organizationId, actor.orgId),
            isNull(pjmSprint.deletedAt),
          ),
        )
        .limit(1)
      if (!sprint) {
        ;(ctx as any).set.status = 404
        return { error: 'Sprint not found' }
      }
      const [itemCount] = await db
        .select({ value: count() })
        .from(pjmWorkItem)
        .where(and(eq(pjmWorkItem.sprintId, id), isNull(pjmWorkItem.deletedAt)))
      return { ...sprint, itemCount: itemCount?.value ?? 0 }
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'sprint:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [sprint] = await db
        .insert(pjmSprint)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          projectId: body.projectId,
          name: body.name,
          goal: body.goal,
          status: 'planning',
          capacity: body.capacity,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          sequence: body.sequence ?? 1,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning()
      ;(ctx as any).set.status = 201
      return sprint
    })
    .patch('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'sprint:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [updated] = await db
        .update(pjmSprint)
        .set({
          ...(body.name != null && { name: body.name }),
          ...(body.goal != null && { goal: body.goal }),
          ...(body.capacity != null && { capacity: body.capacity }),
          ...(body.startDate != null && { startDate: new Date(body.startDate) }),
          ...(body.endDate != null && { endDate: new Date(body.endDate) }),
          updatedAt: new Date(),
        })
        .where(eq(pjmSprint.id, id))
        .returning()
      return updated
    })
    .post('/:id/start', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'sprint:update')
      const { id } = (ctx as any).params
      await db
        .update(pjmSprint)
        .set({ status: 'active', startDate: new Date(), updatedAt: new Date() })
        .where(eq(pjmSprint.id, id))
      return { success: true }
    })
    .post('/:id/complete', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'sprint:complete')
      const { id } = (ctx as any).params
      const now = new Date()
      await db
        .update(pjmSprint)
        .set({ status: 'completed', completedAt: now, updatedAt: now })
        .where(eq(pjmSprint.id, id))
      return { success: true }
    })
    .delete('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'sprint:delete')
      const { id } = (ctx as any).params
      await db.update(pjmSprint).set({ deletedAt: new Date() }).where(eq(pjmSprint.id, id))
      return { success: true }
    })
    .get('/:id/work-items', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'sprint:read')
      const { id } = (ctx as any).params
      const items = await db
        .select()
        .from(pjmWorkItem)
        .where(and(eq(pjmWorkItem.sprintId, id), isNull(pjmWorkItem.deletedAt)))
        .orderBy(pjmWorkItem.order)
      return { data: items }
    })
}
