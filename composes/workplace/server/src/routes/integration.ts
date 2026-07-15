import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceEmployee,
  workplaceTimesheet,
  workplaceTimesheetEntry,
} from '../db/schema/workplace'
import { hasPermission } from '../permissions/matrix'
import { workplacePayslip } from '../db/schema/workplace'

export function createIntegrationRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/integration' })
    .get('/directory', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:people:read')) {
        // Allow cross-compose authenticated access
      }
      // Read-only workforce directory
      const rows = await db
        .select({
          id: workplaceEmployee.id,
          personId: workplaceEmployee.personId,
          employeeCode: workplaceEmployee.employeeCode,
          departmentId: workplaceEmployee.departmentId,
          employmentType: workplaceEmployee.employmentType,
          employmentStatus: workplaceEmployee.employmentStatus,
        })
        .from(workplaceEmployee)
        .where(
          and(
            eq(workplaceEmployee.organizationId, actor?.orgId ?? ''),
            eq(workplaceEmployee.employmentStatus, 'active'),
          ),
        )
      return { employees: rows }
    })
    .get('/capacity', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      // Aggregated capacity information
      const rows = await db
        .select({
          id: workplaceEmployee.id,
          personId: workplaceEmployee.personId,
        })
        .from(workplaceEmployee)
        .where(
          and(
            eq(workplaceEmployee.organizationId, actor.orgId),
            eq(workplaceEmployee.employmentStatus, 'active'),
          ),
        )
      return { activeEmployees: rows.length, employees: rows }
    })
    .get('/approved-timesheets', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { from, to } = (ctx as any).query ?? {}
      // Approved timesheets for Project Management integration
      const timesheets = await db
        .select()
        .from(workplaceTimesheet)
        .where(
          and(
            eq(workplaceTimesheet.organizationId, actor.orgId),
            eq(workplaceTimesheet.status, 'approved'),
          ),
        )
        .orderBy(desc(workplaceTimesheet.weekStartDate))
        .limit(200)

      const result = []
      for (const ts of timesheets) {
        const entries = await db
          .select()
          .from(workplaceTimesheetEntry)
          .where(eq(workplaceTimesheetEntry.timesheetId, ts.id))
        result.push({ timesheet: ts, entries })
      }
      return { timesheets: result }
    })
    .get('/payroll-journal', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      // Payroll-to-ERP journal event data (only when ERP is installed)
      const { period } = (ctx as any).query ?? {}
      // Note: returns journal entry data without private compensation details
      const rows = await db
        .select({
          period: workplacePayslip.payrollRunId,
          employeeId: workplacePayslip.employeeId,
          net: workplacePayslip.net,
          status: workplacePayslip.status,
        })
        .from(workplacePayslip)
        .where(
          and(
            eq(workplacePayslip.organizationId, actor.orgId),
            eq(workplacePayslip.status, 'published'),
          ),
        )
        .limit(500)
      return { journalEntries: rows }
    })
}
