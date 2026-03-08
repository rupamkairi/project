# LMS Frontend — Full Development Plan

> `compose-lms` · `apps/lms` in Turborepo monorepo  
> Four apps, one compose, one shared stack.

---

## Apps Served

| App                   | Path                    | Auth                                   | Purpose                                                               |
| --------------------- | ----------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| **LearnerApp**        | `apps/lms-learner`      | JWT — `learner` role                   | Course discovery, enrollment, learning player, progress, certificates |
| **InstructorApp**     | `apps/lms-instructor`   | JWT — `instructor` role                | Course authoring, module builder, cohort management, grading          |
| **AdminApp**          | `apps/lms-admin`        | JWT — `lms-admin` / `content-reviewer` | Platform oversight, course review, analytics, billing                 |
| **CertificatePortal** | `apps/lms-certificates` | **None — fully public**                | Public certificate verification via `verificationCode`                |

---

## Stack (consistent with project-setup-web)

| Layer           | Package                                                    |
| --------------- | ---------------------------------------------------------- |
| Base            | Vite + React + TypeScript                                  |
| Routing         | TanStack Router (file-based, typed params + search params) |
| Server State    | TanStack Query                                             |
| API Client      | Eden Treaty → `import type { App } from '@repo/api'`       |
| UI              | shadcn/ui + Radix + Tailwind                               |
| Forms           | react-hook-form + Zod                                      |
| Tables          | TanStack Table (headless, server-side pagination)          |
| Charts          | Recharts                                                   |
| Real-Time       | Native WebSocket (RealTimeGateway channels)                |
| Global UI State | Zustand                                                    |
| File Uploads    | Uppy + S3 presigned URLs                                   |
| Rich Text       | Tiptap (course descriptions, assignment instructions)      |
| Dates           | date-fns                                                   |
| Video Player    | custom wrapper over `<video>` + heartbeat hook             |

---

## Shared Package — `packages/lms-ui`

Before any app is built, extract shared primitives into a Turborepo internal package. All four apps consume from here.

**Contents:**

- `<CourseCard>` — thumbnail, title, instructor, rating, price, level badge
- `<StatusBadge>` — maps entity status strings to colored badges (CourseStatus, EnrollmentStatus, etc.)
- `<ProgressBar>` — `completionPct` prop, animated fill
- `<MoneyDisplay>` — `Money` object → `Intl.NumberFormat` (never raw division)
- `<DateDisplay>` — date-fns wrapper, respects timezone
- `<EmptyState>`, `<ErrorBoundary>`, `<Spinner>`, `<PageHeader>`
- `<DataTable>` — TanStack Table wrapper with server-side pagination shell
- Zod schemas: `courseSchema`, `enrollmentSchema`, `assignmentSchema`, `submissionSchema`, `cohortSchema`
- Type re-exports from `@repo/api`
- `useAuth()` hook — reads JWT, exposes `user`, `role`, `hasRole()`
- `useWs(channel)` hook — manages WS subscription lifecycle per channel

---

## Route Trees

### LearnerApp (`apps/lms-learner`)

```
/login
/register
/forgot-password
/verify-email
/                          ← auth guard: learner role
  /                        ← Course discovery home
  /courses
    /                      ← Course catalog browse + search
    /$slug                 ← Course detail + enroll CTA
  /my-learning
    /                      ← Enrolled courses dashboard
    /$courseSlug           ← Learning player (active enrollment required)
      /                    ← Module list + progress sidebar
      /modules/$moduleId   ← Module content view (video/article/quiz/download)
  /assignments
    /                      ← All pending assignments across enrollments
    /$assignmentId         ← Assignment detail + submission form
    /submissions/$id       ← Returned submission + feedback view
  /certificates
    /                      ← Certificate collection
    /$certId               ← Certificate detail + download
  /account
    /                      ← Profile settings
    /notifications         ← Notification preferences
```

### InstructorApp (`apps/lms-instructor`)

```
/login
/                          ← auth guard: instructor role
  /                        ← Instructor dashboard (summary)
  /courses
    /                      ← My courses list
    /new                   ← Create course (step 1: meta)
    /$courseId
      /                    ← Course overview + status/FSM actions
      /modules             ← Module list + builder
      /modules/new         ← Add module
      /modules/$moduleId   ← Edit module
      /assignments         ← Assignment list for this course
      /assignments/new     ← Create assignment
      /assignments/$id     ← Edit assignment
      /enrollments         ← Who is enrolled
      /analytics           ← Course-scoped analytics
  /cohorts
    /                      ← My cohorts list
    /new                   ← Create cohort
    /$cohortId
      /                    ← Cohort detail + learner roster
      /sessions            ← Session list + schedule
      /sessions/new        ← Schedule a session
      /sessions/$sessionId ← Session detail + start/end controls
  /grading
    /                      ← Submissions inbox (all courses)
    /$submissionId         ← Grade submission + feedback form
```

### AdminApp (`apps/lms-admin`)

```
/login
/                          ← auth guard: lms-admin | content-reviewer
  /                        ← Admin dashboard (platform overview)
  /courses
    /                      ← All courses (all instructors)
    /$courseId             ← Course review panel + approve/reject
  /review-queue
    /                      ← Courses pending review (COURSE_REVIEW workflow)
    /$workflowInstanceId   ← Review checklist (content-check + policy-check stages)
  /learners
    /                      ← All learners
    /$learnerId            ← Learner profile + enrollment history
  /enrollments
    /                      ← All enrollments platform-wide
  /certificates
    /                      ← All issued certificates
    /$certId               ← Certificate detail + revoke action
  /analytics
    /                      ← Platform overview (KPIs)
    /revenue               ← Revenue + deferred revenue charts
    /courses               ← Per-course completion, enrollment, rating
    /instructors           ← Per-instructor metrics
  /notifications
    /                      ← Template list
    /$templateKey          ← Template editor
  /settings
    /                      ← General platform settings [lms-admin only]
    /payments              ← Stripe / Razorpay config
    /team                  ← Team + role management
```

### CertificatePortal (`apps/lms-certificates`)

```
/verify/:code              ← Public. No auth. Renders certificate verification result.
/certificates/:id/download ← PDF download (learner-authenticated or signed URL)
```

---

## Parallel Agent Tracks

---

### Track 0 — Foundation (Prerequisite for all tracks)

**Owner: one agent, blocks everything else.**

**Scope:**

- All four Vite + React + TS app scaffolds in Turborepo
- `packages/lms-ui` shared package with all shared components and hooks listed above
- Eden Treaty client: `src/lib/api.ts` in each app (pointing to correct route prefix: `/lms/*`)
- TanStack Query `QueryClient` setup per app
- WebSocket singleton (`src/lib/ws.ts`) + Zustand `useWsStore` — connection, reconnect, channel registry
- `src/lib/auth.ts` — JWT decode, `hasRole()`, role constants (`LMS_ROLES`)
- TanStack Router setup with auth guard root route per app
- Login page (all three authenticated apps share the same form logic — abstract `<LoginPage>`)
- shadcn/ui + Tailwind init per app, base theme tokens (can be a shared Tailwind preset)
- `useAdminQuery` / `useAdminMutation` typed TanStack Query wrappers
- Zustand stores: `useAuthStore`, `useWsStore`, `useInboxStore` (in_app notifications bell)

**APIs used:** `POST /lms/auth/login`, `POST /lms/auth/logout`, `POST /lms/auth/register`, `POST /lms/auth/forgot-password`

---

## LearnerApp Tracks

### Track L1 — Course Discovery & Catalog

**Depends on:** Track 0

**Scope:** The public-facing (post-login) browse experience.

**Pages:**

**L1a. Home / Discovery** (`/`)

- Featured courses row (curated by admin via settings), categories row, popular courses grid
- Search bar → navigates to `/courses?q=` with typed TanStack Router search params
- `GET /lms/courses?featured=true`, `GET /lms/categories`

**L1b. Course Catalog** (`/courses`)

- TanStack Table-style grid/list toggle
- Server-side filters: category, level (`beginner / intermediate / advanced`), price range (free/paid), language, rating
- All filters URL-synced via TanStack Router typed search params
- `GET /lms/courses` with pagination

**L1c. Course Detail** (`/courses/$slug`)

- Hero section: thumbnail, title, instructor name+avatar, rating stars + review count, enrolled count, last updated
- Tabs: Overview (description, prerequisites, what you'll learn), Curriculum (module list — free preview modules unlocked, rest locked), Instructor bio, Reviews
- Sidebar sticky CTA: price, compare-at strikethrough, Enroll / Buy button
- Enrollment modal: coupon code input + total summary → `POST /lms/enrollments`
- Free courses → immediate activation; paid → redirect to payment URL
- `GET /lms/courses/:slug`, `GET /lms/courses/:id/modules` (preview-gated)

**APIs:** `GET /lms/courses`, `GET /lms/courses/:slug`, `GET /lms/categories`, `GET /lms/search?q=`, `POST /lms/enrollments`

---

### Track L2 — My Learning & Progress Dashboard

**Depends on:** Track 0

**Scope:** The learner's enrolled course management hub.

**Pages:**

**L2a. My Learning** (`/my-learning`)

- Enrolled courses grid: course card + inline progress bar (`completionPct`)
- Tabs: All / In Progress / Completed / Expired
- Sort: last accessed, enrollment date, completion %
- Quick-resume button → navigates to last accessed module
- `GET /lms/enrollments` (own)

**L2b. Learning Player Shell** (`/my-learning/$courseSlug`)

- Two-panel layout: left = module tree sidebar; right = content outlet
- Module sidebar: each entry shows type icon, title, progress checkmark, locked indicator
- Sequential learning: locked modules show lock icon + "Complete previous module to unlock"
- Progress header: course title, overall `completionPct` ring, estimated time remaining
- Enrollment expiry countdown if `expiresAt` is set
- `GET /lms/learn/:courseSlug`, real-time: WS `org:{orgId}:actor:{actorId}:lms` → `module.unlocked` events → invalidate sidebar

**L2c. Module View** (`/my-learning/$courseSlug/modules/$moduleId`)

- **Video module:** `<video>` player with custom controls + heartbeat `POST /lms/learn/:courseSlug/modules/:id/progress` every 10s (saves `progressPct` + `timeSpentSec`)
- **Article module:** Rendered rich text / markdown content from `contentDocId`
- **Download module:** File list with download links (presigned S3 URLs)
- **Quiz module:** Multi-question form (MCQ / true-false), submit → score returned inline, retake if `maxAttempts` not reached
- **Assignment module:** Link-through to assignment detail; shows submission status badge
- **Live session module:** Shows scheduled session card with join URL or recording playback
- Complete button (for article/download types) → `POST /lms/learn/:courseSlug/modules/:id/complete`
- Next / Previous module navigation
- `GET /lms/learn/:courseSlug/modules/:id`, `POST /lms/learn/:courseSlug/modules/:id/complete`, `POST /lms/learn/:courseSlug/modules/:id/progress`

---

### Track L3 — Assignments & Submissions

**Depends on:** Track 0

**Scope:** Learner-side assignment lifecycle.

**Pages:**

**L3a. Assignments Inbox** (`/assignments`)

- List of all assignments across active enrollments
- Grouped by: Pending / Submitted / Graded / Overdue
- Shows: course name, assignment title, type badge, due date relative timer, submission status
- `GET /lms/assignments/:id` (per-enrollment aggregation — may need multiple queries)

**L3b. Assignment Detail & Submission** (`/assignments/$assignmentId`)

- Assignment meta: title, instructions (rich text render), type, due date, max score, attempts remaining
- Submission form — switches by `AssignmentType`:
  - **text-response:** Tiptap rich text editor
  - **file-upload:** Uppy drag-and-drop (PDF, ZIP, images) → S3 presigned upload
  - **quiz:** Inline MCQ form (same component as module quiz)
  - **peer-review:** Instructions + file upload + text reflection
- Submit → `POST /lms/assignments/:id/submissions`
- Previous submissions list (attempt history) with scores if returned
- Attempt counter display (e.g. "2 of 3 attempts used")

**L3c. Returned Submission View** (`/assignments/submissions/$id`)

- Grade display: score / maxScore + visual percentage ring
- Pass/fail badge
- Instructor feedback (rich text render)
- Original submission content display
- `GET /lms/submissions/:id/feedback`

**Real-Time:** WS `org:{orgId}:actor:{actorId}:lms` → `submission.returned` → toast notification + invalidate `['submissions']`

---

### Track L4 — Certificates & Account

**Depends on:** Track 0

**Pages:**

**L4a. Certificate Collection** (`/certificates`)

- Grid of earned certificates: course thumbnail, course title, issued date, expiry badge (if applicable)
- Each card: Download PDF button + View button
- Expired certificates shown with "Expired" badge
- `GET /lms/certificates`

**L4b. Certificate Detail** (`/certificates/$certId`)

- Full certificate preview (rendered HTML or PDF embed)
- Verification code display with copy-to-clipboard
- Public verification link: `<app-url>/verify/<code>`
- Download PDF → `GET /lms/certificates/:id/download`
- `GET /lms/certificates/:id`

**L4c. Account & Notification Preferences** (`/account`, `/account/notifications`)

- Profile: name, avatar upload (Uppy → S3), email (read-only), timezone
- Notification prefs: toggles per channel (email / in_app / push) per notification type
- Change password form
- `PATCH /store/account` (identity module endpoint)

---

## InstructorApp Tracks

### Track I1 — Course Authoring

**Depends on:** Track 0  
**This is the most complex track in the entire LMS.**

**Pages:**

**I1a. My Courses List** (`/courses`)

- Table: course thumbnail, title, status badge (draft / under-review / published / archived), module count, enrolled count, avg rating, last updated
- FSM action buttons per row: Submit for Review (draft), Archive (published) — role-gated
- `GET /lms/instructor/courses`

**I1b. Create Course** (`/courses/new`)

- Multi-step wizard (react-hook-form + Zod across steps — state preserved in wizard Zustand slice):
  1. **Basics:** title, slug (auto-derived, editable), level, language, category, tags, prerequisites (tag input)
  2. **Media:** thumbnail upload (Uppy → S3), preview video URL, syllabus PDF upload
  3. **Pricing:** price, compare-at price, currency; free toggle (zeroes price)
  4. **Certificate:** `certificateTemplate.title`, body (Handlebars editor with variable reference sidebar: `{{learnerName}}`, `{{courseTitle}}`, etc.), `expiresAfterDays`, logo upload
  5. **Review:** summary of all fields → submit
- `POST /lms/instructor/courses`

**I1c. Course Overview** (`/courses/$courseId`)

- Status banner: current FSM state + allowed transitions as action buttons
  - Draft → "Submit for Review" button → `POST /lms/instructor/courses/:id/submit-review`
  - Published → "Archive" button (guard: no active enrollments)
- Course stats: enrolled count, completion rate, avg rating
- Quick-edit metadata inline or navigate to edit form
- `GET /lms/instructor/courses/:id`

**I1d. Module Builder** (`/courses/$courseId/modules`)

- Drag-and-drop ordered list of modules (react-beautiful-dnd or dnd-kit)
- Each row: type icon, title, estimated minutes, `isFree` toggle (preview), `isPublished` toggle, edit button
- "Add Module" → inline type selector (video / article / quiz / assignment / live-session / download)
- `GET /lms/instructor/courses/:id/modules`, `POST /lms/instructor/courses/:id/modules` (reorder via PATCH)

**I1e. Module Editor** (`/courses/$courseId/modules/new` & `/modules/$moduleId`)

- Fields common to all: title, description, `estimatedMinutes`, `requiredPrevious` toggle, `isFree` toggle
- Type-specific fields:
  - **video:** video URL input (YouTube / Vimeo / direct S3) or file upload
  - **article:** Tiptap rich text editor (full toolbar)
  - **download:** File upload (Uppy) + display name
  - **quiz:** Question builder (add/remove/reorder MCQ questions with correct answer flagging)
  - **assignment:** Links to assignment (created separately under `/assignments`)
  - **live-session:** Links to a cohort session (picker)
- `POST /lms/instructor/courses/:id/modules`, `PATCH /lms/instructor/modules/:id`

**I1f. Assignment Manager** (`/courses/$courseId/assignments`, `/assignments/new`, `/assignments/$id`)

- List: title, type badge, due config (relative / absolute), max score, submission count
- Create/edit form: title, instructions (Tiptap), type selector, `dueHoursAfterEnrollment` or `absoluteDueDate`, `maxScore`, `passingScore`, `allowLateSubmission`, `maxAttempts`
- `POST`, `PATCH` assignment endpoints

**I1g. Enrolled Learners** (`/courses/$courseId/enrollments`)

- Table: learner name, email, enrollment date, completion %, status badge, last accessed date
- Filter by status (active / completed / expired)
- Row click → view learner progress detail (module-by-module breakdown)
- `GET /lms/instructor/courses/:id/enrollments`

**I1h. Course Analytics** (`/courses/$courseId/analytics`)

- Enrollment trend chart (Recharts) — daily new enrollments over time
- Completion funnel — % of learners who completed each module in sequence
- Avg time per module bar chart
- Assessment score distribution histogram
- `GET /lms/instructor/courses/:id/analytics`

---

### Track I2 — Cohort & Session Management

**Depends on:** Track 0

**Pages:**

**I2a. Cohorts List** (`/cohorts`)

- Table: cohort name, linked course, status badge, start/end dates, capacity / enrolled count, instructor
- Status badges: scheduled / active / completed / cancelled
- `GET /lms/instructor/cohorts`

**I2b. Create / Edit Cohort** (`/cohorts/new` & `/$cohortId`)

- Form: name, linked course (searchable select), start date, end date, capacity, timezone select
- Date range picker (date-fns integration)
- `POST /lms/instructor/cohorts`, `PATCH /lms/instructor/cohorts/:id`

**I2c. Cohort Detail** (`/cohorts/$cohortId`)

- Header: cohort name, course, status badge, date range, capacity fill bar
- **Learner Roster tab:** enrolled learners table with completion %, session attendance
- **Sessions tab:** sessions list + "Schedule Session" button
- Cohort FSM action: cancel button (with confirmation + reason)
- `GET /lms/instructor/cohorts/:id`

**I2d. Schedule Session** (`/cohorts/$cohortId/sessions/new`)

- Form: title, `scheduledAt` (datetime picker), `durationMinutes`, meeting URL (Zoom/Meet), recurrence toggle (weekly pattern)
- `POST /lms/instructor/cohorts/:id/sessions`

**I2e. Session Detail & Live Controls** (`/cohorts/$cohortId/sessions/$sessionId`)

- Session meta: title, scheduled time, duration, meeting URL (clickable)
- Status badge + FSM action buttons:
  - Scheduled → "Start Session" → `POST /lms/sessions/:id/start` (guard: within ±15 min of scheduledAt)
  - Live → "End Session" → `POST /lms/sessions/:id/end`
  - Live → "Cancel" with reason
- Recording section: shows recording URL once `session.record-uploaded` WS event arrives
- Attendee count (real-time from WS channel `org:{orgId}:lms:session:{sessionId}`)
- **Real-Time:** WS `org:{orgId}:lms:session:{sessionId}` → broadcast session state changes live

---

### Track I3 — Grading Inbox

**Depends on:** Track 0

**Pages:**

**I3a. Submissions Inbox** (`/grading`)

- Table: learner name, course, assignment title, type badge, submitted at, attempt #, status (submitted / grading / graded)
- Filter: course, assignment, status
- Unread badge count in sidebar nav (from WS `submission.received` events)
- `GET /lms/instructor/assignments/:id/submissions` (aggregated across all instructor's assignments)

**I3b. Grade Submission** (`/grading/$submissionId`)

- Left panel: submission content display
  - Text response: rendered rich text
  - File uploads: download links for each attachment
  - Quiz: answers with correct/incorrect flags
- Right panel: grading form
  - Score input (numeric, max displayed)
  - Feedback editor (Tiptap — supports formatted feedback)
  - Pass/fail indicator auto-computed from `passingScore`
  - "Return to Learner" submit button → `POST /lms/instructor/submissions/:id/grade`
- Submission FSM state shown: `submitted → grading → graded → returned`
- Previous attempts list (if `maxAttempts > 1`)
- `GET` + `POST /lms/instructor/submissions/:id/grade`

**Real-Time:** WS `org:{orgId}:lms:course:{courseId}:instructor` → `submission.*` → invalidate `['submissions']`, show toast "New submission from [learner name]"

---

## AdminApp Tracks

### Track A1 — Admin Dashboard & Analytics

**Depends on:** Track 0

**Pages:**

**A1a. Admin Dashboard** (`/`)

- KPI cards: total active learners, courses published, enrollments this month, revenue this month, completion rate platform-wide, certificates issued
- Revenue chart: Recharts line/bar, toggle period (7d / 30d / 90d) — includes deferred vs realized revenue
- Top 5 courses by enrollment table
- Top 5 instructors by completion rate table
- `GET /lms/admin/analytics/overview`

**A1b. Revenue Analytics** (`/analytics/revenue`)

- Realized vs deferred revenue stacked area chart (Recharts)
- Revenue breakdown by course table
- Refund rate trend
- `GET /lms/admin/analytics/revenue`

**A1c. Course Analytics** (`/analytics/courses`)

- Per-course table: enrollments, completion rate, avg score, rating, revenue generated
- Sortable, filterable by category / instructor / status
- `GET /lms/admin/analytics/courses`

**A1d. Instructor Analytics** (`/analytics/instructors`)

- Per-instructor table: active courses, total enrolled learners, avg completion rate across courses, total revenue generated
- `GET /lms/admin/analytics/instructors`

---

### Track A2 — Course Review & Management

**Depends on:** Track 0

**Pages:**

**A2a. All Courses** (`/courses`)

- Table: course title, instructor, category, status badge, enrolled count, rating, submitted at
- Filter: status (`draft / under-review / published / archived`), instructor, category
- `GET /lms/admin/courses`

**A2b. Review Queue** (`/review-queue`)

- Filtered view of courses with `status = under-review`, ordered by submission date
- Each row shows: course, instructor, submitted at, workflow stage (content-check vs policy-check)
- Badge: "Awaiting your action" when the next task belongs to the current user's role
- **Real-Time:** WS `org:{orgId}:lms:admin` → `course.submitted-for-review` → live badge count update
- `GET /lms/admin/courses?status=under-review`

**A2c. Course Review Panel** (`/review-queue/$workflowInstanceId`)

- Course detail preview (read-only): all metadata, module list, pricing, certificate template
- COURSE_REVIEW workflow checklist:
  - **Stage 1 — Content Review** (role: `content-reviewer`):
    - ☐ Review all modules for quality and accuracy
    - ☐ Check media assets load correctly
  - **Stage 2 — Policy Check** (role: `lms-admin`):
    - ☐ Verify pricing and terms are compliant
    - ☐ Confirm instructor agreement signed
- Task completion: check off tasks → updates workflow instance
- Final actions (after all tasks complete):
  - "Approve & Publish" → `POST /lms/admin/courses/:id/approve`
  - "Reject" (with required reason textarea) → `POST /lms/admin/courses/:id/reject`
- Rejection sends `course.rejected` notification with reason to instructor

---

### Track A3 — Learner, Enrollment & Certificate Management

**Depends on:** Track 0

**Pages:**

**A3a. Learners** (`/learners`)

- Table: name, email, enrolled course count, completed courses, last active, status badge
- Filters: status (active/suspended), search by name/email
- `GET /lms/admin/learners`

**A3b. Learner Detail** (`/learners/$learnerId`)

- Profile header: avatar, name, email, joined date, status badge
- Stats row: active enrollments, completed courses, certificates earned
- Enrollments table with completion % and status
- Actions: Suspend learner → `POST /lms/admin/learners/:id/suspend` (store-admin only, with confirmation modal)
- `GET /lms/admin/learners/:id` + enrollment list

**A3c. All Enrollments** (`/enrollments`)

- Platform-wide enrollment table: learner, course, status, enrollment date, completion %, price paid
- Filter: status, course, date range
- `GET /lms/admin/enrollments`

**A3d. Certificates** (`/certificates`)

- Table: verification code, learner name, course, issued date, expiry, revoked status
- Filter: revoked, expiring soon, course
- `GET /lms/admin/certificates`

**A3e. Certificate Detail + Revoke** (`/certificates/$certId`)

- Certificate preview (same component as LearnerApp)
- Issued to / course / issued date / expiry
- Verification status: Valid / Revoked / Expired
- "Revoke Certificate" button [lms-admin only] → confirmation modal with reason input → `POST /lms/admin/certificates/:id/revoke`
- Note: revocation sets `revoked=true` — record is immutable, never deleted

---

### Track A4 — Notifications & Settings

**Depends on:** Track 0  
**Role guard:** `lms-admin` only for settings; `lms-admin` + `content-reviewer` for notifications read.

**Pages:**

**A4a. Notification Template List** (`/notifications`)

- Table: key, channel badge (email / in_app / push), trigger description, last updated
- Full 17-template list from compose-lms mapped here

**A4b. Template Editor** (`/notifications/$templateKey`)

- Channel-specific fields: `subject` (email only), `body`
- Handlebars-aware editor — highlight `{{variable}}` tokens in color
- Available variables sidebar (derived per template key — e.g. `enrollment.confirmed` → `learnerName`, `courseTitle`, `courseUrl`)
- Preview pane: render template with mock variable values
- `GET` + `PATCH /lms/admin/notification-templates/:key`

**A4c. General Settings** (`/settings`)

- Platform name, logo, support email, default timezone, default completion threshold
- `GET /lms/admin/settings`, `PATCH /lms/admin/settings`

**A4d. Payment Settings** (`/settings/payments`)

- Active gateway toggle: Stripe / Razorpay
- API key inputs (masked), webhook secret inputs
- Test connection button
- Supported currencies multi-select

**A4e. Team Management** (`/settings/team`)

- Team member list: name, email, role badge (lms-admin / content-reviewer)
- Invite by email + role assignment
- Remove member

---

## CertificatePortal Track

### Track C1 — Public Verification

**Depends on:** Track 0 (minimal — just Vite scaffold + Tailwind, no auth)

**Pages:**

**C1a. Verify Page** (`/verify/:code`)

- URL param: `verificationCode` (e.g. `LMS-A1B2C3D4`)
- On load: `GET /lms/verify/:code`
- **Valid:** Green shield icon, learner name, course title, issued date, expiry (if set). "This certificate is authentic."
- **Revoked:** Red icon. "This certificate has been revoked." (reason shown if available)
- **Expired:** Amber icon. "This certificate expired on [date]."
- **Not Found:** 404 state. "No certificate found for this code."
- No loading skeletons needed — simple fetch-on-mount, single result
- Minimal UI — designed for sharing on LinkedIn etc. Print-friendly CSS.

**C1b. PDF Download** (`/certificates/:id/download`)

- Authenticated or signed URL redirect → streams PDF from S3 via document module

---

## Cross-Cutting Implementation Notes

### Auth Guard (per app)

```typescript
// Each app's root route beforeLoad
beforeLoad: ({ context }) => {
  if (!context.auth.isAuthenticated) throw redirect({ to: "/login" });
  // App-specific role check:
  // LearnerApp:    hasRole('learner')
  // InstructorApp: hasRole('instructor')
  // AdminApp:      hasRole('lms-admin') || hasRole('content-reviewer')
};
```

### Role-Gated UI

`<Can permission="course:publish">` component backed by auth store. Renders `null` if insufficient role. Never rely on UI hiding alone — backend enforces with 403.

### WebSocket Integration (per app)

```typescript
// Channels to subscribe per app:
// LearnerApp:    org:{orgId}:actor:{actorId}:lms
// InstructorApp: org:{orgId}:lms:course:{courseId}:instructor (dynamic per course visited)
//                org:{orgId}:lms:session:{sessionId}       (on session detail page)
// AdminApp:      org:{orgId}:lms:admin
```

On WS event → Zustand dispatch → TanStack Query `invalidateQueries` on relevant keys.

### Video Progress Heartbeat (Module Player)

```typescript
// useVideoProgress hook
// Fires every 10s while video is playing
// POST /lms/learn/:courseSlug/modules/:id/progress
// payload: { progressPct: number, timeSpentSec: number }
// On tab visibility change (Page Visibility API) → flush immediately
// Debounce: skip if progressPct hasn't changed by > 2%
```

### Sequential Module Unlocking

Module sidebar reads `ModuleProgress.status` per module. If `requiredPrevious=true` and previous module not completed → show lock overlay. WS `module.unlocked` event → invalidate `['learn', courseSlug]` → sidebar re-renders with unlocked state automatically.

### Certificate Immutability

Never expose a "delete certificate" button anywhere in any app. The only mutation is `revoke`. UI should make this clear — the revoke button should be destructive-styled with a confirmation dialog that explains the action is permanent.

### Deferred Revenue Display

In admin revenue analytics, always display deferred (ACC-DEFERRED-REVENUE) and realized (ACC-COURSE-REVENUE) as separate stacked bars — never sum them, as this misrepresents actual earned revenue for the platform.

### TanStack Table Pattern (consistent across all apps)

- `page` + `pageSize` as URL search params (typed)
- `sortBy` + `sortDir` as URL search params
- Entity-specific filter keys as URL search params
- Column visibility per table key stored in Zustand

### Zod Schema Strategy

All form schemas in `packages/lms-ui/src/schemas/`. Mirror backend validation. Import into both form renderers and TanStack Query mutation handlers for pre-flight client validation.

---

## Delivery Order

```
Week 1:  Track 0 — Foundation (all 4 app scaffolds + shared package)
Week 2:  Track L1 + Track L2 + Track I1a/I1b/I1c (Discovery, My Learning shell, Course CRUD) — parallel
Week 3:  Track L2c + Track L3 + Track I1d/I1e/I1f (Module player, Assignments, Module builder) — parallel
Week 4:  Track I2 + Track I3 + Track A1 + Track A2 (Cohorts, Grading, Admin dashboard, Review queue) — parallel
Week 5:  Track L4 + Track A3 + Track A4 + Track C1 (Certificates, Learner mgmt, Settings, Portal) — parallel
Week 6:  Real-time integration pass, role guard audit, E2E tests, polish
```

---

## Agent Assignment Map

| Agent   | Tracks                                                  | Complexity     |
| ------- | ------------------------------------------------------- | -------------- |
| Agent A | Track 0 (Foundation + shared package)                   | High — blocker |
| Agent B | Tracks L1 + L4 (Discovery + Certificates)               | Medium         |
| Agent C | Track L2 (My Learning + Module Player)                  | High           |
| Agent D | Track L3 (Assignments + Submissions — Learner side)     | Medium         |
| Agent E | Track I1 (Course Authoring — all sub-tracks)            | Very High      |
| Agent F | Track I2 (Cohorts + Sessions)                           | Medium         |
| Agent G | Track I3 (Grading Inbox)                                | Medium         |
| Agent H | Track A1 + A2 (Admin Dashboard + Review Queue)          | Medium         |
| Agent I | Track A3 + A4 (Learner Mgmt + Settings + Notifications) | Medium         |
| Agent J | Track C1 (Certificate Portal)                           | Low            |

Agents B–J unlock fully once Track 0 is merged. Agents E and C have the longest tails — plan for two agents on each if timeline is tight.
