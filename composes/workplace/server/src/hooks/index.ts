import { createDomainEvent, type EventBus } from '@core'
import { registerWorkflowHooks } from '../lib/workflow-orchestrator'

export function registerWorkplaceHooks(bus: EventBus) {
  registerWorkflowHooks(bus)

  bus.subscribe('workplace.payroll.approved', async (event: any) => {
    const payload = event.payload ?? event
    await bus.publish(
      createDomainEvent(
        'workplace.payroll.payroll-approved',
        payload.payrollRunId ?? payload.id ?? crypto.randomUUID(),
        'workplace.payroll',
        { payrollRunId: payload.payrollRunId, period: payload.period, totalNet: payload.totalNet },
        payload.orgId,
        { correlationId: payload.correlationId, source: 'workplace' },
      ),
    )
  })

  bus.subscribe('workplace.payroll.exported', async (event: any) => {
    const payload = event.payload ?? event
    await bus.publish(
      createDomainEvent(
        'erp.finance.post-payroll-je',
        payload.payrollRunId ?? payload.id ?? crypto.randomUUID(),
        'workplace.payroll',
        { payrollRunId: payload.payrollRunId, period: payload.period, totalNet: payload.totalNet },
        payload.orgId,
        { correlationId: payload.correlationId, source: 'workplace' },
      ),
    )
  })

  bus.subscribe('workplace.leave.requested', async (event: any) => {
    const payload = event.payload ?? event
    await bus.publish(
      createDomainEvent(
        'workplace.leave.submitted-for-approval',
        payload.leaveRequestId ?? payload.id ?? crypto.randomUUID(),
        'workplace.leave',
        {
          leaveRequestId: payload.leaveRequestId ?? payload.id,
          employeeId: payload.employeeId,
          days: payload.days,
        },
        payload.orgId,
        { correlationId: payload.correlationId, source: 'workplace' },
      ),
    )
  })
}
