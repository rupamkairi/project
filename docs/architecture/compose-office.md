# Compose — HR & Office Management

## Human Resources & Office Management

---

## 1. Compose Overview

```
Compose ID:   hr
Version:      1.0.0
Purpose:      Manage the full employee lifecycle — hiring through exit —
              alongside attendance, payroll, field operations, and office management.
Apps Served:  HRAdminApp    → employee management, payroll, policy configuration
              ManagerApp    → team attendance, leave approvals, appraisals
              EmployeeApp   → self-service — apply leave, view payslips, submit claims
              FieldApp      → field worker task submissions with geo + media
```

---

## 2. Module Selection & Configuration

```typescript
const HRCompose: ComposeDefinition = {
  id: "hr",
  name: "HR & Office Management",
  modules: [
    "identity",
    "workflow", // Onboarding, leave approval, appraisal, exit
    "scheduling", // Shifts, interviews, meeting rooms
    "ledger", // Payroll, expense claims, advances
    "document", // Offer letters, contracts, policies, certificates
    "geo", // Geo-fenced attendance, field worker tracking
    "notification", // Leave decisions, payslip ready, policy updates
    "analytics", // Headcount, attrition, payroll cost, attendance
  ],

  moduleConfig: {
    scheduling: {
      resourceLabel: "Employee / Room",
      slotLabel: "Shift / Interview Slot",
    },
    ledger: {
      baseCurrency: "INR",
      enableCostCenters: true, // cost center = department
    },
  },
};
```

---

## 3. Actor Roles & Permission Matrix

| Role              | Who                                                 |
| ----------------- | --------------------------------------------------- |
| `hr-admin`        | Full HR access — payroll, policies, all employees   |
| `hr-manager`      | Manage a department's employees, approve leaves     |
| `manager`         | Team lead — approve leaves, view team attendance    |
| `employee`        | Self-service — own data, leaves, claims, payslips   |
| `field-worker`    | Employee subtype — mobile-first, submit field tasks |
| `payroll-officer` | Run and approve payroll only                        |
| `auditor`         | Read-only — compliance view                         |

```
                        hr-admin  hr-manager  manager  employee  field-worker  payroll  auditor
────────────────────────────────────────────────────────────────────────────────────────────────
employee:read               ✓         ✓          ◑        ◑           ◑           ✓        ✓
employee:create             ✓         —           —        —           —           —        —
employee:update             ✓         ✓ (dept)    —        ◑ (own)     ◑ (own)     —        —
employee:terminate          ✓         —           —        —           —           —        —

attendance:read             ✓         ✓ (team)    ✓ (team) ◑ (own)    ◑ (own)     —        ✓
attendance:mark             ✓         ✓           ✓        ✓           ✓           —        —
attendance:override         ✓         ✓           —        —           —           —        —

leave:apply                 ✓         ✓           ✓        ✓           ✓           —        —
leave:approve               ✓         ✓ (dept)    ✓ (team) —           —           —        —
leave:reject                ✓         ✓ (dept)    ✓ (team) —           —           —        —
leave:policy-manage         ✓         —           —        —           —           —        —

payroll:run                 ✓         —           —        —           —           ✓        —
payroll:approve             ✓         —           —        —           —           ✓        —
payroll:read-own            —         —           —        ✓           ✓           —        —
payroll:read-all            ✓         —           —        —           —           ✓        ✓

claim:submit                ✓         ✓           ✓        ✓           ✓           —        —
claim:approve               ✓         ✓ (dept)    ✓ (team) —           —           —        —
claim:pay                   ✓         —           —        —           —           ✓        —

appraisal:manage            ✓         ✓           ✓        ◑ (own)     —           —        —
field-task:submit           —         —           —        —           ✓           —        —
field-task:review           ✓         ✓           ✓        —           —           —        —

document:read-own           —         —           —        ✓           ✓           —        —
document:manage             ✓         ✓           —        —           —           —        —
analytics:read              ✓         ✓           ✓        —           —           ✓        ✓
```

---

## 4. HR Entity Extensions

### Employee

```typescript
interface Employee extends Entity {
  actorId: ID; // links to identity module actor
  employeeCode: string; // 'EMP-001'
  status: EmployeeStatus;
  type: "full-time" | "part-time" | "contract" | "intern" | "field-worker";
  departmentId: ID;
  designationId: ID;
  managerId?: ID; // actor_id of reporting manager
  joiningDate: Timestamp;
  confirmationDate?: Timestamp;
  exitDate?: Timestamp;
  exitReason?: string;
  probationEndDate?: Timestamp;
  workLocation: "office" | "remote" | "hybrid" | "field";
  addressId?: ID;
  bankDetails: BankDetails;
  taxId: string; // PAN, SSN, etc.
  emergencyContact: EmergencyContact;
  customFields: Record<string, unknown>;
}

type EmployeeStatus =
  | "onboarding"
  | "probation"
  | "active"
  | "notice-period"
  | "terminated"
  | "resigned"
  | "absconded";
```

**Employee FSM:**

```
onboarding → probation      [on: employee.join]        after: joiningDate reached
probation  → active         [on: employee.confirm]     guard: probationEndDate passed
           → terminated     [on: employee.terminate]
active     → notice-period  [on: employee.resign]      entry: [assign noticePeriodEndDate]
           → terminated     [on: employee.terminate]
notice-period → terminated  [on: employee.exit]        after: noticePeriodEndDate
              → active      [on: employee.withdraw-resignation]
terminated → (terminal)
absconded  → terminated     [on: employee.terminate]
```

### Department & Designation

```typescript
interface Department extends Entity {
  name: string;
  code: string;
  headId?: ID; // employee_id of department head
  parentId?: ID; // for nested org chart
  costCenterId: string; // maps to ledger cost center
}

interface Designation extends Entity {
  name: string; // 'Senior Engineer', 'Field Technician'
  level: number; // 1–10 grade level
  departmentId?: ID; // null = applies across departments
  salaryBandMin: Money;
  salaryBandMax: Money;
}
```

### Attendance

```typescript
interface AttendanceRecord extends Entity {
  employeeId: ID
  date: string              // 'YYYY-MM-DD'
  status: AttendanceStatus
  checkInAt?: Timestamp
  checkOutAt?: Timestamp
  checkInLocation?: { lat: number; lng: number }
  checkOutLocation?: { lat: number; lng: number }
  workingMinutes: number    // computed from checkIn/checkOut
  overtime Minutes: number
  source: 'biometric' | 'mobile-geo' | 'manual' | 'system'
  overriddenBy?: ID         // actor who manually overrode
  overrideReason?: string
  shiftId?: ID              // sch_slots.id
}

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half-day'
  | 'late'
  | 'on-leave'
  | 'holiday'
  | 'weekend'
  | 'work-from-home'
```

### Leave

```typescript
interface LeaveApplication extends Entity {
  employeeId: ID;
  type: LeaveType; // 'annual', 'sick', 'maternity', 'unpaid', 'comp-off'
  status: LeaveStatus;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  approverId?: ID;
  approvedAt?: Timestamp;
  rejectedReason?: string;
  documentId?: ID; // medical certificate for sick leave
}

type LeaveStatus =
  | "applied"
  | "approved"
  | "rejected"
  | "cancelled"
  | "withdrawn";

interface LeaveBalance extends Entity {
  employeeId: ID;
  type: LeaveType;
  year: number;
  entitled: number;
  taken: number;
  pending: number; // in applied/approved state
  remaining: number; // entitled - taken - pending
  carriedForward: number;
}
```

**Leave FSM:**

```
applied → approved    [on: leave.approve]  guard: sufficient balance + approver role
        → rejected    [on: leave.reject]   guard: reason provided
        → withdrawn   [on: leave.withdraw] guard: fromDate not yet passed
approved → cancelled  [on: leave.cancel]   guard: fromDate not yet passed
         → withdrawn  [on: leave.withdraw]
```

### Payroll

```typescript
interface PayrollRun extends Entity {
  month: number;
  year: number;
  status:
    | "draft"
    | "processing"
    | "pending-approval"
    | "approved"
    | "paid"
    | "locked";
  processedAt?: Timestamp;
  approvedBy?: ID;
  totalGross: Money;
  totalDeductions: Money;
  totalNet: Money;
  payslipCount: number;
}

interface Payslip extends Entity {
  payrollRunId: ID;
  employeeId: ID;
  month: number;
  year: number;
  status: "draft" | "generated" | "paid";
  earnings: PayComponent[];
  deductions: PayComponent[];
  grossPay: Money;
  totalDeductions: Money;
  netPay: Money;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  paidAt?: Timestamp;
  ledgerTransactionId?: ID;
}

interface PayComponent {
  name: string; // 'Basic', 'HRA', 'PF', 'TDS'
  type: "earning" | "deduction";
  amount: Money;
  isStatutory: boolean; // PF, ESI, TDS
}
```

### Expense Claim

```typescript
interface ExpenseClaim extends Entity {
  employeeId: ID;
  title: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "paid";
  items: ClaimItem[];
  total: Money;
  approverId?: ID;
  paidAt?: Timestamp;
  ledgerTransactionId?: ID;
}

interface ClaimItem {
  category: string; // 'travel', 'meals', 'accommodation', 'supplies'
  description: string;
  amount: Money;
  receiptDocumentId?: ID;
  expenseDate: Timestamp;
}
```

### Field Task

```typescript
interface FieldTask extends Entity {
  assignedTo: ID; // field-worker employee id
  assignedBy: ID;
  title: string;
  description: string;
  status: "assigned" | "in-progress" | "submitted" | "approved" | "rejected";
  location: { lat: number; lng: number; address: string };
  scheduledAt: Timestamp;
  startedAt?: Timestamp;
  submittedAt?: Timestamp;
  submission?: {
    notes: string;
    photos: ID[]; // document module attachment ids
    checklistResults: Record<string, boolean>;
    location: { lat: number; lng: number }; // where submission was made
  };
  reviewerId?: ID;
  reviewNotes?: string;
}
```

---

## 5. HR Hooks

### Hook: Employee Joined (Onboarding Start)

```typescript
compose.hook({
  on: "employee.created",
  handler: async (event, ctx) => {
    const { employeeId, actorId, managerId } = event.payload;

    // 1. Start onboarding workflow
    await ctx.dispatch("workflow.startProcess", {
      templateId: "EMPLOYEE_ONBOARDING",
      entityId: employeeId,
      entityType: "Employee",
      context: { employeeId, managerId },
    });

    // 2. Initialize leave balances for current year
    await ctx.dispatch("hr.initLeaveBalances", { employeeId });

    // 3. Send welcome notification
    await ctx.dispatch("notification.send", {
      templateKey: "employee.welcome",
      to: actorId,
      variables: { employeeCode: event.payload.employeeCode },
    });

    // 4. Notify manager
    if (managerId) {
      await ctx.dispatch("notification.send", {
        templateKey: "employee.new-joinee-alert",
        to: managerId,
        variables: { employeeId },
      });
    }
  },
});
```

### Hook: Leave Approved

```typescript
compose.hook({
  on: "leave.approved",
  handler: async (event, ctx) => {
    const { leaveId, employeeId, fromDate, toDate, type, totalDays } =
      event.payload;

    // 1. Deduct from leave balance
    await ctx.dispatch("hr.deductLeaveBalance", {
      employeeId,
      type,
      days: totalDays,
      reference: leaveId,
    });

    // 2. Mark attendance as on-leave for each day
    await ctx.dispatch("hr.markAttendanceRange", {
      employeeId,
      fromDate,
      toDate,
      status: "on-leave",
    });

    // 3. Notify employee
    await ctx.dispatch("notification.send", {
      templateKey: "leave.approved",
      to: employeeId,
      variables: { fromDate, toDate, totalDays },
    });
  },
});
```

### Hook: Payroll Approved → Disburse

```typescript
compose.hook({
  on: "payroll.approved",
  handler: async (event, ctx) => {
    const { payrollRunId } = event.payload;
    const payslips = await ctx.query("hr.getPayslips", { payrollRunId });

    for (const payslip of payslips) {
      // 1. Post payroll ledger entry per employee
      await ctx.dispatch("ledger.postTransaction", {
        debit: "ACC-SALARY-EXPENSE",
        credit: "ACC-SALARY-PAYABLE",
        amount: payslip.netPay,
        reference: payslip.id,
        referenceType: "Payslip",
        description: `Salary: ${payslip.employeeId} - ${payslip.month}/${payslip.year}`,
      });

      // 2. Notify employee: payslip ready
      await ctx.dispatch("notification.send", {
        templateKey: "payslip.ready",
        to: payslip.employeeId,
        variables: {
          month: payslip.month,
          year: payslip.year,
          netPay: payslip.netPay,
        },
        channels: ["email", "in_app"],
      });
    }

    // 3. Queue bank transfer file generation
    await ctx.queue.add(
      "hr.generate-bank-transfer-file",
      { payrollRunId },
      {
        priority: "critical",
      },
    );
  },
});
```

### Hook: Field Task Submitted

```typescript
compose.hook({
  on: "field-task.submitted",
  handler: async (event, ctx) => {
    const { taskId, location, assignedBy } = event.payload;

    // 1. Update geo entity with submission location
    await ctx.dispatch("geo.attachLocation", {
      entityId: taskId,
      entityType: "FieldTask",
      coordinates: location,
    });

    // 2. Notify reviewer
    await ctx.dispatch("notification.send", {
      templateKey: "field-task.submitted",
      to: assignedBy,
      variables: { taskId },
      channels: ["in_app", "push"],
    });
  },
});
```

### Hook: Employee Resignation

```typescript
compose.hook({
  on: "employee.resigned",
  handler: async (event, ctx) => {
    const { employeeId, noticePeriodDays } = event.payload;

    // 1. Start exit workflow
    await ctx.dispatch("workflow.startProcess", {
      templateId: "EMPLOYEE_EXIT",
      entityId: employeeId,
      entityType: "Employee",
    });

    // 2. Schedule final settlement calculation
    await ctx.queue.add(
      "hr.calculate-fnf",
      { employeeId },
      {
        delay: days(noticePeriodDays - 7), // 7 days before last day
      },
    );

    // 3. Notify HR admin
    await ctx.dispatch("notification.send", {
      templateKey: "employee.resignation-alert",
      to: { role: "hr-admin" },
      variables: { employeeId, lastDay: event.payload.lastWorkingDay },
    });
  },
});
```

---

## 6. Business Rules

```typescript
compose.rules([
  // Leave cannot be applied for past dates beyond configured lookback
  {
    id: "leave-no-backdated-apply",
    scope: "leave:apply",
    guard: {
      field: "leave.fromDate",
      op: "gte",
      value: { relative: `-${config.backdatedLeaveDays}d` },
    },
  },

  // Sick leave beyond 2 days requires medical certificate
  {
    id: "sick-leave-certificate-required",
    scope: "leave:approve",
    condition: {
      and: [
        { field: "leave.type", op: "eq", value: "sick" },
        { field: "leave.totalDays", op: "gt", value: 2 },
      ],
    },
    guard: { field: "leave.documentId", op: "exists" },
  },

  // Payroll cannot be run if attendance is not finalized for the month
  {
    id: "payroll-requires-attendance-finalized",
    scope: "payroll:run",
    guard: { field: "attendance.finalized", op: "eq", value: true },
  },

  // Expense claim items over limit require receipt
  {
    id: "claim-receipt-required",
    scope: "claim:submit",
    condition: {
      field: "claimItem.amount.amount",
      op: "gte",
      value: { ref: "config.receiptRequiredAbove" },
    },
    guard: { field: "claimItem.receiptDocumentId", op: "exists" },
  },

  // Geo-fenced attendance: check-in must be within office radius
  {
    id: "attendance-geo-fence",
    scope: "attendance:mark",
    condition: { field: "employee.workLocation", op: "eq", value: "office" },
    guard: { field: "checkIn.withinOfficeRadius", op: "eq", value: true },
  },
]);
```

---

## 7. Key Workflow Templates

```
EMPLOYEE_ONBOARDING
  1. document-collection   → collect signed offer letter, ID proof, bank details
  2. it-setup              → assign laptop, email, system access
  3. induction             → complete induction training (LMS link if integrated)
  4. probation-goals        → manager sets probation goals
  5. confirmation-review   → manager submits confirmation recommendation
     → On complete: dispatch 'employee.confirm'

EMPLOYEE_EXIT
  1. resignation-acceptance → HR accepts resignation, confirms last day
  2. knowledge-transfer     → tasks assigned to outgoing employee
  3. asset-return           → laptop, ID card, access cards
  4. access-revocation      → IT revokes all system access
  5. fnf-settlement         → payroll officer calculates Full & Final
  6. exit-interview         → HR conducts exit interview
     → On complete: dispatch 'employee.exit'

ANNUAL_APPRAISAL
  1. self-assessment        → employee submits self-review
  2. manager-review         → manager submits ratings + feedback
  3. calibration            → HR normalizes ratings across team
  4. feedback-sharing       → manager shares final rating with employee
  5. increment-processing   → payroll updates salary band
```

---

## 8. API Surface

```
── Employees ─────────────────────────────────────────────────
GET    /hr/employees                      employee:read
POST   /hr/employees                      employee:create
GET    /hr/employees/:id                  employee:read
PATCH  /hr/employees/:id                  employee:update
POST   /hr/employees/:id/terminate        employee:terminate
POST   /hr/employees/:id/resign           employee:update
GET    /hr/employees/:id/payslips         payroll:read-own   (own) or payroll:read-all
GET    /hr/employees/:id/attendance       attendance:read
GET    /hr/employees/:id/leaves           leave:apply (own) or hr-admin
GET    /hr/employees/:id/documents        document:read-own

── Attendance ────────────────────────────────────────────────
GET    /hr/attendance                     attendance:read
POST   /hr/attendance/check-in            attendance:mark
POST   /hr/attendance/check-out           attendance:mark
PATCH  /hr/attendance/:id/override        attendance:override
GET    /hr/attendance/summary             attendance:read   ← monthly summary

── Leaves ────────────────────────────────────────────────────
GET    /hr/leaves                         leave:approve (team/dept)
POST   /hr/leaves                         leave:apply
GET    /hr/leaves/:id                     leave:apply (own) or leave:approve
POST   /hr/leaves/:id/approve             leave:approve
POST   /hr/leaves/:id/reject              leave:approve
POST   /hr/leaves/:id/cancel              leave:apply (own)
GET    /hr/leave-balances/:employeeId     employee:read (own or manager)
GET    /hr/leave-policies                 leave:policy-manage or read

── Payroll ───────────────────────────────────────────────────
GET    /hr/payroll-runs                   payroll:read-all
POST   /hr/payroll-runs                   payroll:run
GET    /hr/payroll-runs/:id               payroll:read-all
POST   /hr/payroll-runs/:id/approve       payroll:approve
GET    /hr/payroll-runs/:id/payslips      payroll:read-all
GET    /hr/payslips/:id                   payroll:read-own (own) or payroll:read-all

── Expense Claims ────────────────────────────────────────────
GET    /hr/claims                         claim:approve (team) or own
POST   /hr/claims                         claim:submit
GET    /hr/claims/:id                     claim:submit (own) or claim:approve
POST   /hr/claims/:id/submit              claim:submit
POST   /hr/claims/:id/approve             claim:approve
POST   /hr/claims/:id/reject              claim:approve
POST   /hr/claims/:id/pay                 claim:pay

── Field Tasks ───────────────────────────────────────────────
GET    /hr/field-tasks                    field-task:review
POST   /hr/field-tasks                    field-task:review  ← assign
GET    /hr/field-tasks/:id                field-task:submit (own) or field-task:review
POST   /hr/field-tasks/:id/submit         field-task:submit
POST   /hr/field-tasks/:id/approve        field-task:review
POST   /hr/field-tasks/:id/reject         field-task:review

── Analytics ─────────────────────────────────────────────────
GET    /hr/analytics/headcount            analytics:read
GET    /hr/analytics/attrition            analytics:read
GET    /hr/analytics/attendance-summary   analytics:read
GET    /hr/analytics/payroll-cost         analytics:read
GET    /hr/analytics/leave-utilization    analytics:read
```

---

## 9. Real-Time Channels

| Channel                        | Subscribers       | Events                           |
| ------------------------------ | ----------------- | -------------------------------- |
| `org:{orgId}:hr:leaves`        | Managers, HR      | `leave.*`                        |
| `org:{orgId}:hr:field`         | Managers, HR      | `field-task.*`                   |
| `org:{orgId}:actor:{id}:inbox` | Employee (self)   | `leave.*`, `payslip.*`, `task.*` |
| `org:{orgId}:hr:payroll`       | Payroll, HR admin | `payroll.*`                      |

---

## 10. Scheduled Jobs

```
hr.mark-absent                    daily (end-of-day)
  → Employees with no attendance record and no approved leave → mark absent

hr.leave-balance-accrual          monthly (1st)
  → Add monthly entitlement to each employee's leave balance
  → Carry forward previous year balances per policy

hr.probation-due-reminder         daily
  → Employees whose probationEndDate is within 7 days
  → Notify manager to submit confirmation

hr.anniversary-reminder           daily
  → Employees with work anniversary today → notify HR + manager

hr.birthday-reminder              daily
  → Notify HR + team (if configured)

hr.payroll-reminder               monthly (25th)
  → Remind payroll officer to initiate the run

hr.attendance-finalization        monthly (last working day)
  → Lock attendance for the month, compute summaries

hr.field-task-overdue             every 2h
  → Field tasks past scheduledAt + buffer with no submission → notify manager

hr.analytics-snapshot             nightly
```
