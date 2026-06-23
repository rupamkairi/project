# LMS Compose — Agent Start

**Read first:** `plans/AGENT-START.md` (universal bootstrap: path aliases, layer rules, existing modules, compose pattern).

Then return here for LMS-specific context.

---

## Goal

Implement LMS compose covering the full learning lifecycle:
- **Course authoring:** instructor creates courses, modules, quizzes, assignments
- **Review pipeline:** content-reviewer approves before publish
- **Enrollment:** payment gate → active access, cohort assignment
- **Learning:** module progress, video heartbeat, sequential unlock, quiz scoring
- **Live sessions:** cohort-based live classes, recording, attendance
- **Grading:** assignment submission, instructor grading, feedback return
- **Certificates:** automatic issuance on completion, PDF generation, public verification

Three front-end apps: LearnerApp, InstructorApp, AdminApp.

---

## Phase Execution Order

### Backend + Shell

1. `01-foundation.md` — package structure, compose factory, permissions, roles. **Start here.**
2. `02-entities.md` — all DB tables (courses, modules, enrollments, progress, assignments, submissions, cohorts, sessions, certificates).
3. `03-courses-modules.md` — course CRUD + FSM, module ordering, content types.
4. `04-enrollment-access.md` — enrollment FSM, payment gate, free course bypass, duplicate guard.
5. `05-progress-learning.md` — module progress, video heartbeat, quiz scoring, sequential unlock.
6. `06-assignments-submissions.md` — assignment lifecycle, submission FSM, grading, late policy.
7. `07-cohorts-sessions.md` — cohort lifecycle, live session FSM, recording, attendance.
8. `08-certificates.md` — certificate issuance, PDF via document module, public verify endpoint.
9. `09-analytics.md` — completion rates, learner progress, revenue, instructor metrics, org-admin reports.
10. `10-backend-logic.md` — FSMs (6 entities), hooks (8), jobs (10), business rules, deferred revenue.
11. `11-shell-integration.md` — server + web wiring, schema export, migration, seed.

### Web UI Detail (read after Phase 11)

12. `12-web-overview.md` — 3 apps (Learner/Instructor/Admin), pain points, design rules, file manifest.
13. `13-web-foundation.md` — `LmsApiClient`, auth stores, shared layout, permission guard.
14. `14-web-learner-catalog.md` — course discovery, categories, search, pricing, PLP + PDP.
15. `15-web-learner-learning.md` — enrolled dashboard, module player, progress bar, quiz UI, certificate page.
16. `16-web-instructor-authoring.md` — course builder, module editor, assignment creator, publish flow.
17. `17-web-instructor-cohorts.md` — cohort management, session scheduling, grading dashboard.
18. `18-web-admin.md` — course moderation queue, learner management, analytics, settings.
19. `19-web-certificates.md` — certificate viewer, download, public `/verify/:code` page.

### Operations Reference (read before starting)

**Read `22-missed-integrations.md` before Phase 1.**

20. `20-data-seeding.md` — categories, roles, workflow templates, dev users, sample course + enrollment.
21. `21-compose-credentials-integration.md` — ports, env vars, payment keys, storage, video provider, Vite aliases.
22. `22-missed-integrations.md` — all pitfalls + 20-item checklist.

---

## Compose Identity

| Property | Value |
|----------|-------|
| Compose name | `lms` |
| Server package | `@projectx/lms-compose` |
| Web package | `@projectx/lms-web` |
| Elysia prefix | `/lms` |
| Export fn | `createLmsCompose(mediator, bus, scheduler)` |
| Export type | `LmsApp` |
| DB table prefix | `lms_` |
| Drizzle object prefix | `lms` (e.g. `lmsCourse`, `lmsEnrollment`) |

---

## DB Tables

### Master tables (read/filter only — already exist)

These tables are owned by foundation modules. LMS compose never creates or migrates them. Filter by `organizationId` + `type`.

| Master table | Filter | LMS meaning |
|-------------|--------|-------------|
| `cat_items` | `type = "course"` | Courses (title, sku/course code, pricing via cat_price_lists) |
| `persons` | `type = "student"` | Learners |
| `persons` | `type = "instructor"` | Instructors |
| `transactions` | `type = "order"` | Enrollments (personId → student, lines → course item) |
| `activities` | `type = "meeting"` | Live sessions (subject, dueAt, actorId → instructor) |
| `pipelines` + `pipeline_stages` | `entityType = "lms.enrollment"` | Enrollment pipeline: Enrolled → In Progress → Completed \| Dropped |
| `pipelines` + `pipeline_stages` | `entityType = "lms.course"` | Course pipeline: Draft → Review → Published \| Archived |

> Never recreate courses/students/instructors as standalone tables; filter cat_items/persons by type. See `docs/master-tables.md`.
>
> Use `seedPipeline(orgId, 'lms.enrollment', stages)` from `apps/server/src/infra/db/seed.ts`.

### Detail tables (lms-owned, create these)

| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `lmsCourseDetail` | `lms_course_detail` | id, organizationId, itemId (cat_items), instructorId (persons), level, durationHours, language, prerequisites (jsonb), certificateTemplateId, isPublished, publishedAt |
| `lmsModule` | `lms_modules` | id, organizationId, itemId (cat_items — course), title, position, isPublished |
| `lmsLesson` | `lms_lessons` | id, organizationId, moduleId, title, position, contentType (video\|text\|pdf\|embed\|quiz), contentUrl, durationMinutes, isFree, isPublished |
| `lmsAssignment` | `lms_assignments` | id, organizationId, moduleId, title, instructions, dueOffsetDays, maxScore |
| `lmsSubmission` | `lms_submissions` | id, organizationId, assignmentId, personId (persons — student), submittedAt, content, score, gradedAt, feedback |
| `lmsQuiz` | `lms_quizzes` | id, organizationId, lessonId, title, passingScore, timeLimitMinutes |
| `lmsQuizQuestion` | `lms_quiz_questions` | id, organizationId, quizId, question, type (mcq\|true_false\|short_answer), position, options (jsonb), explanation |
| `lmsCertificate` | `lms_certificates` | id, organizationId, transactionId (transactions — enrollment), personId, issuedAt, certificateNo, expiresAt, templateId |
| `lmsCohort` | `lms_cohorts` | id, organizationId, itemId (cat_items — course), name, startDate, endDate, maxSize |
| `lmsCohortMember` | `lms_cohort_members` | id, organizationId, cohortId, personId (persons — student), enrolledAt, transactionId |
| `lmsProgress` | `lms_progress` | id, organizationId, personId (persons — student), lessonId, completedAt, watchedSeconds, score; unique (organizationId, personId, lessonId) |
| `lmsDiscussion` | `lms_discussions` | id, organizationId, lessonId, personId, body, createdAt |
| `lmsDiscussionReply` | `lms_discussion_replies` | id, organizationId, discussionId, personId, body, createdAt |

---

## Key FSMs

1. **Course FSM:** `draft → under-review → published | rejected → archived → draft`
2. **Enrollment FSM:** `pending-payment → active → completed | expired | cancelled → refunded`
3. **ModuleProgress FSM:** `not-started → in-progress → completed`
4. **Submission FSM:** `submitted → grading → graded → returned`
5. **LiveSession FSM:** `scheduled → live → ended → recorded | cancelled`
6. **Cohort FSM:** `scheduled → active → completed | cancelled`

---

## Modules via Mediator

| Need | Mediator type prefix |
|------|---------------------|
| Actor/org/roles | `identity.*` |
| Course catalog + search | `catalog.listItems` with `type: "course"` |
| Student / instructor listing | `party.listPersons` with `type: "student"` or `type: "instructor"` |
| Enrollment creation | `commerce.createTransaction` with `type: "order"`, lines referencing course item |
| Live session creation | `activity.log` with `type: "meeting"` |
| Payments | `ledger.postTransaction` + payment adapter |
| Approval workflows | `workflow.startProcess` |
| File storage / PDF gen | `document.generatePDF`, `document.create` |
| Notifications | `notification.send` |
| Analytics | `analytics.track`, `analytics.captureMetric` |
| Scheduling (live sessions) | `scheduling.book`, `scheduling.cancel` |

### Backend route pattern for master reads

```typescript
// GET /lms/courses
const result = await mediator.query({
  type: "catalog.listItems",
  orgId: actor.orgId, actorId: actor.id,
  payload: { type: "course", page, limit }
})

// GET /lms/students
const result = await mediator.query({
  type: "party.listPersons",
  orgId: actor.orgId, actorId: actor.id,
  payload: { type: "student", page, limit }
})
```

Module/lesson/assignment CRUD and progress tracking operate directly on Drizzle lms_ detail tables.
