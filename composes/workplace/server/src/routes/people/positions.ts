import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and } from 'drizzle-orm'
import { workplacePosition } from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createPositionRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/positions' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:positions:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplacePosition)
        .where(eq(workplacePosition.organizationId, actor.orgId))
      return { positions: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:positions:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [pos] = await db
        .insert(workplacePosition)
        .values({
          organizationId: actor.orgId,
          name: body.name,
          level: body.level,
          departmentId: body.departmentId,
          isHead: body.isHead ?? false,
          headCount: body.headCount ?? 1,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { position: pos }
    })
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:positions:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplacePosition)
        .set({
          name: body.name,
          level: body.level,
          departmentId: body.departmentId,
          isHead: body.isHead,
          headCount: body.headCount,
        })
        .where(eq(workplacePosition.id, id))
      return { success: true }
    })
}
