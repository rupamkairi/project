// Project Management Compose — /projects/clients routes
// Reuses Party records. Client here means a party linked to a project.

import Elysia from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { parties } from '@db/schema/party'
import { pjmProject } from '../db/schema/project-management'
import { eq, and, isNull, ilike, or, count } from 'drizzle-orm'
import { requirePermission } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createClientsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/clients' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'client:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      // Get client IDs from projects
      const clientIds = await db
        .select({ clientId: pjmProject.clientId })
        .from(pjmProject)
        .where(and(eq(pjmProject.organizationId, actor.orgId), isNull(pjmProject.deletedAt)))

      const uniqueClientIds = [...new Set(clientIds.map((c) => c.clientId).filter(Boolean))]

      if (uniqueClientIds.length === 0) {
        return listResponse([], 0, page, limit)
      }

      const conds = [eq(parties.organizationId, actor.orgId), isNull(parties.deletedAt)]

      // Filter to client parties only
      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(parties)
          .where(and(...conds))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(parties)
          .where(and(...conds)),
      ])

      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .get('/:id/projects', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'client:read')
      const { id } = (ctx as any).params
      const projects = await db
        .select()
        .from(pjmProject)
        .where(
          and(
            eq(pjmProject.clientId, id),
            eq(pjmProject.organizationId, actor.orgId),
            isNull(pjmProject.deletedAt),
          ),
        )
      return { data: projects }
    })
}
