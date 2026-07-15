// Project Management Compose — /projects/projects routes

import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import {
  pjmProject,
  pjmProjectMember,
  pjmProjectGuest,
  pjmBoard,
  pjmBoardColumn,
} from '../db/schema/project-management'
import { eq, and, isNull, desc, ilike, or, count } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

const DEFAULT_COLUMNS = [
  { name: 'Backlog', reportingCategory: 'backlog', order: 0, color: '#6b7280' },
  { name: 'To Do', reportingCategory: 'todo', order: 1, color: '#3b82f6' },
  { name: 'In Progress', reportingCategory: 'in_progress', order: 2, color: '#f59e0b' },
  { name: 'Review', reportingCategory: 'review', order: 3, color: '#8b5cf6' },
  { name: 'Done', reportingCategory: 'done', order: 4, color: '#10b981' },
]

export function createProjectsRoutes(_mediator: Mediator) {
  return (
    new Elysia({ prefix: '/projects' })
      .get('/', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:read')
        const q = (ctx as any).query ?? {}
        const { page, limit, offset } = parsePagination(q)

        const conds = [eq(pjmProject.organizationId, actor.orgId), isNull(pjmProject.deletedAt)]
        if (q.search)
          conds.push(
            or(ilike(pjmProject.name, `%${q.search}%`), ilike(pjmProject.key, `%${q.search}%`))!,
          )
        if (q.portfolioId) conds.push(eq(pjmProject.portfolioId, String(q.portfolioId)))
        if (q.status) conds.push(eq(pjmProject.status, String(q.status)))
        if (q.type) conds.push(eq(pjmProject.type, String(q.type)))

        const [items, [c]] = await Promise.all([
          db
            .select()
            .from(pjmProject)
            .where(and(...conds))
            .orderBy(desc(pjmProject.createdAt))
            .limit(limit)
            .offset(offset),
          db
            .select({ value: count() })
            .from(pjmProject)
            .where(and(...conds)),
        ])
        return listResponse(items, c?.value ?? 0, page, limit)
      })
      .get('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:read')
        const { id } = (ctx as any).params
        const [project] = await db
          .select()
          .from(pjmProject)
          .where(
            and(
              eq(pjmProject.id, id),
              eq(pjmProject.organizationId, actor.orgId),
              isNull(pjmProject.deletedAt),
            ),
          )
          .limit(1)
        if (!project) {
          ;(ctx as any).set.status = 404
          return { error: 'Project not found' }
        }
        return project
      })
      .post('/', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:create')
        const body = (ctx as any).body ?? {}
        const now = new Date()

        const projectId = generateId()
        const [project] = await db
          .insert(pjmProject)
          .values({
            id: projectId,
            organizationId: actor.orgId,
            key: body.key ?? `PROJ-${Date.now()}`,
            name: body.name,
            description: body.description,
            portfolioId: body.portfolioId,
            type: body.type ?? 'kanban',
            status: body.status ?? 'active',
            ownerId: body.ownerId ?? actor.id,
            clientId: body.clientId,
            startDate: body.startDate ? new Date(body.startDate) : now,
            targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : null,
            sequence: 0,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: body.meta ?? {},
          })
          .returning()

        // Create default board with default columns
        const boardId = generateId()
        await db.insert(pjmBoard).values({
          id: boardId,
          organizationId: actor.orgId,
          projectId,
          name: 'Board',
          type: body.type ?? 'kanban',
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })

        const columnIds: Record<string, string> = {}
        for (const col of DEFAULT_COLUMNS) {
          const colId = generateId()
          columnIds[col.reportingCategory] = colId
          await db.insert(pjmBoardColumn).values({
            id: colId,
            organizationId: actor.orgId,
            boardId,
            name: col.name,
            reportingCategory: col.reportingCategory,
            order: col.order,
            color: col.color,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
        }

        // Set default board on project
        await db
          .update(pjmProject)
          .set({ defaultBoardId: boardId, updatedAt: now })
          .where(eq(pjmProject.id, projectId))
        ;(ctx as any).set.status = 201
        return { ...project, defaultBoardId: boardId }
      })
      .patch('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const [updated] = await db
          .update(pjmProject)
          .set({
            ...(body.name != null && { name: body.name }),
            ...(body.description != null && { description: body.description }),
            ...(body.type != null && { type: body.type }),
            ...(body.status != null && { status: body.status }),
            ...(body.ownerId != null && { ownerId: body.ownerId }),
            ...(body.clientId != null && { clientId: body.clientId }),
            ...(body.startDate != null && { startDate: new Date(body.startDate) }),
            ...(body.targetEndDate != null && { targetEndDate: new Date(body.targetEndDate) }),
            ...(body.actualEndDate != null && { actualEndDate: new Date(body.actualEndDate) }),
            updatedAt: new Date(),
          })
          .where(eq(pjmProject.id, id))
          .returning()
        return updated
      })
      .delete('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:delete')
        const { id } = (ctx as any).params
        await db.update(pjmProject).set({ deletedAt: new Date() }).where(eq(pjmProject.id, id))
        return { success: true }
      })
      .post('/:id/archive', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:archive')
        const { id } = (ctx as any).params
        await db
          .update(pjmProject)
          .set({ archivedAt: new Date(), updatedAt: new Date() })
          .where(eq(pjmProject.id, id))
        return { success: true }
      })
      // Members
      .get('/:id/members', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:read')
        const { id } = (ctx as any).params
        const members = await db
          .select()
          .from(pjmProjectMember)
          .where(
            and(
              eq(pjmProjectMember.projectId, id),
              eq(pjmProjectMember.organizationId, actor.orgId),
              isNull(pjmProjectMember.deletedAt),
            ),
          )
        return { data: members }
      })
      .post('/:id/members', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [member] = await db
          .insert(pjmProjectMember)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            projectId: id,
            actorId: body.actorId,
            role: body.role ?? 'member',
            hourlyRate: body.hourlyRate,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .onConflictDoNothing()
          .returning()
        ;(ctx as any).set.status = 201
        return member
      })
      .delete('/:id/members/:actorId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:update')
        const { id, actorId } = (ctx as any).params
        await db
          .delete(pjmProjectMember)
          .where(and(eq(pjmProjectMember.projectId, id), eq(pjmProjectMember.actorId, actorId)))
        return { success: true }
      })
      // Guests
      .get('/:id/guests', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:read')
        const { id } = (ctx as any).params
        const guests = await db
          .select()
          .from(pjmProjectGuest)
          .where(
            and(
              eq(pjmProjectGuest.projectId, id),
              eq(pjmProjectGuest.organizationId, actor.orgId),
              isNull(pjmProjectGuest.deletedAt),
            ),
          )
        return { data: guests }
      })
      .post('/:id/guests', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [guest] = await db
          .insert(pjmProjectGuest)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            projectId: id,
            actorId: body.actorId,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .onConflictDoNothing()
          .returning()
        ;(ctx as any).set.status = 201
        return guest
      })
      .delete('/:id/guests/:actorId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'project:update')
        const { id, actorId } = (ctx as any).params
        await db
          .delete(pjmProjectGuest)
          .where(and(eq(pjmProjectGuest.projectId, id), eq(pjmProjectGuest.actorId, actorId)))
        return { success: true }
      })
  )
}
