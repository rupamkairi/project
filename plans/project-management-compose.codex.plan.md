# Project Management Compose

## Goal

Create a complete, independently usable `Project Management` Compose for hybrid project delivery and professional services.

It covers:

- Portfolios and projects
- Epics, stories, tasks, subtasks and bugs
- Backlogs, sprints and customizable boards
- Comments, replies and attachments
- Project worklogs and resource planning
- Clients, retainers, budgets and billing drafts
- Client guest portal
- Delivery, financial and portfolio reports

## Assumptions

- Compose ID: `project-management`
- Display name: `Project Management`
- Package names: `@projectx/project-management-server` and `@projectx/project-management-web`
- Factory: `createProjectManagementCompose(...)`
- Public prefix: `/projects`
- Hybrid planning supports Scrum, Kanban and general projects.
- Work Item is the unified model for Epic, Story, Task, Subtask and Bug.
- Subtasks and hierarchy use `parentId`.
- Board columns are customizable.
- Fields, workflows and work-item types are otherwise fixed.
- No automation engine, custom fields or templates.
- Pull Requests use manual links only.
- Comments remain Compose-owned.
- Project Management owns project worklogs.
- Workplace may import approved worklogs into employee timesheets.
- Final invoices and payments remain outside this Compose.
- Start implementation by saving this plan as `plans/project-management-compose.codex.plan.md`; do not update it afterward.

## Steps

1. **Create the Compose**
   - Add server and web packages, schema, seed, permissions, hooks, jobs and manifest.
   - Mount server and web routes into their respective shells.
   - Add the Compose to the shared dashboard.
   - Export `createProjectManagementCompose`, `ProjectManagementApp` and `seedProjectManagement`.

2. **Reuse shared capabilities**
   - Identity and Roles for users and access.
   - Party for client organizations.
   - Documents and Attachments for project files.
   - Notifications for mentions, assignments and deadlines.
   - Activities for the audit/activity stream.
   - Analytics for report definitions and snapshots.
   - Scheduling for calendar views when appropriate.
   - Do not create direct database dependencies on another Compose's tables.

3. **Create delivery records**
   - Portfolios and portfolio membership.
   - Projects, project members and client guests.
   - Milestones and cross-project dependencies.
   - Sprints with goals, capacity and lifecycle.
   - Unified work items with hierarchical parent relationships.
   - Assignment history, watchers, labels and label mappings.
   - Work-item dependencies and checklist items.
   - Boards and customizable columns.
   - Threaded comments and replies.
   - Project worklogs.
   - Manual Pull Request links.
   - Client approvals for milestones and deliverables.

4. **Define important Work Item fields**
   - Project sequence/key and human-readable reference.
   - Type, title, description and acceptance criteria.
   - Parent, epic, sprint and milestone relationships.
   - Board column and normalized reporting category.
   - Priority, labels, tags and resolution.
   - Reporter, creator, current assignees and assignment history.
   - Story points, original estimate, remaining estimate and logged time.
   - Planned, start, due, actual-start and completion dates.
   - Recurrence settings, progress and archived state.
   - Pull Requests, attachments, dependencies, watchers and activity history.

5. **Implement planning views**
   - Portfolio dashboard and cross-project roadmap.
   - Project overview and health.
   - Backlog and sprint planning.
   - Scrum and Kanban boards.
   - List, calendar and timeline/Gantt views.
   - Milestone and dependency views.
   - Team workload and capacity view.
   - My Work view across assigned projects.

6. **Implement lifecycle rules**
   - Fixed work-item types: Epic, Story, Task, Subtask and Bug.
   - Default columns: Backlog, To Do, In Progress, Review and Done.
   - Allow project managers to add, rename, reorder and archive columns.
   - Every column maps to a fixed reporting category so reports remain stable.
   - Preserve assignment, status and sprint-change history.
   - Prevent invalid hierarchy, dependency cycles and deletion of referenced records.
   - Archive completed structures instead of destroying history.

7. **Implement Full PSA**
   - Reuse Party records as clients.
   - Add rate cards and role/member rates.
   - Add project budgets and budget periods.
   - Add retainers with included units, usage and balances.
   - Add fixed-fee, time-and-material and retainer billing schedules.
   - Generate reviewable billing drafts and billing lines.
   - Support client approval before export.
   - Exclude final invoices, payments, credit notes and project-owned expense records.

8. **Implement guest portal**
   - Restrict guests to explicitly shared projects.
   - Allow viewing approved work, files, milestones and reports.
   - Allow comments, replies and deliverable approvals.
   - Hide internal comments, cost rates, margins and private work items.

9. **Define permissions**
   - Project Management Admin
   - Portfolio Manager
   - Project Manager
   - Team Member
   - Finance Manager
   - Client Guest
   - Viewer
   - Enforce organization, portfolio, project and guest-level access on every route.

10. **Expose APIs**
    - `/projects/portfolios`
    - `/projects/projects`
    - `/projects/work-items`
    - `/projects/sprints`
    - `/projects/boards`
    - `/projects/comments`
    - `/projects/worklogs`
    - `/projects/clients`
    - `/projects/psa`
    - `/projects/reports`
    - `/projects/my-work`
    - Use validated Elysia feature routes with consistent authorization and organization scoping.

11. **Add integrations**
    - Consume Workplace workforce directory and capacity when available.
    - Publish approved project worklogs for Workplace timesheets.
    - Accept CRM deal-to-project creation without owning CRM records.
    - Export approved billing drafts to ERP when installed.
    - Keep all integrations optional so the Compose works independently.

12. **Add reports**
    - Project health, progress and overdue work.
    - Sprint burndown/burnup and velocity.
    - Cumulative flow, throughput, lead time and cycle time.
    - Milestone and dependency risk.
    - Workload, allocation and capacity.
    - Estimated versus actual time.
    - Billable versus non-billable time.
    - Budget burn, profitability and margin.
    - Retainer consumption and billing forecast.
    - Portfolio roadmap and health.
    - Client-facing project summary.

## Risks / Checks

- Verify organization and project isolation.
- Verify guest users cannot access internal or financial information.
- Verify work-item hierarchy and dependency-cycle prevention.
- Verify board-column customization preserves reporting categories.
- Verify assignment and status history cannot be lost.
- Verify sprint planning, rollover and completion.
- Verify worklog approval and optional Workplace export.
- Verify retainers, rates, budgets and billing-draft calculations.
- Verify CRM, Workplace and ERP are optional integrations.
- Verify large boards and backlogs use paginated APIs and efficient React rendering.
- Test permission boundaries, lifecycle transitions, reports, seeds, manifests and shell registration.
- Run package tests, type-checks and route/schema smoke tests without starting dev servers.
