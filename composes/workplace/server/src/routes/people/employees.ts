import { Elysia } from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceEmployee,
  workplaceEmploymentHistory,
  workplaceContract,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createEmployeeRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/employees' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceEmployee)
        .where(eq(workplaceEmployee.organizationId, actor.orgId))
        .orderBy(desc(workplaceEmployee.createdAt))
      return { employees: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const orgId = actor.orgId

      let personId = body.personId
      if (!personId) {
        const result = await mediator.dispatch({
          type: 'person.createPerson',
          payload: {
            organizationId: orgId,
            type: 'employee',
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            phone: body.phone,
          },
          actorId: actor.actorId,
          orgId,
          correlationId: generateId(),
        })
        personId = (result as any)?.id ?? result
      }

      const [emp] = await db
        .insert(workplaceEmployee)
        .values({
          organizationId: orgId,
          personId: String(personId),
          employeeCode: body.employeeCode,
          positionId: body.positionId,
          departmentId: body.departmentId,
          managerId: body.managerId,
          employmentType: body.employmentType ?? 'permanent',
          employmentStatus: body.employmentStatus ?? 'preboarding',
          joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
          meta: body.meta ?? {},
        })
        .returning()

      ;(ctx as any).set.status = 201
      return { employee: emp }
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      const { id } = (ctx as any).params
      const [emp] = await db.select().from(workplaceEmployee).where(eq(workplaceEmployee.id, id))
      if (!emp) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      const isSelf = emp.personId === actor?.actorId
      const canRead = actor && (hasPermission(actor, 'workplace:people:read') || isSelf)
      if (!canRead) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      return { employee: emp }
    })
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      const [existing] = await db
        .select()
        .from(workplaceEmployee)
        .where(eq(workplaceEmployee.id, id))
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }

      await db.insert(workplaceEmploymentHistory).values({
        employeeId: id,
        organizationId: existing.organizationId,
        field: 'update',
        oldValue: JSON.stringify({
          positionId: existing.positionId,
          departmentId: existing.departmentId,
          managerId: existing.managerId,
        }),
        newValue: JSON.stringify({
          positionId: body.positionId,
          departmentId: body.departmentId,
          managerId: body.managerId,
        }),
        changedById: actor.actorId,
      })

      await db
        .update(workplaceEmployee)
        .set({
          positionId: body.positionId ?? existing.positionId,
          departmentId: body.departmentId ?? existing.departmentId,
          managerId: body.managerId ?? existing.managerId,
          employmentType: body.employmentType ?? existing.employmentType,
          meta: body.meta ?? existing.meta,
        })
        .where(eq(workplaceEmployee.id, id))
      return { success: true }
    })
    .post('/:id/terminate', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      const [existing] = await db
        .select()
        .from(workplaceEmployee)
        .where(eq(workplaceEmployee.id, id))
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }

      await db.insert(workplaceEmploymentHistory).values({
        employeeId: id,
        organizationId: existing.organizationId,
        field: 'termination',
        oldValue: existing.employmentStatus,
        newValue: 'terminated',
        changedById: actor.actorId,
        reason: body.reason,
      })

      await db
        .update(workplaceEmployee)
        .set({
          employmentStatus: 'terminated',
          terminationDate: new Date(body.date ?? new Date()),
          terminationReason: body.reason,
        })
        .where(eq(workplaceEmployee.id, id))

      await bus.publish(
        createDomainEvent(
          'workplace.employee.terminated',
          id,
          'workplace.employee',
          {
            employeeId: id,
            reason: body.reason,
            date: body.date ?? new Date().toISOString(),
            orgId: actor.orgId,
          },
          actor.orgId,
          { actorId: actor.actorId, correlationId: generateId(), source: 'workplace' },
        ),
      )

      return { success: true }
    })
    .get('/:id/history', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const rows = await db
        .select()
        .from(workplaceEmploymentHistory)
        .where(eq(workplaceEmploymentHistory.employeeId, id))
        .orderBy(desc(workplaceEmploymentHistory.changedAt))
      return { history: rows }
    })
}
