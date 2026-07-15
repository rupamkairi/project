import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { generatePrefixedId } from '@core'

// ─── People ───────────────────────────────────────────────────────────────────

export const workplaceDepartment = pgTable(
  'workplace_departments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('dep')),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    code: text('code'),
    parentId: text('parent_id'),
    managerId: text('manager_id'),
  },
  (t) => [uniqueIndex('wkp_dept_org_name_idx').on(t.organizationId, t.name)],
)

export const workplacePosition = pgTable(
  'workplace_positions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('pos')),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    level: integer('level').default(1),
    departmentId: text('department_id').references(() => workplaceDepartment.id),
    isHead: boolean('is_head').default(false),
    headCount: integer('head_count').default(1),
    filledCount: integer('filled_count').default(0),
  },
  (t) => [uniqueIndex('wkp_pos_org_name_idx').on(t.organizationId, t.name)],
)

export const workplaceEmployee = pgTable(
  'workplace_employees',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('emp')),
    organizationId: text('organization_id').notNull(),
    personId: text('person_id').notNull(),
    employeeCode: text('employee_code'),
    positionId: text('position_id').references(() => workplacePosition.id),
    departmentId: text('department_id').references(() => workplaceDepartment.id),
    managerId: text('manager_id'),
    employmentType: text('employment_type').notNull().default('permanent'),
    employmentStatus: text('employment_status').notNull().default('preboarding'),
    joinDate: timestamp('join_date'),
    probationEndDate: timestamp('probation_end_date'),
    confirmationDate: timestamp('confirmation_date'),
    terminationDate: timestamp('termination_date'),
    terminationReason: text('termination_reason'),
    workSchedule: text('work_schedule').default('standard'),
    meta: jsonb('meta').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    uniqueIndex('wkp_emp_person_idx').on(t.personId, t.organizationId),
    index('wkp_emp_dept_idx').on(t.departmentId),
    index('wkp_emp_manager_idx').on(t.managerId),
  ],
)

export const workplaceEmploymentHistory = pgTable('workplace_employment_history', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('eh')),
  employeeId: text('employee_id')
    .notNull()
    .references(() => workplaceEmployee.id),
  organizationId: text('organization_id').notNull(),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedById: text('changed_by_id'),
  changedAt: timestamp('changed_at').defaultNow(),
  reason: text('reason'),
})

export const workplaceContract = pgTable('workplace_contracts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('cnt')),
  organizationId: text('organization_id').notNull(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => workplaceEmployee.id),
  type: text('type').notNull().default('permanent'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  probationMonths: integer('probation_months').default(6),
  noticePeriodDays: integer('notice_period_days').default(30),
  ctc: numeric('ctc', { precision: 12, scale: 2 }),
  documentId: text('document_id'),
  status: text('status').notNull().default('draft'),
  signedAt: timestamp('signed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Recruitment ──────────────────────────────────────────────────────────────

export const workplaceJobOpening = pgTable(
  'workplace_job_openings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('job')),
    organizationId: text('organization_id').notNull(),
    title: text('title').notNull(),
    positionId: text('position_id').references(() => workplacePosition.id),
    departmentId: text('department_id').references(() => workplaceDepartment.id),
    pipelineId: text('pipeline_id'),
    employmentType: text('employment_type').default('permanent'),
    headCount: integer('head_count').default(1),
    filledCount: integer('filled_count').default(0),
    minCtc: numeric('min_ctc', { precision: 12, scale: 2 }),
    maxCtc: numeric('max_ctc', { precision: 12, scale: 2 }),
    description: text('description'),
    requirements: jsonb('requirements').default([]),
    status: text('status').notNull().default('draft'),
    openedAt: timestamp('opened_at'),
    closedAt: timestamp('closed_at'),
    createdById: text('created_by_id'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('wkp_job_status_idx').on(t.status), index('wkp_job_dept_idx').on(t.departmentId)],
)

export const workplaceApplication = pgTable(
  'workplace_applications',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('app')),
    organizationId: text('organization_id').notNull(),
    jobOpeningId: text('job_opening_id')
      .notNull()
      .references(() => workplaceJobOpening.id),
    personId: text('person_id'),
    candidateName: text('candidate_name').notNull(),
    candidateEmail: text('candidate_email'),
    candidatePhone: text('candidate_phone'),
    resumeDocumentId: text('resume_document_id'),
    currentCtc: numeric('current_ctc', { precision: 12, scale: 2 }),
    expectedCtc: numeric('expected_ctc', { precision: 12, scale: 2 }),
    noticePeriodDays: integer('notice_period_days'),
    source: text('source'),
    stageId: text('stage_id'),
    status: text('status').notNull().default('screening'),
    appliedAt: timestamp('applied_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [index('wkp_app_job_idx').on(t.jobOpeningId), index('wkp_app_status_idx').on(t.status)],
)

export const workplaceInterview = pgTable(
  'workplace_interviews',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('ivw')),
    organizationId: text('organization_id').notNull(),
    applicationId: text('application_id')
      .notNull()
      .references(() => workplaceApplication.id),
    interviewerId: text('interviewer_id'),
    round: integer('round').default(1),
    type: text('type').notNull().default('technical'),
    scheduledAt: timestamp('scheduled_at'),
    durationMinutes: integer('duration_minutes').default(60),
    location: text('location'),
    meetingLink: text('meeting_link'),
    status: text('status').notNull().default('scheduled'),
    feedback: text('feedback'),
    rating: integer('rating'),
    recommendation: text('recommendation'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('wkp_ivw_app_idx').on(t.applicationId)],
)

export const workplaceOffer = pgTable('workplace_offers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('ofr')),
  organizationId: text('organization_id').notNull(),
  applicationId: text('application_id')
    .notNull()
    .references(() => workplaceApplication.id),
  positionId: text('position_id'),
  departmentId: text('department_id'),
  offeredCtc: numeric('offered_ctc', { precision: 12, scale: 2 }),
  joiningDate: timestamp('joining_date'),
  validityDays: integer('validity_days').default(7),
  documentId: text('document_id'),
  status: text('status').notNull().default('draft'),
  sentAt: timestamp('sent_at'),
  acceptedAt: timestamp('accepted_at'),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Work ─────────────────────────────────────────────────────────────────────

export const workplaceLeaveType = pgTable('workplace_leave_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('lt')),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  code: text('code'),
  maxDays: integer('max_days').default(0),
  isPaid: boolean('is_paid').default(true),
  isCarryForward: boolean('is_carry_forward').default(false),
  maxCarryForward: integer('max_carry_forward').default(0),
  requiresDocuments: boolean('requires_documents').default(false),
})

export const workplaceLeaveAllocation = pgTable(
  'workplace_leave_allocations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('la')),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    leaveTypeId: text('leave_type_id')
      .notNull()
      .references(() => workplaceLeaveType.id),
    organizationId: text('organization_id').notNull(),
    year: integer('year').notNull(),
    allocated: numeric('allocated', { precision: 5, scale: 1 }).notNull(),
    used: numeric('used', { precision: 5, scale: 1 }).default('0'),
    balance: numeric('balance', { precision: 5, scale: 1 }),
  },
  (t) => [uniqueIndex('wkp_la_emp_type_year_idx').on(t.employeeId, t.leaveTypeId, t.year)],
)

export const workplaceLeaveRequest = pgTable(
  'workplace_leave_requests',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('lr')),
    organizationId: text('organization_id').notNull(),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    leaveTypeId: text('leave_type_id')
      .notNull()
      .references(() => workplaceLeaveType.id),
    fromDate: timestamp('from_date').notNull(),
    toDate: timestamp('to_date').notNull(),
    days: numeric('days', { precision: 5, scale: 1 }).notNull(),
    halfDay: boolean('half_day').default(false),
    reason: text('reason'),
    documentId: text('document_id'),
    workflowInstanceId: text('workflow_instance_id'),
    status: text('status').notNull().default('draft'),
    approvedById: text('approved_by_id'),
    approvedAt: timestamp('approved_at'),
    rejectedReason: text('rejected_reason'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [index('wkp_lr_emp_idx').on(t.employeeId), index('wkp_lr_status_idx').on(t.status)],
)

export const workplaceShift = pgTable('workplace_shifts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('shf')),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  breakMinutes: integer('break_minutes').default(60),
  color: text('color'),
})

export const workplaceShiftAssignment = pgTable(
  'workplace_shift_assignments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('sha')),
    organizationId: text('organization_id').notNull(),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    shiftId: text('shift_id')
      .notNull()
      .references(() => workplaceShift.id),
    fromDate: timestamp('from_date').notNull(),
    toDate: timestamp('to_date'),
  },
  (t) => [index('wkp_sha_emp_idx').on(t.employeeId)],
)

export const workplaceAttendance = pgTable(
  'workplace_attendance',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('att')),
    organizationId: text('organization_id').notNull(),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    date: timestamp('date').notNull(),
    status: text('status').notNull(),
    shiftId: text('shift_id'),
    checkIn: timestamp('check_in'),
    checkOut: timestamp('check_out'),
    workHours: numeric('work_hours', { precision: 4, scale: 2 }),
    overtimeHours: numeric('overtime_hours', { precision: 4, scale: 2 }).default('0'),
    remarks: text('remarks'),
  },
  (t) => [
    uniqueIndex('wkp_att_emp_date_idx').on(t.employeeId, t.date),
    index('wkp_att_date_idx').on(t.date),
  ],
)

export const workplaceTimesheet = pgTable(
  'workplace_timesheets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('ts')),
    organizationId: text('organization_id').notNull(),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    weekStartDate: timestamp('week_start_date').notNull(),
    weekEndDate: timestamp('week_end_date').notNull(),
    totalHours: numeric('total_hours', { precision: 5, scale: 2 }).default('0'),
    billableHours: numeric('billable_hours', { precision: 5, scale: 2 }).default('0'),
    status: text('status').notNull().default('draft'),
    submittedAt: timestamp('submitted_at'),
    approvedById: text('approved_by_id'),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [uniqueIndex('wkp_ts_emp_week_idx').on(t.employeeId, t.weekStartDate)],
)

export const workplaceTimesheetEntry = pgTable('workplace_timesheet_entries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('tse')),
  timesheetId: text('timesheet_id')
    .notNull()
    .references(() => workplaceTimesheet.id),
  date: timestamp('date').notNull(),
  projectId: text('project_id'),
  taskId: text('task_id'),
  description: text('description'),
  hours: numeric('hours', { precision: 4, scale: 2 }).notNull(),
  billable: boolean('billable').default(true),
})

// ─── Performance ──────────────────────────────────────────────────────────────

export const workplaceGoal = pgTable(
  'workplace_goals',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('gol')),
    organizationId: text('organization_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    type: text('type').notNull().default('individual'),
    employeeId: text('employee_id').references(() => workplaceEmployee.id),
    departmentId: text('department_id'),
    parentGoalId: text('parent_goal_id'),
    category: text('category'),
    weight: numeric('weight', { precision: 5, scale: 2 }),
    targetValue: numeric('target_value', { precision: 10, scale: 2 }),
    currentValue: numeric('current_value', { precision: 10, scale: 2 }),
    unit: text('unit'),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    status: text('status').notNull().default('active'),
    progress: numeric('progress', { precision: 5, scale: 2 }).default('0'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('wkp_gol_emp_idx').on(t.employeeId)],
)

export const workplaceReviewCycle = pgTable('workplace_review_cycles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('rc')),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('annual'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  selfReviewDeadline: timestamp('self_review_deadline'),
  managerReviewDeadline: timestamp('manager_review_deadline'),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const workplaceReview = pgTable(
  'workplace_reviews',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('rev')),
    organizationId: text('organization_id').notNull(),
    reviewCycleId: text('review_cycle_id')
      .notNull()
      .references(() => workplaceReviewCycle.id),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    reviewerId: text('reviewer_id'),
    type: text('type').notNull(),
    status: text('status').notNull().default('pending'),
    overallRating: numeric('overall_rating', { precision: 3, scale: 2 }),
    strengths: text('strengths'),
    improvements: text('improvements'),
    comments: text('comments'),
    submittedAt: timestamp('submitted_at'),
    acknowledgedAt: timestamp('acknowledged_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [uniqueIndex('wkp_rev_cycle_emp_type_idx').on(t.reviewCycleId, t.employeeId, t.type)],
)

export const workplaceReviewCriteria = pgTable('workplace_review_criteria', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('rvc')),
  reviewId: text('review_id')
    .notNull()
    .references(() => workplaceReview.id),
  category: text('category').notNull(),
  name: text('name').notNull(),
  weight: numeric('weight', { precision: 5, scale: 2 }),
  rating: numeric('rating', { precision: 3, scale: 2 }),
  comment: text('comment'),
})

export const workplaceFeedback = pgTable('workplace_feedback', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('fb')),
  organizationId: text('organization_id').notNull(),
  fromEmployeeId: text('from_employee_id')
    .notNull()
    .references(() => workplaceEmployee.id),
  toEmployeeId: text('to_employee_id')
    .notNull()
    .references(() => workplaceEmployee.id),
  context: text('context'),
  feedback: text('feedback').notNull(),
  isAnonymous: boolean('is_anonymous').default(false),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Payroll ──────────────────────────────────────────────────────────────────

export const workplacePayComponent = pgTable('workplace_pay_components', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('pc')),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  code: text('code'),
  type: text('type').notNull(),
  isTaxable: boolean('is_taxable').default(true),
  calculationMethod: text('calculation_method').default('formula'),
  formula: text('formula'),
  defaultValue: numeric('default_value', { precision: 12, scale: 2 }),
})

export const workplaceSalaryStructure = pgTable('workplace_salary_structures', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('ss')),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false),
  components: jsonb('components').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const workplaceEmployeeCompensation = pgTable(
  'workplace_employee_compensation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('ec')),
    organizationId: text('organization_id').notNull(),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    structureId: text('structure_id').references(() => workplaceSalaryStructure.id),
    ctc: numeric('ctc', { precision: 12, scale: 2 }).notNull(),
    effectiveFrom: timestamp('effective_from').notNull(),
    effectiveTo: timestamp('effective_to'),
    bankAccount: text('bank_account'),
    bankName: text('bank_name'),
    bankIfsc: text('bank_ifsc'),
    pan: text('pan'),
    pfNo: text('pf_no'),
    esiNo: text('esi_no'),
    uan: text('uan'),
    active: boolean('active').default(true),
    updatedById: text('updated_by_id'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('wkp_ec_emp_idx').on(t.employeeId)],
)

export const workplacePayrollRun = pgTable(
  'workplace_payroll_runs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('pr')),
    organizationId: text('organization_id').notNull(),
    period: text('period').notNull(),
    periodStart: timestamp('period_start'),
    periodEnd: timestamp('period_end'),
    status: text('status').notNull().default('draft'),
    workflowInstanceId: text('workflow_instance_id'),
    totalGross: numeric('total_gross', { precision: 15, scale: 2 }).default('0'),
    totalDeductions: numeric('total_deductions', { precision: 15, scale: 2 }).default('0'),
    totalNet: numeric('total_net', { precision: 15, scale: 2 }).default('0'),
    employeeCount: integer('employee_count').default(0),
    processedAt: timestamp('processed_at'),
    approvedAt: timestamp('approved_at'),
    approvedById: text('approved_by_id'),
    journalEntryId: text('journal_entry_id'),
    paymentExported: boolean('payment_exported').default(false),
    paymentExportedAt: timestamp('payment_exported_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [uniqueIndex('wkp_pr_org_period_idx').on(t.organizationId, t.period)],
)

export const workplacePayslip = pgTable(
  'workplace_payslips',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('ps')),
    organizationId: text('organization_id').notNull(),
    payrollRunId: text('payroll_run_id')
      .notNull()
      .references(() => workplacePayrollRun.id),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    compensationId: text('compensation_id').references(() => workplaceEmployeeCompensation.id),
    workingDays: integer('working_days').notNull(),
    presentDays: integer('present_days').notNull(),
    paidDays: integer('paid_days').notNull(),
    earnings: jsonb('earnings').notNull(),
    deductions: jsonb('deductions').notNull(),
    gross: numeric('gross', { precision: 15, scale: 2 }).notNull(),
    net: numeric('net', { precision: 15, scale: 2 }).notNull(),
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at'),
  },
  (t) => [
    index('wkp_ps_run_idx').on(t.payrollRunId),
    uniqueIndex('wkp_ps_run_emp_idx').on(t.payrollRunId, t.employeeId),
  ],
)

// ─── Office ───────────────────────────────────────────────────────────────────

export const workplaceExpenseClaim = pgTable(
  'workplace_expense_claims',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('exp')),
    organizationId: text('organization_id').notNull(),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').default('INR'),
    status: text('status').notNull().default('draft'),
    workflowInstanceId: text('workflow_instance_id'),
    submittedAt: timestamp('submitted_at'),
    approvedAt: timestamp('approved_at'),
    approvedById: text('approved_by_id'),
    rejectedReason: text('rejected_reason'),
    paidAt: timestamp('paid_at'),
    journalEntryId: text('journal_entry_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [index('wkp_exp_emp_idx').on(t.employeeId), index('wkp_exp_status_idx').on(t.status)],
)

export const workplaceExpenseItem = pgTable('workplace_expense_items', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('exi')),
  claimId: text('claim_id')
    .notNull()
    .references(() => workplaceExpenseClaim.id),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('INR'),
  documentId: text('document_id'),
  billable: boolean('billable').default(false),
})

export const workplaceAsset = pgTable('workplace_assets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('ast')),
  organizationId: text('organization_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  status: text('status').default('available'),
  purchaseDate: timestamp('purchase_date'),
  purchaseCost: numeric('purchase_cost', { precision: 15, scale: 2 }),
  serialNumber: text('serial_number'),
  model: text('model'),
  locationId: text('location_id'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const workplaceAssetAssignment = pgTable(
  'workplace_asset_assignments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('asa')),
    organizationId: text('organization_id').notNull(),
    assetId: text('asset_id')
      .notNull()
      .references(() => workplaceAsset.id),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    assignedAt: timestamp('assigned_at').defaultNow(),
    expectedReturnAt: timestamp('expected_return_at'),
    returnedAt: timestamp('returned_at'),
    condition: text('condition'),
    notes: text('notes'),
  },
  (t) => [index('wkp_asa_asset_idx').on(t.assetId), index('wkp_asa_emp_idx').on(t.employeeId)],
)

export const workplacePolicy = pgTable('workplace_policies', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('pol')),
  organizationId: text('organization_id').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  version: integer('version').default(1),
  content: text('content'),
  documentId: text('document_id'),
  isActive: boolean('is_active').default(true),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const workplacePolicyAcknowledgement = pgTable(
  'workplace_policy_acknowledgements',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('pak')),
    organizationId: text('organization_id').notNull(),
    policyId: text('policy_id')
      .notNull()
      .references(() => workplacePolicy.id),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    acknowledgedAt: timestamp('acknowledged_at').defaultNow(),
    ipAddress: text('ip_address'),
  },
  (t) => [uniqueIndex('wkp_pak_policy_emp_idx').on(t.policyId, t.employeeId)],
)

export const workplaceAnnouncement = pgTable(
  'workplace_announcements',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('ann')),
    organizationId: text('organization_id').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    category: text('category').default('general'),
    priority: text('priority').default('normal'),
    postedById: text('posted_by_id'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('wkp_ann_org_date_idx').on(t.organizationId, t.createdAt)],
)

export const workplaceVisitor = pgTable(
  'workplace_visitors',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('vis')),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    company: text('company'),
    hostEmployeeId: text('host_employee_id').references(() => workplaceEmployee.id),
    purpose: text('purpose').notNull(),
    checkIn: timestamp('check_in'),
    checkOut: timestamp('check_out'),
    badgeNumber: text('badge_number'),
    status: text('status').notNull().default('expected'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('wkp_vis_host_idx').on(t.hostEmployeeId)],
)

export const workplaceRoom = pgTable('workplace_rooms', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generatePrefixedId('rm')),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  floor: text('floor'),
  capacity: integer('capacity').default(1),
  locationId: text('location_id'),
  amenities: jsonb('amenities').default([]),
  isActive: boolean('is_active').default(true),
})

export const workplaceRoomBooking = pgTable(
  'workplace_room_bookings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generatePrefixedId('rb')),
    organizationId: text('organization_id').notNull(),
    roomId: text('room_id')
      .notNull()
      .references(() => workplaceRoom.id),
    employeeId: text('employee_id')
      .notNull()
      .references(() => workplaceEmployee.id),
    title: text('title').notNull(),
    fromTime: timestamp('from_time').notNull(),
    toTime: timestamp('to_time').notNull(),
    attendees: jsonb('attendees').default([]),
    status: text('status').notNull().default('confirmed'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('wkp_rb_room_time_idx').on(t.roomId, t.fromTime, t.toTime)],
)

// ─── Type exports ─────────────────────────────────────────────────────────────

export type WorkplaceDepartment = typeof workplaceDepartment.$inferSelect
export type WorkplacePosition = typeof workplacePosition.$inferSelect
export type WorkplaceEmployee = typeof workplaceEmployee.$inferSelect
export type WorkplaceEmploymentHistory = typeof workplaceEmploymentHistory.$inferSelect
export type WorkplaceContract = typeof workplaceContract.$inferSelect
export type WorkplaceJobOpening = typeof workplaceJobOpening.$inferSelect
export type WorkplaceApplication = typeof workplaceApplication.$inferSelect
export type WorkplaceInterview = typeof workplaceInterview.$inferSelect
export type WorkplaceOffer = typeof workplaceOffer.$inferSelect
export type WorkplaceLeaveType = typeof workplaceLeaveType.$inferSelect
export type WorkplaceLeaveAllocation = typeof workplaceLeaveAllocation.$inferSelect
export type WorkplaceLeaveRequest = typeof workplaceLeaveRequest.$inferSelect
export type WorkplaceShift = typeof workplaceShift.$inferSelect
export type WorkplaceShiftAssignment = typeof workplaceShiftAssignment.$inferSelect
export type WorkplaceAttendance = typeof workplaceAttendance.$inferSelect
export type WorkplaceTimesheet = typeof workplaceTimesheet.$inferSelect
export type WorkplaceTimesheetEntry = typeof workplaceTimesheetEntry.$inferSelect
export type WorkplaceGoal = typeof workplaceGoal.$inferSelect
export type WorkplaceReviewCycle = typeof workplaceReviewCycle.$inferSelect
export type WorkplaceReview = typeof workplaceReview.$inferSelect
export type WorkplaceReviewCriteria = typeof workplaceReviewCriteria.$inferSelect
export type WorkplaceFeedback = typeof workplaceFeedback.$inferSelect
export type WorkplacePayComponent = typeof workplacePayComponent.$inferSelect
export type WorkplaceSalaryStructure = typeof workplaceSalaryStructure.$inferSelect
export type WorkplaceEmployeeCompensation = typeof workplaceEmployeeCompensation.$inferSelect
export type WorkplacePayrollRun = typeof workplacePayrollRun.$inferSelect
export type WorkplacePayslip = typeof workplacePayslip.$inferSelect
export type WorkplaceExpenseClaim = typeof workplaceExpenseClaim.$inferSelect
export type WorkplaceExpenseItem = typeof workplaceExpenseItem.$inferSelect
export type WorkplaceAsset = typeof workplaceAsset.$inferSelect
export type WorkplaceAssetAssignment = typeof workplaceAssetAssignment.$inferSelect
export type WorkplacePolicy = typeof workplacePolicy.$inferSelect
export type WorkplacePolicyAcknowledgement = typeof workplacePolicyAcknowledgement.$inferSelect
export type WorkplaceAnnouncement = typeof workplaceAnnouncement.$inferSelect
export type WorkplaceVisitor = typeof workplaceVisitor.$inferSelect
export type WorkplaceRoom = typeof workplaceRoom.$inferSelect
export type WorkplaceRoomBooking = typeof workplaceRoomBooking.$inferSelect
