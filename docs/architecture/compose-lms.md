# Compose — EdTech / Learning Management System

## Course Authoring, Enrollment, Live Learning & Certification

---

## 1. Compose Overview

```
Compose ID:   lms
Version:      1.0.0
Purpose:      Power the full learning lifecycle — course creation and publishing,
              learner enrollment and progress tracking, live cohort sessions,
              graded assessments, and verifiable certificate issuance.
Apps Served:  LearnerApp          → course discovery, enrollment, learning, progress
              InstructorApp       → course authoring, cohort management, grading
              AdminApp            → platform management, analytics, subscriptions
              CertificatePortal   → public certificate verification (no auth)
```

---

## 2. Module Selection & Configuration

```typescript
const LMSCompose: ComposeDefinition = {
  id: "lms",
  name: "Learning Management System",
  modules: [
    "identity", // Actors: admin, instructor, learner — roles + org multi-tenancy
    "catalog", // Course catalog — discovery, categories, pricing, search
    "ledger", // Payments, subscriptions, revenue recognition, refunds
    "workflow", // Course review, assignment grading workflows
    "scheduling", // Live sessions, cohort timelines, recurring class schedules
    "document", // Course materials, assignment submissions, certificate PDFs
    "notification", // Enrollment confirmations, grade notifications, session reminders
    "analytics", // Completion rates, learner progress, revenue, instructor metrics
  ],

  moduleConfig: {
    catalog: {
      itemLabel: "Course",
      enableVariants: false,
      enablePriceLists: true, // individual vs institutional vs group pricing
      enableSearch: true,
      attributes: [
        "level", // 'beginner' | 'intermediate' | 'advanced'
        "language",
        "prerequisites",
        "tags",
        "certificate_offered",
        "completion_threshold", // % required for certificate (default: 80)
      ],
    },
    scheduling: {
      resourceLabel: "Instructor",
      slotLabel: "Live Session",
      enableRecurring: true,
    },
    ledger: {
      baseCurrency: "USD",
      supportedCurrencies: ["USD", "EUR", "INR", "GBP"],
      defaultAccounts: {
        revenue: "ACC-COURSE-REVENUE",
        refunds: "ACC-REFUNDS",
        tax: "ACC-TAX-COLLECTED",
        receivable: "ACC-PAYMENT-RECEIVABLE",
        deferred: "ACC-DEFERRED-REVENUE", // for subscriptions / installment plans
      },
    },
    workflow: {
      processLabel: "Course Review",
    },
  },
};
```

---

## 3. Actor Roles & Permission Matrix

| Role               | Who                                                            |
| ------------------ | -------------------------------------------------------------- |
| `lms-admin`        | Platform admin — full access, billing, instructor management   |
| `content-reviewer` | Reviews and approves courses before publishing                 |
| `instructor`       | Creates courses, grades assignments, manages cohorts           |
| `learner`          | Enrolls in courses, submits assignments, earns certificates    |
| `org-admin`        | B2B tenant admin — manages seats, learner roster for their org |

```
                           lms-admin  reviewer  instructor  learner  org-admin
───────────────────────────────────────────────────────────────────────────────
course:create                  ✓          —          ✓         —         —
course:read                    ✓          ✓          ✓         ✓(pub)    ✓
course:update                  ✓          —          ◑(own)    —         —
course:publish                 ✓          ✓          —         —         —
course:archive                 ✓          —          ◑(own)    —         —

module:create                  ✓          —          ◑(own)    —         —
module:read                    ✓          ✓          ✓         ◑(enr)    ✓
module:update                  ✓          —          ◑(own)    —         —

enrollment:create              ✓          —          —         ✓         ✓
enrollment:read                ✓          —          ◑(own)    ◑(own)    ✓
enrollment:cancel              ✓          —          —         ◑(own)    ✓
enrollment:manage              ✓          —          ◑(own)    —         ✓

cohort:create                  ✓          —          ◑(own)    —         —
cohort:read                    ✓          ✓          ✓         ◑(enr)    ✓
cohort:manage                  ✓          —          ◑(own)    —         —

session:create                 ✓          —          ◑(own)    —         —
session:read                   ✓          —          ✓         ◑(enr)    ✓
session:start                  ✓          —          ◑(own)    —         —

assignment:create              ✓          —          ◑(own)    —         —
assignment:read                ✓          ✓          ✓         ◑(enr)    ✓
submission:create              ✓          —          —         ◑(own)    —
submission:grade               ✓          —          ◑(own)    —         —

certificate:read               ✓          —          —         ◑(own)    ✓
certificate:issue              ✓          —          —         —         —   [system only]
certificate:revoke             ✓          —          —         —         —

analytics:read                 ✓          —          ◑(own)    —         ✓
billing:manage                 ✓          —          —         —         ✓
```

---

## 4. Entity Extensions

---

### Course

```typescript
interface Course extends Entity {
  title: string;
  slug: string; // URL-safe, unique
  description: string; // rich text
  instructorId: ID; // identity.Actor
  categoryId: ID; // catalog.Category
  status: CourseStatus;
  type: CourseType;
  level: CourseLevel;
  language: string; // 'en', 'hi', 'de'
  prerequisites: string[];
  durationHours: number; // estimated total
  moduleCount: number; // computed
  price: Money;
  compareAtPrice?: Money; // for strikethrough pricing
  currency: string;
  enrolledCount: number; // computed, cached
  completedCount: number; // computed, cached
  rating: number; // 0–5, computed from reviews
  reviewCount: number;
  completionThreshold: number; // % of modules to unlock certificate (default: 80)
  tags: string[];
  thumbnailDocId?: ID;
  previewVideoUrl?: string;
  syllabusDocId?: ID;
  certificateTemplate: CertificateTemplate;
  publishedAt?: Timestamp;
  archivedAt?: Timestamp;
}

interface CertificateTemplate {
  title: string; // 'Certificate of Completion'
  body: string; // Handlebars: 'This certifies that {{learnerName}} has...'
  expiresAfterDays?: number; // null = no expiry
  logoDocId?: ID;
}

type CourseStatus = "draft" | "under-review" | "published" | "archived";
type CourseType = "self-paced" | "cohort" | "live-only" | "hybrid";
type CourseLevel = "beginner" | "intermediate" | "advanced" | "all-levels";
```

**Course FSM:**

```
draft ──[course.submit-review]──► under-review
          guard: at least 1 module exists, price set
          entry: [
            emit 'course.submitted-for-review',
            dispatch 'workflow.startProcess' → COURSE_REVIEW
          ]

under-review ──[course.approve]──► published
          guard: role = content-reviewer+
          entry: [
            emit 'course.published',
            assign course.publishedAt = now(),
            dispatch 'catalog.publishItem' → makes course searchable
          ]

under-review ──[course.reject]──► draft
          guard: role = content-reviewer+, rejectionReason required
          entry: [notify instructor with feedback]

published ──[course.archive]──► archived
          guard: no active enrollments OR admin override
          entry: [
            emit 'course.archived',
            dispatch 'catalog.archiveItem'
          ]

archived ──[course.restore]──► draft   [lms-admin only]
```

---

### CourseModule _(named differently from architectural module to avoid collision)_

```typescript
interface CourseModule extends Entity {
  courseId: ID;
  title: string;
  description?: string;
  order: number; // display sequence
  type: CourseModuleType;
  contentRef?: string; // URL for video, article URL
  contentDocId?: ID; // document for downloadable content
  estimatedMinutes: number;
  isFree: boolean; // preview-able without enrollment
  isPublished: boolean;
  requiredPrevious: boolean; // must complete previous module first
}

type CourseModuleType =
  | "video"
  | "article"
  | "quiz"
  | "assignment"
  | "live-session"
  | "download";
```

---

### Enrollment

```typescript
interface Enrollment extends Entity {
  learnerId: ID;
  courseId: ID;
  cohortId?: ID; // null = self-paced
  status: EnrollmentStatus;
  paymentId?: ID; // ledger.Transaction
  couponCode?: string;
  pricePaid: Money;
  completionPct: number; // 0–100, computed from module progress
  completedAt?: Timestamp;
  certificateId?: ID;
  expiresAt?: Timestamp; // for subscription-based access
  lastAccessedAt?: Timestamp;
}

type EnrollmentStatus =
  | "pending-payment"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "refunded";
```

**Enrollment FSM:**

```
pending-payment ──[enrollment.payment-confirmed]──► active
          entry: [
            emit 'enrollment.activated',
            dispatch 'notification.send' → welcome email,
            if cohortId: dispatch 'lms.addToCohort',
            dispatch 'ledger.recognizeRevenue' (or defer if subscription)
          ]

active ──[enrollment.complete]──► completed
          guard: completionPct >= course.completionThreshold
          entry: [
            emit 'enrollment.completed',
            assign enrollment.completedAt = now(),
            dispatch 'lms.issueCertificate'
          ]

active ──[enrollment.expire]──► expired
          (auto-triggered by scheduler when expiresAt passes)
          entry: [emit 'enrollment.expired', notify learner]

active ──[enrollment.cancel]──► cancelled
          guard: not yet completed
          entry: [
            emit 'enrollment.cancelled',
            dispatch 'lms.processRefund' if within refund window
          ]

cancelled ──[enrollment.refund]──► refunded
          entry: [dispatch 'ledger.processRefund']
```

---

### ModuleProgress

```typescript
interface ModuleProgress extends Entity {
  enrollmentId: ID;
  moduleId: ID;
  learnerId: ID; // denormalized
  courseId: ID; // denormalized
  status: ModuleProgressStatus;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  progressPct: number; // 0–100 (for video: % watched)
  quizScore?: number; // if module is quiz
  quizAttempts: number;
  timeSpentSec: number;
}

type ModuleProgressStatus = "not-started" | "in-progress" | "completed";
```

---

### Assignment

```typescript
interface Assignment extends Entity {
  courseId: ID;
  moduleId: ID;
  title: string;
  description: string; // rich text — instructions
  type: AssignmentType;
  dueHoursAfterEnrollment?: number; // relative deadline
  absoluteDueDate?: Timestamp; // for cohort assignments
  maxScore: number;
  passingScore: number;
  allowLateSubmission: boolean;
  maxAttempts: number;
}

type AssignmentType =
  | "quiz"
  | "file-upload"
  | "text-response"
  | "peer-review"
  | "project";
```

---

### Submission

```typescript
interface Submission extends Entity {
  assignmentId: ID;
  learnerId: ID;
  enrollmentId: ID;
  attemptNumber: number;
  status: SubmissionStatus;
  content?: string; // text response
  attachmentIds: ID[]; // uploaded files
  score?: number;
  maxScore: number;
  feedback?: string;
  gradedBy?: ID;
  gradedAt?: Timestamp;
  submittedAt: Timestamp;
}

type SubmissionStatus =
  | "submitted"
  | "grading"
  | "graded"
  | "returned"
  | "late";
```

**Submission FSM:**

```
submitted ──[auto]──► grading
          entry: [
            emit 'submission.received',
            dispatch 'notification.send' → instructor (new submission to grade)
          ]

grading ──[submission.grade]──► graded
          guard: score set, role = instructor+
          entry: [
            emit 'submission.graded',
            assign submission.gradedAt = now(),
            dispatch 'lms.updateModuleProgress' if passing score met
          ]

graded ──[submission.return]──► returned
          entry: [
            emit 'submission.returned',
            dispatch 'notification.send' → learner (grade + feedback)
          ]
```

---

### Certificate

```typescript
interface Certificate extends Entity {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  verificationCode: string; // unique, public — e.g. 'LMS-A1B2C3D4'
  issuedAt: Timestamp;
  expiresAt?: Timestamp;
  documentId: ID; // the PDF stored in document module
  revoked: boolean;
  revokedReason?: string;
  revokedAt?: Timestamp;
}

// Certificate is IMMUTABLE after issuance.
// Revocation sets revoked=true but does not delete the record.
// Public verification endpoint checks: exists AND NOT revoked AND NOT expired
```

---

### Cohort

```typescript
interface Cohort extends Entity {
  courseId: ID;
  name: string; // 'Batch Jan 2025'
  instructorId: ID;
  startDate: Timestamp;
  endDate: Timestamp;
  capacity: number;
  enrolledCount: number; // computed
  status: CohortStatus;
  timezone: string; // 'Asia/Kolkata'
  sessionIds: ID[];
}

type CohortStatus = "scheduled" | "active" | "completed" | "cancelled";
```

---

### LiveSession

```typescript
interface LiveSession extends Entity {
  cohortId: ID;
  courseId: ID; // denormalized
  instructorId: ID;
  title: string;
  scheduledAt: Timestamp;
  durationMinutes: number;
  meetingUrl: string; // Zoom / Meet link
  recordingUrl?: string;
  status: LiveSessionStatus;
  attendeeCount: number; // computed from joins
}

type LiveSessionStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled"
  | "recorded";
```

**LiveSession FSM:**

```
scheduled ──[session.start]──► live
          guard: scheduledAt within ±15 min AND role = instructor
          entry: [
            emit 'session.started',
            dispatch 'realtime.broadcast' → cohort channel,
            dispatch 'notification.send' → all cohort learners
          ]

live ──[session.end]──► ended
          entry: [emit 'session.ended', notify cohort]

ended ──[session.record-uploaded]──► recorded
          entry: [
            emit 'session.recorded',
            dispatch 'notification.send' → cohort (recording available)
          ]

scheduled ──[session.cancel]──► cancelled
          entry: [notify all cohort members]
```

---

## 5. LMS Hooks

### Hook: Enrollment Activated

```typescript
compose.hook({
  on: "enrollment.activated",
  handler: async (event, ctx) => {
    const { enrollmentId, learnerId, courseId, cohortId } = event.payload;
    const [enrollment, course, learner] = await Promise.all([
      ctx.query("lms.getEnrollment", { id: enrollmentId }),
      ctx.query("lms.getCourse", { id: courseId }),
      ctx.query("identity.getActor", { id: learnerId }),
    ]);

    // 1. Send welcome email
    await ctx.dispatch("notification.send", {
      templateKey: "enrollment.confirmed",
      to: learnerId,
      channels: ["email"],
      variables: {
        learnerName: learner.name,
        courseTitle: course.title,
        courseUrl: `${ctx.org.settings.appUrl}/learn/${course.slug}`,
        cohortStart: cohortId
          ? (await ctx.query("lms.getCohort", { id: cohortId })).startDate
          : null,
      },
    });

    // 2. Create module progress records (one per module — all not-started)
    const modules = await ctx.query("lms.getCourseModules", { courseId });
    for (const mod of modules) {
      await ctx.dispatch("lms.createModuleProgress", {
        enrollmentId,
        moduleId: mod.id,
        learnerId,
        courseId,
      });
    }

    // 3. Recognize or defer revenue in ledger
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-PAYMENT-RECEIVABLE",
      credit:
        course.type === "self-paced"
          ? "ACC-COURSE-REVENUE"
          : "ACC-DEFERRED-REVENUE",
      amount: enrollment.pricePaid,
      reference: enrollmentId,
      referenceType: "Enrollment",
      description: `Enrollment: ${course.title} — ${learner.email}`,
    });

    // 4. Update course enrolledCount
    await ctx.dispatch("lms.incrementEnrolledCount", { courseId });

    // 5. Schedule inactivity nudge job
    ctx.scheduler.runOnce(
      `enrollment-nudge:${enrollmentId}`,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      { enrollmentId, learnerId, courseId },
      async (job) => {
        const progress = await ctx.query("lms.getEnrollmentProgress", {
          id: job.data.enrollmentId,
        });
        if (progress.completionPct === 0) {
          await ctx.dispatch("notification.send", {
            templateKey: "enrollment.nudge",
            to: job.data.learnerId,
            channels: ["email"],
            variables: {
              courseTitle: course.title,
              courseUrl: `.../${course.slug}`,
            },
          });
        }
      },
    );
  },
});
```

---

### Hook: Module Completed

```typescript
compose.hook({
  on: "module.completed",
  handler: async (event, ctx) => {
    const { moduleId, enrollmentId, learnerId, courseId } = event.payload;

    // 1. Recalculate enrollment completion %
    const [allModules, completedModules] = await Promise.all([
      ctx.query("lms.getCourseModules", { courseId }),
      ctx.query("lms.getCompletedModules", { enrollmentId }),
    ]);

    const completionPct = Math.round(
      (completedModules.length / allModules.length) * 100,
    );
    await ctx.dispatch("lms.updateEnrollmentProgress", {
      enrollmentId,
      completionPct,
    });

    // 2. Update deferred revenue — recognize proportionally
    const enrollment = await ctx.query("lms.getEnrollment", {
      id: enrollmentId,
    });
    if (enrollment.pricePaid.amount > 0) {
      const portion = enrollment.pricePaid.amount / allModules.length;
      await ctx.dispatch("ledger.postTransaction", {
        debit: "ACC-DEFERRED-REVENUE",
        credit: "ACC-COURSE-REVENUE",
        amount: { amount: portion, currency: enrollment.pricePaid.currency },
        reference: `${enrollmentId}:${moduleId}`,
        referenceType: "ModuleCompletion",
        description: `Revenue recognition: module completed`,
      });
    }

    // 3. Unlock next module if sequential learning enabled
    const course = await ctx.query("lms.getCourse", { id: courseId });
    const nextModule = allModules.find(
      (m) => m.order === /* current module order */ 0 + 1,
    );
    if (nextModule?.requiredPrevious) {
      await ctx.dispatch("lms.unlockModule", {
        enrollmentId,
        moduleId: nextModule.id,
      });
      await ctx.dispatch("notification.send", {
        templateKey: "module.unlocked",
        to: learnerId,
        channels: ["in_app"],
        variables: { moduleTitle: nextModule.title, courseTitle: course.title },
      });
    }

    // 4. Check if course complete → trigger enrollment FSM
    if (completionPct >= course.completionThreshold) {
      await ctx.dispatch("lms.completeEnrollment", { enrollmentId });
    }
  },
});
```

---

### Hook: Enrollment Completed → Issue Certificate

```typescript
compose.hook({
  on: "enrollment.completed",
  handler: async (event, ctx) => {
    const { enrollmentId, learnerId, courseId } = event.payload;
    const [enrollment, course, learner] = await Promise.all([
      ctx.query("lms.getEnrollment", { id: enrollmentId }),
      ctx.query("lms.getCourse", { id: courseId }),
      ctx.query("identity.getActor", { id: learnerId }),
    ]);

    // 1. Generate certificate PDF
    const verificationCode = `LMS-${ulid().slice(-8).toUpperCase()}`;
    const expiresAt = course.certificateTemplate.expiresAfterDays
      ? new Date(
          Date.now() + course.certificateTemplate.expiresAfterDays * 86400000,
        )
      : undefined;

    const pdfDocId = await ctx.dispatch("document.generatePDF", {
      templateKey: "certificate",
      variables: {
        learnerName: learner.name,
        courseTitle: course.title,
        completionDate: new Date().toLocaleDateString(),
        verificationCode,
        verifyUrl: `${ctx.org.settings.appUrl}/verify/${verificationCode}`,
        instructorName: (
          await ctx.query("identity.getActor", { id: course.instructorId })
        ).name,
      },
    });

    // 2. Create Certificate entity
    const cert = await ctx.dispatch("lms.createCertificate", {
      enrollmentId,
      learnerId,
      courseId,
      verificationCode,
      issuedAt: new Date(),
      expiresAt,
      documentId: pdfDocId,
    });

    // 3. Update enrollment with certificateId
    await ctx.dispatch("lms.updateEnrollment", {
      enrollmentId,
      certificateId: cert.id,
    });

    // 4. Send certificate email
    await ctx.dispatch("notification.send", {
      templateKey: "certificate.issued",
      to: learnerId,
      channels: ["email"],
      variables: {
        learnerName: learner.name,
        courseTitle: course.title,
        verificationCode,
        verifyUrl: `${ctx.org.settings.appUrl}/verify/${verificationCode}`,
        downloadUrl: `${ctx.org.settings.appUrl}/certificates/${cert.id}/download`,
      },
    });

    // 5. Analytics
    await ctx.dispatch("analytics.captureMetric", {
      key: "lms.course.completion",
      value: 1,
      dimensions: { courseId, instructorId: course.instructorId },
    });
  },
});
```

---

### Hook: Submission Graded

```typescript
compose.hook({
  on: "submission.graded",
  handler: async (event, ctx) => {
    const { submissionId, score, maxScore, learnerId, moduleId } =
      event.payload;

    // 1. Return submission to learner (triggers notification)
    await ctx.dispatch("lms.returnSubmission", { submissionId });

    // 2. If passing → mark module complete
    const assignment = await ctx.query("lms.getAssignmentByModule", {
      moduleId,
    });
    if (score >= assignment.passingScore) {
      await ctx.dispatch("lms.completeModule", {
        moduleId,
        learnerId,
        quizScore: score,
      });
    }
  },
});
```

---

### Hook: Live Session Starting Soon

```typescript
compose.hook({
  on: "session.reminder-trigger", // emitted by scheduler job
  handler: async (event, ctx) => {
    const { sessionId, minutesBefore } = event.payload;
    const session = await ctx.query("lms.getSession", { id: sessionId });
    const cohort = await ctx.query("lms.getCohort", { id: session.cohortId });
    const enrollments = await ctx.query("lms.getCohortEnrollments", {
      cohortId: cohort.id,
    });

    for (const enrollment of enrollments.filter((e) => e.status === "active")) {
      await ctx.dispatch("notification.send", {
        templateKey: "session.reminder",
        to: enrollment.learnerId,
        channels: ["in_app", ...(minutesBefore <= 30 ? ["email"] : [])],
        variables: {
          sessionTitle: session.title,
          startsAt: session.scheduledAt,
          meetingUrl: session.meetingUrl,
          minutesBefore,
        },
      });
    }
  },
});
```

---

## 6. Business Rules

```typescript
compose.rules([
  // Free courses skip payment gate — enrollment goes straight to active
  {
    id: "free-course-skip-payment",
    scope: "enrollment:create",
    condition: { field: "course.price.amount", op: "eq", value: 0 },
    action: "set-status",
    value: "active",
  },

  // Learner cannot enroll in same course twice while active
  {
    id: "no-duplicate-active-enrollment",
    scope: "enrollment:create",
    guard: {
      field: "existingActiveEnrollmentCount",
      op: "eq",
      value: 0,
    },
  },

  // Certificate requires minimum completion threshold
  {
    id: "certificate-requires-completion-threshold",
    scope: "enrollment:complete",
    guard: {
      field: "enrollment.completionPct",
      op: "gte",
      value: { ref: "course.completionThreshold" },
    },
  },

  // Assignment submission blocked after due date (unless late submission allowed)
  {
    id: "assignment-no-late-submission",
    scope: "submission:create",
    guard: {
      or: [
        { field: "assignment.allowLateSubmission", op: "eq", value: true },
        {
          field: "now",
          op: "lte",
          value: { ref: "assignment.absoluteDueDate" },
        },
      ],
    },
  },

  // Max attempts per assignment
  {
    id: "assignment-max-attempts",
    scope: "submission:create",
    guard: {
      field: "submission.attemptNumber",
      op: "lte",
      value: { ref: "assignment.maxAttempts" },
    },
  },

  // Course cannot be published without at least 1 module
  {
    id: "course-publish-requires-module",
    scope: "course:submit-review",
    guard: { field: "course.moduleCount", op: "gt", value: 0 },
  },

  // Course cannot be published without a price set (0 is valid for free courses)
  {
    id: "course-publish-requires-price",
    scope: "course:submit-review",
    guard: { field: "course.price", op: "exists" },
  },

  // Sequential modules: must complete previous before starting next
  {
    id: "module-sequential-lock",
    scope: "module:start",
    guard: {
      or: [
        { field: "module.requiredPrevious", op: "eq", value: false },
        {
          field: "previousModuleProgress.status",
          op: "eq",
          value: "completed",
        },
      ],
    },
  },

  // Cohort max capacity
  {
    id: "cohort-capacity-limit",
    scope: "cohort:enroll",
    guard: {
      field: "cohort.enrolledCount",
      op: "lt",
      value: { ref: "cohort.capacity" },
    },
  },

  // Refund window: 14 days from enrollment (configurable)
  {
    id: "refund-within-window",
    scope: "enrollment:cancel",
    condition: {
      field: "daysSinceEnrollment",
      op: "lte",
      value: { ref: "config.refundWindowDays" },
    },
    action: "allow-refund",
  },
]);
```

---

## 7. API Routes

```
Base URL: /v1
Auth:     Bearer JWT — all routes require authentication unless marked public

── Catalog (Public) ──────────────────────────────────────────────────
GET    /lms/courses                        public          ← published only
GET    /lms/courses/:slug                  public
GET    /lms/categories                     public
GET    /lms/search?q=                      public          ← catalog.SearchAdapter
GET    /lms/courses/:id/modules            public (free/preview) or enrollment-gated

── Auth ──────────────────────────────────────────────────────────────
POST   /lms/auth/register                  public
POST   /lms/auth/login                     public
POST   /lms/auth/logout                    learner
POST   /lms/auth/forgot-password           public
POST   /lms/auth/reset-password            public

── Enrollment ────────────────────────────────────────────────────────
GET    /lms/enrollments                    learner:own     ← my enrollments
POST   /lms/enrollments                    learner
GET    /lms/enrollments/:id                learner:own
POST   /lms/enrollments/:id/cancel         learner:own
GET    /lms/enrollments/:id/progress       learner:own

── Learning ──────────────────────────────────────────────────────────
GET    /lms/learn/:courseSlug              learner (enrolled)
GET    /lms/learn/:courseSlug/modules/:id  learner (enrolled + unlocked)
POST   /lms/learn/:courseSlug/modules/:id/complete  learner (enrolled)
POST   /lms/learn/:courseSlug/modules/:id/progress  learner ← heartbeat (video %)

── Assignments & Submissions ─────────────────────────────────────────
GET    /lms/assignments/:id                learner (enrolled)
POST   /lms/assignments/:id/submissions    learner (enrolled) submission:create
GET    /lms/submissions/:id                learner:own
GET    /lms/assignments/:id/submissions    instructor:own  ← all submissions for grading
POST   /lms/submissions/:id/grade         instructor:own   submission:grade
GET    /lms/submissions/:id/feedback       learner:own

── Certificates ──────────────────────────────────────────────────────
GET    /lms/certificates                   learner:own
GET    /lms/certificates/:id               learner:own
GET    /lms/certificates/:id/download      learner:own     ← PDF download
GET    /lms/verify/:code                   public          ← certificate verification

── Live Sessions ─────────────────────────────────────────────────────
GET    /lms/cohorts/:id/sessions           learner (enrolled)
GET    /lms/sessions/:id                   learner (enrolled)
POST   /lms/sessions/:id/start             instructor:own  session:start
POST   /lms/sessions/:id/end               instructor:own

── Instructor Portal ──────────────────────────────────────────────────
GET    /lms/instructor/courses             instructor:own  course:read
POST   /lms/instructor/courses             instructor      course:create
GET    /lms/instructor/courses/:id         instructor:own
PATCH  /lms/instructor/courses/:id         instructor:own  course:update
POST   /lms/instructor/courses/:id/submit-review  instructor:own
GET    /lms/instructor/courses/:id/modules        instructor:own
POST   /lms/instructor/courses/:id/modules        instructor:own  module:create
PATCH  /lms/instructor/modules/:id               instructor:own  module:update
DELETE /lms/instructor/modules/:id               instructor:own
GET    /lms/instructor/courses/:id/enrollments    enrollment:read (own course)
GET    /lms/instructor/courses/:id/analytics      analytics:read (own course)
GET    /lms/instructor/cohorts                    instructor:own
POST   /lms/instructor/cohorts                    cohort:create
PATCH  /lms/instructor/cohorts/:id                cohort:manage
POST   /lms/instructor/cohorts/:id/sessions       session:create
GET    /lms/instructor/assignments/:id/submissions    submission:grade
POST   /lms/instructor/submissions/:id/grade          submission:grade

── Admin Portal ──────────────────────────────────────────────────────
GET    /lms/admin/courses                  course:read    ← all courses
POST   /lms/admin/courses/:id/approve      course:publish
POST   /lms/admin/courses/:id/reject       course:publish
GET    /lms/admin/enrollments              enrollment:manage
GET    /lms/admin/learners                 actor:manage
POST   /lms/admin/learners/:id/suspend     actor:manage
GET    /lms/admin/certificates             certificate:read
POST   /lms/admin/certificates/:id/revoke  certificate:revoke
GET    /lms/admin/analytics/overview       analytics:read
GET    /lms/admin/analytics/revenue        analytics:read
GET    /lms/admin/analytics/courses        analytics:read
GET    /lms/admin/analytics/instructors    analytics:read
PATCH  /lms/admin/settings                 lms-admin only

── Webhooks ──────────────────────────────────────────────────────────
POST   /webhooks/payment   → enrollment payment → activate enrollment
POST   /webhooks/zoom      → session recording ready → update session
```

---

## 8. Notification Templates

| Key                        | Channel        | Trigger                                    |
| -------------------------- | -------------- | ------------------------------------------ |
| `enrollment.confirmed`     | email          | Enrollment activated (payment confirmed)   |
| `enrollment.nudge`         | email          | No progress in 7 days                      |
| `enrollment.expiring-soon` | email          | Access expiry in 30, 7, 1 day              |
| `enrollment.expired`       | email          | Access expired                             |
| `module.unlocked`          | in_app         | Next module available (sequential mode)    |
| `assignment.due-soon`      | in_app + email | 24h before assignment deadline             |
| `assignment.overdue`       | in_app + email | Assignment past due, not submitted         |
| `submission.received`      | in_app         | New submission — notifies instructor       |
| `submission.returned`      | in_app + email | Grade + feedback returned to learner       |
| `certificate.issued`       | email          | Certificate issued with download link      |
| `certificate.expiring`     | email          | Certificate expiry in 30, 7, 1 day         |
| `session.reminder`         | in_app + email | 1 day and 30 min before live session       |
| `session.recording-ready`  | in_app + email | Recording available after session ends     |
| `session.cancelled`        | in_app + email | Session cancelled — cohort notified        |
| `cohort.starting`          | email          | Cohort starts in 7 days                    |
| `course.approved`          | email          | Course approved and published — instructor |
| `course.rejected`          | email          | Course rejected with feedback — instructor |
| `waitlist.spot-available`  | email          | Cohort spot opened — waitlist learner      |

---

## 9. Real-Time Channels

| Channel                                        | Subscribers         | Events                                                         |
| ---------------------------------------------- | ------------------- | -------------------------------------------------------------- |
| `org:{orgId}:lms:session:{sessionId}`          | Cohort + instructor | session state, announcements, presence                         |
| `org:{orgId}:lms:course:{courseId}:instructor` | Instructor          | `enrollment.*`, `submission.*`                                 |
| `org:{orgId}:actor:{actorId}:lms`              | Learner             | `module.unlocked`, `submission.returned`, `certificate.issued` |
| `org:{orgId}:lms:admin`                        | Admins              | `course.submitted-for-review`                                  |

```typescript
// RealTimeBridge registrations
bridge.forward(
  "session.*",
  (e) => `org:${e.orgId}:lms:session:${e.payload.sessionId}`,
);
bridge.forward(
  "enrollment.*",
  (e) => `org:${e.orgId}:lms:course:${e.payload.courseId}:instructor`,
);
bridge.forward(
  "submission.*",
  (e) => `org:${e.orgId}:lms:course:${e.payload.courseId}:instructor`,
);
bridge.forward(
  "module.unlocked",
  (e) => `org:${e.orgId}:actor:${e.payload.learnerId}:lms`,
);
bridge.forward(
  "certificate.issued",
  (e) => `org:${e.orgId}:actor:${e.payload.learnerId}:lms`,
);
```

---

## 10. Scheduled Jobs

```
lms.session-reminders-1day        daily 09:00
  → Find sessions scheduled for tomorrow
  → Emit 'session.reminder-trigger' with minutesBefore=1440

lms.session-reminders-30min       every 15 min
  → Find sessions starting within 30–45 min window
  → Emit 'session.reminder-trigger' with minutesBefore=30

lms.enrollment-expiry-check       daily 07:00
  → Find enrollments where expiresAt < now(), status = active
  → Advance FSM to 'expired'
  → Send expiry notification

lms.enrollment-expiry-warning     daily 07:00
  → Find enrollments expiring in 30, 7, 1 day
  → Send warning notification

lms.assignment-due-reminders      daily 09:00
  → Find assignments due in 24h with no submission from enrolled learners
  → Send reminder notification per learner

lms.learner-inactivity-nudge      weekly Tuesday 10:00
  → Find active enrollments with no module activity in > 7 days
  → Send re-engagement email

lms.cohort-activation             daily 06:00
  → Find cohorts with startDate = today, status = scheduled
  → Advance cohort FSM to 'active'
  → Notify all enrolled learners: cohort has started

lms.certificate-expiry-reminder   weekly Monday 08:00
  → Find certificates expiring in 30, 7, 1 day
  → Notify certificate holders

lms.analytics-snapshot            nightly 02:00
  → Completion rates, enrollment counts, revenue per course
  → Update anl_data_points

lms.deferred-revenue-recognition  monthly 1st 03:00
  → Reconcile deferred revenue → realized for completed cohorts
```

---

## 11. Integrations

```typescript
LMSCompose.integrations = {
  payment:  [StripeAdapter, RazorpayAdapter],   // course purchases, subscriptions
  storage:  [S3Adapter],                         // video assets, PDFs, assignment files, certs
  email:    [ResendAdapter],
  video:    [ZoomAdapter, GoogleMeetAdapter],    // live session hosting
  push:     [FCMAdapter],                        // learner mobile app notifications
};

// Inbound Webhooks
POST /webhooks/payment       → course purchase confirmed → activate enrollment
POST /webhooks/zoom          → recording ready → session.record-uploaded event
```

---

## 12. Seed Data

```typescript
// Roles
[
  { name: "lms-admin",        permissions: ["*:*"] },
  { name: "content-reviewer", permissions: [
    "course:read", "course:publish",
    "module:read", "assignment:read", "analytics:read",
  ]},
  { name: "instructor",       permissions: [
    "course:create", "course:read", "course:update",
    "module:create", "module:read", "module:update",
    "cohort:create", "cohort:read", "cohort:manage",
    "session:create", "session:read", "session:start",
    "assignment:create", "assignment:read",
    "submission:grade",
    "enrollment:read",
    "analytics:read",
  ]},
  { name: "learner",          permissions: [
    "course:read",
    "module:read",
    "enrollment:create", "enrollment:read", "enrollment:cancel",
    "submission:create",
    "certificate:read",
  ]},
  { name: "org-admin",        permissions: [
    "course:read", "enrollment:manage", "enrollment:create",
    "analytics:read", "billing:manage",
    "certificate:read",
  ]},
]

// Default Course Categories
["Technology", "Design", "Business", "Science", "Personal Development", "Language"]

// Course Review Workflow Template
{
  id:         "COURSE_REVIEW",
  entityType: "Course",
  stages: [
    {
      id:    "content-check",
      title: "Content Review",
      tasks: [
        { title: "Review all modules for quality and accuracy", role: "content-reviewer" },
        { title: "Check media assets load correctly",           role: "content-reviewer" },
      ],
    },
    {
      id:    "policy-check",
      title: "Policy & Pricing Check",
      tasks: [
        { title: "Verify pricing and terms are compliant", role: "lms-admin" },
        { title: "Confirm instructor agreement signed",    role: "lms-admin" },
      ],
    },
  ],
}

// Notification Templates
[
  { key: "enrollment.confirmed",    channel: "email", subject: "You're enrolled in {{courseTitle}}", body: "..." },
  { key: "enrollment.nudge",        channel: "email", subject: "Continue your learning: {{courseTitle}}", body: "..." },
  { key: "assignment.due-soon",     channel: "in_app", body: "Assignment due tomorrow: {{assignmentTitle}}" },
  { key: "submission.returned",     channel: "email", subject: "Your assignment has been graded", body: "..." },
  { key: "certificate.issued",      channel: "email", subject: "🎓 Your certificate is ready!", body: "..." },
  { key: "session.reminder",        channel: "email", subject: "Live session starts in {{minutesBefore}} min", body: "..." },
  { key: "course.approved",         channel: "email", subject: "Your course {{courseTitle}} is live!", body: "..." },
  { key: "course.rejected",         channel: "email", subject: "Review needed: {{courseTitle}}", body: "..." },
]

// Config Defaults
{
  compose: "lms",
  config: {
    defaultCompletionThreshold: 80,       // % modules to complete for certificate
    refundWindowDays:           14,
    inactivityNudgeDays:        7,
    sessionReminderMinutes:     [1440, 30], // 1 day + 30 min
    maxQuizAttempts:            3,
    certificateExpiresAfterDays: null,     // null = no expiry by default
  }
}
```
