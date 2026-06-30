# LMS Compose — Plan Index

---

## Plan Files

### Backend (Phases 1–11)

> **Master Table Architecture:** Master tables (cat_items, persons, transactions, activities, pipelines) already exist — lms compose creates lms_ detail tables only. Schema migration does not touch master tables.

| Phase | File | Description |
|-------|------|-------------|
| 01 | [01-foundation.md](01-foundation.md) | Package structure, compose factory, permissions, roles, ID prefixes. Schema migration creates lms_ detail tables only. |
| 02 | [02-entities.md](02-entities.md) | Master table mappings (read/filter only) + lms_ detail table definitions |
| 03 | [03-courses-modules.md](03-courses-modules.md) | Course CRUD + FSM, module ordering, content types, course review workflow |
| 04 | [04-enrollment-access.md](04-enrollment-access.md) | Enrollment FSM, payment gate, free course bypass, cohort assignment |
| 05 | [05-progress-learning.md](05-progress-learning.md) | Module progress, video heartbeat, quiz scoring, sequential unlock |
| 06 | [06-assignments-submissions.md](06-assignments-submissions.md) | Assignment lifecycle, submission FSM, grading, late policy, max attempts |
| 07 | [07-cohorts-sessions.md](07-cohorts-sessions.md) | Cohort lifecycle, live session FSM, attendance, recording |
| 08 | [08-certificates.md](08-certificates.md) | Certificate issuance, PDF generation, public verification endpoint |
| 09 | [09-analytics.md](09-analytics.md) | Completion rates, learner progress, revenue reports, instructor metrics |
| 10 | [10-backend-logic.md](10-backend-logic.md) | FSMs (6), hooks (8), scheduled jobs (10), business rules, deferred revenue |
| 11 | [11-shell-integration.md](11-shell-integration.md) | Server + web shell wiring, schema export, migration, seed |

### Web UI (Phases 12–19)

| Phase | File | Description |
|-------|------|-------------|
| 12 | [12-web-overview.md](12-web-overview.md) | 3 apps overview, pain points, design rules, full file manifest |
| 13 | [13-web-learner.md](13-web-learner.md) | LearnerDashboard, catalog, module player, quiz UI, certificates page |
| 14 | [14-web-instructor.md](14-web-instructor.md) | InstructorDashboard, course editor (4 tabs), DnD module manager, analytics |
| 15 | [15-web-admin.md](15-web-admin.md) | AdminDashboard, review queue, bulk enroll dialog, instructors, config |
| 16 | [16-web-course-detail.md](16-web-course-detail.md) | CourseDetailPage, EnrollCard, coupon input, reviews section, module row |
| 17 | [17-web-verify-certificate.md](17-web-verify-certificate.md) | Public verify page, PDF template, LinkedIn share button |
| 18 | [18-web-reports.md](18-web-reports.md) | Revenue report (BarChart), instructor analytics, coupon management |
| 19 | [19-web-foundation.md](19-web-foundation.md) | Auth store, LmsLayout, sidebar nav by app, CourseCard, ProgressBar, StatusBadge |

### Operations (Phases 20–22)

| Phase | File | Description |
|-------|------|-------------|
| 20 | [20-data-seeding.md](20-data-seeding.md) | Categories, roles, workflow templates, dev users, sample course + enrollment |
| 21 | [21-compose-credentials-integration.md](21-compose-credentials-integration.md) | Ports, env vars, payment keys, storage (S3), video provider, Vite aliases |
| 22 | [22-missed-integrations.md](22-missed-integrations.md) | Pitfalls + 20-item integration checklist |

---

## Architecture Diagram

```
apps/server (Shell)
  └── .use(lmsCompose)        prefix: /lms

composes/lms/
  server/src/
    index.ts                  ← createLmsCompose(mediator, bus, scheduler)
    routes/
      courses/                ← Phase 3
      enrollments/            ← Phase 4
      learning/               ← Phase 5
      assignments/            ← Phase 6
      cohorts/                ← Phase 7
      certificates/           ← Phase 8
      analytics/              ← Phase 9
    hooks/                    ← Phase 10
    jobs/                     ← Phase 10
    fsm/                      ← Phase 10
    schema/                   ← Phase 2

packages/lms-web/src/
  apps/
    learner/                  ← Phases 14-15
    instructor/               ← Phases 16-17
    admin/                    ← Phase 18
  components/shared/
  api/lms-client.ts
  stores/

apps/web (Shell)
  └── /lms → LmsRouter        ← Phase 11
```

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Enrollment double-submit | Server-side idempotency check: `existingActiveEnrollment` guard |
| Progress % drift | Recompute on every module.complete, not cached |
| Certificate issued without threshold | `enrollment.complete` FSM guard checks `completionPct >= threshold` |
| Free course payment bypass | `free-course-skip-payment` rule — go straight to `active` |
| Quiz retries exceed max | `maxAttempts` enforced at submission create, not UI |
| Video heartbeat spam | Debounce to 1 update per 10s per enrollment per module |
| Deferred revenue timing | Recognition triggered on `module.completed`, not enrollment |
| IRN-equivalent: cert verification | `verificationCode` must be globally unique — use `ulid().slice(-8)` + prefix |
