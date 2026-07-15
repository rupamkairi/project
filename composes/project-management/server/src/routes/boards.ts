// Project Management Compose — /projects/boards routes

import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { pjmBoard, pjmBoardColumn, pjmWorkItem } from '../db/schema/project-management'
import { eq, and, isNull, desc, count, sql } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

const REPORTING_CATEGORIES = ['backlog', 'todo', 'in_progress', 'review', 'done']

export function createBoardsRoutes(_mediator: Mediator) {
  return (
    new Elysia({ prefix: '/boards' })
      .get('/', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'board:read')
        const q = (ctx as any).query ?? {}
        const conds = [eq(pjmBoard.organizationId, actor.orgId), isNull(pjmBoard.deletedAt)]
        if (q.projectId) conds.push(eq(pjmBoard.projectId, String(q.projectId)))
        const boards = await db
          .select()
          .from(pjmBoard)
          .where(and(...conds))
        return { data: boards }
      })
      .get('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'board:read')
        const { id } = (ctx as any).params
        const [board] = await db
          .select()
          .from(pjmBoard)
          .where(
            and(
              eq(pjmBoard.id, id),
              eq(pjmBoard.organizationId, actor.orgId),
              isNull(pjmBoard.deletedAt),
            ),
          )
          .limit(1)
        if (!board) {
          ;(ctx as any).set.status = 404
          return { error: 'Board not found' }
        }

        const columns = await db
          .select()
          .from(pjmBoardColumn)
          .where(and(eq(pjmBoardColumn.boardId, id), isNull(pjmBoardColumn.archivedAt)))
          .orderBy(pjmBoardColumn.order)

        // Fetch work items grouped by column
        const columnsWithItems = await Promise.all(
          columns.map(async (col) => {
            const items = await db
              .select()
              .from(pjmWorkItem)
              .where(
                and(
                  eq(pjmWorkItem.boardColumnId, col.id),
                  isNull(pjmWorkItem.deletedAt),
                  isNull(pjmWorkItem.archivedAt),
                ),
              )
              .orderBy(pjmWorkItem.order)
              .limit(50)
            return { ...col, items }
          }),
        )

        return { ...board, columns: columnsWithItems }
      })
      .post('/', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'board:manage')
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [board] = await db
          .insert(pjmBoard)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            projectId: body.projectId,
            name: body.name ?? 'Board',
            type: body.type ?? 'kanban',
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return board
      })
      .delete('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'board:manage')
        const { id } = (ctx as any).params
        await db.update(pjmBoard).set({ deletedAt: new Date() }).where(eq(pjmBoard.id, id))
        return { success: true }
      })
      // Columns
      .post('/:id/columns', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'board:manage')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        if (!REPORTING_CATEGORIES.includes(body.reportingCategory)) {
          ;(ctx as any).set.status = 400
          return { error: `reportingCategory must be one of: ${REPORTING_CATEGORIES.join(', ')}` }
        }
        const now = new Date()
        const [col] = await db
          .insert(pjmBoardColumn)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            boardId: id,
            name: body.name,
            reportingCategory: body.reportingCategory,
            order: body.order ?? 0,
            color: body.color,
            wipLimit: body.wipLimit,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return col
      })
      .patch('/:id/columns/:columnId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'board:manage')
        const { columnId } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const [updated] = await db
          .update(pjmBoardColumn)
          .set({
            ...(body.name != null && { name: body.name }),
            ...(body.order != null && { order: body.order }),
            ...(body.color != null && { color: body.color }),
            ...(body.wipLimit != null && { wipLimit: body.wipLimit }),
            ...(body.reportingCategory != null && { reportingCategory: body.reportingCategory }),
            updatedAt: new Date(),
          })
          .where(eq(pjmBoardColumn.id, columnId))
          .returning()
        return updated
      })
      .delete('/:id/columns/:columnId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'board:manage')
        const { columnId } = (ctx as any).params
        // Archive column rather than delete (preserves reporting category history)
        await db
          .update(pjmBoardColumn)
          .set({ archivedAt: new Date(), updatedAt: new Date() })
          .where(eq(pjmBoardColumn.id, columnId))
        return { success: true }
      })
  )
}
