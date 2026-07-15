import { db } from '@db/client'
import { generateId } from '@core'
import { wfProcessTemplates, wfProcessInstances, wfTasks } from '@db/schema/workflow'
import { eq, and } from 'drizzle-orm'
import type { EventBus } from '@core'
import { createDomainEvent } from '@core'

async function startWorkflowInstance(
  orgId: string,
  entityId: string,
  entityType: string,
  actorId: string,
) {
  const [tpl] = await db
    .select()
    .from(wfProcessTemplates)
    .where(
      and(
        eq(wfProcessTemplates.organizationId, orgId),
        eq(wfProcessTemplates.entityType, entityType),
        eq(wfProcessTemplates.isActive, true),
      ),
    )
    .limit(1)

  if (!tpl) {
    console.log(`No active workflow template for entityType=${entityType} in org=${orgId}`)
    return null
  }

  const stages = tpl.stages as Array<{
    id: string
    name: string
    tasks: Array<{ title: string; assigneeRole?: string }>
  }>
  const firstStage = stages[0]
  if (!firstStage) return null

  const now = new Date()
  const instanceId = generateId()

  await db
    .insert(wfProcessInstances)
    .values({
      id: instanceId,
      organizationId: orgId,
      templateId: tpl.id,
      entityId,
      entityType,
      currentStage: firstStage.id ?? firstStage.name,
      context: { startedBy: actorId },
      status: 'active',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .onConflictDoNothing()

  if (firstStage.tasks?.length) {
    await db.insert(wfTasks).values(
      firstStage.tasks.map((t) => ({
        id: generateId(),
        organizationId: orgId,
        instanceId,
        stageId: firstStage.id ?? firstStage.name,
        title: t.title,
        assigneeRole: t.assigneeRole ?? null,
        status: 'open' as const,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })),
    )
  }

  console.log(`Started workflow instance ${instanceId} (${entityType}) for entity ${entityId}`)
  return instanceId
}

export function registerWorkflowHooks(bus: EventBus) {
  bus.subscribe('workplace.employee.hired', async (event: any) => {
    const payload = event.payload ?? event
    const instanceId = await startWorkflowInstance(
      payload.orgId,
      payload.employeeId ?? payload.id,
      'Employee',
      payload.actorId ?? 'system',
    )

    if (instanceId) {
      await bus.publish(
        createDomainEvent(
          'workplace.onboarding.started',
          payload.employeeId ?? payload.id ?? crypto.randomUUID(),
          'workplace.employee',
          {
            employeeId: payload.employeeId ?? payload.id,
            personId: payload.personId,
            joinDate: payload.joinDate,
            workflowInstanceId: instanceId,
          },
          payload.orgId,
          { correlationId: payload.correlationId ?? crypto.randomUUID(), source: 'workplace' },
        ),
      )
    }
  })

  bus.subscribe('workplace.employee.terminated', async (event: any) => {
    const payload = event.payload ?? event
    const instanceId = await startWorkflowInstance(
      payload.orgId,
      payload.employeeId ?? payload.id,
      'Employee',
      payload.actorId ?? 'system',
    )

    if (instanceId) {
      await bus.publish(
        createDomainEvent(
          'workplace.offboarding.started',
          payload.employeeId ?? payload.id ?? crypto.randomUUID(),
          'workplace.employee',
          {
            employeeId: payload.employeeId ?? payload.id,
            reason: payload.reason,
            date: payload.date,
            workflowInstanceId: instanceId,
          },
          payload.orgId,
          { correlationId: payload.correlationId ?? crypto.randomUUID(), source: 'workplace' },
        ),
      )
    }
  })
}

export async function getEmployeeWorkflowInstances(orgId: string, employeeId: string) {
  return db
    .select()
    .from(wfProcessInstances)
    .where(
      and(
        eq(wfProcessInstances.organizationId, orgId),
        eq(wfProcessInstances.entityId, employeeId),
      ),
    )
}

export async function getWorkflowTasks(orgId: string, instanceId: string) {
  return db
    .select()
    .from(wfTasks)
    .where(and(eq(wfTasks.organizationId, orgId), eq(wfTasks.instanceId, instanceId)))
}

export async function completeWorkflowTask(
  orgId: string,
  taskId: string,
  actorId: string,
  outcome?: Record<string, unknown>,
) {
  const now = new Date()
  await db
    .update(wfTasks)
    .set({
      status: 'completed',
      completedAt: now,
      outcome: outcome ?? {},
      updatedAt: now,
    })
    .where(and(eq(wfTasks.id, taskId), eq(wfTasks.organizationId, orgId)))
}
