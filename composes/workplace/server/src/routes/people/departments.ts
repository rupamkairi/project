import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and } from 'drizzle-orm'
import { workplaceDepartment, workplacePosition } from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createDepartmentRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/departments' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:departments:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceDepartment)
        .where(eq(workplaceDepartment.organizationId, actor.orgId))
      return { departments: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:departments:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [dept] = await db
        .insert(workplaceDepartment)
        .values({
          organizationId: actor.orgId,
          name: body.name,
          code: body.code,
          parentId: body.parentId,
          managerId: body.managerId,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { department: dept }
    })
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:departments:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceDepartment)
        .set({
          name: body.name,
          code: body.code,
          managerId: body.managerId,
        })
        .where(eq(workplaceDepartment.id, id))
      return { success: true }
    })
}
