import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceJobOpening,
  workplaceApplication,
  workplaceInterview,
  workplaceOffer,
  workplaceEmployee,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createJobOpeningRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/job-openings' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceJobOpening)
        .where(eq(workplaceJobOpening.organizationId, actor.orgId))
        .orderBy(desc(workplaceJobOpening.createdAt))
      return { jobOpenings: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [job] = await db
        .insert(workplaceJobOpening)
        .values({
          organizationId: actor.orgId,
          title: body.title,
          positionId: body.positionId,
          departmentId: body.departmentId,
          pipelineId: body.pipelineId,
          employmentType: body.employmentType ?? 'permanent',
          headCount: body.headCount ?? 1,
          minCtc: body.minCtc,
          maxCtc: body.maxCtc,
          description: body.description,
          requirements: body.requirements ?? [],
          status: 'draft',
          createdById: actor.actorId,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { jobOpening: job }
    })
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceJobOpening)
        .set({
          title: body.title,
          description: body.description,
          minCtc: body.minCtc,
          maxCtc: body.maxCtc,
          status: body.status,
          headCount: body.headCount,
        })
        .where(eq(workplaceJobOpening.id, id))
      return { success: true }
    })
    .post('/:id/open', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceJobOpening)
        .set({
          status: 'open',
          openedAt: new Date(),
        })
        .where(eq(workplaceJobOpening.id, id))
      return { success: true }
    })
    .post('/:id/close', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceJobOpening)
        .set({
          status: 'closed',
          closedAt: new Date(),
        })
        .where(eq(workplaceJobOpening.id, id))
      return { success: true }
    })
    .get('/:id/applications', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const rows = await db
        .select()
        .from(workplaceApplication)
        .where(eq(workplaceApplication.jobOpeningId, id))
        .orderBy(desc(workplaceApplication.appliedAt))
      return { applications: rows }
    })
}
