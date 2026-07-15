// Project Management Compose — /projects/my-work routes

import Elysia from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { pjmWorkItem, pjmWorkItemAssignment, pjmProject } from '../db/schema/project-management'
import { eq, and, isNull, desc, inArray, sql } from 'drizzle-orm'
import { requirePermission } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createMyWorkRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/my-work' }).get('/', async (ctx) => {
    const actor = getActor(ctx)
    requirePermission(actor, 'my-work:read')
    const q = (ctx as any).query ?? {}
    const { page, limit, offset } = parsePagination(q)

    // Find work items assigned to the current actor
    const assignments = await db
      .select({ workItemId: pjmWorkItemAssignment.workItemId })
      .from(pjmWorkItemAssignment)
      .where(
        and(
          eq(pjmWorkItemAssignment.actorId, actor.id),
          isNull(pjmWorkItemAssignment.unassignedAt),
          eq(pjmWorkItemAssignment.organizationId, actor.orgId),
        ),
      )

    const workItemIds = [...new Set(assignments.map((a) => a.workItemId))]

    if (workItemIds.length === 0) {
      return listResponse([], 0, page, limit)
    }

    const conds = [
      eq(pjmWorkItem.organizationId, actor.orgId),
      isNull(pjmWorkItem.deletedAt),
      isNull(pjmWorkItem.archivedAt),
      sql`${pjmWorkItem.resolution} IS DISTINCT FROM 'done'`,
    ]

    // Filter to assigned items
    const items = await db
      .select()
      .from(pjmWorkItem)
      .where(and(...conds))
      .orderBy(desc(pjmWorkItem.priority))
      .limit(limit)
      .offset(offset)

    // Filter in JS by assignment
    const assignedItems = items.filter((i) => workItemIds.includes(i.id))

    // Enrich with project info
    const projectIds = [...new Set(assignedItems.map((i) => i.projectId))]
    const projects =
      projectIds.length > 0
        ? await db
            .select({ id: pjmProject.id, key: pjmProject.key, name: pjmProject.name })
            .from(pjmProject)
            .where(
              and(
                eq(pjmProject.organizationId, actor.orgId),
                inArray(pjmProject.id, projectIds as [string, ...string[]]),
              ),
            )
        : []

    const projectMap = new Map(projects.map((p) => [p.id, p]))
    const enriched = assignedItems.map((i) => ({ ...i, project: projectMap.get(i.projectId) }))

    return listResponse(enriched, enriched.length, page, limit)
  })
}
