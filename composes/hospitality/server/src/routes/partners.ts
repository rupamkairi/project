import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { hspPartner } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createPartnersRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/partners' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'partner:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)
      const conds = [eq(hspPartner.organizationId, actor.orgId), isNull(hspPartner.deletedAt)]
      if (q.type) conds.push(eq(hspPartner.type, String(q.type)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(hspPartner)
          .where(and(...conds))
          .orderBy(desc(hspPartner.name))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(hspPartner)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'partner:read')
      const { id } = (ctx as any).params
      const [item] = await db
        .select()
        .from(hspPartner)
        .where(
          and(
            eq(hspPartner.id, id),
            eq(hspPartner.organizationId, actor.orgId),
            isNull(hspPartner.deletedAt),
          ),
        )
        .limit(1)
      if (!item) {
        ;(ctx as any).set.status = 404
        return { error: 'Partner not found' }
      }
      return item
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'partner:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [item] = await db
        .insert(hspPartner)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          ...body,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning()
      ;(ctx as any).set.status = 201
      return item
    })
    .patch('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'partner:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db.select().from(hspPartner).where(eq(hspPartner.id, id)).limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Partner not found' }
      }
      const [updated] = await db
        .update(hspPartner)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(hspPartner.id, id))
        .returning()
      return updated
    })
    .delete('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'partner:delete')
      const { id } = (ctx as any).params
      await db.update(hspPartner).set({ deletedAt: new Date() }).where(eq(hspPartner.id, id))
      return { success: true }
    })
}
