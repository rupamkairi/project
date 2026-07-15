import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import { workplaceEmployee } from '../db/schema/workplace'
import { wfProcessInstances, wfTasks } from '@db/schema/workflow'
import { hasPermission } from '../permissions/matrix'
import {
  getEmployeeWorkflowInstances,
  getWorkflowTasks,
  completeWorkflowTask,
} from '../lib/workflow-orchestrator'

export function createOnboardingRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/onboarding' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      // List employees in preboarding/onboarding status
      const employees = await db
        .select()
        .from(workplaceEmployee)
        .where(
          and(
            eq(workplaceEmployee.organizationId, actor.orgId),
            eq(workplaceEmployee.employmentStatus, 'preboarding'),
          ),
        )
      return { onboarding: employees }
    })
    .get('/:employeeId/workflow', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { employeeId } = (ctx as any).params
      const instances = await getEmployeeWorkflowInstances(actor.orgId, employeeId)
      if (instances.length === 0) {
        return { workflowInstances: [], tasks: [] }
      }
      const instance = instances[0]
      if (!instance) return { workflowInstances: instances, tasks: [] }
      const tasks = await getWorkflowTasks(actor.orgId, instance.id)
      return { workflowInstances: instances, tasks }
    })
    .post('/:employeeId/complete-task', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { employeeId } = (ctx as any).params
      const body = (ctx as any).body as any

      await completeWorkflowTask(actor.orgId, body.taskId, actor.actorId, body.outcome ?? {})

      // If all tasks in current stage are done, advance to next stage
      const [instance] = await db
        .select()
        .from(wfProcessInstances)
        .where(eq(wfProcessInstances.entityId, employeeId))
      if (instance) {
        const remaining = await db
          .select()
          .from(wfTasks)
          .where(
            and(
              eq(wfTasks.organizationId, actor.orgId),
              eq(wfTasks.instanceId, instance.id),
              eq(wfTasks.status, 'open'),
            ),
          )
        if (remaining.length === 0) {
          // Advance stage (simplified — just move stages linearly)
          const tplStages = instance.context as any
          await db
            .update(wfProcessInstances)
            .set({
              currentStage: 'completed',
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(wfProcessInstances.id, instance.id))

          // Activate employee
          await db
            .update(workplaceEmployee)
            .set({
              employmentStatus: 'active',
            })
            .where(
              and(
                eq(workplaceEmployee.id, employeeId),
                eq(workplaceEmployee.organizationId, actor.orgId),
              ),
            )
        }
      }

      return { success: true }
    })
    .get('/offboarding', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const employees = await db
        .select()
        .from(workplaceEmployee)
        .where(
          and(
            eq(workplaceEmployee.organizationId, actor.orgId),
            eq(workplaceEmployee.employmentStatus, 'terminated'),
          ),
        )
      return { offboarding: employees }
    })
}
