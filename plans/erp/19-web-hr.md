# Phase 19 — Web: HR

---

## 19.1 EmployeesPage

Columns: Emp No | Name | Department | Designation | Type | Join Date | Status | Actions

Filter: department, employment type, status.

Actions: "Add Employee" (opens CreateEmployeeDialog).

**CreateEmployeeDialog fields:**
- Emp No (auto-generated: EMP-001)
- Name (required)
- Email, Phone
- Department (dropdown)
- Designation
- Employment type: permanent | contract | intern
- Join date
- PAN (optional)
- Aadhaar (stored masked)
- Bank account: account no, bank name, IFSC
- PF No, ESI No (optional)
- Link to platform actor (optional — for login access)

---

## 19.2 EmployeeDetailPage

Header:
```
[Avatar] Rahul Sharma              [Edit] [Terminate]
EMP-042 | Software Engineer | Engineering Dept
Joined: 01 Jan 2023 | Permanent | Active
```

Tabs: Profile | Leave Balance | Attendance | Salary Slips

**Profile tab:** full employee details in read view.

**Leave Balance tab:**
```
Leave Type     | Allocated | Used | Pending | Balance
Annual Leave   |    21     |  5   |    2    |   14
Sick Leave     |    12     |  2   |    0    |   10
Casual Leave   |     6     |  1   |    0    |    5
```

**Attendance tab:** monthly calendar view.
- Green dot = present
- Yellow = half-day
- Red = absent
- Blue = leave
- Gray = weekend/holiday

Month selector at top.

**Salary Slips tab:** list of issued slips — month, gross, net, status. "View" opens SalarySlipDetailPage.

---

## 19.3 LeavePage

Three sub-tabs within Leave section:

**Applications tab:**
Columns: Emp No | Name | Leave Type | From | To | Days | Status | Actions

Filter: status, department, date range.

For managers (`erp:hr:manage`): Approve / Reject buttons per row.
For self (`erp:employee`): Create leave application.

**CreateLeaveApplicationDialog:**
- Leave type (dropdown — shows balance)
- From date, To date
- Computed days (excluding weekends + holidays) — shown live
- Reason text

On submit: checks balance. If insufficient → "Insufficient balance: N days available" error.

**Allocations tab:**
Columns: Emp | Leave Type | Period | Allocated | Used | Balance

Actions: "Add Allocation" (admin/HR only).

**Leave Types tab:**
Manage leave types: name, max days, carry-forward allowed (toggle), applicable roles.

---

## 19.4 AttendancePage

**Default view:** monthly register (matrix view).

Controls:
- Month + Year selector
- Department filter
- Export CSV button

Table:
```
Employee          | 1  | 2  | 3  | 4  | 5  | ... | 30 | 31 | Total P | Total A
Rahul Sharma      | P  | P  | WE | P  | P  | ... | P  | P  |   24    |   2
Priya Singh       | P  | HL | WE | P  | L  | ... | P  | WE |   22    |   1
```

Legend: P=Present, HL=Half-day, WE=Weekend, L=Leave, A=Absent, H=Holiday.

**Mark Attendance panel** (employee self-service):
Simple form: date (default today), status (present/half-day), check-in/check-out time.
Appears at top for employees with `erp:employee` role.

**Bulk import:** HR managers can upload CSV attendance register.
CSV format: `empNo,date,status,checkIn,checkOut`.
