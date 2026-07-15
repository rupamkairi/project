import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceEmployee,
  workplaceLeaveRequest,
  workplaceLeaveAllocation,
  workplaceAttendance,
  workplaceTimesheet,
  workplacePayslip,
  workplaceExpenseClaim,
  workplaceGoal,
  workplaceReview,
  workplaceFeedback,
  workplaceAnnouncement,
  workplacePolicy,
} from '../db/schema/workplace'
import { hasPermission } from '../permissions/matrix'

export function createMyWorkplaceRoutes(mediator: Mediator) {
  return (
    new Elysia({ prefix: '/my' })
      .get('/profile', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        return { employee: emp }
      })
      .get('/leave-balance', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        const balances = await db
          .select()
          .from(workplaceLeaveAllocation)
          .where(
            and(
              eq(workplaceLeaveAllocation.employeeId, emp.id),
              eq(workplaceLeaveAllocation.year, new Date().getFullYear()),
            ),
          )
        return { leaveBalances: balances }
      })
      .get('/leave-requests', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        const rows = await db
          .select()
          .from(workplaceLeaveRequest)
          .where(eq(workplaceLeaveRequest.employeeId, emp.id))
          .orderBy(desc(workplaceLeaveRequest.createdAt))
          .limit(50)
        return { leaveRequests: rows }
      })
      .get('/attendance', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        const rows = await db
          .select()
          .from(workplaceAttendance)
          .where(eq(workplaceAttendance.employeeId, emp.id))
          .orderBy(desc(workplaceAttendance.date))
          .limit(90)
        return { attendance: rows }
      })
      .get('/timesheets', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        const rows = await db
          .select()
          .from(workplaceTimesheet)
          .where(eq(workplaceTimesheet.employeeId, emp.id))
          .orderBy(desc(workplaceTimesheet.createdAt))
          .limit(20)
        return { timesheets: rows }
      })
      .get('/payslips', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        const rows = await db
          .select()
          .from(workplacePayslip)
          .where(
            and(eq(workplacePayslip.employeeId, emp.id), eq(workplacePayslip.status, 'published')),
          )
          .orderBy(desc(workplacePayslip.publishedAt))
          .limit(24)
        return { payslips: rows }
      })
      .get('/expenses', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        const rows = await db
          .select()
          .from(workplaceExpenseClaim)
          .where(eq(workplaceExpenseClaim.employeeId, emp.id))
          .orderBy(desc(workplaceExpenseClaim.createdAt))
          .limit(20)
        return { expenseClaims: rows }
      })
      .get('/goals', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        const rows = await db
          .select()
          .from(workplaceGoal)
          .where(eq(workplaceGoal.employeeId, emp.id))
          .orderBy(desc(workplaceGoal.createdAt))
          .limit(20)
        return { goals: rows }
      })
      .get('/reviews', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }
        const rows = await db
          .select()
          .from(workplaceReview)
          .where(eq(workplaceReview.employeeId, emp.id))
          .orderBy(desc(workplaceReview.createdAt))
          .limit(10)
        return { reviews: rows }
      })
      .get('/announcements', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const rows = await db
          .select()
          .from(workplaceAnnouncement)
          .where(eq(workplaceAnnouncement.organizationId, actor.orgId))
          .orderBy(desc(workplaceAnnouncement.createdAt))
          .limit(20)
        return { announcements: rows }
      })
      .get('/policies', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const rows = await db
          .select()
          .from(workplacePolicy)
          .where(
            and(
              eq(workplacePolicy.organizationId, actor.orgId),
              eq(workplacePolicy.isActive, true),
            ),
          )
          .orderBy(desc(workplacePolicy.publishedAt))
          .limit(20)
        return { policies: rows }
      })
      // Manager approval inbox
      .get('/approvals', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const [emp] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.organizationId, actor.orgId),
              eq(workplaceEmployee.personId, actor.actorId),
            ),
          )
        if (!emp) {
          ;(ctx as any).set.status = 404
          return { error: 'Not an employee' }
        }

        // Find direct reports
        const directReports = await db
          .select()
          .from(workplaceEmployee)
          .where(eq(workplaceEmployee.managerId, emp.id))
        const reportIds = directReports.map((e) => e.id)

        // Pending leave requests from reports
        const leaveRequests =
          reportIds.length > 0
            ? await db
                .select()
                .from(workplaceLeaveRequest)
                .where(and(eq(workplaceLeaveRequest.status, 'submitted')))
                .limit(50)
            : []

        // Pending expense claims from reports
        const expenseClaims =
          reportIds.length > 0
            ? await db
                .select()
                .from(workplaceExpenseClaim)
                .where(and(eq(workplaceExpenseClaim.status, 'submitted')))
                .limit(50)
            : []

        // Pending timesheets from reports
        const timesheets =
          reportIds.length > 0
            ? await db
                .select()
                .from(workplaceTimesheet)
                .where(and(eq(workplaceTimesheet.status, 'submitted')))
                .limit(50)
            : []

        return {
          approvals: {
            leaveRequests,
            expenseClaims,
            timesheets,
          },
        }
      })
  )
}
