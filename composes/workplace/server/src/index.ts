import { Elysia } from 'elysia'
import type { Mediator, EventBus, Scheduler } from '@core'

import { createDepartmentRoutes } from './routes/people/departments'
import { createPositionRoutes } from './routes/people/positions'
import { createEmployeeRoutes } from './routes/people/employees'
import { createContractRoutes } from './routes/people/contracts'

import { createJobOpeningRoutes } from './routes/recruitment/job-openings'
import { createApplicationRoutes } from './routes/recruitment/applications'

import { createLeaveRoutes } from './routes/work/leave'
import { createAttendanceRoutes } from './routes/work/attendance'
import { createTimesheetRoutes } from './routes/work/timesheets'
import { createShiftRoutes } from './routes/work/shifts'

import { createGoalRoutes } from './routes/performance/goals'
import { createReviewRoutes } from './routes/performance/reviews'

import { createCompensationRoutes } from './routes/payroll/compensation'
import { createPayrollRunRoutes } from './routes/payroll/payroll-runs'
import { createPayslipRoutes } from './routes/payroll/payslips'

import { createExpenseRoutes } from './routes/office/expenses'
import { createAssetRoutes } from './routes/office/assets'
import { createPolicyRoutes } from './routes/office/policies'
import {
  createAnnouncementRoutes,
  createVisitorRoutes,
  createRoomRoutes,
} from './routes/office/office'

import { createIntegrationRoutes } from './routes/integration'
import { createMyWorkplaceRoutes } from './routes/my-workplace'
import { createReportRoutes } from './routes/reports'
import { createSettingsRoutes } from './routes/settings'
import { createSetupRoutes } from './routes/setup'
import { createOnboardingRoutes } from './routes/onboarding'

import { registerWorkplaceHooks } from './hooks/index'
import { registerWorkplaceJobs } from './jobs/index'

export function createWorkplaceCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerWorkplaceHooks(bus)
  registerWorkplaceJobs(scheduler)

  return new Elysia({ prefix: '/workplace' })
    .use(createDepartmentRoutes(mediator))
    .use(createPositionRoutes(mediator))
    .use(createEmployeeRoutes(mediator, bus))
    .use(createContractRoutes(mediator))
    .use(createJobOpeningRoutes(mediator))
    .use(createApplicationRoutes(mediator, bus))
    .use(createLeaveRoutes(mediator))
    .use(createAttendanceRoutes(mediator))
    .use(createTimesheetRoutes(mediator))
    .use(createShiftRoutes(mediator))
    .use(createGoalRoutes(mediator))
    .use(createReviewRoutes(mediator))
    .use(createCompensationRoutes(mediator))
    .use(createPayrollRunRoutes(mediator))
    .use(createPayslipRoutes(mediator))
    .use(createExpenseRoutes(mediator))
    .use(createAssetRoutes(mediator))
    .use(createPolicyRoutes(mediator))
    .use(createAnnouncementRoutes(mediator))
    .use(createVisitorRoutes(mediator))
    .use(createRoomRoutes(mediator))
    .use(createIntegrationRoutes(mediator))
    .use(createMyWorkplaceRoutes(mediator))
    .use(createReportRoutes(mediator))
    .use(createSettingsRoutes(mediator))
    .use(createSetupRoutes(mediator))
    .use(createOnboardingRoutes(mediator))
}

export { seedWorkplace } from './db/seed/index'
export * from './db/schema/workplace'

export type WorkplaceApp = ReturnType<typeof createWorkplaceCompose>
