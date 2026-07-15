import { generateId } from '@core'
import { db } from '@db/client'
import { wfProcessTemplates } from '@db/schema/workflow'

const ORG_ID = process.env.SEED_ORG_ID ?? 'org_default'

const ONBOARDING_TEMPLATE = {
  name: 'Employee Onboarding',
  description: 'Standard new hire onboarding process',
  entityType: 'Employee',
  isActive: true,
  stages: [
    {
      id: 'preboarding',
      name: 'Pre-boarding',
      tasks: [
        { title: 'Send welcome email', assigneeRole: 'hr' },
        { title: 'Prepare workstation and equipment', assigneeRole: 'it' },
        { title: 'Create employee accounts (email, tools)', assigneeRole: 'it' },
        { title: 'Assign buddy/mentor', assigneeRole: 'manager' },
        { title: 'Prepare employee ID card', assigneeRole: 'hr' },
      ],
    },
    {
      id: 'first-day',
      name: 'First Day',
      tasks: [
        { title: 'Office tour and introductions', assigneeRole: 'hr' },
        { title: 'Issue laptop and equipment', assigneeRole: 'it' },
        { title: 'Complete HR paperwork', assigneeRole: 'hr' },
        { title: 'Manager 1:1 kickoff meeting', assigneeRole: 'manager' },
      ],
    },
    {
      id: 'first-week',
      name: 'First Week',
      tasks: [
        { title: 'Complete compliance training', assigneeRole: 'employee' },
        { title: 'Review team structure and workflows', assigneeRole: 'manager' },
        { title: 'Set up development environment', assigneeRole: 'it' },
        { title: 'Review job responsibilities and goals', assigneeRole: 'manager' },
      ],
    },
    {
      id: 'probation',
      name: 'Probation Period',
      tasks: [
        { title: '30-day check-in with manager', assigneeRole: 'manager' },
        { title: '60-day progress review', assigneeRole: 'manager' },
        { title: 'Probation completion review', assigneeRole: 'manager' },
      ],
    },
  ],
}

const OFFBOARDING_TEMPLATE = {
  name: 'Employee Offboarding',
  description: 'Standard employee exit process',
  entityType: 'Employee',
  isActive: true,
  stages: [
    {
      id: 'notice',
      name: 'Notice Period',
      tasks: [
        { title: 'Acknowledge resignation/termination', assigneeRole: 'hr' },
        { title: 'Conduct exit interview', assigneeRole: 'hr' },
        { title: 'Plan knowledge transfer', assigneeRole: 'manager' },
        { title: 'Notify IT of pending offboarding', assigneeRole: 'hr' },
      ],
    },
    {
      id: 'handover',
      name: 'Knowledge Handover',
      tasks: [
        { title: 'Document ongoing projects and handover', assigneeRole: 'employee' },
        { title: 'Transfer client/partner relationships', assigneeRole: 'manager' },
        { title: 'Update team documentation', assigneeRole: 'employee' },
      ],
    },
    {
      id: 'clearance',
      name: 'Clearance',
      tasks: [
        { title: 'Return company laptop and equipment', assigneeRole: 'it' },
        { title: 'Return ID card and access badge', assigneeRole: 'hr' },
        { title: 'Revoke system access and accounts', assigneeRole: 'it' },
        { title: 'Settle final salary and dues', assigneeRole: 'payroll' },
        { title: 'Collect relieving letter', assigneeRole: 'hr' },
      ],
    },
  ],
}

const LEAVE_APPROVAL_TEMPLATE = {
  name: 'Leave Approval',
  description: 'Standard leave request approval workflow',
  entityType: 'LeaveRequest',
  isActive: true,
  stages: [
    {
      id: 'manager-review',
      name: 'Manager Review',
      tasks: [{ title: 'Review leave request', assigneeRole: 'manager' }],
    },
    {
      id: 'hr-review',
      name: 'HR Review',
      tasks: [{ title: 'Verify leave balance and policy compliance', assigneeRole: 'hr' }],
    },
  ],
}

const EXPENSE_APPROVAL_TEMPLATE = {
  name: 'Expense Approval',
  description: 'Standard expense claim approval workflow',
  entityType: 'ExpenseClaim',
  isActive: true,
  stages: [
    {
      id: 'manager-approval',
      name: 'Manager Approval',
      tasks: [{ title: 'Review expense claim and receipts', assigneeRole: 'manager' }],
    },
    {
      id: 'finance-approval',
      name: 'Finance Approval',
      tasks: [
        { title: 'Verify expense policy compliance', assigneeRole: 'finance' },
        { title: 'Process reimbursement payment', assigneeRole: 'finance' },
      ],
    },
  ],
}

export async function seedWorkflowTemplates() {
  const templates = [
    ONBOARDING_TEMPLATE,
    OFFBOARDING_TEMPLATE,
    LEAVE_APPROVAL_TEMPLATE,
    EXPENSE_APPROVAL_TEMPLATE,
  ]

  for (const tpl of templates) {
    await db
      .insert(wfProcessTemplates)
      .values({
        id: generateId(),
        organizationId: ORG_ID,
        name: tpl.name,
        description: tpl.description,
        entityType: tpl.entityType,
        stages: tpl.stages,
        isActive: tpl.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        meta: {},
      })
      .onConflictDoNothing()
  }

  console.log(
    'Seeded workflow templates: onboarding, offboarding, leave-approval, expense-approval',
  )
}

export {
  ONBOARDING_TEMPLATE,
  OFFBOARDING_TEMPLATE,
  LEAVE_APPROVAL_TEMPLATE,
  EXPENSE_APPROVAL_TEMPLATE,
}
