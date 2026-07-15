// Project Management Compose — /projects/comments routes

import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { pjmComment } from '../db/schema/project-management'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { requirePermission, isGuest } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createCommentsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/comments' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'comment:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      const conds = [eq(pjmComment.organizationId, actor.orgId), isNull(pjmComment.deletedAt)]
      if (q.workItemId) conds.push(eq(pjmComment.workItemId, String(q.workItemId)))

      // Guests cannot see internal comments
      if (isGuest(actor)) {
        conds.push(eq(pjmComment.isInternal, false))
      }

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(pjmComment)
          .where(and(...conds))
          .orderBy(desc(pjmComment.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(pjmComment)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'comment:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()

      // Guests cannot create internal comments
      const isInternal = isGuest(actor) ? false : (body.isInternal ?? false)

      const [comment] = await db
        .insert(pjmComment)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          workItemId: body.workItemId,
          parentId: body.parentId ?? null,
          authorId: actor.id,
          body: body.body,
          isInternal,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning()
      ;(ctx as any).set.status = 201
      return comment
    })
    .patch('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'comment:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db.select().from(pjmComment).where(eq(pjmComment.id, id)).limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Comment not found' }
      }
      if (existing.authorId !== actor.id) {
        ;(ctx as any).set.status = 403
        return { error: 'Can only edit your own comments' }
      }

      const updateData: Record<string, any> = { updatedAt: new Date() }
      if (body.body != null) updateData.body = body.body
      if (!isGuest(actor) && body.isInternal != null) updateData.isInternal = body.isInternal

      const [updated] = await db
        .update(pjmComment)
        .set(updateData)
        .where(eq(pjmComment.id, id))
        .returning()
      return updated
    })
    .delete('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'comment:delete')
      const { id } = (ctx as any).params
      await db.update(pjmComment).set({ deletedAt: new Date() }).where(eq(pjmComment.id, id))
      return { success: true }
    })
}
