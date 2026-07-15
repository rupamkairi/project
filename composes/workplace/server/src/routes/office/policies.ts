import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import { workplacePolicy, workplacePolicyAcknowledgement } from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createPolicyRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/policies' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:policies:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplacePolicy)
        .where(
          and(eq(workplacePolicy.organizationId, actor.orgId), eq(workplacePolicy.isActive, true)),
        )
        .orderBy(desc(workplacePolicy.createdAt))
      return { policies: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:policies:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [policy] = await db
        .insert(workplacePolicy)
        .values({
          organizationId: actor.orgId,
          title: body.title,
          category: body.category,
          version: body.version ?? 1,
          content: body.content,
          documentId: body.documentId,
          publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { policy }
    })
    .post('/:id/acknowledge', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .insert(workplacePolicyAcknowledgement)
        .values({
          organizationId: actor.orgId,
          policyId: id,
          employeeId: body.employeeId,
        })
        .onConflictDoNothing()
      return { success: true }
    })
}
