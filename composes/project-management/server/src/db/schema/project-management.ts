// Project Management Compose — detail tables (prefixed `pjm_`).
//
// Reuses shared master tables: parties (clients), actors (users/members),
// documents/attachments (project files), activities, notifications, analytics.
//
// Work Item is the unified model for Epic, Story, Task, Subtask, Bug.
// Hierarchy uses `parentId`. Board columns are customizable but each maps
// to a fixed reporting category.

import { pgTable, text, timestamp, jsonb, integer, index, baseColumns } from '@db/schema/helpers'
import { primaryKey } from 'drizzle-orm/pg-core'

// --- Portfolios -------------------------------------------------------------

export const pjmPortfolio = pgTable(
  'pjm_portfolios',
  {
    ...baseColumns,
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('active'), // active|archived
    ownerId: text('owner_id'), // → actors
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
  },
  (table) => [
    index('pjm_portfolios_org_idx').on(table.organizationId),
    index('pjm_portfolios_org_status_idx').on(table.organizationId, table.status),
  ],
)

export const pjmPortfolioMember = pgTable(
  'pjm_portfolio_members',
  {
    ...baseColumns,
    portfolioId: text('portfolio_id').notNull(), // → pjm_portfolios
    actorId: text('actor_id').notNull(), // → actors
    role: text('role').notNull().default('viewer'), // admin|manager|member|viewer
  },
  (table) => [
    primaryKey({ columns: [table.portfolioId, table.actorId] }),
    index('pjm_portfolio_members_org_idx').on(table.organizationId, table.portfolioId),
  ],
)

// --- Projects ---------------------------------------------------------------

export const pjmProject = pgTable(
  'pjm_projects',
  {
    ...baseColumns,
    key: text('key').notNull(), // human-readable key e.g. "PROJ-1"
    name: text('name').notNull(),
    description: text('description'),
    portfolioId: text('portfolio_id'), // → pjm_portfolios
    type: text('type').notNull().default('kanban'), // scrum|kanban|waterfall|general
    status: text('status').notNull().default('active'), // proposed|active|on_hold|completed|cancelled
    ownerId: text('owner_id'), // → actors (PM)
    clientId: text('client_id'), // → parties
    startDate: timestamp('start_date'),
    targetEndDate: timestamp('target_end_date'),
    actualEndDate: timestamp('actual_end_date'),
    defaultBoardId: text('default_board_id'), // → pjm_boards
    sequence: integer('sequence').notNull().default(0), // auto-increment per project for work item keys
    archivedAt: timestamp('archived_at'),
  },
  (table) => [
    index('pjm_projects_org_idx').on(table.organizationId),
    index('pjm_projects_org_key_idx').on(table.organizationId, table.key),
    index('pjm_projects_org_portfolio_idx').on(table.organizationId, table.portfolioId),
  ],
)

export const pjmProjectMember = pgTable(
  'pjm_project_members',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    actorId: text('actor_id').notNull(), // → actors
    role: text('role').notNull().default('member'), // admin|manager|member|viewer
    hourlyRate: integer('hourly_rate'), // override rate in cents
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.actorId] }),
    index('pjm_project_members_org_idx').on(table.organizationId, table.projectId),
  ],
)

export const pjmProjectGuest = pgTable(
  'pjm_project_guests',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    actorId: text('actor_id').notNull(), // → actors (guest user)
  },
  (table) => [primaryKey({ columns: [table.projectId, table.actorId] })],
)

// --- Milestones -------------------------------------------------------------

export const pjmMilestone = pgTable(
  'pjm_milestones',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'), // pending|in_progress|completed|cancelled
    dueDate: timestamp('due_date'),
    completedAt: timestamp('completed_at'),
    approvalRequired: jsonb('approval_required').$type<boolean>().default(false),
    approvedById: text('approved_by_id'), // → actors (guest or internal)
    approvedAt: timestamp('approved_at'),
  },
  (table) => [index('pjm_milestones_org_project_idx').on(table.organizationId, table.projectId)],
)

export const pjmMilestoneDependency = pgTable(
  'pjm_milestone_dependencies',
  {
    ...baseColumns,
    milestoneId: text('milestone_id').notNull(), // → pjm_milestones
    dependsOnId: text('depends_on_id').notNull(), // → pjm_milestones
  },
  (table) => [primaryKey({ columns: [table.milestoneId, table.dependsOnId] })],
)

// --- Sprints ----------------------------------------------------------------

export const pjmSprint = pgTable(
  'pjm_sprints',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    name: text('name').notNull(),
    goal: text('goal'),
    status: text('status').notNull().default('planning'), // planning|active|completed|cancelled
    capacity: integer('capacity'), // total planned hours
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    completedAt: timestamp('completed_at'),
    sequence: integer('sequence').notNull().default(1),
  },
  (table) => [
    index('pjm_sprints_org_project_idx').on(table.organizationId, table.projectId),
    index('pjm_sprints_org_status_idx').on(table.organizationId, table.status),
  ],
)

// --- Work Items (unified: Epic, Story, Task, Subtask, Bug) ------------------

export const pjmWorkItem = pgTable(
  'pjm_work_items',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    sequence: integer('sequence').notNull(), // auto-increment within project
    ref: text('ref').notNull(), // computed: {project.key}-{sequence}
    type: text('type').notNull(), // epic|story|task|subtask|bug
    title: text('title').notNull(),
    description: text('description'),
    acceptanceCriteria: text('acceptance_criteria'),
    parentId: text('parent_id'), // → pjm_work_items (hierarchy)
    epicId: text('epic_id'), // → pjm_work_items (direct epic link)
    sprintId: text('sprint_id'), // → pjm_sprints
    milestoneId: text('milestone_id'), // → pjm_milestones
    boardColumnId: text('board_column_id'), // → pjm_board_columns
    reportingCategory: text('reporting_category'), // denormalized: backlog|todo|in_progress|review|done
    priority: text('priority').notNull().default('medium'), // critical|high|medium|low|none
    resolution: text('resolution'), // done|wont_do|duplicate|cannot_reproduce
    reporterId: text('reporter_id'), // → actors
    creatorId: text('creator_id'), // → actors
    storyPoints: integer('story_points'),
    originalEstimate: integer('original_estimate'), // minutes
    remainingEstimate: integer('remaining_estimate'), // minutes
    loggedTime: integer('logged_time').notNull().default(0), // minutes, computed from worklogs
    plannedStartDate: timestamp('planned_start_date'),
    startDate: timestamp('start_date'),
    dueDate: timestamp('due_date'),
    actualStartDate: timestamp('actual_start_date'),
    completedAt: timestamp('completed_at'),
    recurrenceRule: text('recurrence_rule'), // RFC 5545 RRULE
    progress: integer('progress').notNull().default(0), // 0-100
    archivedAt: timestamp('archived_at'),
    order: integer('order').notNull().default(0), // display order within column/sprint
  },
  (table) => [
    index('pjm_work_items_org_project_idx').on(table.organizationId, table.projectId),
    index('pjm_work_items_org_ref_idx').on(table.organizationId, table.ref),
    index('pjm_work_items_org_type_idx').on(table.organizationId, table.type),
    index('pjm_work_items_org_sprint_idx').on(table.organizationId, table.sprintId),
    index('pjm_work_items_org_column_idx').on(table.organizationId, table.boardColumnId),
    index('pjm_work_items_org_epic_idx').on(table.organizationId, table.epicId),
    index('pjm_work_items_org_parent_idx').on(table.organizationId, table.parentId),
    index('pjm_work_items_org_assignee_idx').on(table.organizationId),
  ],
)

// --- Work Item Relationships ------------------------------------------------

export const pjmWorkItemAssignment = pgTable(
  'pjm_work_item_assignments',
  {
    ...baseColumns,
    workItemId: text('work_item_id').notNull(), // → pjm_work_items
    actorId: text('actor_id').notNull(), // → actors
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    unassignedAt: timestamp('unassigned_at'), // null = currently assigned
    assignedById: text('assigned_by_id'), // → actors
  },
  (table) => [
    index('pjm_wi_assignments_org_wi_idx').on(table.organizationId, table.workItemId),
    index('pjm_wi_assignments_org_actor_idx').on(table.organizationId, table.actorId),
  ],
)

export const pjmWorkItemWatcher = pgTable(
  'pjm_work_item_watchers',
  {
    ...baseColumns,
    workItemId: text('work_item_id').notNull(), // → pjm_work_items
    actorId: text('actor_id').notNull(), // → actors
  },
  (table) => [primaryKey({ columns: [table.workItemId, table.actorId] })],
)

export const pjmLabel = pgTable(
  'pjm_labels',
  {
    ...baseColumns,
    name: text('name').notNull(),
    color: text('color'), // hex color
  },
  (table) => [index('pjm_labels_org_idx').on(table.organizationId)],
)

export const pjmWorkItemLabel = pgTable(
  'pjm_work_item_labels',
  {
    ...baseColumns,
    workItemId: text('work_item_id').notNull(), // → pjm_work_items
    labelId: text('label_id').notNull(), // → pjm_labels
  },
  (table) => [primaryKey({ columns: [table.workItemId, table.labelId] })],
)

export const pjmWorkItemDependency = pgTable(
  'pjm_work_item_dependencies',
  {
    ...baseColumns,
    workItemId: text('work_item_id').notNull(), // → pjm_work_items
    dependsOnId: text('depends_on_id').notNull(), // → pjm_work_items
    type: text('type').notNull().default('blocks'), // blocks|related|duplicates
  },
  (table) => [
    primaryKey({ columns: [table.workItemId, table.dependsOnId] }),
    index('pjm_wi_deps_org_wi_idx').on(table.organizationId, table.workItemId),
  ],
)

export const pjmChecklistItem = pgTable(
  'pjm_checklist_items',
  {
    ...baseColumns,
    workItemId: text('work_item_id').notNull(), // → pjm_work_items
    text: text('text').notNull(),
    completed: jsonb('completed').$type<boolean>().default(false),
    completedById: text('completed_by_id'), // → actors
    completedAt: timestamp('completed_at'),
    order: integer('order').notNull().default(0),
  },
  (table) => [index('pjm_checklist_org_wi_idx').on(table.organizationId, table.workItemId)],
)

// --- Boards & Columns -------------------------------------------------------

export const pjmBoard = pgTable(
  'pjm_boards',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    name: text('name').notNull(),
    type: text('type').notNull().default('scrum'), // scrum|kanban|general
  },
  (table) => [index('pjm_boards_org_project_idx').on(table.organizationId, table.projectId)],
)

export const pjmBoardColumn = pgTable(
  'pjm_board_columns',
  {
    ...baseColumns,
    boardId: text('board_id').notNull(), // → pjm_boards
    name: text('name').notNull(),
    reportingCategory: text('reporting_category').notNull(), // backlog|todo|in_progress|review|done
    order: integer('order').notNull().default(0),
    color: text('color'),
    wipLimit: integer('wip_limit'),
    archivedAt: timestamp('archived_at'),
  },
  (table) => [index('pjm_board_cols_org_board_idx').on(table.organizationId, table.boardId)],
)

// --- Comments ---------------------------------------------------------------

export const pjmComment = pgTable(
  'pjm_comments',
  {
    ...baseColumns,
    workItemId: text('work_item_id').notNull(), // → pjm_work_items
    parentId: text('parent_id'), // → pjm_comments (threaded replies)
    authorId: text('author_id').notNull(), // → actors
    body: text('body').notNull(),
    isInternal: jsonb('is_internal').$type<boolean>().default(false), // hidden from guests
  },
  (table) => [index('pjm_comments_org_wi_idx').on(table.organizationId, table.workItemId)],
)

// --- Worklogs ---------------------------------------------------------------

export const pjmWorklog = pgTable(
  'pjm_worklogs',
  {
    ...baseColumns,
    workItemId: text('work_item_id').notNull(), // → pjm_work_items
    actorId: text('actor_id').notNull(), // → actors
    timeSpent: integer('time_spent').notNull(), // minutes
    description: text('description'),
    date: timestamp('date').notNull().defaultNow(),
    billable: jsonb('billable').$type<boolean>().default(true),
    approved: jsonb('approved').$type<boolean>().default(false),
    approvedById: text('approved_by_id'), // → actors
    approvedAt: timestamp('approved_at'),
    exportedToWorkplace: jsonb('exported_to_workplace').$type<boolean>().default(false),
  },
  (table) => [
    index('pjm_worklogs_org_wi_idx').on(table.organizationId, table.workItemId),
    index('pjm_worklogs_org_actor_idx').on(table.organizationId, table.actorId),
  ],
)

// --- Pull Request Links (manual) --------------------------------------------

export const pjmPullRequestLink = pgTable(
  'pjm_pull_request_links',
  {
    ...baseColumns,
    workItemId: text('work_item_id').notNull(), // → pjm_work_items
    url: text('url').notNull(),
    title: text('title'),
    source: text('source').notNull().default('manual'), // manual|github|gitlab
  },
  (table) => [index('pjm_pr_links_org_wi_idx').on(table.organizationId, table.workItemId)],
)

// --- Client Approvals -------------------------------------------------------

export const pjmApproval = pgTable(
  'pjm_approvals',
  {
    ...baseColumns,
    entityType: text('entity_type').notNull(), // milestone|deliverable|billing_draft
    entityId: text('entity_id').notNull(), // → corresponding record
    requestedById: text('requested_by_id'), // → actors
    approvedById: text('approved_by_id'), // → actors (guest or internal)
    status: text('status').notNull().default('pending'), // pending|approved|rejected
    comment: text('comment'),
    approvedAt: timestamp('approved_at'),
  },
  (table) => [
    index('pjm_approvals_org_entity_idx').on(
      table.organizationId,
      table.entityType,
      table.entityId,
    ),
  ],
)

// --- PSA: Rate Cards --------------------------------------------------------

export const pjmRateCard = pgTable(
  'pjm_rate_cards',
  {
    ...baseColumns,
    name: text('name').notNull(),
    defaultHourlyRate: integer('default_hourly_rate').notNull(), // cents per hour
  },
  (table) => [index('pjm_rate_cards_org_idx').on(table.organizationId)],
)

export const pjmMemberRate = pgTable(
  'pjm_member_rates',
  {
    ...baseColumns,
    rateCardId: text('rate_card_id').notNull(), // → pjm_rate_cards
    role: text('role'), // role-based rate (admin|manager|member)
    actorId: text('actor_id'), // member-specific override rate
    hourlyRate: integer('hourly_rate').notNull(), // cents per hour
    effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
    effectiveTo: timestamp('effective_to'),
  },
  (table) => [index('pjm_member_rates_org_card_idx').on(table.organizationId, table.rateCardId)],
)

// --- PSA: Budgets -----------------------------------------------------------

export const pjmBudget = pgTable(
  'pjm_budgets',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    name: text('name').notNull(),
    type: text('type').notNull().default('fixed_fee'), // fixed_fee|time_and_materials|retainer|mixed
    totalAmount: integer('total_amount'), // total budget in cents
    currency: text('currency').notNull().default('USD'),
    approvedById: text('approved_by_id'), // → actors
  },
  (table) => [index('pjm_budgets_org_project_idx').on(table.organizationId, table.projectId)],
)

export const pjmBudgetPeriod = pgTable(
  'pjm_budget_periods',
  {
    ...baseColumns,
    budgetId: text('budget_id').notNull(), // → pjm_budgets
    name: text('name').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    amount: integer('amount').notNull(), // cents
  },
  (table) => [index('pjm_budget_periods_org_budget_idx').on(table.organizationId, table.budgetId)],
)

// --- PSA: Retainers ---------------------------------------------------------

export const pjmRetainer = pgTable(
  'pjm_retainers',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    clientId: text('client_id'), // → parties
    name: text('name').notNull(),
    totalUnits: integer('total_units').notNull(), // hours
    usedUnits: integer('used_units').notNull().default(0), // consumed hours
    unitPrice: integer('unit_price').notNull(), // cents per hour
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    status: text('status').notNull().default('active'), // active|exhausted|cancelled
  },
  (table) => [index('pjm_retainers_org_project_idx').on(table.organizationId, table.projectId)],
)

export const pjmRetainerUsage = pgTable(
  'pjm_retainer_usage',
  {
    ...baseColumns,
    retainerId: text('retainer_id').notNull(), // → pjm_retainers
    worklogId: text('worklog_id'), // → pjm_worklogs
    units: integer('units').notNull(), // hours consumed
    date: timestamp('date').notNull().defaultNow(),
  },
  (table) => [
    index('pjm_retainer_usage_org_retainer_idx').on(table.organizationId, table.retainerId),
  ],
)

// --- PSA: Billing -----------------------------------------------------------

export const pjmBillingSchedule = pgTable(
  'pjm_billing_schedules',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    name: text('name').notNull(),
    type: text('type').notNull().default('time_and_materials'), // fixed_fee|time_and_materials|retainer|milestone
    frequency: text('frequency'), // monthly|weekly|on_completion|milestone
    nextRunDate: timestamp('next_run_date'),
  },
  (table) => [
    index('pjm_billing_schedules_org_project_idx').on(table.organizationId, table.projectId),
  ],
)

export const pjmBillingDraft = pgTable(
  'pjm_billing_drafts',
  {
    ...baseColumns,
    projectId: text('project_id').notNull(), // → pjm_projects
    clientId: text('client_id'), // → parties
    scheduleId: text('schedule_id'), // → pjm_billing_schedules
    periodStart: timestamp('period_start'),
    periodEnd: timestamp('period_end'),
    totalAmount: integer('total_amount').notNull().default(0), // cents
    status: text('status').notNull().default('draft'), // draft|review|approved|exported
    approvedById: text('approved_by_id'), // → actors (client guest or internal)
    approvedAt: timestamp('approved_at'),
    exportedToErpAt: timestamp('exported_to_erp_at'),
  },
  (table) => [
    index('pjm_billing_drafts_org_project_idx').on(table.organizationId, table.projectId),
    index('pjm_billing_drafts_org_status_idx').on(table.organizationId, table.status),
  ],
)

export const pjmBillingLine = pgTable(
  'pjm_billing_lines',
  {
    ...baseColumns,
    draftId: text('draft_id').notNull(), // → pjm_billing_drafts
    description: text('description').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: integer('unit_price').notNull(), // cents
    totalAmount: integer('total_amount').notNull(), // cents, quantity * unitPrice
    worklogId: text('worklog_id'), // → pjm_worklogs (source)
    type: text('type').notNull().default('time'), // time|fixed_fee|retainer|expense|other
  },
  (table) => [index('pjm_billing_lines_org_draft_idx').on(table.organizationId, table.draftId)],
)

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type PjmPortfolio = typeof pjmPortfolio.$inferSelect
export type PjmPortfolioMember = typeof pjmPortfolioMember.$inferSelect
export type PjmProject = typeof pjmProject.$inferSelect
export type PjmProjectMember = typeof pjmProjectMember.$inferSelect
export type PjmProjectGuest = typeof pjmProjectGuest.$inferSelect
export type PjmMilestone = typeof pjmMilestone.$inferSelect
export type PjmSprint = typeof pjmSprint.$inferSelect
export type PjmWorkItem = typeof pjmWorkItem.$inferSelect
export type PjmWorkItemAssignment = typeof pjmWorkItemAssignment.$inferSelect
export type PjmWorkItemWatcher = typeof pjmWorkItemWatcher.$inferSelect
export type PjmLabel = typeof pjmLabel.$inferSelect
export type PjmWorkItemLabel = typeof pjmWorkItemLabel.$inferSelect
export type PjmWorkItemDependency = typeof pjmWorkItemDependency.$inferSelect
export type PjmChecklistItem = typeof pjmChecklistItem.$inferSelect
export type PjmBoard = typeof pjmBoard.$inferSelect
export type PjmBoardColumn = typeof pjmBoardColumn.$inferSelect
export type PjmComment = typeof pjmComment.$inferSelect
export type PjmWorklog = typeof pjmWorklog.$inferSelect
export type PjmPullRequestLink = typeof pjmPullRequestLink.$inferSelect
export type PjmApproval = typeof pjmApproval.$inferSelect
export type PjmRateCard = typeof pjmRateCard.$inferSelect
export type PjmMemberRate = typeof pjmMemberRate.$inferSelect
export type PjmBudget = typeof pjmBudget.$inferSelect
export type PjmBudgetPeriod = typeof pjmBudgetPeriod.$inferSelect
export type PjmRetainer = typeof pjmRetainer.$inferSelect
export type PjmRetainerUsage = typeof pjmRetainerUsage.$inferSelect
export type PjmBillingSchedule = typeof pjmBillingSchedule.$inferSelect
export type PjmBillingDraft = typeof pjmBillingDraft.$inferSelect
export type PjmBillingLine = typeof pjmBillingLine.$inferSelect
