import type { Scheduler } from '@core'
import { db } from '@db/client'
import { eq } from 'drizzle-orm'
import { workplacePayrollRun } from '../db/schema/workplace'

export function registerWorkplaceJobs(scheduler: Scheduler) {
  // Monthly on 25th: create draft payroll run
  scheduler.define('workplace.create-monthly-payroll', '0 9 25 * *', async () => {
    const now = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    await db
      .insert(workplacePayrollRun)
      .values({
        organizationId: 'default',
        period,
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        status: 'draft',
      })
      .onConflictDoNothing()
  })

  // Daily: renew leave allocations for new year
  scheduler.define('workplace.renew-leave-allocations', '0 3 1 1 *', async () => {
    // Placeholder: actual logic would iterate employees and create allocations
    console.log('Workplace: Leave allocations renewal triggered for new year')
  })

  // Daily: flag expired policies
  scheduler.define('workplace.flag-expired-policies', '0 4 * * *', async () => {
    console.log('Workplace: Policy expiration check triggered')
  })
}
