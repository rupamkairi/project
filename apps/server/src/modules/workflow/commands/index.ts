import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { wfProcessTemplates, wfProcessInstances, wfTasks } from '@db/schema/workflow'
import type { WfProcessInstance } from '@db/schema/workflow'
import { eq, and } from 'drizzle-orm'

export interface StartProcessPayload {
  entityId: string
  entityType: string
  title?: string
  assigneeId?: string
}

export const startProcessHandler: CommandHandler<StartProcessPayload, WfProcessInstance> = async (
  command,
) => {
  const p = command.payload
  const now = new Date()
  let [template] = await db
    .select()
    .from(wfProcessTemplates)
    .where(
      and(
        eq(wfProcessTemplates.organizationId, command.orgId),
        eq(wfProcessTemplates.entityType, p.entityType),
        eq(wfProcessTemplates.isActive, true),
      ),
    )
    .limit(1)

  if (!template) {
    const [created] = await db
      .insert(wfProcessTemplates)
      .values({
        id: generateId(),
        organizationId: command.orgId,
        name: `${p.entityType} approval`,
        entityType: p.entityType,
        stages: [{ id: 'review', name: 'Review' }],
        isActive: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })
      .returning()
    template = created!
  }

  const [instance] = await db
    .insert(wfProcessInstances)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      templateId: template.id,
      entityId: p.entityId,
      entityType: p.entityType,
      currentStage: 'review',
      context: {},
      status: 'active',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()

  await db.insert(wfTasks).values({
    id: generateId(),
    organizationId: command.orgId,
    instanceId: instance!.id,
    stageId: 'review',
    title: p.title ?? 'Approval',
    assigneeId: p.assigneeId ?? null,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: {},
  })

  return instance!
}

export const completeProcessHandler: CommandHandler<{ id: string; outcome?: string }, WfProcessInstance> =
  async (command) => {
    const now = new Date()
    const [row] = await db
      .update(wfProcessInstances)
      .set({
        status: 'completed',
        completedAt: now,
        updatedAt: now,
        context: { outcome: command.payload.outcome ?? 'approved' },
      })
      .where(
        and(
          eq(wfProcessInstances.id, command.payload.id),
          eq(wfProcessInstances.organizationId, command.orgId),
        ),
      )
      .returning()
    if (!row) throw new Error('Process not found')
    return row
  }
