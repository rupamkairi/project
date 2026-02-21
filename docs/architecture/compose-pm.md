# Compose — Project Management

## Task Tracking, Sprint Planning, Time Logging & Client Delivery

---

## 1. Compose Overview

```
Compose ID:   project
Version:      1.0.0
Purpose:      Manage the full project delivery lifecycle — from project scoping
              and sprint planning through task execution, time tracking, and
              client reporting — for teams of any size.
Apps Served:  ProjectApp     → project board, backlog, sprint management
              TimeTrackerApp → time entry, billable hours, approvals
              ClientPortal   → read-only progress, milestone, document sharing
              ReportsApp     → burn-down, velocity, budget health, invoicing
              AdminApp       → team management, billing config, analytics
```

---

## 2. Module Selection & Configuration

```typescript
const ProjectCompose: ComposeDefinition = {
  id: "project",
  name: "Project Management",
  modules: [
    "identity", // Actors: PM, developer, designer, client — roles + permissions
    "ledger", // Project budgets, billable hours → invoices, cost tracking
    "workflow", // Task lifecycle, sprint review processes, approval chains
    "scheduling", // Milestones, sprint timelines, recurring standups
    "document", // Specs, design files, deliverables, SOW attachments
    "notification", // Task assignments, deadline alerts, digest emails, mentions
    "analytics", // Velocity, burn-down, utilization, budget health
  ],

  moduleConfig: {
    workflow: {
      processLabel: "Project Workflow",
      taskLabel: "Task",
      enableSubTasks: true,
      enableChecklists: true,
    },
    scheduling: {
      resourceLabel: "Team Member",
      slotLabel: "Sprint Window",
      enableRecurring: true, // for standup / retrospective scheduling
    },
    ledger: {
      baseCurrency: "USD",
      enableCostCenters: true, // one cost center per project
      defaultAccounts: {
        revenue: "ACC-PROJECT-REVENUE",
        labor: "ACC-LABOR-COST",
        expenses: "ACC-PROJECT-EXPENSES",
        receivable: "ACC-ACCOUNTS-RECEIVABLE",
      },
    },
    document: {
      enableVersioning: true,
      enableFolders: true, // folder per project
    },
  },
};
```

---

## 3. Actor Roles & Permission Matrix

| Role              | Who                                                            |
| ----------------- | -------------------------------------------------------------- |
| `project-admin`   | Platform administrator — full access, billing, team setup      |
| `project-manager` | Owns one or more projects — full control within their projects |
| `team-lead`       | Leads sub-team — manages tasks for own team, sees sprint board |
| `member`          | Developer / designer — owns assigned tasks, logs time          |
| `client`          | External stakeholder — read-only milestones, docs, progress    |
| `billing-manager` | Finance — time approvals, invoicing, budget visibility         |

```
                          project-admin  pm    team-lead  member  client  billing-mgr
──────────────────────────────────────────────────────────────────────────────────────
project:create                ✓          ✓        —         —       —          —
project:read                  ✓          ✓        ✓         ✓       ◑(own)     ✓
project:update                ✓          ✓        —         —       —          —
project:archive               ✓          ✓        —         —       —          —
project:delete                ✓          —        —         —       —          —

milestone:create              ✓          ✓        —         —       —          —
milestone:read                ✓          ✓        ✓         ✓       ✓          ✓
milestone:update              ✓          ✓        —         —       —          —

sprint:create                 ✓          ✓        ✓         —       —          —
sprint:read                   ✓          ✓        ✓         ✓       —          ✓
sprint:update                 ✓          ✓        ✓         —       —          —
sprint:complete               ✓          ✓        ✓         —       —          —

task:create                   ✓          ✓        ✓         ✓       —          —
task:read                     ✓          ✓        ✓         ✓       —          ✓
task:update                   ✓          ✓        ✓         ◑(own)  —          —
task:assign                   ✓          ✓        ✓         —       —          —
task:delete                   ✓          ✓        —         —       —          —
task:move-status              ✓          ✓        ✓         ✓       —          —

time-entry:create             ✓          ✓        ✓         ✓       —          —
time-entry:read               ✓          ✓        ✓         ◑(own)  —          ✓
time-entry:update             ✓          ✓        —         ◑(own)  —          —
time-entry:approve            ✓          ✓        ✓         —       —          ✓
time-entry:delete             ✓          ✓        —         ◑(own)  —          —

invoice:create                ✓          —        —         —       —          ✓
invoice:read                  ✓          ✓        —         —       ◑(own)     ✓
invoice:send                  ✓          —        —         —       —          ✓

document:upload               ✓          ✓        ✓         ✓       —          —
document:read                 ✓          ✓        ✓         ✓       ◑(shared)  ✓
document:delete               ✓          ✓        —         ◑(own)  —          —

analytics:read                ✓          ✓        ✓         —       —          ✓
budget:read                   ✓          ✓        —         —       —          ✓
budget:manage                 ✓          —        —         —       —          ✓
```

---

## 4. Entity Extensions

All entities below are Compose-level extensions. They are registered in the
`EntitySchemaRegistry` during ProjectCompose boot and live in the `project`
namespace.

---

### Project

```typescript
interface Project extends Entity {
  code: string; // 'PRJ-001' — auto-generated
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  ownerId: ID; // identity.Actor — Project Manager
  clientId?: ID; // identity.Actor — Client contact
  teamIds: ID[]; // identity.Actor[] — team members
  startDate: Timestamp;
  endDate: Timestamp;
  budget: Money;
  billingType: BillingType;
  hourlyRate?: Money; // for time-and-material projects
  completionPct: number; // 0–100, computed from tasks
  health: ProjectHealth; // green / amber / red — computed
  tags: string[];
  ledgerCostCenterId: ID; // ledger.CostCenter — auto-created on project creation
  documentFolderId: ID; // document.Folder — auto-created on project creation
}

type ProjectType =
  | "fixed-price"
  | "time-and-material"
  | "retainer"
  | "internal";
type BillingType = "hourly" | "fixed" | "milestone-based" | "non-billable";
type ProjectHealth = "green" | "amber" | "red" | "on-hold";
type ProjectStatus = "draft" | "active" | "on-hold" | "completed" | "archived";
```

**Project FSM:**

```
draft ──[project.activate]──► active
          (guard: startDate set, at least 1 team member)
          entry: [
            emit 'project.activated',
            dispatch 'notification.send' → team welcome,
            dispatch 'scheduling.createMilestoneTimeline'
          ]

active ──[project.put-on-hold]──► on-hold
          entry: [emit 'project.on-hold', notify team]

on-hold ──[project.resume]──► active

active ──[project.complete]──► completed
          guard: all milestones completed OR pm override with reason
          entry: [
            emit 'project.completed',
            dispatch 'project.generateCompletionReport',
            notify client + team
          ]

completed ──[project.archive]──► archived   (terminal)

any ──[project.archive]──► archived   guard: role = project-admin only
```

---

### Milestone

```typescript
interface Milestone extends Entity {
  projectId: ID;
  title: string;
  description?: string;
  dueDate: Timestamp;
  status: MilestoneStatus;
  linkedTaskIds: ID[]; // tasks that must be done for this milestone
  completionPct: number; // computed: done tasks / total linked tasks
  billingAmount?: Money; // for milestone-based billing — triggers invoice on completion
  notifyClientOnComplete: boolean;
}

type MilestoneStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "missed"
  | "cancelled";
```

**Milestone FSM:**

```
pending ──[milestone.start]──► in-progress
          (auto-triggered when first linked task moves to in-progress)

in-progress ──[milestone.complete]──► completed
          guard: all linkedTaskIds status = 'done'  OR  pm override
          entry: [
            emit 'milestone.completed',
            dispatch 'notification.send' → PM + client,
            if billingAmount: dispatch 'project.createMilestoneInvoice'
          ]

in-progress ──[milestone.miss]──► missed
          (auto-triggered by scheduler job when dueDate passes, status ≠ completed)
          entry: [emit 'milestone.missed', notify PM, flag project.health = amber]

missed ──[milestone.complete]──► completed   (late completion still allowed)

any ──[milestone.cancel]──► cancelled   guard: role = project-manager+
```

---

### Sprint

```typescript
interface Sprint extends Entity {
  projectId: ID;
  name: string; // 'Sprint 1', 'Sprint 2'
  goal?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: SprintStatus;
  capacity: number; // story points capacity for this sprint
  velocityActual?: number; // computed on sprint complete
  taskIds: ID[]; // tasks pulled into this sprint
}

type SprintStatus = "planned" | "active" | "completed" | "cancelled";
```

**Sprint FSM:**

```
planned ──[sprint.start]──► active
          guard: startDate <= today, no other sprint active in same project
          entry: [emit 'sprint.started', notify team]

active ──[sprint.complete]──► completed
          entry: [
            emit 'sprint.completed',
            dispatch 'project.snapshotVelocity',        // record velocityActual
            dispatch 'project.rollUnfinishedTasks',     // move incomplete → backlog
            dispatch 'notification.send' → sprint-review invite
          ]

active ──[sprint.cancel]──► cancelled
          guard: role = project-manager+
          entry: [dispatch 'project.rollUnfinishedTasks']
```

---

### Task

```typescript
interface Task extends Entity {
  projectId: ID;
  sprintId?: ID; // null = backlog
  milestoneId?: ID;
  parentTaskId?: ID; // for sub-tasks
  title: string;
  description?: string; // rich text / markdown
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: ID;
  reporterId: ID;
  storyPoints?: number;
  estimatedHours?: number;
  loggedHours: number; // computed: sum of TimeEntry.hours for this task
  dueDate?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  labelIds: string[];
  attachmentIds: ID[]; // document module refs
  checklistItems: ChecklistItem[];
  blockedBy: ID[]; // task IDs that block this task
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  checkedBy?: ID;
  checkedAt?: Timestamp;
}

type TaskType = "epic" | "story" | "task" | "bug" | "spike";
type TaskStatus =
  | "backlog"
  | "todo"
  | "in-progress"
  | "in-review"
  | "done"
  | "cancelled";
type TaskPriority = "critical" | "high" | "medium" | "low";
```

**Task FSM:**

```
backlog ──[task.plan]──► todo
          (when added to active sprint)

todo ──[task.start]──► in-progress
          guard: assigneeId set
          entry: [
            assign task.startedAt = now(),
            emit 'task.started'
          ]

in-progress ──[task.submit-review]──► in-review

in-review ──[task.approve]──► done
          entry: [
            assign task.completedAt = now(),
            emit 'task.completed',
            dispatch 'project.checkMilestoneProgress' if milestoneId set,
            dispatch 'project.checkSprintProgress'
          ]

in-review ──[task.reject]──► in-progress
          (reviewer sends it back with comment)

in-progress ──[task.block]──► in-progress  (status unchanged, blockedBy updated)

any ──[task.cancel]──► cancelled   guard: role = team-lead+
any ──[task.reopen]──► todo        guard: role = team-lead+, from done or cancelled
```

---

### TimeEntry

```typescript
interface TimeEntry extends Entity {
  taskId: ID;
  projectId: ID; // denormalized for query performance
  actorId: ID;
  date: Timestamp; // date of work (not created_at)
  hours: number; // decimal: 1.5 = 1h 30m
  description: string;
  billable: boolean;
  rate: Money; // hourly rate at time of entry — snapshot
  amount: Money; // computed: hours × rate
  status: TimeEntryStatus;
  approvedBy?: ID;
  approvedAt?: Timestamp;
  invoiceId?: ID; // set when included in an invoice
}

type TimeEntryStatus = "pending" | "approved" | "rejected" | "invoiced";
```

> TimeEntry is **append-only**. Entries can be corrected by creating a new
> entry with a negative delta and a reference to the original (same pattern as
> `ledger` journal entries). Approved + invoiced entries are immutable.

---

### ProjectInvoice

```typescript
interface ProjectInvoice extends Entity {
  invoiceNumber: string; // 'INV-PRJ001-001'
  projectId: ID;
  clientId: ID;
  type: InvoiceType;
  status: InvoiceStatus;
  periodStart?: Timestamp;
  periodEnd?: Timestamp;
  milestoneId?: ID; // for milestone-based invoices
  timeEntryIds: ID[]; // time entries included in this invoice
  lineItems: InvoiceLineItem[];
  subtotal: Money;
  tax: Money;
  total: Money;
  paidAmount: Money;
  dueDate: Timestamp;
  ledgerTransactionId?: ID;
  sentAt?: Timestamp;
  paidAt?: Timestamp;
}

interface InvoiceLineItem {
  description: string;
  qty: number;
  unitPrice: Money;
  amount: Money;
}

type InvoiceType = "time-and-material" | "milestone" | "fixed" | "retainer";
type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially-paid"
  | "paid"
  | "overdue"
  | "void";
```

**ProjectInvoice FSM:**

```
draft ──[invoice.send]──► sent
          entry: [
            emit 'invoice.sent',
            dispatch 'notification.send' → client,
            mark TimeEntries status = 'invoiced'
          ]

sent ──[invoice.mark-paid]──► paid
          entry: [
            emit 'invoice.paid',
            dispatch 'ledger.postTransaction' (revenue recognition),
            dispatch 'notification.send' → PM (payment confirmed)
          ]

sent ──[invoice.partial-payment]──► partially-paid
sent ──[invoice.overdue]──► overdue   (auto by scheduler)
overdue ──[invoice.mark-paid]──► paid
draft ──[invoice.void]──► void
sent  ──[invoice.void]──► void   guard: role = billing-manager+
```

---

## 5. Project Hooks

### Hook: Task Assigned

```typescript
compose.hook({
  on: "task.assigned",
  handler: async (event, ctx) => {
    const { taskId, assigneeId, projectId } = event.payload;
    const [task, project] = await Promise.all([
      ctx.query("project.getTask", { id: taskId }),
      ctx.query("project.getProject", { id: projectId }),
    ]);

    // 1. Notify assignee
    await ctx.dispatch("notification.send", {
      templateKey: "task.assigned",
      to: assigneeId,
      channels: ["in_app", "email"],
      variables: {
        taskTitle: task.title,
        projectName: project.name,
        dueDate: task.dueDate,
        priority: task.priority,
        boardUrl: `${ctx.org.settings.appUrl}/projects/${projectId}/tasks/${taskId}`,
      },
    });

    // 2. If dueDate set, register a scheduling reminder
    if (task.dueDate) {
      await ctx.scheduler.runOnce(
        `task-due-reminder:${taskId}`,
        new Date(task.dueDate - 24 * 60 * 60 * 1000), // 24h before
        { taskId, assigneeId },
        async (job) => {
          await ctx.dispatch("notification.send", {
            templateKey: "task.due-soon",
            to: job.data.assigneeId,
            channels: ["in_app", "email"],
            variables: { taskTitle: task.title, dueDate: task.dueDate },
          });
        },
      );
    }
  },
});
```

---

### Hook: Task Completed

```typescript
compose.hook({
  on: "task.completed",
  handler: async (event, ctx) => {
    const { taskId, projectId, milestoneId, sprintId } = event.payload;

    // 1. Check milestone completion
    if (milestoneId) {
      const milestone = await ctx.query("project.getMilestone", {
        id: milestoneId,
      });
      const allDone = milestone.linkedTaskIds.every(
        (id) => id === taskId || /* check from store */ true,
      );
      if (allDone) {
        await ctx.dispatch("project.completeMilestone", { milestoneId });
      } else {
        // Recompute completion percentage
        await ctx.dispatch("project.updateMilestoneProgress", { milestoneId });
      }
    }

    // 2. Update project completion % and health
    await ctx.dispatch("project.recalculateHealth", { projectId });

    // 3. Check sprint burn-down snapshot
    if (sprintId) {
      await ctx.dispatch("project.snapshotBurnDown", { sprintId });
    }
  },
});
```

---

### Hook: Milestone Completed

```typescript
compose.hook({
  on: "milestone.completed",
  handler: async (event, ctx) => {
    const { milestoneId, projectId } = event.payload;
    const milestone = await ctx.query("project.getMilestone", {
      id: milestoneId,
    });

    // 1. Notify client if configured
    if (milestone.notifyClientOnComplete) {
      const project = await ctx.query("project.getProject", { id: projectId });
      if (project.clientId) {
        await ctx.dispatch("notification.send", {
          templateKey: "milestone.completed",
          to: project.clientId,
          channels: ["email"],
          variables: {
            milestoneName: milestone.title,
            projectName: project.name,
            portalUrl: `${ctx.org.settings.appUrl}/client/projects/${projectId}`,
          },
        });
      }
    }

    // 2. If milestone billing → auto-create draft invoice
    if (milestone.billingAmount?.amount > 0) {
      await ctx.dispatch("project.createMilestoneInvoice", {
        projectId,
        milestoneId,
        amount: milestone.billingAmount,
      });
    }

    // 3. Recalculate project health
    await ctx.dispatch("project.recalculateHealth", { projectId });
  },
});
```

---

### Hook: Sprint Completed

```typescript
compose.hook({
  on: "sprint.completed",
  handler: async (event, ctx) => {
    const { sprintId, projectId } = event.payload;
    const sprint = await ctx.query("project.getSprint", { id: sprintId });

    // 1. Snapshot velocity into analytics
    const completedPoints = await ctx.query("project.getCompletedStoryPoints", {
      sprintId,
    });
    await ctx.dispatch("analytics.captureMetric", {
      key: "project.sprint.velocity",
      value: completedPoints,
      dimensions: { projectId, sprintId },
    });

    // 2. Roll unfinished tasks to backlog
    const incompleteTasks = sprint.taskIds.filter(/* status != done */);
    for (const taskId of incompleteTasks) {
      await ctx.dispatch("project.moveTaskToBacklog", { taskId });
    }

    // 3. Notify PM with sprint summary
    const project = await ctx.query("project.getProject", { id: projectId });
    await ctx.dispatch("notification.send", {
      templateKey: "sprint.completed",
      to: project.ownerId,
      channels: ["email"],
      variables: {
        sprintName: sprint.name,
        completedPoints,
        rolledBackCount: incompleteTasks.length,
        velocityActual: completedPoints,
      },
    });
  },
});
```

---

### Hook: Budget Threshold Exceeded

```typescript
compose.hook({
  on: "project.budget-threshold-crossed",
  handler: async (event, ctx) => {
    const { projectId, thresholdPct, consumedAmount, budgetAmount } =
      event.payload;
    const project = await ctx.query("project.getProject", { id: projectId });

    // Update health indicator
    const health = thresholdPct >= 100 ? "red" : "amber";
    await ctx.dispatch("project.updateHealth", { projectId, health });

    // Notify PM and billing manager
    await ctx.dispatch("notification.send", {
      templateKey: "project.budget-alert",
      to: { roles: ["project-manager", "billing-manager"], projectId },
      channels: ["in_app", "email"],
      variables: {
        projectName: project.name,
        thresholdPct,
        consumedAmount,
        budgetAmount,
      },
    });

    // At 100%: block new billable time entries (rule enforced)
    if (thresholdPct >= 100) {
      await ctx.dispatch("project.lockBillableTime", { projectId });
    }
  },
});
```

---

### Hook: Time Entry Approved

```typescript
compose.hook({
  on: "time-entry.approved",
  handler: async (event, ctx) => {
    const { timeEntryId, projectId } = event.payload;
    const entry = await ctx.query("project.getTimeEntry", { id: timeEntryId });

    // Post labor cost to ledger cost center
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-LABOR-COST",
      credit: "ACC-ACCOUNTS-PAYABLE",
      amount: entry.amount,
      currency: entry.amount.currency,
      reference: timeEntryId,
      referenceType: "TimeEntry",
      costCenterId: entry.project.ledgerCostCenterId,
      description: `Labor: ${entry.description} — ${entry.actorId}`,
    });

    // Check if this approval pushes project past a budget threshold
    await ctx.dispatch("project.checkBudgetThresholds", { projectId });
  },
});
```

---

### Hook: Project Completed

```typescript
compose.hook({
  on: "project.completed",
  handler: async (event, ctx) => {
    const { projectId } = event.payload;
    const project = await ctx.query("project.getProject", { id: projectId });

    // 1. Auto-generate final invoice for any unbilled approved time entries
    const unbilledEntries = await ctx.query("project.getUnbilledTimeEntries", {
      projectId,
    });
    if (
      unbilledEntries.length > 0 &&
      project.billingType === "time-and-material"
    ) {
      await ctx.dispatch("project.createTimeAndMaterialInvoice", {
        projectId,
        timeEntryIds: unbilledEntries.map((e) => e.id),
      });
    }

    // 2. Generate project completion report document
    await ctx.dispatch("project.generateCompletionReport", { projectId });

    // 3. Post final revenue recognition to ledger
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-ACCOUNTS-RECEIVABLE",
      credit: "ACC-PROJECT-REVENUE",
      amount: project.budget,
      reference: projectId,
      referenceType: "Project",
      description: `Revenue recognition: ${project.name}`,
    });

    // 4. Notify client + team
    await ctx.dispatch("notification.send", {
      templateKey: "project.completed",
      to: project.clientId,
      channels: ["email"],
      variables: { projectName: project.name, portalUrl: "..." },
    });
  },
});
```

---

## 6. Business Rules

```typescript
compose.rules([
  // Task cannot move to in-progress without an assignee
  {
    id: "task-requires-assignee-before-start",
    scope: "task:start",
    guard: { field: "task.assigneeId", op: "exists" },
  },

  // Story points must be set before a task enters a sprint
  {
    id: "task-requires-story-points-for-sprint",
    scope: "task:add-to-sprint",
    guard: { field: "task.storyPoints", op: "gt", value: 0 },
  },

  // Sprint capacity cannot be exceeded
  {
    id: "sprint-capacity-limit",
    scope: "task:add-to-sprint",
    guard: {
      field: "sprint.currentLoad", // sum of storyPoints of all sprint tasks
      op: "lt",
      value: { ref: "sprint.capacity" },
    },
  },

  // Only active projects accept time entries
  {
    id: "time-entry-requires-active-project",
    scope: "time-entry:create",
    guard: { field: "project.status", op: "eq", value: "active" },
  },

  // Billable time blocked on budget-locked projects
  {
    id: "no-billable-time-on-locked-project",
    scope: "time-entry:create",
    guard: {
      or: [
        { field: "timeEntry.billable", op: "eq", value: false },
        { field: "project.billingLocked", op: "eq", value: false },
      ],
    },
  },

  // Time entries cannot be edited after approval
  {
    id: "approved-time-entries-immutable",
    scope: "time-entry:update",
    guard: {
      field: "timeEntry.status",
      op: "nin",
      value: ["approved", "invoiced"],
    },
  },

  // Completed sprints cannot have tasks added
  {
    id: "no-tasks-in-completed-sprint",
    scope: "task:add-to-sprint",
    guard: { field: "sprint.status", op: "neq", value: "completed" },
  },

  // Milestone completion requires PM override if not all tasks done
  {
    id: "milestone-complete-requires-tasks-done",
    scope: "milestone:complete",
    condition: {
      field: "milestone.completionPct",
      op: "lt",
      value: 100,
    },
    action: "require-approval",
    approverRole: "project-manager",
    reason: "Milestone has incomplete tasks. Override requires PM approval.",
  },

  // Invoice can only be sent when project has active client
  {
    id: "invoice-requires-client",
    scope: "invoice:send",
    guard: { field: "project.clientId", op: "exists" },
  },

  // Budget thresholds (evaluated on every time-entry approval)
  {
    id: "budget-threshold-70",
    scope: "project:budget-check",
    condition: { field: "project.budgetConsumedPct", op: "gte", value: 70 },
    action: "emit",
    event: "project.budget-threshold-crossed",
    payload: { thresholdPct: 70 },
  },
  {
    id: "budget-threshold-90",
    scope: "project:budget-check",
    condition: { field: "project.budgetConsumedPct", op: "gte", value: 90 },
    action: "emit",
    event: "project.budget-threshold-crossed",
    payload: { thresholdPct: 90 },
  },
  {
    id: "budget-threshold-100",
    scope: "project:budget-check",
    condition: { field: "project.budgetConsumedPct", op: "gte", value: 100 },
    action: "emit",
    event: "project.budget-threshold-crossed",
    payload: { thresholdPct: 100 },
  },
]);
```

---

## 7. API Routes

```
Base URL: /v1
Auth:     Bearer JWT — all routes require authentication unless marked public
Scope:    All routes org-scoped via JWT.orgId

── Projects ──────────────────────────────────────────────────────────
GET    /project/projects                      project:read
POST   /project/projects                      project:create
GET    /project/projects/:id                  project:read
PATCH  /project/projects/:id                  project:update
DELETE /project/projects/:id                  project:delete       [project-admin only]
POST   /project/projects/:id/activate         project:update
POST   /project/projects/:id/complete         project:update       [pm only]
POST   /project/projects/:id/archive          project:archive
POST   /project/projects/:id/hold             project:update
GET    /project/projects/:id/health           project:read
GET    /project/projects/:id/timeline         project:read         ← milestones + sprints
GET    /project/projects/:id/budget           budget:read
GET    /project/projects/:id/members          project:read
POST   /project/projects/:id/members          project:update
DELETE /project/projects/:id/members/:actorId project:update

── Milestones ────────────────────────────────────────────────────────
GET    /project/projects/:id/milestones           milestone:read
POST   /project/projects/:id/milestones           milestone:create
GET    /project/milestones/:id                    milestone:read
PATCH  /project/milestones/:id                    milestone:update
DELETE /project/milestones/:id                    milestone:update  [pm only]
POST   /project/milestones/:id/complete           milestone:update
POST   /project/milestones/:id/cancel             milestone:update

── Sprints ───────────────────────────────────────────────────────────
GET    /project/projects/:id/sprints              sprint:read
POST   /project/projects/:id/sprints              sprint:create
GET    /project/sprints/:id                       sprint:read
PATCH  /project/sprints/:id                       sprint:update
POST   /project/sprints/:id/start                 sprint:update
POST   /project/sprints/:id/complete              sprint:complete
GET    /project/sprints/:id/burndown              sprint:read      ← burn-down chart data

── Tasks ─────────────────────────────────────────────────────────────
GET    /project/projects/:id/tasks                task:read
POST   /project/projects/:id/tasks                task:create
GET    /project/projects/:id/backlog              task:read        ← backlog only
GET    /project/tasks/:id                         task:read
PATCH  /project/tasks/:id                         task:update
DELETE /project/tasks/:id                         task:delete
POST   /project/tasks/:id/assign                  task:assign
POST   /project/tasks/:id/move                    task:move-status ← { status, sprintId? }
POST   /project/tasks/:id/block                   task:update
POST   /project/tasks/:id/unblock                 task:update
GET    /project/tasks/:id/subtasks                task:read
POST   /project/tasks/:id/subtasks                task:create
GET    /project/tasks/:id/timeline                task:read        ← event history
POST   /project/tasks/:id/attachments             document:upload
GET    /project/tasks/:id/attachments             document:read

── Time Entries ──────────────────────────────────────────────────────
GET    /project/projects/:id/time-entries         time-entry:read
POST   /project/time-entries                      time-entry:create
GET    /project/time-entries/:id                  time-entry:read
PATCH  /project/time-entries/:id                  time-entry:update
DELETE /project/time-entries/:id                  time-entry:delete
POST   /project/time-entries/:id/approve          time-entry:approve
POST   /project/time-entries/:id/reject           time-entry:approve
GET    /project/projects/:id/time-entries/summary time-entry:read  ← grouped by actor/date

── Invoices ──────────────────────────────────────────────────────────
GET    /project/projects/:id/invoices             invoice:read
POST   /project/projects/:id/invoices             invoice:create
GET    /project/invoices/:id                      invoice:read
PATCH  /project/invoices/:id                      invoice:create   [draft only]
POST   /project/invoices/:id/send                 invoice:send
POST   /project/invoices/:id/record-payment       invoice:send
POST   /project/invoices/:id/void                 invoice:send     [billing-manager only]
GET    /project/invoices/:id/pdf                  invoice:read     ← generates PDF

── Documents ─────────────────────────────────────────────────────────
GET    /project/projects/:id/documents            document:read
POST   /project/projects/:id/documents            document:upload
GET    /project/documents/:id                     document:read
DELETE /project/documents/:id                     document:delete
GET    /project/documents/:id/versions            document:read

── Analytics ─────────────────────────────────────────────────────────
GET    /project/projects/:id/analytics/overview   analytics:read
GET    /project/projects/:id/analytics/velocity   analytics:read
GET    /project/projects/:id/analytics/burndown   analytics:read
GET    /project/projects/:id/analytics/time       analytics:read  ← by member/label
GET    /project/analytics/utilization             analytics:read  ← across all projects
POST   /project/analytics/reports                 analytics:read

── Client Portal (scoped, read-only) ─────────────────────────────────
GET    /project/client/projects                   project:read     [client role only]
GET    /project/client/projects/:id               project:read
GET    /project/client/projects/:id/milestones    milestone:read
GET    /project/client/projects/:id/documents     document:read    [shared only]
GET    /project/client/invoices                   invoice:read     [own only]
```

---

## 8. Notification Templates

| Key                      | Channel        | Trigger                             |
| ------------------------ | -------------- | ----------------------------------- |
| `task.assigned`          | in_app + email | Task assigned to actor              |
| `task.due-soon`          | in_app + email | 24h before task dueDate             |
| `task.overdue`           | in_app + email | Task dueDate passed, status ≠ done  |
| `task.unblocked`         | in_app         | Blocking task completed             |
| `task.review-requested`  | in_app + email | Task moved to in-review             |
| `task.review-rejected`   | in_app         | Reviewer sends task back            |
| `milestone.completed`    | email          | Milestone marked complete           |
| `milestone.missed`       | in_app + email | Milestone dueDate passed, not done  |
| `milestone.due-soon`     | in_app + email | 7 days and 1 day before milestone   |
| `sprint.started`         | in_app + email | Sprint activated                    |
| `sprint.completed`       | email          | Sprint completion summary to PM     |
| `sprint.ending-soon`     | in_app         | 3 days before sprint end            |
| `project.activated`      | email          | Project goes active — team welcome  |
| `project.completed`      | email          | Project completed — client notice   |
| `project.budget-alert`   | in_app + email | Budget at 70%, 90%, 100%            |
| `project.health-changed` | in_app         | Health flips amber or red           |
| `time-entry.approved`    | in_app         | Time entry approved by PM           |
| `time-entry.rejected`    | in_app         | Time entry rejected with reason     |
| `invoice.sent`           | email          | Invoice sent to client              |
| `invoice.overdue`        | email          | Invoice past due date               |
| `invoice.paid`           | email          | Payment confirmed — PM notified     |
| `weekly.digest`          | email          | Weekly summary per member (Mon 7am) |

---

## 9. Real-Time Channels

| Channel                                    | Subscribers          | Events                                             |
| ------------------------------------------ | -------------------- | -------------------------------------------------- |
| `org:{orgId}:project:{projectId}:board`    | All project members  | `task.*`, `sprint.*`                               |
| `org:{orgId}:project:{projectId}:timeline` | PM + client          | `milestone.*`, `project.*`                         |
| `org:{orgId}:project:{projectId}:budget`   | PM + billing-manager | `project.budget-threshold-crossed`, `invoice.*`    |
| `org:{orgId}:actor:{actorId}:tasks`        | Individual member    | `task.assigned`, `task.due-soon`, `task.unblocked` |
| `org:{orgId}:project:admin`                | project-admin        | `project.health-changed`, `project.*`              |

```typescript
// RealTimeBridge registrations
bridge.forward(
  "task.*",
  (e) => `org:${e.orgId}:project:${e.payload.projectId}:board`,
);
bridge.forward(
  "sprint.*",
  (e) => `org:${e.orgId}:project:${e.payload.projectId}:board`,
);
bridge.forward(
  "milestone.*",
  (e) => `org:${e.orgId}:project:${e.payload.projectId}:timeline`,
);
bridge.forward(
  "project.*",
  (e) => `org:${e.orgId}:project:${e.payload.projectId}:timeline`,
);
bridge.forward(
  "task.assigned",
  (e) => `org:${e.orgId}:actor:${e.payload.assigneeId}:tasks`,
);
bridge.forward(
  "project.budget-threshold-crossed",
  (e) => `org:${e.orgId}:project:${e.payload.projectId}:budget`,
);
```

---

## 10. Scheduled Jobs

```
project.check-overdue-tasks          daily 08:00
  → Find tasks with dueDate < today, status ≠ done/cancelled
  → Emit 'task.overdue' for each
  → Notify assignee + PM
  → Update project health score

project.check-missed-milestones      daily 08:00
  → Find milestones with dueDate < today, status = in-progress
  → Advance FSM to 'missed'
  → Notify PM + client

project.sprint-ending-soon           daily 08:00
  → Find sprints ending in 3 days, status = active
  → Notify PM + team-leads

project.weekly-digest                weekly Monday 07:00
  → Per-member: open tasks, time logged this week, upcoming deadlines
  → Send email digest

project.stale-task-check             weekly Sunday 20:00
  → Find tasks with status = in-progress, no time entry or update in > 14 days
  → Notify PM

project.invoice-overdue-check        daily 09:00
  → Find invoices with dueDate < today, status = sent
  → Advance FSM to 'overdue'
  → Send overdue reminder to client

project.budget-snapshot              nightly 02:00
  → Per active project: compute budgetConsumedPct from approved time entries + expenses
  → Update analytics materialized view

project.analytics-snapshot           nightly 03:00
  → Velocity, burn-down, utilization metrics → anl_data_points
```

---

## 11. Integrations

```typescript
ProjectCompose.integrations = {
  storage:      [S3Adapter],                 // document attachments, task files, reports
  email:        [ResendAdapter],             // digest, milestone alerts, invoices
  calendar:     [GoogleCalendarAdapter,      // milestone + sprint sync
                 OutlookCalendarAdapter],
  payment:      [StripeAdapter],             // invoice payment link generation
};

// Inbound Webhooks
POST /webhooks/payment       → invoice payment confirmed → mark invoice paid
POST /webhooks/github        → PR/commit linked to task via task ID in commit message
                               → emit 'task.pr-linked' → attach to task timeline
```

---

## 12. Seed Data

```typescript
// Roles (is_system: false — project-specific)
[
  { name: "project-admin",   permissions: ["*:*"] },
  { name: "project-manager", permissions: [
    "project:*", "milestone:*", "sprint:*", "task:*",
    "time-entry:*", "invoice:read", "document:*", "analytics:read", "budget:read",
  ]},
  { name: "team-lead",       permissions: [
    "project:read", "milestone:read", "sprint:*", "task:*",
    "time-entry:create", "time-entry:read", "time-entry:approve",
    "document:*", "analytics:read",
  ]},
  { name: "member",          permissions: [
    "project:read", "milestone:read", "sprint:read",
    "task:create", "task:read", "task:update", "task:move-status",
    "time-entry:create", "time-entry:read",
    "document:upload", "document:read",
  ]},
  { name: "client",          permissions: [
    "project:read", "milestone:read", "invoice:read", "document:read",
  ]},
  { name: "billing-manager", permissions: [
    "project:read", "sprint:read", "time-entry:read", "time-entry:approve",
    "invoice:*", "budget:*", "analytics:read",
  ]},
]

// Default Workflow Process Templates
[
  {
    id:          "TASK_REVIEW",
    entityType:  "Task",
    stages: [
      { id: "review",   title: "Code / Design Review",  tasks: [{ title: "Review",  role: "team-lead" }] },
      { id: "qa",       title: "QA Verification",        tasks: [{ title: "Test",    role: "member" }] },
      { id: "sign-off", title: "PM Sign-off",            tasks: [{ title: "Approve", role: "project-manager" }] },
    ],
  },
  {
    id:          "SPRINT_CEREMONY",
    entityType:  "Sprint",
    stages: [
      { id: "review",  title: "Sprint Review",      tasks: [{ title: "Demo to client",  role: "project-manager" }] },
      { id: "retro",   title: "Retrospective",       tasks: [{ title: "Team retro",      role: "team-lead" }] },
      { id: "planning",title: "Next Sprint Planning",tasks: [{ title: "Plan next sprint",role: "project-manager" }] },
    ],
  },
]

// Default Notification Templates (compose-level, supplement core templates)
[
  { key: "task.assigned",          channel: "in_app",  body: "You've been assigned: {{taskTitle}} in {{projectName}}" },
  { key: "task.assigned",          channel: "email",   subject: "New task assigned: {{taskTitle}}", body: "..." },
  { key: "task.due-soon",          channel: "in_app",  body: "Due tomorrow: {{taskTitle}}" },
  { key: "task.overdue",           channel: "email",   subject: "Overdue task: {{taskTitle}}", body: "..." },
  { key: "milestone.completed",    channel: "email",   subject: "Milestone reached: {{milestoneName}}", body: "..." },
  { key: "milestone.missed",       channel: "email",   subject: "Milestone missed: {{milestoneName}}", body: "..." },
  { key: "sprint.completed",       channel: "email",   subject: "Sprint {{sprintName}} complete", body: "..." },
  { key: "project.budget-alert",   channel: "email",   subject: "Budget alert: {{projectName}} at {{thresholdPct}}%", body: "..." },
  { key: "project.completed",      channel: "email",   subject: "Project {{projectName}} completed", body: "..." },
  { key: "invoice.sent",           channel: "email",   subject: "Invoice {{invoiceNumber}} from {{orgName}}", body: "..." },
  { key: "invoice.overdue",        channel: "email",   subject: "Payment overdue: Invoice {{invoiceNumber}}", body: "..." },
  { key: "weekly.digest",          channel: "email",   subject: "Your weekly summary — {{weekOf}}", body: "..." },
]

// Config Defaults
{
  compose: "project",
  config: {
    budgetThresholds:       [70, 90, 100],
    defaultHourlyRate:      { amount: 50, currency: "USD" },
    invoicePaymentTermDays: 30,
    sprintDefaultDays:      14,
    taskStaleThresholdDays: 14,
    weeklyDigestDayOfWeek:  1,  // Monday
    weeklyDigestHour:       7,
  }
}
```
