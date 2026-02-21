# LMS Compose

A comprehensive Learning Management System compose for the ProjectX platform.

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [Entities](#4-entities)
5. [State Machines (FSMs)](#5-state-machines-fsms)
6. [API Reference Summary](#6-api-reference-summary)
7. [Scheduled Jobs](#7-scheduled-jobs)
8. [Hooks](#8-hooks)
9. [Business Rules](#9-business-rules)
10. [Integrations](#10-integrations)
11. [Configuration](#11-configuration)
12. [Development](#12-development)

---

## 1. Overview

### What is LMS Compose

LMS Compose is a full-featured Learning Management System implementation that provides course creation, enrollment management, progress tracking, certificate generation, cohort-based learning, and live session management. It follows the compose architecture pattern, integrating with core platform modules while providing domain-specific business logic.

### Architecture Position

LMS Compose operates at **Layer 3 - Compose** in the platform architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 4: Applications                     │
│              (Server, Worker, CLI, Frontend)                 │
├─────────────────────────────────────────────────────────────┤
│                    Layer 3: Composes                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │   LMS   │ │   CRM   │ │   HRM   │ │   POS   │ ...       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
├───────┼──────────┼──────────┼──────────┼───────────────────┤
│       │          │          │          │    Layer 2: Modules│
│       └──────────┴──────────┴──────────┴───────────────────│
│                      Identity, Catalog, Ledger, Workflow,   │
│                      Scheduling, Document, Notification,    │
│                      Analytics                               │
├─────────────────────────────────────────────────────────────┤
│                    Layer 1: Core                             │
│         CQRS, Event Sourcing, FSM, Rules, Realtime          │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature                    | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| **Course Management**      | Create, publish, and manage courses with multiple module types          |
| **Enrollment System**      | Flexible enrollment with payment integration and expiry management      |
| **Progress Tracking**      | Fine-grained progress tracking per module with completion thresholds    |
| **Certificate Generation** | Automatic PDF certificate generation with verification codes            |
| **Cohort-Based Learning**  | Scheduled cohorts with capacity management and instructor assignment    |
| **Live Sessions**          | Integrated video conferencing (Zoom/Google Meet) with recording support |
| **Assignment System**      | Multiple assignment types with grading workflow                         |
| **Payment Integration**    | Stripe and Razorpay adapters for payment processing                     |
| **Real-time Updates**      | WebSocket support for live session state and presence                   |
| **Analytics**              | Built-in analytics snapshots and reporting                              |

---

## 2. Quick Start

### Installation

```bash
# Add LMS Compose to your project
pnpm add @projectx/lms-compose
```

### Basic Setup

```typescript
import { createLMSCompose, type LMSConfig } from "@projectx/lms-compose";

const config: LMSConfig = {
  adapters: {
    payment: {
      provider: "stripe",
      apiKey: process.env.STRIPE_API_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    },
    videoMeeting: {
      provider: "zoom",
      apiKey: process.env.ZOOM_API_KEY!,
      apiSecret: process.env.ZOOM_API_SECRET!,
    },
  },
  features: {
    enableCertificates: true,
    enableCohorts: true,
    enableLiveSessions: true,
    enableQuizzes: true,
    enablePeerReview: false,
  },
  defaults: {
    completionThreshold: 80,
    refundWindowDays: 14,
    inactivityNudgeDays: 7,
    sessionReminderMinutes: [1440, 30],
    maxQuizAttempts: 3,
    certificateExpiresAfterDays: null,
  },
};

const lmsModule = createLMSCompose(config);
```

### Running Seed Data

```typescript
import { seedLMSData, type SeedContext } from "@projectx/lms-compose";

const ctx: SeedContext = {
  db: databaseClient,
  organizationId: "org_123",
};

await seedLMSData(ctx);
```

Seed data includes:

- **Roles**: `lms-admin`, `content-reviewer`, `instructor`, `learner`, `org-admin`
- **Categories**: Technology, Design, Business, Science, Personal Development, Language
- **Workflow Template**: Course Review workflow
- **Notification Templates**: 17 templates for all LMS events
- **Ledger Accounts**: Revenue, Refunds, Tax, Receivable, Deferred Revenue

---

## 3. Architecture

### Directory Structure

```
composes/lms/
├── index.ts              # Main module export and LMSComposeModule class
├── types/
│   └── index.ts          # Type definitions for entities and primitives
├── db/
│   └── schema/
│       ├── index.ts      # Drizzle ORM schema definitions
│       └── helpers.ts    # Schema utilities (base columns, money columns)
├── fsm/
│   └── index.ts          # State machine definitions
├── commands/
│   └── index.ts          # Command handlers (write operations)
├── queries/
│   └── index.ts          # Query handlers (read operations)
├── events/
│   └── index.ts          # Domain event definitions and factories
├── hooks/
│   └── index.ts          # Event-driven hooks/workflows
├── rules/
│   └── index.ts          # Business rule definitions
├── jobs/
│   └── index.ts          # Scheduled job definitions
├── routes/
│   └── index.ts          # HTTP route definitions
├── adapters/
│   └── index.ts          # External service adapters
├── realtime/
│   └── index.ts          # WebSocket/realtime bridge
└── seed/
    └── index.ts          # Seed data and functions
```

### Component Overview

| Component            | Responsibility                                              |
| -------------------- | ----------------------------------------------------------- |
| **LMSComposeModule** | Main module class; handles boot, registration, and shutdown |
| **FSM Engine**       | State machine management for entity lifecycle               |
| **Command Handlers** | Process write operations with validation and event emission |
| **Query Handlers**   | Handle read operations with authorization checks            |
| **Event Bus**        | Pub/sub for domain events                                   |
| **Hooks**            | React to events and trigger side effects                    |
| **Rules Engine**     | Declarative business rule evaluation                        |
| **Scheduler**        | Cron-based job execution                                    |
| **Realtime Bridge**  | WebSocket event forwarding                                  |

### Data Flow Diagram

```
                              ┌─────────────────┐
                              │   HTTP Request  │
                              └────────┬────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│                        Routes Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Catalog    │  │  Learning   │  │  Instructor │  ...     │
│  │  Endpoints  │  │  Endpoints  │  │  Endpoints  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼──────────────────┘
          │                │                │
          ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────┐
│                        CQRS Layer                             │
│  ┌────────────────────────────┐  ┌────────────────────────┐  │
│  │     Command Handlers       │  │    Query Handlers      │  │
│  │  (Create, Update, Delete)  │  │    (Read, Search)      │  │
│  └─────────────┬──────────────┘  └───────────┬────────────┘  │
└────────────────┼─────────────────────────────┼────────────────┘
                 │                             │
                 ▼                             ▼
┌────────────────────────┐      ┌──────────────────────────────┐
│      FSM Engine        │      │        Database              │
│  ┌──────────────────┐  │      │  ┌────────────────────────┐  │
│  │   courseFSM      │  │      │  │    lms_courses         │  │
│  │   enrollmentFSM  │  │      │  │    lms_enrollments     │  │
│  │   submissionFSM  │  │      │  │    lms_certificates    │  │
│  │   liveSessionFSM │  │      │  │    ...                 │  │
│  │   cohortFSM      │  │      │  └────────────────────────┘  │
│  └──────────────────┘  │      └──────────────────────────────┘
└────────────┬───────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│                      Event Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Events    │──│   Hooks     │──│  Adapters   │          │
│  │  (Emit)     │  │ (React)     │  │ (Integrate) │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Entities

### Course

The primary entity representing a learning course.

| Field                 | Type                | Description                                                |
| --------------------- | ------------------- | ---------------------------------------------------------- |
| `id`                  | ID                  | Unique identifier                                          |
| `title`               | string              | Course title                                               |
| `slug`                | string              | URL-friendly identifier                                    |
| `description`         | string              | Course description                                         |
| `instructorId`        | ID                  | Reference to instructor                                    |
| `categoryId`          | ID                  | Reference to category                                      |
| `status`              | CourseStatus        | `draft` \| `under-review` \| `published` \| `archived`     |
| `type`                | CourseType          | `self-paced` \| `cohort` \| `live-only` \| `hybrid`        |
| `level`               | CourseLevel         | `beginner` \| `intermediate` \| `advanced` \| `all-levels` |
| `price`               | Money               | Course price                                               |
| `completionThreshold` | number              | Percentage required for completion (default: 80)           |
| `enrolledCount`       | number              | Total active enrollments                                   |
| `rating`              | number              | Average rating (0-5)                                       |
| `certificateTemplate` | CertificateTemplate | Certificate configuration                                  |

### CourseModule

Individual learning units within a course.

| Field              | Type             | Description                                                                    |
| ------------------ | ---------------- | ------------------------------------------------------------------------------ |
| `courseId`         | ID               | Parent course reference                                                        |
| `title`            | string           | Module title                                                                   |
| `order`            | number           | Display order                                                                  |
| `type`             | CourseModuleType | `video` \| `article` \| `quiz` \| `assignment` \| `live-session` \| `download` |
| `estimatedMinutes` | number           | Estimated completion time                                                      |
| `isFree`           | boolean          | Available without enrollment                                                   |
| `isPublished`      | boolean          | Visible to learners                                                            |
| `requiredPrevious` | boolean          | Requires previous module completion                                            |

### Enrollment

Learner's enrollment in a course.

| Field           | Type             | Description                                                                            |
| --------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `learnerId`     | ID               | Enrolled learner                                                                       |
| `courseId`      | ID               | Enrolled course                                                                        |
| `cohortId`      | ID               | Optional cohort reference                                                              |
| `status`        | EnrollmentStatus | `pending-payment` \| `active` \| `completed` \| `expired` \| `cancelled` \| `refunded` |
| `pricePaid`     | Money            | Amount paid                                                                            |
| `completionPct` | number           | Progress percentage                                                                    |
| `certificateId` | ID               | Issued certificate reference                                                           |
| `expiresAt`     | Timestamp        | Optional access expiry                                                                 |

### ModuleProgress

Tracks learner progress through individual modules.

| Field          | Type                 | Description                                   |
| -------------- | -------------------- | --------------------------------------------- |
| `enrollmentId` | ID                   | Parent enrollment                             |
| `moduleId`     | ID                   | Module being tracked                          |
| `learnerId`    | ID                   | Learner reference                             |
| `status`       | ModuleProgressStatus | `not-started` \| `in-progress` \| `completed` |
| `progressPct`  | number               | Completion percentage                         |
| `quizScore`    | number               | Quiz score if applicable                      |
| `timeSpentSec` | number               | Total time spent                              |

### Assignment

Assessment tasks within courses.

| Field                 | Type           | Description                                                              |
| --------------------- | -------------- | ------------------------------------------------------------------------ |
| `courseId`            | ID             | Parent course                                                            |
| `moduleId`            | ID             | Associated module                                                        |
| `title`               | string         | Assignment title                                                         |
| `type`                | AssignmentType | `quiz` \| `file-upload` \| `text-response` \| `peer-review` \| `project` |
| `maxScore`            | number         | Maximum possible score                                                   |
| `passingScore`        | number         | Minimum passing score                                                    |
| `maxAttempts`         | number         | Allowed attempts                                                         |
| `allowLateSubmission` | boolean        | Accept late submissions                                                  |

### Submission

Learner submissions for assignments.

| Field           | Type             | Description                                                  |
| --------------- | ---------------- | ------------------------------------------------------------ |
| `assignmentId`  | ID               | Assignment reference                                         |
| `learnerId`     | ID               | Submitting learner                                           |
| `attemptNumber` | number           | Attempt count                                                |
| `status`        | SubmissionStatus | `submitted` \| `grading` \| `graded` \| `returned` \| `late` |
| `content`       | string           | Text content                                                 |
| `attachmentIds` | ID[]             | Uploaded files                                               |
| `score`         | number           | Assigned score                                               |
| `feedback`      | string           | Grader feedback                                              |

### Certificate

Completion certificates.

| Field              | Type      | Description              |
| ------------------ | --------- | ------------------------ |
| `enrollmentId`     | ID        | Source enrollment        |
| `learnerId`        | ID        | Certificate holder       |
| `courseId`         | ID        | Completed course         |
| `verificationCode` | string    | Unique verification code |
| `issuedAt`         | Timestamp | Issue date               |
| `expiresAt`        | Timestamp | Optional expiry          |
| `revoked`          | boolean   | Revocation status        |

### Cohort

Scheduled learning groups.

| Field          | Type         | Description                                           |
| -------------- | ------------ | ----------------------------------------------------- |
| `courseId`     | ID           | Associated course                                     |
| `name`         | string       | Cohort name                                           |
| `instructorId` | ID           | Assigned instructor                                   |
| `startDate`    | Timestamp    | Start date                                            |
| `endDate`      | Timestamp    | End date                                              |
| `capacity`     | number       | Maximum enrollment                                    |
| `status`       | CohortStatus | `scheduled` \| `active` \| `completed` \| `cancelled` |

### LiveSession

Scheduled live video sessions.

| Field             | Type              | Description                                                   |
| ----------------- | ----------------- | ------------------------------------------------------------- |
| `cohortId`        | ID                | Parent cohort                                                 |
| `title`           | string            | Session title                                                 |
| `scheduledAt`     | Timestamp         | Scheduled time                                                |
| `durationMinutes` | number            | Session duration                                              |
| `meetingUrl`      | string            | Video meeting URL                                             |
| `recordingUrl`    | string            | Recording URL                                                 |
| `status`          | LiveSessionStatus | `scheduled` \| `live` \| `ended` \| `cancelled` \| `recorded` |

---

## 5. State Machines (FSMs)

### Course FSM Diagram

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
              ┌─────────┐                                     │
              │  DRAFT  │◄────────────────────────────────┐    │
              └────┬────┘                                 │    │
                   │                                      │    │
                   │ submit-review                         │    │
                   │ (requires: modules, price)            │    │
                   ▼                                      │    │
            ┌─────────────┐                               │    │
            │ UNDER-REVIEW│─── reject ────────────────────┘    │
            └──────┬──────┘                                    │
                   │                                           │
                   │ approve                                   │
                   │ (requires: reviewer role)                 │
                   ▼                                           │
            ┌───────────┐                                      │
            │ PUBLISHED │─── archive ────────────────────────┐ │
            └───────────┘   (requires: no active            │ │
                            enrollments OR admin role)      │ │
                                   ▼                        │ │
                            ┌──────────┐                    │ │
                            │ ARCHIVED │──── restore ───────┼─┘
                            └──────────┘  (admin only)      │
                                               ▼             │
                                          [back to DRAFT]────┘
```

### Enrollment FSM Diagram

```
┌──────────────────┐
│ PENDING-PAYMENT  │
└────────┬─────────┘
         │
         │ payment-confirmed
         │
         ▼
   ┌─────────┐─────── complete ────────►┌───────────┐
   │  ACTIVE │                           │ COMPLETED │
   └────┬────┘                           └───────────┘
        │
        ├─── expire ────────►┌─────────┐
        │                    │ EXPIRED │
        │                    └─────────┘
        │
        └─── cancel ────────►┌───────────┐
                             │ CANCELLED │
                             └─────┬─────┘
                                   │
                                   │ refund
                                   │
                                   ▼
                            ┌──────────┐
                            │ REFUNDED │
                            └──────────┘
```

### Submission FSM Diagram

```
┌───────────┐           ┌─────────┐
│ SUBMITTED │─── auto ──►│ GRADING │
└───────────┘           └────┬────┘
                             │
                             │ grade
                             │
                             ▼
                      ┌─────────┐
                      │ GRADED  │
                      └────┬────┘
                           │
                           │ return
                           │
                           ▼
                    ┌───────────┐
                    │ RETURNED  │
                    └───────────┘

┌───────────┐
│   LATE    │─── auto ──► [GRADING]
└───────────┘
```

### LiveSession FSM Diagram

```
┌───────────┐
│ SCHEDULED │───────┐
└─────┬─────┘       │
      │             │ cancel
      │ start       │
      │             ▼
      ▼       ┌───────────┐
┌───────┐     │ CANCELLED │
│  LIVE │     └───────────┘
└───┬───┘
    │
    │ end
    │
    ▼
┌─────────┐
│  ENDED  │
└────┬────┘
     │
     │ record-uploaded
     │
     ▼
┌──────────┐
│ RECORDED │
└──────────┘
```

---

## 6. API Reference Summary

### Catalog Endpoints (Public)

| Method | Path                 | Description            |
| ------ | -------------------- | ---------------------- |
| `GET`  | `/lms/courses`       | List published courses |
| `GET`  | `/lms/courses/:slug` | Get course by slug     |
| `GET`  | `/lms/categories`    | List categories        |
| `GET`  | `/lms/search`        | Search courses         |
| `GET`  | `/lms/verify/:code`  | Verify certificate     |

### Learning Endpoints (Authenticated)

| Method | Path                                          | Description          |
| ------ | --------------------------------------------- | -------------------- |
| `GET`  | `/lms/enrollments`                            | List my enrollments  |
| `POST` | `/lms/enrollments`                            | Create enrollment    |
| `GET`  | `/lms/enrollments/:id`                        | Get enrollment       |
| `POST` | `/lms/enrollments/:id/cancel`                 | Cancel enrollment    |
| `GET`  | `/lms/enrollments/:id/progress`               | Get progress         |
| `GET`  | `/lms/learn/:courseSlug`                      | Course learning page |
| `GET`  | `/lms/learn/:courseSlug/modules/:id`          | Module content       |
| `POST` | `/lms/learn/:courseSlug/modules/:id/complete` | Mark complete        |
| `POST` | `/lms/learn/:courseSlug/modules/:id/progress` | Update progress      |
| `GET`  | `/lms/assignments/:id`                        | Get assignment       |
| `POST` | `/lms/assignments/:id/submissions`            | Submit assignment    |
| `GET`  | `/lms/certificates`                           | List my certificates |
| `GET`  | `/lms/certificates/:id/download`              | Download certificate |
| `GET`  | `/lms/cohorts/:id/sessions`                   | Get cohort sessions  |
| `GET`  | `/lms/sessions/:id`                           | Get session details  |

### Instructor Endpoints

| Method   | Path                                          | Description        |
| -------- | --------------------------------------------- | ------------------ |
| `GET`    | `/lms/instructor/courses`                     | List my courses    |
| `POST`   | `/lms/instructor/courses`                     | Create course      |
| `PATCH`  | `/lms/instructor/courses/:id`                 | Update course      |
| `POST`   | `/lms/instructor/courses/:id/submit-review`   | Submit for review  |
| `POST`   | `/lms/instructor/courses/:id/modules`         | Create module      |
| `PATCH`  | `/lms/instructor/modules/:id`                 | Update module      |
| `DELETE` | `/lms/instructor/modules/:id`                 | Delete module      |
| `GET`    | `/lms/instructor/courses/:id/enrollments`     | Get enrollments    |
| `GET`    | `/lms/instructor/courses/:id/analytics`       | Get analytics      |
| `POST`   | `/lms/instructor/cohorts`                     | Create cohort      |
| `POST`   | `/lms/instructor/cohorts/:id/sessions`        | Create session     |
| `POST`   | `/lms/sessions/:id/start`                     | Start live session |
| `POST`   | `/lms/sessions/:id/end`                       | End live session   |
| `GET`    | `/lms/instructor/assignments/:id/submissions` | List submissions   |
| `POST`   | `/lms/instructor/submissions/:id/grade`       | Grade submission   |

### Admin Endpoints

| Method  | Path                                 | Description          |
| ------- | ------------------------------------ | -------------------- |
| `GET`   | `/lms/admin/courses`                 | List all courses     |
| `POST`  | `/lms/admin/courses/:id/approve`     | Approve course       |
| `POST`  | `/lms/admin/courses/:id/reject`      | Reject course        |
| `GET`   | `/lms/admin/enrollments`             | List all enrollments |
| `GET`   | `/lms/admin/learners`                | List all learners    |
| `POST`  | `/lms/admin/learners/:id/suspend`    | Suspend learner      |
| `GET`   | `/lms/admin/certificates`            | List certificates    |
| `POST`  | `/lms/admin/certificates/:id/revoke` | Revoke certificate   |
| `GET`   | `/lms/admin/analytics/overview`      | Analytics overview   |
| `GET`   | `/lms/admin/analytics/revenue`       | Revenue analytics    |
| `PATCH` | `/lms/admin/settings`                | Update settings      |

### Webhook Endpoints

| Method | Path                | Description             |
| ------ | ------------------- | ----------------------- |
| `POST` | `/webhooks/payment` | Handle payment webhooks |
| `POST` | `/webhooks/zoom`    | Handle Zoom webhooks    |

---

## 7. Scheduled Jobs

| Job ID                             | Schedule       | Description                           |
| ---------------------------------- | -------------- | ------------------------------------- |
| `lms.session-reminders-1day`       | `0 9 * * *`    | Send reminders 1 day before sessions  |
| `lms.session-reminders-30min`      | `*/15 * * * *` | Send reminders 30 min before sessions |
| `lms.enrollment-expiry-check`      | `0 7 * * *`    | Process expired enrollments           |
| `lms.enrollment-expiry-warning`    | `0 7 * * *`    | Send expiry warnings (30, 7, 1 day)   |
| `lms.assignment-due-reminders`     | `0 9 * * *`    | Remind about assignments due in 24h   |
| `lms.learner-inactivity-nudge`     | `0 10 * * 2`   | Re-engagement emails (weekly)         |
| `lms.cohort-activation`            | `0 6 * * *`    | Activate cohorts starting today       |
| `lms.certificate-expiry-reminder`  | `0 8 * * 1`    | Certificate expiry warnings (weekly)  |
| `lms.analytics-snapshot`           | `0 2 * * *`    | Nightly analytics snapshots           |
| `lms.deferred-revenue-recognition` | `0 3 1 * *`    | Monthly revenue reconciliation        |

---

## 8. Hooks

Event-driven workflows that react to domain events:

| Hook                      | Trigger Event              | Actions                                                                                          |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| `enrollmentActivatedHook` | `enrollment.activated`     | Send confirmation email, create module progress records, post ledger transaction, schedule nudge |
| `moduleCompletedHook`     | `module.completed`         | Update overall progress, recognize revenue, unlock next module, check completion threshold       |
| `enrollmentCompletedHook` | `enrollment.completed`     | Generate certificate, send notification, capture analytics                                       |
| `submissionGradedHook`    | `submission.graded`        | Return submission, update module progress if passed                                              |
| `sessionReminderHook`     | `session.reminder-trigger` | Send reminders to enrolled learners                                                              |
| `coursePublishedHook`     | `course.published`         | Publish to catalog, notify instructor                                                            |
| `courseRejectedHook`      | `course.rejected`          | Notify instructor with feedback                                                                  |
| `sessionStartedHook`      | `session.started`          | Broadcast realtime event, notify learners                                                        |
| `sessionEndedHook`        | `session.ended`            | Notify learners                                                                                  |
| `sessionRecordedHook`     | `session.recorded`         | Send recording notification                                                                      |

---

## 9. Business Rules

| Rule ID                        | Scope                  | Description                                      |
| ------------------------------ | ---------------------- | ------------------------------------------------ |
| `freeCourseSkipPayment`        | `enrollment:create`    | Free courses skip payment, set status to active  |
| `noDuplicateActiveEnrollment`  | `enrollment:create`    | Prevent duplicate active enrollments             |
| `certificateRequiresThreshold` | `enrollment:complete`  | Completion must meet threshold for certificate   |
| `assignmentNoLateSubmission`   | `submission:create`    | Reject late submissions unless allowed           |
| `assignmentMaxAttempts`        | `submission:create`    | Enforce maximum attempt limit                    |
| `coursePublishRequiresModule`  | `course:submit-review` | Course must have at least one module             |
| `coursePublishRequiresPrice`   | `course:submit-review` | Course must have price set                       |
| `moduleSequentialLock`         | `module:start`         | Require previous module completion if configured |
| `cohortCapacityLimit`          | `cohort:enroll`        | Enforce cohort capacity                          |
| `refundWithinWindow`           | `enrollment:cancel`    | Allow refund within configured window            |

---

## 10. Integrations

### Payment Adapters

#### Stripe Adapter

```typescript
import { StripeAdapter } from "@projectx/lms-compose";

const stripe = new StripeAdapter({
  apiKey: process.env.STRIPE_API_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});

// Create checkout session
const session = await stripe.createPaymentSession({
  id: "order_123",
  amount: { amount: 9900, currency: "USD" },
  successUrl: "https://app.example.com/success",
  cancelUrl: "https://app.example.com/cancel",
});

// Handle webhook
const result = await stripe.handleWebhook(payload, signature);
```

#### Razorpay Adapter

```typescript
import { RazorpayAdapter } from "@projectx/lms-compose";

const razorpay = new RazorpayAdapter({
  apiKey: process.env.RAZORPAY_KEY_ID!,
  webhookSecret: process.env.RAZORPAY_KEY_SECRET!,
});
```

### Video Conferencing

#### Zoom Adapter

```typescript
import { ZoomAdapter } from "@projectx/lms-compose";

const zoom = new ZoomAdapter({
  apiKey: process.env.ZOOM_API_KEY!,
  apiSecret: process.env.ZOOM_API_SECRET!,
});

// Create meeting
const meeting = await zoom.createMeeting({
  id: "session_123",
  title: "Live Session 1",
  scheduledAt: Date.now(),
  durationMinutes: 60,
  hostId: "instructor_123",
});

// Get recording
const recording = await zoom.getRecording(meeting.id);
```

#### Google Meet Adapter

```typescript
import { GoogleMeetAdapter } from "@projectx/lms-compose";

const gmeet = new GoogleMeetAdapter({
  apiKey: process.env.GOOGLE_API_KEY!,
  apiSecret: process.env.GOOGLE_API_SECRET!,
});
```

### Storage

#### LMS Storage Adapter

```typescript
import { LMSStorageAdapter } from "@projectx/lms-compose";

const storage = new LMSStorageAdapter({
  bucket: "lms-media-bucket",
  region: "us-east-1",
});

// Upload course media
const result = await storage.uploadCourseMedia("course_123", file);

// Generate certificate PDF
const cert = await storage.generateCertificatePDF("template", {
  learnerName: "John Doe",
  courseTitle: "TypeScript Fundamentals",
  completionDate: "2026-02-21",
  verificationCode: "LMS-ABC12345",
  verifyUrl: "https://verify.example.com/LMS-ABC12345",
});
```

---

## 11. Configuration

### Environment Variables

| Variable                | Required    | Description                         |
| ----------------------- | ----------- | ----------------------------------- |
| `STRIPE_API_KEY`        | Conditional | Stripe API key (if using Stripe)    |
| `STRIPE_WEBHOOK_SECRET` | Conditional | Stripe webhook secret               |
| `RAZORPAY_KEY_ID`       | Conditional | Razorpay key ID (if using Razorpay) |
| `RAZORPAY_KEY_SECRET`   | Conditional | Razorpay key secret                 |
| `ZOOM_API_KEY`          | Conditional | Zoom API key                        |
| `ZOOM_API_SECRET`       | Conditional | Zoom API secret                     |
| `AWS_S3_BUCKET`         | No          | S3 bucket for media storage         |
| `AWS_REGION`            | No          | AWS region                          |

### Module Config Options

```typescript
interface LMSConfig {
  adapters?: {
    payment?: {
      provider: "stripe" | "razorpay";
      apiKey: string;
      webhookSecret: string;
    };
    videoMeeting?: {
      provider: "zoom" | "google-meet";
      apiKey: string;
      apiSecret: string;
      webhookSecret?: string;
    };
    storage?: {
      bucket?: string;
      region?: string;
    };
  };
  features?: {
    enableCertificates: boolean; // Default: true
    enableCohorts: boolean; // Default: true
    enableLiveSessions: boolean; // Default: true
    enableQuizzes: boolean; // Default: true
    enablePeerReview: boolean; // Default: false
  };
  defaults?: {
    completionThreshold: number; // Default: 80
    refundWindowDays: number; // Default: 14
    inactivityNudgeDays: number; // Default: 7
    sessionReminderMinutes: number[]; // Default: [1440, 30]
    maxQuizAttempts: number; // Default: 3
    certificateExpiresAfterDays: number | null; // Default: null
  };
}
```

### Module Dependencies

```typescript
const LMSCompose: ComposeDefinition = {
  id: "lms",
  name: "Learning Management System",
  version: "1.0.0",
  modules: [
    "identity", // User management
    "catalog", // Course catalog
    "ledger", // Financial transactions
    "workflow", // Review process
    "scheduling", // Session scheduling
    "document", // Certificate PDFs
    "notification", // Email/push notifications
    "analytics", // Metrics tracking
  ],
  moduleConfig: {
    catalog: {
      itemLabel: "Course",
      enableVariants: false,
      enablePriceLists: true,
      enableSearch: true,
    },
    scheduling: {
      resourceLabel: "Instructor",
      slotLabel: "Live Session",
      enableRecurring: true,
    },
    ledger: {
      baseCurrency: "USD",
      supportedCurrencies: ["USD", "EUR", "INR", "GBP"],
    },
    workflow: {
      processLabel: "Course Review",
    },
  },
};
```

---

## 12. Development

### Running Tests

```bash
# Run all LMS tests
pnpm test composes/lms

# Run specific test file
pnpm test composes/lms/commands/index.test.ts

# Run with coverage
pnpm test:coverage composes/lms
```

### Database Migrations

Migrations are registered in order:

```
0001_lms_categories
0002_lms_courses
0003_lms_course_modules
0004_lms_enrollments
0005_lms_module_progress
0006_lms_assignments
0007_lms_submissions
0008_lms_certificates
0009_lms_cohorts
0010_lms_live_sessions
0011_lms_course_reviews
```

```bash
# Generate migration
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Reset database
pnpm db:reset
```

### Debugging

Enable debug logging:

```typescript
const lmsModule = createLMSCompose({
  // ... config
});

lmsModule.setContext({
  logger: {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta),
    debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta),
  },
  // ... other context
});
```

### Type Exports

```typescript
import type {
  // Entities
  Course,
  CourseModule,
  Enrollment,
  ModuleProgress,
  Assignment,
  Submission,
  Certificate,
  Cohort,
  LiveSession,

  // FSM Types
  CourseState,
  CourseEvent,
  EnrollmentState,
  EnrollmentEvent,
  SubmissionState,
  SubmissionEvent,
  LiveSessionState,
  LiveSessionEvent,
  CohortState,
  CohortEvent,

  // Command Payloads
  CourseCreatePayload,
  EnrollmentCreatePayload,
  SubmissionCreatePayload,
  // ... etc
} from "@projectx/lms-compose";
```

---

## License

MIT
