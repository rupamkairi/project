// Project Management Compose — event hooks

import { generateId } from '@core'
import { db } from '@db/client'
import { eq, and, isNull, sql } from 'drizzle-orm'
import {
  pjmWorkItem,
  pjmWorkItemAssignment,
  pjmRetainer,
  pjmRetainerUsage,
  pjmWorklog,
  pjmSprint,
} from '../db/schema/project-management'
import type { Mediator } from '@core'

export interface EventBus {
  on(event: string, handler: (payload: any) => Promise<void>): void
}

export function registerProjectManagementHooks(bus: EventBus, mediator: Mediator): void {
  // work-item.assigned — notify assignee
  bus.on('work-item.assigned', async (event) => {
    const { workItemId, actorId, orgId } = event.payload ?? {}
    if (!workItemId || !actorId) return

    try {
      await mediator.dispatch({
        type: 'notification.send',
        recipientId: actorId,
        subject: "You've been assigned to a work item",
        body: `You have been assigned to work item ${workItemId}.`,
        orgId,
      } as any)
    } catch {
      /* Notification module optional */
    }

    try {
      await mediator.dispatch({
        type: 'activity.log',
        entityType: 'work_item',
        entityId: workItemId,
        actorId: event.actorId,
        action: 'assigned',
        orgId,
      } as any)
    } catch {
      /* Activity module optional */
    }
  })

  // work-item.completed — auto-log activity
  bus.on('work-item.completed', async (event) => {
    const { workItemId, orgId } = event.payload ?? {}
    if (!workItemId) return

    try {
      await mediator.dispatch({
        type: 'activity.log',
        entityType: 'work_item',
        entityId: workItemId,
        actorId: event.actorId,
        action: 'completed',
        orgId,
      } as any)
    } catch {
      /* Activity module optional */
    }
  })

  // sprint.started / sprint.completed — analytics stub
  bus.on('sprint.statusChanged', async (event) => {
    const { sprintId, orgId, status } = event.payload ?? {}
    try {
      await mediator.dispatch({
        type: 'analytics.captureEvent',
        name: `sprint.${status}`,
        props: { sprintId, orgId },
      } as any)
    } catch {
      /* Analytics module optional */
    }
  })

  // worklog.approved — consume retainer units if applicable
  bus.on('worklog.approved', async (event) => {
    const { worklogId, orgId } = event.payload ?? {}
    if (!worklogId) return

    const [worklog] = await db
      .select()
      .from(pjmWorklog)
      .where(eq(pjmWorklog.id, worklogId))
      .limit(1)
    if (!worklog) return

    // Find active retainers for the associated work item
    const [wi] = await db
      .select({ projectId: pjmWorkItem.projectId })
      .from(pjmWorkItem)
      .where(and(eq(pjmWorkItem.organizationId, orgId), isNull(pjmWorkItem.deletedAt)))

    if (wi) {
      const retainers = await db
        .select()
        .from(pjmRetainer)
        .where(
          and(
            eq(pjmRetainer.projectId, wi.projectId),
            eq(pjmRetainer.status, 'active'),
            isNull(pjmRetainer.deletedAt),
          ),
        )

      for (const retainer of retainers) {
        const remainingUnits = retainer.totalUnits - retainer.usedUnits
        const consumedHours = Math.min(remainingUnits, worklog.timeSpent / 60)

        if (consumedHours > 0) {
          const now = new Date()
          await db.insert(pjmRetainerUsage).values({
            id: generateId(),
            organizationId: orgId,
            retainerId: retainer.id,
            worklogId,
            units: consumedHours,
            date: now,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })

          const newUsed = retainer.usedUnits + consumedHours
          await db
            .update(pjmRetainer)
            .set({
              usedUnits: newUsed,
              status: newUsed >= retainer.totalUnits ? 'exhausted' : 'active',
              updatedAt: now,
            })
            .where(eq(pjmRetainer.id, retainer.id))
        }
      }
    }
  })

  // pjm.worklog.exported — consumed by Workplace compose (optional integration)
  // pjm.billing.exported — consumed by ERP compose (optional integration)
  // No internal bus subscription needed; Workplace/ERP subscribe externally
}
