# Workplace Compose

## Goal

Create `Workplace` as a complete small-business office management Compose, independent from ERP.

It covers:

- Recruitment
- Onboarding and offboarding
- Employment management
- HR, leave and attendance
- People work records
- Performance management
- Generic payroll
- Expenses and office assets
- Policies, announcements, visitors and room bookings
- Employee and manager self-service

## Assumptions

- Public prefix: `/workplace`
- Factory: `createWorkplaceCompose(...)`
- No existing data or compatibility routes are required.
- Projects and project tasks remain outside Workplace.
- Project Management owns clients, budgets, billing and commercial utilization.
- Payroll is country-neutral.
- Recruitment has no public careers portal.
- Shared tables/modules are reused wherever suitable.
- Start implementation by saving this plan as `plans/workplace-compose.codex.plan.md`; do not update it afterward.

## Steps

1. **Create the Compose**
   - Add Workplace server and web packages.
   - Add manifest, dashboard card, shell registration and schema exports.
   - Provide `createWorkplaceCompose`, `WorkplaceApp` and `seedWorkplace`.

2. **Reuse shared capabilities**
   - Person: candidates and employees.
   - Actor/Role: access and employee accounts.
   - Pipeline: recruitment stages.
   - Workflow: onboarding, offboarding and approvals.
   - Scheduling: interviews, shifts and room bookings.
   - Documents: resumes, contracts, policies and employee files.
   - Activities: notes, meetings and employment activity.
   - Notifications, Locations and Analytics.

3. **Add approved Workplace records**
   - People: departments, positions, employees and employment contracts/history.
   - Recruitment: job openings, applications and interview evaluations.
   - Work: leave types/balances/requests, shifts, attendance and timesheets.
   - Performance: goals, review cycles, reviews and feedback.
   - Payroll: pay components, salary structures, employee compensation, payroll runs and payslips.
   - Office: expense claims/items, assets/assignments, policy acknowledgements and visitor logs.
   - Use organization-scoped `workplace_*` tables with required indexes and constraints.

4. **Implement complete workflows**
   - Recruitment: opening → screening → interview → offer → hire/reject.
   - Hiring creates the employee, draft contract and onboarding workflow.
   - Employment: preboarding → active → leave/offboarding → terminated.
   - Leave, timesheet, expense and payroll approval lifecycles.
   - Payroll calculation, approval, payslip generation and payment export.
   - Asset assignment/return, policy acknowledgement, visitors and room booking.
   - Employee self-service and manager approval inbox.

5. **Provide Workplace navigation**
   - Dashboard
   - Recruitment
   - Onboarding
   - People
   - Time & Leave
   - Performance
   - Payroll
   - Expenses
   - Office
   - Reports
   - My Workplace
   - Settings

6. **Define access**
   - Workplace Admin
   - HR Manager
   - Recruiter
   - Payroll Manager
   - Office Manager
   - People Manager
   - Employee
   - Auditor
   - Enforce organization isolation and permission checks on every route.

7. **Add setup and defaults**
   - Setup wizard for locations, workweek, departments, positions, leave policy, payroll frequency/currency and office policies.
   - Seed roles, permissions, recruitment pipeline, onboarding/offboarding templates, leave types and payroll components.
   - Include optional demo data separately from normal setup.

8. **Separate ERP**
   - Move reusable HR/payroll code into Workplace.
   - Remove HR and Payroll routes, schemas, permissions, seeds and navigation from ERP.
   - Keep shared Core and Domain Modules unchanged.
   - Generate a migration that removes unused ERP HR/payroll tables and creates Workplace-owned tables.
   - Leave ERP focused on procurement, sales, inventory, finance, manufacturing and tax.

9. **Expose integration contracts**
   - Read-only workforce directory and capacity endpoints.
   - Approved timesheet/event interface for Project Management.
   - Payroll-to-ERP journal event, optional when ERP is installed.
   - Never expose private compensation through general employee APIs.

## Risks / Checks

- Verify candidate-to-employee conversion does not duplicate Person records.
- Verify hiring, onboarding, leave, payroll and offboarding state transitions.
- Verify payroll rounding, adjustments, reruns, approval and payment export.
- Verify employee self-service cannot access confidential HR or payroll data.
- Verify managers only access their reporting hierarchy.
- Verify organization isolation across every API and report.
- Verify shared Workflow, Pipeline, Scheduling and Document records are reused.
- Verify `/erp/hr` and `/erp/payroll` are fully removed.
- Verify Workplace server APIs, web routes, manifest, seeds and migrations.
- Run package tests, type-checks and route/schema smoke tests without starting dev servers.
