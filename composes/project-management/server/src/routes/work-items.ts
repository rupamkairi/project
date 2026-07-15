// Project Management Compose — /projects/work-items routes

import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import {
  pjmWorkItem,
  pjmWorkItemAssignment,
  pjmWorkItemWatcher,
  pjmWorkItemLabel,
  pjmLabel,
  pjmWorkItemDependency,
  pjmChecklistItem,
  pjmPullRequestLink,
  pjmProject,
  pjmBoardColumn,
} from '../db/schema/project-management'
import { eq, and, isNull, desc, ilike, or, count, inArray } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

const VALID_TYPES = ['epic', 'story', 'task', 'subtask', 'bug']

export function createWorkItemsRoutes(_mediator: Mediator) {
  return (
    new Elysia({ prefix: '/work-items' })
      .get('/', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:read')
        const q = (ctx as any).query ?? {}
        const { page, limit, offset } = parsePagination(q)

        const conds = [
          eq(pjmWorkItem.organizationId, actor.orgId),
          isNull(pjmWorkItem.deletedAt),
          isNull(pjmWorkItem.archivedAt),
        ]
        if (q.projectId) conds.push(eq(pjmWorkItem.projectId, String(q.projectId)))
        if (q.type) conds.push(eq(pjmWorkItem.type, String(q.type)))
        if (q.sprintId) conds.push(eq(pjmWorkItem.sprintId, String(q.sprintId)))
        if (q.epicId) conds.push(eq(pjmWorkItem.epicId, String(q.epicId)))
        if (q.boardColumnId) conds.push(eq(pjmWorkItem.boardColumnId, String(q.boardColumnId)))
        if (q.search)
          conds.push(
            or(ilike(pjmWorkItem.title, `%${q.search}%`), ilike(pjmWorkItem.ref, `%${q.search}%`))!,
          )
        if (q.type) conds.push(eq(pjmWorkItem.type, String(q.type)))
        if (q.priority) conds.push(eq(pjmWorkItem.priority, String(q.priority)))
        if (q.reportingCategory)
          conds.push(eq(pjmWorkItem.reportingCategory, String(q.reportingCategory)))

        const [items, [c]] = await Promise.all([
          db
            .select()
            .from(pjmWorkItem)
            .where(and(...conds))
            .orderBy(desc(pjmWorkItem.createdAt))
            .limit(limit)
            .offset(offset),
          db
            .select({ value: count() })
            .from(pjmWorkItem)
            .where(and(...conds)),
        ])
        return listResponse(items, c?.value ?? 0, page, limit)
      })
      .get('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:read')
        const { id } = (ctx as any).params
        const [item] = await db
          .select()
          .from(pjmWorkItem)
          .where(
            and(
              eq(pjmWorkItem.id, id),
              eq(pjmWorkItem.organizationId, actor.orgId),
              isNull(pjmWorkItem.deletedAt),
            ),
          )
          .limit(1)
        if (!item) {
          ;(ctx as any).set.status = 404
          return { error: 'Work item not found' }
        }

        // Fetch enrichments in parallel
        const [assignments, watchers, labels, checklists, dependencies, pullRequests] =
          await Promise.all([
            db
              .select()
              .from(pjmWorkItemAssignment)
              .where(
                and(
                  eq(pjmWorkItemAssignment.workItemId, id),
                  isNull(pjmWorkItemAssignment.unassignedAt),
                ),
              ),
            db.select().from(pjmWorkItemWatcher).where(eq(pjmWorkItemWatcher.workItemId, id)),
            db
              .select({ label: pjmLabel })
              .from(pjmWorkItemLabel)
              .innerJoin(pjmLabel, eq(pjmWorkItemLabel.labelId, pjmLabel.id))
              .where(eq(pjmWorkItemLabel.workItemId, id)),
            db
              .select()
              .from(pjmChecklistItem)
              .where(eq(pjmChecklistItem.workItemId, id))
              .orderBy(pjmChecklistItem.order),
            db.select().from(pjmWorkItemDependency).where(eq(pjmWorkItemDependency.workItemId, id)),
            db.select().from(pjmPullRequestLink).where(eq(pjmPullRequestLink.workItemId, id)),
          ])

        return { ...item, assignments, watchers, labels, checklists, dependencies, pullRequests }
      })
      .post('/', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:create')
        const body = (ctx as any).body ?? {}
        const now = new Date()

        if (!body.projectId) {
          ;(ctx as any).set.status = 400
          return { error: 'projectId is required' }
        }
        if (!VALID_TYPES.includes(body.type)) {
          ;(ctx as any).set.status = 400
          return { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }
        }

        // Validate parent hierarchy
        if (body.parentId) {
          const [parent] = await db
            .select({ type: pjmWorkItem.type })
            .from(pjmWorkItem)
            .where(eq(pjmWorkItem.id, body.parentId))
            .limit(1)
          if (!parent) {
            ;(ctx as any).set.status = 400
            return { error: 'Parent work item not found' }
          }
          // Subtask can only have story/task/bug parent
          if (body.type === 'subtask' && !['story', 'task', 'bug'].includes(parent.type)) {
            ;(ctx as any).set.status = 400
            return { error: 'Subtask parent must be a story, task, or bug' }
          }
        }

        // Get next sequence for this project
        const [project] = await db
          .select({ sequence: pjmProject.sequence, key: pjmProject.key })
          .from(pjmProject)
          .where(eq(pjmProject.id, body.projectId))
          .limit(1)
        if (!project) {
          ;(ctx as any).set.status = 400
          return { error: 'Project not found' }
        }

        const nextSeq = project.sequence + 1
        await db
          .update(pjmProject)
          .set({ sequence: nextSeq, updatedAt: now })
          .where(eq(pjmProject.id, body.projectId))

        // Resolve board column and reporting category
        let boardColumnId = body.boardColumnId ?? null
        let reportingCategory = 'backlog'
        if (boardColumnId) {
          const [col] = await db
            .select({ reportingCategory: pjmBoardColumn.reportingCategory })
            .from(pjmBoardColumn)
            .where(eq(pjmBoardColumn.id, boardColumnId))
            .limit(1)
          if (col) reportingCategory = col.reportingCategory
        }

        const ref = `${project.key}-${nextSeq}`
        const [item] = await db
          .insert(pjmWorkItem)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            projectId: body.projectId,
            sequence: nextSeq,
            ref,
            type: body.type,
            title: body.title,
            description: body.description,
            acceptanceCriteria: body.acceptanceCriteria,
            parentId: body.parentId,
            epicId: body.epicId,
            sprintId: body.sprintId,
            milestoneId: body.milestoneId,
            boardColumnId,
            reportingCategory,
            priority: body.priority ?? 'medium',
            reporterId: body.reporterId ?? actor.id,
            creatorId: actor.id,
            storyPoints: body.storyPoints,
            originalEstimate: body.originalEstimate,
            remainingEstimate: body.remainingEstimate ?? body.originalEstimate,
            plannedStartDate: body.plannedStartDate ? new Date(body.plannedStartDate) : null,
            startDate: body.startDate ? new Date(body.startDate) : null,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            recurrenceRule: body.recurrenceRule,
            order: body.order ?? 0,
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
        requirePermission(actor, 'work-item:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()

        // Resolve reporting category if column changed
        const updateData: Record<string, any> = { updatedAt: now }
        if (body.title != null) updateData.title = body.title
        if (body.description != null) updateData.description = body.description
        if (body.acceptanceCriteria != null) updateData.acceptanceCriteria = body.acceptanceCriteria
        if (body.type != null) updateData.type = body.type
        if (body.priority != null) updateData.priority = body.priority
        if (body.resolution != null) updateData.resolution = body.resolution
        if (body.storyPoints != null) updateData.storyPoints = body.storyPoints
        if (body.originalEstimate != null) updateData.originalEstimate = body.originalEstimate
        if (body.remainingEstimate != null) updateData.remainingEstimate = body.remainingEstimate
        if (body.sprintId != null) updateData.sprintId = body.sprintId
        if (body.milestoneId != null) updateData.milestoneId = body.milestoneId
        if (body.epicId != null) updateData.epicId = body.epicId
        if (body.plannedStartDate != null)
          updateData.plannedStartDate = new Date(body.plannedStartDate)
        if (body.dueDate != null) updateData.dueDate = new Date(body.dueDate)
        if (body.progress != null) updateData.progress = body.progress
        if (body.order != null) updateData.order = body.order
        if (body.recurrenceRule != null) updateData.recurrenceRule = body.recurrenceRule

        if (body.boardColumnId != null) {
          updateData.boardColumnId = body.boardColumnId
          const [col] = await db
            .select({ reportingCategory: pjmBoardColumn.reportingCategory })
            .from(pjmBoardColumn)
            .where(eq(pjmBoardColumn.id, body.boardColumnId))
            .limit(1)
          if (col) updateData.reportingCategory = col.reportingCategory
        }

        // Handle completion
        if (body.resolution === 'done') {
          updateData.completedAt = now
          updateData.progress = 100
        }

        const [updated] = await db
          .update(pjmWorkItem)
          .set(updateData)
          .where(eq(pjmWorkItem.id, id))
          .returning()
        return updated
      })
      .delete('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:delete')
        const { id } = (ctx as any).params
        // Prevent deletion if referenced by other work items
        const children = await db
          .select({ value: count() })
          .from(pjmWorkItem)
          .where(eq(pjmWorkItem.parentId, id))
        if (children[0]?.value && children[0].value > 0) {
          ;(ctx as any).set.status = 400
          return { error: 'Cannot delete: work item has child items' }
        }
        await db.update(pjmWorkItem).set({ deletedAt: new Date() }).where(eq(pjmWorkItem.id, id))
        return { success: true }
      })
      .post('/:id/archive', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:archive')
        const { id } = (ctx as any).params
        await db
          .update(pjmWorkItem)
          .set({ archivedAt: new Date(), updatedAt: new Date() })
          .where(eq(pjmWorkItem.id, id))
        return { success: true }
      })
      // Assignments
      .get('/:id/assignments', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:read')
        const { id } = (ctx as any).params
        const assignments = await db
          .select()
          .from(pjmWorkItemAssignment)
          .where(
            and(eq(pjmWorkItemAssignment.workItemId, id), isNull(pjmWorkItemAssignment.deletedAt)),
          )
          .orderBy(desc(pjmWorkItemAssignment.assignedAt))
        return { data: assignments }
      })
      .post('/:id/assignments', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:assign')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [assignment] = await db
          .insert(pjmWorkItemAssignment)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            workItemId: id,
            actorId: body.actorId,
            assignedAt: now,
            assignedById: actor.id,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return assignment
      })
      .patch('/:id/assignments/:assignmentId/unassign', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:assign')
        const { assignmentId } = (ctx as any).params
        await db
          .update(pjmWorkItemAssignment)
          .set({ unassignedAt: new Date(), updatedAt: new Date() })
          .where(eq(pjmWorkItemAssignment.id, assignmentId))
        return { success: true }
      })
      // Watchers
      .get('/:id/watchers', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:read')
        const { id } = (ctx as any).params
        const watchers = await db
          .select()
          .from(pjmWorkItemWatcher)
          .where(eq(pjmWorkItemWatcher.workItemId, id))
        return { data: watchers }
      })
      .post('/:id/watchers', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [w] = await db
          .insert(pjmWorkItemWatcher)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            workItemId: id,
            actorId: body.actorId,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .onConflictDoNothing()
          .returning()
        ;(ctx as any).set.status = w ? 201 : 200
        return w ?? { success: true }
      })
      .delete('/:id/watchers/:actorId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id, actorId } = (ctx as any).params
        await db
          .delete(pjmWorkItemWatcher)
          .where(
            and(eq(pjmWorkItemWatcher.workItemId, id), eq(pjmWorkItemWatcher.actorId, actorId)),
          )
        return { success: true }
      })
      // Labels
      .post('/:id/labels', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [l] = await db
          .insert(pjmWorkItemLabel)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            workItemId: id,
            labelId: body.labelId,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .onConflictDoNothing()
          .returning()
        ;(ctx as any).set.status = l ? 201 : 200
        return l ?? { success: true }
      })
      .delete('/:id/labels/:labelId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id, labelId } = (ctx as any).params
        await db
          .delete(pjmWorkItemLabel)
          .where(and(eq(pjmWorkItemLabel.workItemId, id), eq(pjmWorkItemLabel.labelId, labelId)))
        return { success: true }
      })
      // Dependencies (with cycle prevention)
      .get('/:id/dependencies', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:read')
        const { id } = (ctx as any).params
        const deps = await db
          .select()
          .from(pjmWorkItemDependency)
          .where(eq(pjmWorkItemDependency.workItemId, id))
        return { data: deps }
      })
      .post('/:id/dependencies', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const dependsOnId = body.dependsOnId

        // Prevent self-dependency
        if (id === dependsOnId) {
          ;(ctx as any).set.status = 400
          return { error: 'Cannot depend on self' }
        }

        // Prevent direct cycle: if A depends on B, B cannot depend on A
        const [existing] = await db
          .select()
          .from(pjmWorkItemDependency)
          .where(
            and(
              eq(pjmWorkItemDependency.workItemId, dependsOnId),
              eq(pjmWorkItemDependency.dependsOnId, id),
            ),
          )
          .limit(1)
        if (existing) {
          ;(ctx as any).set.status = 400
          return { error: 'Cannot create dependency: would create a cycle' }
        }

        const now = new Date()
        const [dep] = await db
          .insert(pjmWorkItemDependency)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            workItemId: id,
            dependsOnId,
            type: body.type ?? 'blocks',
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .onConflictDoNothing()
          .returning()
        ;(ctx as any).set.status = dep ? 201 : 200
        return dep ?? { error: 'Dependency already exists' }
      })
      .delete('/:id/dependencies/:depId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id, depId } = (ctx as any).params
        await db
          .delete(pjmWorkItemDependency)
          .where(
            and(
              eq(pjmWorkItemDependency.workItemId, id),
              eq(pjmWorkItemDependency.dependsOnId, depId),
            ),
          )
        return { success: true }
      })
      // Checklist items
      .get('/:id/checklists', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:read')
        const { id } = (ctx as any).params
        const items = await db
          .select()
          .from(pjmChecklistItem)
          .where(eq(pjmChecklistItem.workItemId, id))
          .orderBy(pjmChecklistItem.order)
        return { data: items }
      })
      .post('/:id/checklists', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [item] = await db
          .insert(pjmChecklistItem)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            workItemId: id,
            text: body.text,
            order: body.order ?? 0,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return item
      })
      .patch('/:id/checklists/:checklistId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id, checklistId } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [updated] = await db
          .update(pjmChecklistItem)
          .set({
            ...(body.text != null && { text: body.text }),
            ...(body.completed != null && {
              completed: body.completed,
              completedById: body.completed ? actor.id : null,
              completedAt: body.completed ? now : null,
            }),
            ...(body.order != null && { order: body.order }),
            updatedAt: now,
          })
          .where(eq(pjmChecklistItem.id, checklistId))
          .returning()
        return updated
      })
      .delete('/:id/checklists/:checklistId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id, checklistId } = (ctx as any).params
        await db
          .update(pjmChecklistItem)
          .set({ deletedAt: new Date() })
          .where(eq(pjmChecklistItem.id, checklistId))
        return { success: true }
      })
      // Pull Request links
      .get('/:id/pull-requests', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:read')
        const { id } = (ctx as any).params
        const prs = await db
          .select()
          .from(pjmPullRequestLink)
          .where(eq(pjmPullRequestLink.workItemId, id))
        return { data: prs }
      })
      .post('/:id/pull-requests', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [pr] = await db
          .insert(pjmPullRequestLink)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            workItemId: id,
            url: body.url,
            title: body.title,
            source: body.source ?? 'manual',
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return pr
      })
      .delete('/:id/pull-requests/:prId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'work-item:update')
        const { prId } = (ctx as any).params
        await db
          .update(pjmPullRequestLink)
          .set({ deletedAt: new Date() })
          .where(eq(pjmPullRequestLink.id, prId))
        return { success: true }
      })
  )
}
