# Phase 8 — HR & Payroll

---

## 8.1 Department Routes

```
GET    /erp/departments             erp:hr:read
POST   /erp/departments             erp:hr:manage
PATCH  /erp/departments/:id         erp:hr:manage
```

---

## 8.2 Employee Routes

> **MTA note:** Employees are stored in the `persons` table with `type = "employee"`. There is no `erp_employees` table.
> - Read: `mediator.dispatch({ type: "person.listPersons", filter: { type: "employee" } })`
> - Create: `mediator.dispatch({ type: "person.createPerson", data: { type: "employee", ... } })`
> - HR-specific fields (`pfNo`, `esiNo`, `aadhaar`, `bankAccount`) go in `meta` jsonb on the `persons` record.

```
GET    /erp/employees               erp:hr:read
POST   /erp/employees               erp:hr:manage
GET    /erp/employees/:id           erp:hr:read  (employees can view own: erp:employee:self)
PATCH  /erp/employees/:id           erp:hr:manage
POST   /erp/employees/:id/terminate erp:hr:manage
GET    /erp/employees/:id/leave-balance   erp:hr:read
GET    /erp/employees/:id/attendance      erp:hr:read
GET    /erp/employees/:id/salary-slips    erp:hr:read
```

**Create employee body:**
```typescript
{
  empNo: string;
  name: string;
  email?: string;
  phone?: string;
  departmentId: string;
  designation: string;
  employmentType: "permanent" | "contract" | "intern";
  joinDate: string;
  pan?: string;
  // HR-specific fields below are stored in persons.meta (jsonb):
  aadhaar?: string;       // stored masked: XXXX-XXXX-1234 — in meta
  bankAccount?: { accountNo: string; bankName: string; ifsc: string };  // in meta
  pfNo?: string;          // in meta
  esiNo?: string;         // in meta
  actorId?: string;       // link to platform actor (optional) — top-level on persons record
}
```

---

## 8.3 Leave Management Routes

```
GET    /erp/leave-types              erp:hr:read
POST   /erp/leave-types              erp:hr:manage

GET    /erp/leave-allocations        erp:hr:read
POST   /erp/leave-allocations        erp:hr:manage   ← allocate annual leave
POST   /erp/leave-allocations/bulk   erp:hr:manage   ← allocate for all employees

GET    /erp/leave-applications       erp:hr:read
POST   /erp/leave-applications       erp:hr:read  (any employee creates for self)
GET    /erp/leave-applications/:id   erp:hr:read
POST   /erp/leave-applications/:id/submit   (self)
POST   /erp/leave-applications/:id/approve  erp:hr:manage
POST   /erp/leave-applications/:id/reject   erp:hr:manage
```

**Create leave application:**
```typescript
{
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  reason: string;
}
```

On submit: compute `days` (excluding weekends + holidays). Check balance ≥ days. Notify manager.

On approve: deduct from `erpLeaveAllocation.used`, update `balance`.

---

## 8.4 Attendance Routes

```
GET    /erp/attendance               erp:hr:read
POST   /erp/attendance               erp:hr:manage  (bulk import)
POST   /erp/attendance/mark          erp:employee:self  ← employee marks own attendance
GET    /erp/attendance/monthly       erp:hr:read   ← monthly register view
  query: ?month=&year=&departmentId=
```

**Mark attendance (self):**
```typescript
{ date: string; status: "present" | "half-day"; checkIn?: string; checkOut?: string }
```

Manager can override via `POST /erp/attendance` (erp:hr:manage) with `employeeId` included.

Monthly register response: matrix of `[employee][day] = status`. Used for payroll input.

---

## 8.5 Salary Structure Routes

```
GET    /erp/salary-structures        erp:hr:read
POST   /erp/salary-structures        erp:hr:manage
GET    /erp/salary-structures/:id    erp:hr:read
PATCH  /erp/salary-structures/:id    erp:hr:manage
```

**Structure components (jsonb):**
```typescript
interface SalaryStructure {
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
}

interface SalaryComponent {
  name: string;                    // "Basic", "HRA", "PF", "TDS"
  type: "fixed" | "formula" | "percentage";
  value?: number;                  // for fixed
  formula?: string;                // for formula: "basic * 0.4" (HRA example)
  basisOf?: string;                // for percentage: name of basis component
  rate?: number;                   // for percentage: e.g. 12 (= 12% of basis)
  isTaxable?: boolean;
}
```

**Example structure:**
```json
{
  "earnings": [
    { "name": "Basic", "type": "formula", "formula": "ctc * 0.5" },
    { "name": "HRA", "type": "percentage", "basisOf": "Basic", "rate": 40 },
    { "name": "Special Allowance", "type": "formula", "formula": "ctc - Basic - HRA" }
  ],
  "deductions": [
    { "name": "Employee PF", "type": "percentage", "basisOf": "Basic", "rate": 12 },
    { "name": "Professional Tax", "type": "fixed", "value": 200 },
    { "name": "TDS", "type": "formula", "formula": "annual_income_tax / 12" }
  ]
}
```

---

## 8.6 Salary Slip Routes

```
GET    /erp/salary-slips             erp:hr:read
GET    /erp/salary-slips/:id         erp:hr:read  (or erp:employee:self for own)
GET    /erp/salary-slips/:id/pdf     erp:hr:read
POST   /erp/salary-slips/:id/submit  erp:payroll:run
```

Salary slips are created by Payroll Entry (see 8.7). Individual slip submission marks it as `submitted`.

> **MTA note:** `erp_salary_slips.employeeId` is renamed to `personId` — references `persons.id` (type="employee").

---

## 8.7 Payroll Entry Routes

> **MTA note:** The Drizzle table is `erp_payroll_runs` (renamed from `erp_payroll_entries`). All `employeeId` references in code comments become `personId` — references `persons.id` (type="employee").

```
GET    /erp/payroll-entries          erp:payroll:run
POST   /erp/payroll-entries          erp:payroll:run   ← create monthly payroll run
GET    /erp/payroll-entries/:id      erp:payroll:run
POST   /erp/payroll-entries/:id/generate-slips  erp:payroll:run
POST   /erp/payroll-entries/:id/submit          erp:payroll:run
```

**Create payroll entry body:**
```typescript
{
  month: number;     // 1-12
  year: number;
  departmentId?: string;   // null = all persons with type="employee"
  salaryStructureId?: string;
}
```

**Generate slips** (`/generate-slips`):

For each active person with `type = "employee"` (in department if filtered) — query via `person.listPersons({ type: "employee", departmentId })`:
1. Get attendance for the month → `presentDays` count
2. Load salary structure
3. Compute each component using formula evaluator (safe eval sandbox)
4. Pro-rate if `presentDays < workingDays`: `amount = componentAmount * presentDays / workingDays`
5. Insert `erpSalarySlip` (status: `draft`) with `personId` (not `employeeId`)
6. Update `erpPayrollRuns.personCount`, `totalGross`, `totalNet`

**Submit payroll entry:**
1. Validate all slips have status `submitted`
2. Create bulk `erpJournalEntry`:
   - Dr: Salary Expense (5200) for gross amounts
   - Cr: Employee PF Payable (2140) for PF deductions
   - Cr: TDS Payable (2130) for TDS deductions
   - Cr: Bank Account (1112) for net pay
3. Set payroll entry `status = "submitted"`
4. Emit `payroll.submitted`
