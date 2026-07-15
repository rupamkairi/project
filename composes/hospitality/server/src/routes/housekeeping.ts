import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { locations } from '@db/schema/location'
import { hspHousekeeping } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count, inArray } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createHousekeepingRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/housekeeping' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'housekeeping:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)
      const conds = [
        eq(hspHousekeeping.organizationId, actor.orgId),
        isNull(hspHousekeeping.deletedAt),
      ]
      if (q.propertyId) conds.push(eq(hspHousekeeping.propertyId, String(q.propertyId)))
      if (q.status) conds.push(eq(hspHousekeeping.status, String(q.status)))
      if (q.assigneeId) conds.push(eq(hspHousekeeping.assignedActorId, String(q.assigneeId)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(hspHousekeeping)
          .where(and(...conds))
          .orderBy(desc(hspHousekeeping.scheduledDate))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(hspHousekeeping)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'housekeeping:read')
      const { id } = (ctx as any).params
      const [task] = await db
        .select()
        .from(hspHousekeeping)
        .where(
          and(
            eq(hspHousekeeping.id, id),
            eq(hspHousekeeping.organizationId, actor.orgId),
            isNull(hspHousekeeping.deletedAt),
          ),
        )
        .limit(1)
      if (!task) {
        ;(ctx as any).set.status = 404
        return { error: 'Task not found' }
      }
      return task
    })
    .post('/:id/assign', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'housekeeping:assign')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [updated] = await db
        .update(hspHousekeeping)
        .set({
          assignedActorId: body.assignedActorId,
          status: 'assigned',
          updatedAt: now,
        })
        .where(eq(hspHousekeeping.id, id))
        .returning()
      return updated
    })
    .post('/:id/start', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'housekeeping:complete')
      const { id } = (ctx as any).params
      const now = new Date()
      const [updated] = await db
        .update(hspHousekeeping)
        .set({
          status: 'in_progress',
          startedAt: now,
          updatedAt: now,
        })
        .where(eq(hspHousekeeping.id, id))
        .returning()
      return updated
    })
    .post('/:id/complete', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'housekeeping:complete')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const now = new Date()

      const [task] = await db
        .select()
        .from(hspHousekeeping)
        .where(eq(hspHousekeeping.id, id))
        .limit(1)
      if (!task) {
        ;(ctx as any).set.status = 404
        return { error: 'Task not found' }
      }

      const [updated] = await db
        .update(hspHousekeeping)
        .set({
          status: 'completed',
          completedAt: now,
          linenNotes: body.linenNotes ?? task.linenNotes,
          minibarNotes: body.minibarNotes ?? task.minibarNotes,
          maintenanceIssues: body.maintenanceIssues ?? task.maintenanceIssues,
          notes: body.notes ?? task.notes,
          updatedAt: now,
        })
        .where(eq(hspHousekeeping.id, id))
        .returning()

      // Update room status
      if (task.roomLocationId) {
        await db
          .update(locations)
          .set({ meta: { ...((locations.meta as any) ?? {}), status: 'cleaning' }, updatedAt: now })
          .where(eq(locations.id, task.roomLocationId))
      }

      return updated
    })
    .post('/:id/inspect', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'housekeeping:inspect')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const now = new Date()

      const [updated] = await db
        .update(hspHousekeeping)
        .set({
          status: body.result === 'pass' ? 'inspected' : 'completed',
          inspectedAt: now,
          inspectedById: actor.id,
          inspectionResult: body.result,
          updatedAt: now,
        })
        .where(eq(hspHousekeeping.id, id))
        .returning()

      if (updated && body.result === 'pass') {
        const [task] = await db
          .select()
          .from(hspHousekeeping)
          .where(eq(hspHousekeeping.id, id))
          .limit(1)
        if (task?.roomLocationId) {
          await db
            .update(locations)
            .set({
              meta: { ...((locations.meta as any) ?? {}), status: 'inspected' },
              updatedAt: now,
            })
            .where(eq(locations.id, task.roomLocationId))
        }
      }

      return updated
    })
    .get('/rooms/dirty', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'housekeeping:read')
      const q = (ctx as any).query ?? {}
      const conds = [
        eq(locations.organizationId, actor.orgId),
        eq(locations.type, 'room'),
        isNull(locations.deletedAt),
      ]
      if (q.propertyId) conds.push(eq(locations.parentId, String(q.propertyId)))

      const rooms = await db
        .select()
        .from(locations)
        .where(and(...conds))
      const dirty = rooms.filter((r) => {
        const s = (r.meta as any)?.status ?? 'available'
        return s === 'dirty' || s === 'cleaning'
      })
      return listResponse(
        dirty.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          status: (r.meta as any)?.status,
        })),
        dirty.length,
        1,
        100,
      )
    })
}
