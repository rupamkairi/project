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

## DB Tables (19 total)

| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `lmsCourse` | `lms_courses` | id, orgId, slug, instructorId, categoryId, status, type, level, price, completionThreshold, certificateTemplate (jsonb) |
| `lmsCourseModule` | `lms_course_modules` | id, courseId, title, type, order, contentRef, estimatedMinutes, isFree, isPublished, requiredPrevious |
| `lmsEnrollment` | `lms_enrollments` | id, learnerId, courseId, cohortId, status, pricePaid, completionPct, completedAt, certificateId, expiresAt |
| `lmsModuleProgress` | `lms_module_progress` | id, enrollmentId, moduleId, learnerId, courseId, status, startedAt, completedAt, progressPct, quizScore, timeSpentSec |
| `lmsAssignment` | `lms_assignments` | id, courseId, moduleId, type, dueHoursAfterEnrollment, absoluteDueDate, maxScore, passingScore, allowLateSubmission, maxAttempts |
| `lmsSubmission` | `lms_submissions` | id, assignmentId, learnerId, enrollmentId, attemptNumber, status, content, attachmentIds, score, feedback, gradedBy, gradedAt |
| `lmsQuizQuestion` | `lms_quiz_questions` | id, moduleId, question, type (mcq/text/true-false), options (jsonb), correctAnswer, points |
| `lmsCohort` | `lms_cohorts` | id, courseId, name, instructorId, startDate, endDate, capacity, enrolledCount, status, timezone |
| `lmsLiveSession` | `lms_live_sessions` | id, cohortId, courseId, instructorId, title, scheduledAt, durationMinutes, meetingUrl, recordingUrl, status, attendeeCount |
| `lmsSessionAttendance` | `lms_session_attendance` | id, sessionId, learnerId, joinedAt, leftAt, durationMinutes |
| `lmsCertificate` | `lms_certificates` | id, enrollmentId, learnerId, courseId, verificationCode, issuedAt, expiresAt, documentId, revoked, revokedReason |
| `lmsReview` | `lms_reviews` | id, courseId, learnerId, enrollmentId, rating, comment, isVerified, createdAt |
| `lmsCategory` | `lms_categories` | id, orgId, name, slug, parentId, order, isActive |
| `lmsWaitlist` | `lms_waitlist` | id, cohortId, learnerId, joinedAt, notifiedAt, status |
| `lmsCoupon` | `lms_coupons` | id, orgId, code, type (pct/fixed), value, maxUses, usedCount, courseIds (jsonb), expiresAt, isActive |
| `lmsOrgConfig` | `lms_org_config` | orgId, defaultCompletionThreshold, refundWindowDays, inactivityNudgeDays, maxQuizAttempts, certificateExpiresAfterDays |

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
| Course catalog + search | `catalog.*` |
| Payments | `ledger.postTransaction` + payment adapter |
| Approval workflows | `workflow.startProcess` |
| File storage / PDF gen | `document.generatePDF`, `document.create` |
| Notifications | `notification.send` |
| Analytics | `analytics.track`, `analytics.captureMetric` |
| Scheduling (live sessions) | `scheduling.book`, `scheduling.cancel` |
