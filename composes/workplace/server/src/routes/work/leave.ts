import { Elysia } from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceLeaveType,
  workplaceLeaveAllocation,
  workplaceLeaveRequest,
  workplaceEmployee,
} from '../../db/schema/workplace'
import { hasPermission, WORKPLACE_ROLES } from '../../permissions/matrix'

export function createLeaveRoutes(mediator: Mediator) {
  return new Elysia()
    .get('/leave-types', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:leave:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceLeaveType)
        .where(eq(workplaceLeaveType.organizationId, actor.orgId))
      return { leaveTypes: rows }
    })
    .post('/leave-types', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:leave:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [lt] = await db
        .insert(workplaceLeaveType)
        .values({
          organizationId: actor.orgId,
          name: body.name,
          code: body.code,
          maxDays: body.maxDays ?? 0,
          isPaid: body.isPaid ?? true,
          isCarryForward: body.isCarryForward ?? false,
          maxCarryForward: body.maxCarryForward ?? 0,
          requiresDocuments: body.requiresDocuments ?? false,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { leaveType: lt }
    })
    .get('/leave-allocations', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:leave:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { employeeId, year } = (ctx as any).query ?? {}
      const rows = await db
        .select()
        .from(workplaceLeaveAllocation)
        .where(
          and(
            eq(workplaceLeaveAllocation.organizationId, actor.orgId),
            employeeId ? eq(workplaceLeaveAllocation.employeeId, employeeId) : undefined,
            year
              ? eq(workplaceLeaveAllocation.year, Number(year))
              : eq(workplaceLeaveAllocation.year, new Date().getFullYear()),
          ),
        )
      return { allocations: rows }
    })
    .post('/leave-allocations', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:leave:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const allocated = Number(body.allocated)
      const [alloc] = await db
        .insert(workplaceLeaveAllocation)
        .values({
          employeeId: body.employeeId,
          leaveTypeId: body.leaveTypeId,
          organizationId: actor.orgId,
          year: body.year ?? new Date().getFullYear(),
          allocated: String(allocated),
          used: '0',
          balance: String(allocated),
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { allocation: alloc }
    })
    .get('/leave-requests', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:leave:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceLeaveRequest)
        .where(eq(workplaceLeaveRequest.organizationId, actor.orgId))
        .orderBy(desc(workplaceLeaveRequest.createdAt))
        .limit(500)
      return { leaveRequests: rows }
    })
    .post('/leave-requests', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const from = new Date(body.fromDate)
      const to = new Date(body.toDate)
      const diffTime = Math.abs(to.getTime() - from.getTime())
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

      const [lr] = await db
        .insert(workplaceLeaveRequest)
        .values({
          organizationId: actor.orgId,
          employeeId: body.employeeId,
          leaveTypeId: body.leaveTypeId,
          fromDate: from,
          toDate: to,
          days: String(days),
          halfDay: body.halfDay ?? false,
          reason: body.reason,
          status: 'draft',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { leaveRequest: lr }
    })
    .post('/leave-requests/:id/submit', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [lr] = await db
        .select()
        .from(workplaceLeaveRequest)
        .where(eq(workplaceLeaveRequest.id, id))
      if (!lr || lr.status !== 'draft') {
        ;(ctx as any).set.status = 400
        return { error: 'Request must be in draft status' }
      }
      const [alloc] = await db
        .select()
        .from(workplaceLeaveAllocation)
        .where(
          and(
            eq(workplaceLeaveAllocation.employeeId, lr.employeeId),
            eq(workplaceLeaveAllocation.leaveTypeId, lr.leaveTypeId),
            eq(workplaceLeaveAllocation.year, new Date(lr.fromDate).getFullYear()),
          ),
        )
      if (!alloc || Number(alloc.balance ?? 0) < Number(lr.days)) {
        ;(ctx as any).set.status = 400
        return {
          error: `Insufficient leave balance. Available: ${alloc?.balance ?? 0}, Required: ${lr.days}`,
        }
      }
      await db
        .update(workplaceLeaveRequest)
        .set({ status: 'submitted' })
        .where(eq(workplaceLeaveRequest.id, id))
      return { success: true, status: 'submitted' }
    })
    .post('/leave-requests/:id/approve', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:leave:approve')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [lr] = await db
        .select()
        .from(workplaceLeaveRequest)
        .where(eq(workplaceLeaveRequest.id, id))
      if (!lr || lr.status !== 'submitted') {
        ;(ctx as any).set.status = 400
        return { error: 'Request must be submitted first' }
      }
      await db.transaction(async (tx) => {
        const [alloc] = await tx
          .select()
          .from(workplaceLeaveAllocation)
          .where(
            and(
              eq(workplaceLeaveAllocation.employeeId, lr.employeeId),
              eq(workplaceLeaveAllocation.leaveTypeId, lr.leaveTypeId),
            ),
          )
        if (alloc) {
          const newUsed = Number(alloc.used ?? 0) + Number(lr.days)
          const newBalance = Number(alloc.allocated) - newUsed
          await tx
            .update(workplaceLeaveAllocation)
            .set({
              used: String(newUsed),
              balance: String(Math.max(0, newBalance)),
            })
            .where(eq(workplaceLeaveAllocation.id, alloc.id))
        }
        await tx
          .update(workplaceLeaveRequest)
          .set({
            status: 'approved',
            approvedById: actor.actorId,
            approvedAt: new Date(),
          })
          .where(eq(workplaceLeaveRequest.id, id))
      })
      return { success: true, status: 'approved' }
    })
    .post('/leave-requests/:id/reject', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:leave:approve')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceLeaveRequest)
        .set({
          status: 'rejected',
          rejectedReason: body.reason,
        })
        .where(eq(workplaceLeaveRequest.id, id))
      return { success: true, status: 'rejected' }
    })
}
