# LMS Plugin Integration Guide

This guide explains how to integrate the Learning Management System (LMS) plugin into any ProjectX core system.

## Table of Contents

1. [Overview](#1-overview)
2. [Interface Contract](#2-interface-contract)
3. [Basic Integration](#3-basic-integration)
4. [Database Setup](#4-database-setup)
5. [Adapters](#5-adapters)
6. [Events](#6-events)
7. [Commands & Queries](#7-commands--queries)
8. [Real-time](#8-real-time)
9. [Testing](#9-testing)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Overview

### What the LMS Plugin Provides

The LMS plugin is a full-featured Learning Management System compose that provides:

- **Course Management**: Create, update, publish, and archive courses with multiple module types (video, article, quiz, assignment, live-session, download)
- **Enrollment System**: Track learner enrollments with payment integration, progress tracking, and completion certificates
- **Cohort-Based Learning**: Support for cohort-based courses with scheduled live sessions
- **Certificate Generation**: Automatic certificate issuance upon course completion with verification system
- **Assignment & Submission**: Instructor-led grading with multiple submission types
- **Live Sessions**: Integration with video conferencing platforms (Zoom, Google Meet)
- **Payment Processing**: Support for Stripe and Razorpay payment gateways
- **Analytics**: Comprehensive analytics for instructors and administrators

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Core System                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Mediator  │  │  Scheduler  │  │   Logger    │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                     │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│  │  EventBus   │  │  FSMEngine  │  │ RuleEngine  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┴──────┘            │
│         │                │                                     │
│  ┌──────┴──────┐  ┌──────┴──────┐                             │
│  │    Queue    │  │ RealtimeGW  │                             │
│  └──────┬──────┘  └──────┬──────┘                             │
└─────────┼────────────────┼─────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        LMS Plugin                               │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   Commands    │  │    Queries    │  │    Events     │      │
│  │ (42 handlers) │  │ (29 handlers) │  │ (36 types)    │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   FSMs (5)    │  │   Rules (10+) │  │   Jobs (10)   │      │
│  │ course,       │  │ permissions,  │  │ reminders,    │      │
│  │ enrollment,   │  │ guards,       │  │ analytics,    │      │
│  │ submission,   │  │ conditions    │  │ expiry checks │      │
│  │ liveSession,  │  │               │  │               │      │
│  │ cohort        │  │               │  │               │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   Adapters    │  │   Routes      │  │  Realtime     │      │
│  │ Payment,      │  │ REST API      │  │ WebSocket     │      │
│  │ VideoMeeting, │  │ endpoints     │  │ bridge        │      │
│  │ Storage,      │  │               │  │               │      │
│  │ Notification  │  │               │  │               │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Database Schema                       │  │
│  │  categories, courses, modules, enrollments, progress,    │  │
│  │  assignments, submissions, certificates, cohorts, sessions│  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Dependencies

The LMS plugin requires the following core capabilities:

**Required Dependencies:**
| Capability | Purpose |
|------------|---------|
| `eventBus` | Publishing and subscribing to domain events |
| `fsmEngine` | State machine management for courses, enrollments, submissions |
| `ruleEngine` | Permission guards and business rule evaluation |
| `scheduler` | Scheduled job execution (reminders, analytics, etc.) |
| `queue` | Background job processing |
| `database` | PostgreSQL with drizzle-orm |

**Optional Dependencies:**
| Capability | Purpose |
|------------|---------|
| `realtime` | WebSocket broadcasting for live sessions and notifications |
| `payment` | Payment processing (Stripe/Razorpay) |
| `videoMeeting` | Video conferencing integration (Zoom/Google Meet) |
| `storage` | File storage for course materials and certificates |
| `notification` | Email and push notifications |

---

## 2. Interface Contract

### LMSPluginContext Interface

The host system must provide a context object implementing `LMSPluginContext`:

```typescript
interface LMSPluginContext {
  eventBus: EventBus;
  fsmEngine: FSMEngine;
  ruleEngine: RuleEngine;
  queue: Queue;
  scheduler: Scheduler;
  realtime: RealtimeGateway;
  db: DatabaseClient;
  logger: Logger;
  dispatch: <R = unknown>(command: Command) => Promise<R>;
  query: <R = unknown>(query: Query) => Promise<R>;
  config: LMSPluginConfig;
}
```

### Required Interfaces

#### EventBus

```typescript
interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(
    pattern: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): () => void;
}
```

The EventBus enables publish/subscribe messaging. The LMS plugin:

- Publishes events for all state changes (course created, enrollment activated, etc.)
- Subscribes to events for cross-aggregate coordination
- Uses pattern matching for subscriptions (e.g., `enrollment.*`)

#### FSMEngine

```typescript
interface FSMEngine {
  register(machine: StateMachine<string, string>): void;
  transition(
    entityType: string,
    entityId: ID,
    event: string,
    context: unknown,
  ): Promise<unknown>;
  getState(entityType: string, entityId: ID): Promise<string | null>;
}
```

The FSMEngine manages state machines. The LMS plugin registers 5 FSMs:

- `course`: draft → under-review → published → archived
- `enrollment`: pending-payment → active → completed/expired/cancelled
- `submission`: submitted → grading → graded → returned
- `liveSession`: scheduled → live → ended → recorded
- `cohort`: scheduled → active → completed/cancelled

#### RuleEngine

```typescript
interface RuleEngine {
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;
  register(id: string, expr: RuleExpr): void;
  resolve(id: string): RuleExpr | undefined;
}
```

The RuleEngine evaluates business rules. The LMS plugin uses it for:

- Permission guards (can user create course? can learner submit assignment?)
- Business conditions (is enrollment expired? is course publishable?)

#### Scheduler

```typescript
interface Scheduler {
  schedule(
    cron: string,
    name: string,
    data: unknown,
    opts?: { repeat?: { cron: string } },
  ): Promise<void>;
  cancel(name: string): Promise<void>;
}
```

The Scheduler handles cron-based jobs. The LMS plugin schedules 10 jobs:

- Session reminders (1 day and 30 minutes before)
- Enrollment expiry checks and warnings
- Assignment due reminders
- Learner inactivity nudges
- Cohort activation
- Certificate expiry reminders
- Analytics snapshots
- Deferred revenue recognition

#### Queue

```typescript
interface Queue {
  add(name: string, data: unknown, opts?: JobOptions): Promise<Job>;
  getJob(id: ID): Promise<Job | null>;
}
```

The Queue handles background processing for tasks like:

- Certificate generation
- Email notifications
- Analytics processing

#### DatabaseClient

```typescript
interface DatabaseClient {
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
  execute(sql: string, params: unknown[]): Promise<void>;
}
```

The DatabaseClient provides PostgreSQL access. Must be compatible with drizzle-orm query builder.

#### Logger

```typescript
interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
```

The Logger provides structured logging throughout the plugin lifecycle.

#### dispatch and query

```typescript
dispatch: <R = unknown>(command: Command) => Promise<R>;
query: <R = unknown>(query: Query) => Promise<R>;
```

These functions connect to the mediator pattern for:

- `dispatch`: Execute commands that change state
- `query`: Read data without side effects

### Optional Interfaces

#### RealtimeGateway

```typescript
interface RealtimeGateway {
  broadcast(channel: string, event: string, payload: unknown): Promise<void>;
  subscribe(clientId: ID, channels: string[]): void;
  unsubscribe(clientId: ID, channels: string[]): void;
}
```

Enables WebSocket broadcasting for live session updates and real-time notifications.

#### PaymentAdapter

```typescript
interface PaymentAdapter {
  createPaymentSession(order: PaymentOrder): Promise<PaymentSession>;
  capturePayment(sessionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: Money): Promise<RefundResult>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}
```

Integrates payment processing for paid courses.

#### VideoMeetingAdapter

```typescript
interface VideoMeetingAdapter {
  createMeeting(session: MeetingSession): Promise<MeetingDetails>;
  getMeeting(meetingId: string): Promise<MeetingDetails>;
  endMeeting(meetingId: string): Promise<void>;
  getRecording(meetingId: string): Promise<RecordingDetails | null>;
}
```

Integrates video conferencing for live sessions.

#### StorageAdapter

```typescript
interface StorageAdapter {
  upload(
    key: string,
    file: Buffer,
    meta?: Record<string, unknown>,
  ): Promise<StoredFile>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

Handles file uploads for course materials and certificates.

#### NotificationAdapter

```typescript
interface NotificationAdapter {
  send(to: string, message: NotificationPayload): Promise<NotificationResult>;
}
```

Sends email and push notifications to learners and instructors.

---

## 3. Basic Integration

### Step-by-Step Integration

```typescript
import {
  createLMSPlugin,
  type LMSPluginContext,
  type LMSPluginConfig,
} from "@projectx/compose-lms";

async function integrateLMS(coreSystem: CoreSystem) {
  // 1. Create the plugin with configuration
  const lms = createLMSPlugin({
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
    adapters: {
      payment: coreSystem.adapters.stripe,
      videoMeeting: coreSystem.adapters.zoom,
      storage: coreSystem.adapters.s3,
      notification: coreSystem.adapters.email,
    },
  });

  // 2. Prepare the context
  const context: LMSPluginContext = {
    eventBus: coreSystem.eventBus,
    fsmEngine: coreSystem.fsmEngine,
    ruleEngine: coreSystem.ruleEngine,
    queue: coreSystem.queue,
    scheduler: coreSystem.scheduler,
    realtime: coreSystem.realtimeGateway,
    db: coreSystem.database,
    logger: coreSystem.logger.child({ plugin: "lms" }),
    dispatch: coreSystem.mediator.dispatch,
    query: coreSystem.mediator.query,
    config: {} as LMSPluginConfig, // Will be merged by plugin
  };

  // 3. Initialize the plugin
  await lms.init(context);

  // 4. Register routes with your HTTP server
  const routes = lms.getRoutes();
  for (const route of routes) {
    coreSystem.httpServer.registerRoute(route);
  }

  // 5. Jobs are automatically registered with scheduler during init
  // No additional steps needed

  // 6. Get manifest for health checks and monitoring
  const manifest = lms.getManifest();
  console.log("LMS Plugin initialized:", {
    version: manifest.version,
    entities: manifest.entities.length,
    events: manifest.events.length,
    commands: manifest.commands.length,
    queries: manifest.queries.length,
  });

  return lms;
}
```

### Integration with Express/Fastify

```typescript
import { createLMSPlugin, type LMSPluginContext } from "@projectx/compose-lms";
import Fastify from "fastify";

async function setupLMS(fastify: FastifyInstance, context: LMSPluginContext) {
  const lms = createLMSPlugin();
  await lms.init(context);

  const routes = lms.getRoutes();

  for (const route of routes) {
    fastify.route({
      method: route.method,
      url: route.path,
      handler: async (request, reply) => {
        const routeContext = {
          actor: request.user,
          org: request.org,
          correlationId: request.id,
          ...context,
        };
        return route.handler(routeContext, request.body);
      },
    });
  }

  return lms;
}
```

### Plugin Lifecycle

```typescript
// Startup
const lms = createLMSPlugin(config);
await lms.init(context);

// Get plugin information
const manifest = lms.getManifest();
const definition = lms.getComposeDefinition();
const currentConfig = lms.getConfig();

// Shutdown
await lms.shutdown();
```

---

## 4. Database Setup

### Running Migrations

The LMS plugin uses drizzle-orm for database schema management. Run migrations in order:

```bash
# Using drizzle-kit
npx drizzle-kit push

# Or run migrations manually in order:
psql -d your_database -f migrations/0001_lms_categories.sql
psql -d your_database -f migrations/0002_lms_courses.sql
psql -d your_database -f migrations/0003_lms_course_modules.sql
psql -d your_database -f migrations/0004_lms_enrollments.sql
psql -d your_database -f migrations/0005_lms_module_progress.sql
psql -d your_database -f migrations/0006_lms_assignments.sql
psql -d your_database -f migrations/0007_lms_submissions.sql
psql -d your_database -f migrations/0008_lms_certificates.sql
psql -d your_database -f migrations/0009_lms_cohorts.sql
psql -d your_database -f migrations/0010_lms_live_sessions.sql
psql -d your_database -f migrations/0011_lms_course_reviews.sql
```

### Migration List

| Migration                | Tables Created        |
| ------------------------ | --------------------- |
| 0001_lms_categories      | `lms_categories`      |
| 0002_lms_courses         | `lms_courses`         |
| 0003_lms_course_modules  | `lms_course_modules`  |
| 0004_lms_enrollments     | `lms_enrollments`     |
| 0005_lms_module_progress | `lms_module_progress` |
| 0006_lms_assignments     | `lms_assignments`     |
| 0007_lms_submissions     | `lms_submissions`     |
| 0008_lms_certificates    | `lms_certificates`    |
| 0009_lms_cohorts         | `lms_cohorts`         |
| 0010_lms_live_sessions   | `lms_live_sessions`   |
| 0011_lms_course_reviews  | `lms_course_reviews`  |

### Schema Overview

```typescript
import {
  lmsCategories,
  lmsCourses,
  lmsCourseModules,
  lmsEnrollments,
  lmsModuleProgress,
  lmsAssignments,
  lmsSubmissions,
  lmsCertificates,
  lmsCohorts,
  lmsLiveSessions,
  lmsCourseReviews,
} from "@projectx/compose-lms";
```

#### Core Tables

**lms_categories**

- Hierarchical course categories
- Fields: name, slug, parentId, description, sortOrder, status

**lms_courses**

- Main course entity
- Fields: title, slug, description, instructorId, categoryId, status, type, level, price, etc.
- Statuses: draft, under-review, published, archived
- Types: self-paced, cohort, live-only, hybrid

**lms_course_modules**

- Course content modules
- Types: video, article, quiz, assignment, live-session, download
- Fields: title, order, type, contentRef, isFree, isPublished

**lms_enrollments**

- Learner-course relationships
- Statuses: pending-payment, active, completed, expired, cancelled, refunded
- Tracks: completionPct, pricePaid, expiresAt

**lms_module_progress**

- Individual module progress tracking
- Statuses: not-started, in-progress, completed
- Tracks: progressPct, quizScore, timeSpentSec

#### Assessment Tables

**lms_assignments**

- Course assignments
- Types: quiz, file-upload, text-response, peer-review, project
- Fields: title, maxScore, passingScore, dueDate

**lms_submissions**

- Learner submissions
- Statuses: submitted, grading, graded, returned, late
- Fields: content, score, feedback, gradedBy

#### Certification Tables

**lms_certificates**

- Course completion certificates
- Fields: verificationCode, issuedAt, expiresAt, documentId, revoked

#### Cohort Tables

**lms_cohorts**

- Cohort-based course instances
- Statuses: scheduled, active, completed, cancelled
- Fields: name, startDate, endDate, capacity, timezone

**lms_live_sessions**

- Live session scheduling
- Statuses: scheduled, live, ended, cancelled, recorded
- Fields: title, scheduledAt, durationMinutes, meetingUrl, recordingUrl

### Integration with drizzle-orm

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as lmsSchema from "@projectx/compose-lms/db/schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

const db = drizzle(client, {
  schema: {
    ...lmsSchema,
    // ... your other schemas
  },
});
```

---

## 5. Adapters

The LMS plugin supports multiple adapters for external integrations.

### Payment Adapter

#### Using Stripe

```typescript
import { StripeAdapter } from "@projectx/compose-lms";

const stripeAdapter = new StripeAdapter({
  apiKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  logger: logger.child({ adapter: "stripe" }),
});

const lms = createLMSPlugin({
  adapters: { payment: stripeAdapter },
});
```

#### Using Razorpay

```typescript
import { RazorpayAdapter } from "@projectx/compose-lms";

const razorpayAdapter = new RazorpayAdapter({
  apiKey: process.env.RAZORPAY_KEY_ID!,
  webhookSecret: process.env.RAZORPAY_KEY_SECRET!,
  logger: logger.child({ adapter: "razorpay" }),
});

const lms = createLMSPlugin({
  adapters: { payment: razorpayAdapter },
});
```

#### Custom Payment Adapter

```typescript
import type {
  PaymentAdapter,
  PaymentOrder,
  PaymentSession,
  PaymentResult,
  RefundResult,
  WebhookEvent,
} from "@projectx/compose-lms";

class CustomPaymentAdapter implements PaymentAdapter {
  readonly name = "custom";

  async createPaymentSession(order: PaymentOrder): Promise<PaymentSession> {
    // Create payment session with your provider
  }

  async capturePayment(sessionId: string): Promise<PaymentResult> {
    // Capture/verify payment
  }

  async refund(transactionId: string, amount: Money): Promise<RefundResult> {
    // Process refund
  }

  async handleWebhook(
    payload: unknown,
    signature: string,
  ): Promise<WebhookEvent> {
    // Handle webhook from payment provider
  }
}
```

### Video Meeting Adapter

#### Using Zoom

```typescript
import { ZoomAdapter } from "@projectx/compose-lms";

const zoomAdapter = new ZoomAdapter({
  apiKey: process.env.ZOOM_API_KEY!,
  apiSecret: process.env.ZOOM_API_SECRET!,
  webhookSecret: process.env.ZOOM_WEBHOOK_SECRET,
  logger: logger.child({ adapter: "zoom" }),
});

const lms = createLMSPlugin({
  adapters: { videoMeeting: zoomAdapter },
});
```

#### Using Google Meet

```typescript
import { GoogleMeetAdapter } from "@projectx/compose-lms";

const meetAdapter = new GoogleMeetAdapter({
  apiKey: process.env.GOOGLE_API_KEY!,
  apiSecret: process.env.GOOGLE_API_SECRET!,
  logger: logger.child({ adapter: "google-meet" }),
});
```

#### Custom Video Meeting Adapter

```typescript
import type {
  VideoMeetingAdapter,
  MeetingSession,
  MeetingDetails,
  RecordingDetails,
} from "@projectx/compose-lms";

class CustomMeetingAdapter implements VideoMeetingAdapter {
  readonly name = "custom";

  async createMeeting(session: MeetingSession): Promise<MeetingDetails> {
    // Create meeting with your provider
  }

  async getMeeting(meetingId: string): Promise<MeetingDetails> {
    // Get meeting details
  }

  async endMeeting(meetingId: string): Promise<void> {
    // End active meeting
  }

  async getRecording(meetingId: string): Promise<RecordingDetails | null> {
    // Get recording if available
  }
}
```

### Storage Adapter

```typescript
import { LMSStorageAdapter, type StorageAdapter } from "@projectx/compose-lms";

const storageAdapter = new LMSStorageAdapter({
  bucket: "lms-media",
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  logger: logger.child({ adapter: "storage" }),
});

const lms = createLMSPlugin({
  adapters: { storage: storageAdapter },
});
```

#### Custom Storage Adapter

```typescript
import type { StorageAdapter, StoredFile } from "@projectx/compose-lms";

class CustomStorageAdapter implements StorageAdapter {
  readonly name = "custom";

  async upload(
    key: string,
    file: Buffer,
    meta?: Record<string, unknown>,
  ): Promise<StoredFile> {
    // Upload file to your storage
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // Generate signed URL for download
  }

  async delete(key: string): Promise<void> {
    // Delete file
  }
}
```

### Notification Adapter

```typescript
import { EmailAdapter, PushAdapter } from "@projectx/compose-lms";

const emailAdapter = new EmailAdapter({
  apiKey: process.env.SENDGRID_API_KEY!,
  from: "noreply@yourdomain.com",
  logger: logger.child({ adapter: "email" }),
});

const pushAdapter = new PushAdapter({
  apiKey: process.env.FCM_API_KEY!,
  logger: logger.child({ adapter: "push" }),
});
```

### Using createLMSAdapters Helper

```typescript
import { createLMSAdapters } from "@projectx/compose-lms";

const adapters = createLMSAdapters({
  payment: {
    provider: "stripe",
    apiKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
  videoMeeting: {
    provider: "zoom",
    apiKey: process.env.ZOOM_API_KEY!,
    apiSecret: process.env.ZOOM_API_SECRET!,
  },
  storage: {
    bucket: "lms-media",
    region: "us-east-1",
  },
  notifications: {
    email: {
      apiKey: process.env.SENDGRID_API_KEY!,
      from: "noreply@yourdomain.com",
    },
    push: {
      apiKey: process.env.FCM_API_KEY!,
    },
  },
  logger: logger,
});

const lms = createLMSPlugin({ adapters });
```

---

## 6. Events

### Events Emitted by LMS

The LMS plugin emits 36 event types across 8 domains:

#### Course Events

| Event Type                    | When Emitted         | Payload                                                                      |
| ----------------------------- | -------------------- | ---------------------------------------------------------------------------- |
| `course.created`              | Course created       | `{ courseId, title, slug, instructorId, categoryId, status, price }`         |
| `course.updated`              | Course modified      | `{ courseId, title?, description?, instructorId, updatedFields }`            |
| `course.submitted-for-review` | Submitted for review | `{ courseId, title, instructorId, submittedAt }`                             |
| `course.published`            | Course approved      | `{ courseId, title, slug, instructorId, publishedAt }`                       |
| `course.rejected`             | Course rejected      | `{ courseId, title, instructorId, rejectionReason, rejectedBy, rejectedAt }` |
| `course.archived`             | Course archived      | `{ courseId, title, instructorId, archivedAt }`                              |
| `course.restored`             | Course restored      | `{ courseId, title, instructorId, restoredAt }`                              |

#### Enrollment Events

| Event Type             | When Emitted                                     | Payload                                                                             |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `enrollment.created`   | Enrollment created (pending payment)             | `{ enrollmentId, learnerId, courseId, cohortId?, status, pricePaid }`               |
| `enrollment.activated` | Enrollment activated (payment confirmed or free) | `{ enrollmentId, learnerId, courseId, cohortId?, activatedAt }`                     |
| `enrollment.completed` | Course completed                                 | `{ enrollmentId, learnerId, courseId, completionPct, completedAt, certificateId? }` |
| `enrollment.expired`   | Enrollment expired                               | `{ enrollmentId, learnerId, courseId, expiredAt }`                                  |
| `enrollment.cancelled` | Enrollment cancelled                             | `{ enrollmentId, learnerId, courseId, cancelledAt, reason? }`                       |
| `enrollment.refunded`  | Enrollment refunded                              | `{ enrollmentId, learnerId, courseId, refundAmount, refundedAt, paymentId? }`       |

#### Module Events

| Event Type         | When Emitted                          | Payload                                                                                                    |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `module.started`   | Learner starts module                 | `{ moduleProgressId, enrollmentId, moduleId, learnerId, courseId, startedAt }`                             |
| `module.completed` | Module completed                      | `{ moduleProgressId, enrollmentId, moduleId, learnerId, courseId, completedAt, quizScore?, timeSpentSec }` |
| `module.unlocked`  | Module unlocked (sequential progress) | `{ moduleProgressId, enrollmentId, moduleId, learnerId, courseId, unlockedAt }`                            |

#### Assignment Events

| Event Type           | When Emitted        | Payload                                                                                                                 |
| -------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `assignment.created` | Assignment created  | `{ assignmentId, courseId, moduleId, title, type, maxScore, passingScore, dueHoursAfterEnrollment?, absoluteDueDate? }` |
| `assignment.updated` | Assignment modified | `{ assignmentId, courseId, moduleId, updatedFields }`                                                                   |
| `assignment.deleted` | Assignment deleted  | `{ assignmentId, courseId, moduleId, title, deletedAt }`                                                                |

#### Submission Events

| Event Type            | When Emitted                     | Payload                                                                                                                               |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `submission.created`  | Submission created               | `{ submissionId, assignmentId, learnerId, enrollmentId, attemptNumber, submittedAt }`                                                 |
| `submission.received` | Submission received for grading  | `{ submissionId, assignmentId, learnerId, enrollmentId, moduleId, courseId, attemptNumber, receivedAt }`                              |
| `submission.graded`   | Submission graded                | `{ submissionId, assignmentId, learnerId, enrollmentId, moduleId, courseId, score, maxScore, passed, feedback?, gradedBy, gradedAt }` |
| `submission.returned` | Submission returned for revision | `{ submissionId, assignmentId, learnerId, enrollmentId, moduleId, courseId, score, maxScore, feedback?, returnedAt }`                 |

#### Certificate Events

| Event Type             | When Emitted               | Payload                                                                                                       |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `certificate.issued`   | Certificate issued         | `{ certificateId, enrollmentId, learnerId, courseId, verificationCode, issuedAt, expiresAt? }`                |
| `certificate.expiring` | Certificate nearing expiry | `{ certificateId, enrollmentId, learnerId, courseId, verificationCode, expiresAt, daysUntilExpiry }`          |
| `certificate.revoked`  | Certificate revoked        | `{ certificateId, enrollmentId, learnerId, courseId, verificationCode, revokedReason, revokedBy, revokedAt }` |

#### Cohort Events

| Event Type         | When Emitted     | Payload                                                                                  |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------------- |
| `cohort.created`   | Cohort created   | `{ cohortId, courseId, name, instructorId, startDate, endDate, capacity, timezone }`     |
| `cohort.activated` | Cohort started   | `{ cohortId, courseId, name, instructorId, activatedAt, enrolledCount }`                 |
| `cohort.completed` | Cohort completed | `{ cohortId, courseId, name, instructorId, completedAt, totalEnrolled, totalCompleted }` |
| `cohort.cancelled` | Cohort cancelled | `{ cohortId, courseId, name, instructorId, cancelledAt, reason? }`                       |

#### Session Events

| Event Type                 | When Emitted           | Payload                                                                                            |
| -------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| `session.created`          | Live session scheduled | `{ sessionId, cohortId, courseId, instructorId, title, scheduledAt, durationMinutes, meetingUrl }` |
| `session.reminder-trigger` | Reminder triggered     | `{ sessionId, cohortId, courseId, instructorId, title, scheduledAt, minutesBefore }`               |
| `session.started`          | Session went live      | `{ sessionId, cohortId, courseId, instructorId, title, startedAt, meetingUrl }`                    |
| `session.ended`            | Session ended          | `{ sessionId, cohortId, courseId, instructorId, title, endedAt, durationMinutes, attendeeCount }`  |
| `session.recorded`         | Recording available    | `{ sessionId, cohortId, courseId, instructorId, title, recordingUrl, recordedAt }`                 |
| `session.cancelled`        | Session cancelled      | `{ sessionId, cohortId, courseId, instructorId, title, scheduledAt, cancelledAt, reason? }`        |

### Subscribing to LMS Events

```typescript
import {
  LMS_EVENT_NAMESPACE,
  CourseEventTypes,
  EnrollmentEventTypes,
  type CoursePublishedPayload,
  type EnrollmentActivatedPayload,
} from "@projectx/compose-lms";

// Subscribe to specific event
const unsubscribe = eventBus.subscribe("course.published", async (event) => {
  const payload = event.payload as CoursePublishedPayload;
  console.log(
    `Course published: ${payload.title} by instructor ${payload.instructorId}`,
  );
});

// Subscribe to all enrollment events
const unsubEnrollments = eventBus.subscribe("enrollment.*", async (event) => {
  console.log(`Enrollment event: ${event.type}`, event.payload);
});

// Subscribe to all LMS events
const unsubAll = eventBus.subscribe(
  `${LMS_EVENT_NAMESPACE}.*`,
  async (event) => {
    console.log(`LMS event: ${event.type}`);
  },
);

// Cleanup
unsubscribe();
unsubEnrollments();
unsubAll();
```

### Event Payload Types

All event payload types are exported from the package:

```typescript
import type {
  CourseCreatedPayload,
  CourseUpdatedPayload,
  CourseSubmittedForReviewPayload,
  CoursePublishedPayload,
  CourseRejectedPayload,
  CourseArchivedPayload,
  CourseRestoredPayload,
  EnrollmentCreatedPayload,
  EnrollmentActivatedPayload,
  EnrollmentCompletedPayload,
  EnrollmentExpiredPayload,
  EnrollmentCancelledPayload,
  EnrollmentRefundedPayload,
  ModuleStartedPayload,
  ModuleCompletedPayload,
  ModuleUnlockedPayload,
  AssignmentCreatedPayload,
  AssignmentUpdatedPayload,
  AssignmentDeletedPayload,
  SubmissionCreatedPayload,
  SubmissionReceivedPayload,
  SubmissionGradedPayload,
  SubmissionReturnedPayload,
  CertificateIssuedPayload,
  CertificateExpiringPayload,
  CertificateRevokedPayload,
  CohortCreatedPayload,
  CohortActivatedPayload,
  CohortCompletedPayload,
  CohortCancelledPayload,
  SessionCreatedPayload,
  SessionReminderTriggerPayload,
  SessionStartedPayload,
  SessionEndedPayload,
  SessionRecordedPayload,
  SessionCancelledPayload,
} from "@projectx/compose-lms";
```

---

## 7. Commands & Queries

### Dispatching LMS Commands

Commands change state in the LMS system. All commands require proper actor context.

```typescript
import type { Command } from "@projectx/compose-lms";

// Create a course
const course = await dispatch({
  type: "lms.course.create",
  payload: {
    title: "Introduction to TypeScript",
    slug: "intro-typescript",
    description: "Learn TypeScript from scratch",
    type: "self-paced",
    level: "beginner",
    price: { amount: 4900, currency: "USD" },
    currency: "USD",
  },
  actorId: "instructor-123",
  orgId: "org-456",
  correlationId: "req-789",
});

// Submit course for review
await dispatch({
  type: "lms.course.submitReview",
  payload: { courseId: course.id },
  actorId: "instructor-123",
  orgId: "org-456",
  correlationId: "req-790",
});

// Create enrollment
const enrollment = await dispatch({
  type: "lms.enrollment.create",
  payload: {
    courseId: course.id,
    learnerId: "learner-789",
    pricePaid: { amount: 4900, currency: "USD" },
  },
  actorId: "learner-789",
  orgId: "org-456",
  correlationId: "req-791",
});

// Complete a module
await dispatch({
  type: "lms.progress.complete",
  payload: {
    enrollmentId: enrollment.id,
    moduleId: "module-123",
    learnerId: "learner-789",
    quizScore: 85,
  },
  actorId: "learner-789",
  orgId: "org-456",
  correlationId: "req-792",
});

// Grade a submission
await dispatch({
  type: "lms.submission.grade",
  payload: {
    submissionId: "submission-123",
    score: 92,
    feedback: "Excellent work! Clear explanations and good code structure.",
  },
  actorId: "instructor-123",
  orgId: "org-456",
  correlationId: "req-793",
});
```

### Full Command List

| Command                         | Description             | Payload Type                      |
| ------------------------------- | ----------------------- | --------------------------------- |
| `lms.course.create`             | Create new course       | `CourseCreatePayload`             |
| `lms.course.update`             | Update course details   | `CourseUpdatePayload`             |
| `lms.course.submitReview`       | Submit for review       | `CourseSubmitReviewPayload`       |
| `lms.course.approve`            | Approve course          | `CourseApprovePayload`            |
| `lms.course.reject`             | Reject course           | `CourseRejectPayload`             |
| `lms.course.archive`            | Archive course          | `CourseArchivePayload`            |
| `lms.course.restore`            | Restore archived course | `CourseRestorePayload`            |
| `lms.module.create`             | Create module           | `ModuleCreatePayload`             |
| `lms.module.update`             | Update module           | `ModuleUpdatePayload`             |
| `lms.module.delete`             | Delete module           | `ModuleDeletePayload`             |
| `lms.module.reorder`            | Reorder modules         | `ModuleReorderPayload`            |
| `lms.enrollment.create`         | Create enrollment       | `EnrollmentCreatePayload`         |
| `lms.enrollment.cancel`         | Cancel enrollment       | `EnrollmentCancelPayload`         |
| `lms.enrollment.complete`       | Complete enrollment     | `EnrollmentCompletePayload`       |
| `lms.enrollment.paymentConfirm` | Confirm payment         | `EnrollmentPaymentConfirmPayload` |
| `lms.progress.update`           | Update progress         | `ProgressUpdatePayload`           |
| `lms.progress.complete`         | Complete module         | `ProgressCompletePayload`         |
| `lms.assignment.create`         | Create assignment       | `AssignmentCreatePayload`         |
| `lms.assignment.update`         | Update assignment       | `AssignmentUpdatePayload`         |
| `lms.assignment.delete`         | Delete assignment       | `AssignmentDeletePayload`         |
| `lms.submission.create`         | Create submission       | `SubmissionCreatePayload`         |
| `lms.submission.grade`          | Grade submission        | `SubmissionGradePayload`          |
| `lms.certificate.create`        | Issue certificate       | `CertificateCreatePayload`        |
| `lms.certificate.revoke`        | Revoke certificate      | `CertificateRevokePayload`        |
| `lms.cohort.create`             | Create cohort           | `CohortCreatePayload`             |
| `lms.cohort.update`             | Update cohort           | `CohortUpdatePayload`             |
| `lms.cohort.cancel`             | Cancel cohort           | `CohortCancelPayload`             |
| `lms.session.create`            | Create live session     | `SessionCreatePayload`            |
| `lms.session.start`             | Start session           | `SessionStartPayload`             |
| `lms.session.end`               | End session             | `SessionEndPayload`               |
| `lms.session.cancel`            | Cancel session          | `SessionCancelPayload`            |
| `lms.session.uploadRecording`   | Upload recording        | `SessionUploadRecordingPayload`   |

### Querying LMS Data

Queries read data without side effects:

```typescript
import type { Query } from "@projectx/compose-lms";

// List courses
const courses = await query({
  type: "lms.courses.list",
  params: {
    page: 1,
    limit: 20,
    status: "published",
    level: "beginner",
  },
  actorId: "user-123",
  orgId: "org-456",
});

// Get course by slug
const course = await query({
  type: "lms.courses.getBySlug",
  params: { slug: "intro-typescript" },
  actorId: "user-123",
  orgId: "org-456",
});

// Get enrollment progress
const progress = await query({
  type: "lms.enrollments.progress",
  params: { enrollmentId: "enrollment-123" },
  actorId: "learner-789",
  orgId: "org-456",
});

// Verify certificate
const verification = await query({
  type: "lms.certificates.verify",
  params: { code: "CERT-ABC123XYZ" },
  actorId: "public",
  orgId: "org-456",
});

// Get instructor analytics
const analytics = await query({
  type: "lms.instructor.analytics",
  params: { courseId: "course-123" },
  actorId: "instructor-123",
  orgId: "org-456",
});
```

### Full Query List

| Query                        | Description                 | Params                                                                                                 |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `lms.courses.list`           | List courses with filters   | `{ page?, limit?, status?, level?, categoryId?, instructorId?, tags?, minPrice?, maxPrice?, search? }` |
| `lms.courses.getBySlug`      | Get course by slug          | `{ slug }`                                                                                             |
| `lms.courses.search`         | Search courses              | `{ q, page?, limit?, filters? }`                                                                       |
| `lms.categories.list`        | List categories             | `{ parentId?, includeInactive? }`                                                                      |
| `lms.courses.modules`        | Get course modules          | `{ courseId, enrollmentId? }`                                                                          |
| `lms.enrollments.list`       | List user enrollments       | `{ page?, limit?, status?, courseId? }`                                                                |
| `lms.enrollments.get`        | Get enrollment by ID        | `{ id }`                                                                                               |
| `lms.enrollments.progress`   | Get enrollment progress     | `{ enrollmentId }`                                                                                     |
| `lms.learn.course`           | Get course for learning     | `{ courseSlug }`                                                                                       |
| `lms.learn.module`           | Get module for learning     | `{ courseId, moduleId }`                                                                               |
| `lms.progress.get`           | Get module progress         | `{ enrollmentId, moduleId }`                                                                           |
| `lms.assignments.get`        | Get assignment              | `{ id }`                                                                                               |
| `lms.submissions.get`        | Get submission              | `{ id }`                                                                                               |
| `lms.submissions.list`       | List submissions            | `{ assignmentId, page?, limit?, status? }`                                                             |
| `lms.certificates.list`      | List user certificates      | `{ page?, limit? }`                                                                                    |
| `lms.certificates.get`       | Get certificate             | `{ id }`                                                                                               |
| `lms.certificates.verify`    | Verify certificate by code  | `{ code }`                                                                                             |
| `lms.certificates.download`  | Get download URL            | `{ id }`                                                                                               |
| `lms.cohorts.get`            | Get cohort                  | `{ id }`                                                                                               |
| `lms.cohorts.sessions`       | Get cohort sessions         | `{ cohortId }`                                                                                         |
| `lms.sessions.get`           | Get session                 | `{ id }`                                                                                               |
| `lms.instructor.courses`     | List instructor courses     | `{ page?, limit?, status? }`                                                                           |
| `lms.instructor.enrollments` | List course enrollments     | `{ courseId, page?, limit?, status? }`                                                                 |
| `lms.instructor.analytics`   | Get course analytics        | `{ courseId }`                                                                                         |
| `lms.instructor.submissions` | List pending submissions    | `{ page?, limit?, status? }`                                                                           |
| `lms.admin.courses`          | Admin: list all courses     | `{ page?, limit?, status?, instructorId?, search? }`                                                   |
| `lms.admin.enrollments`      | Admin: list all enrollments | `{ page?, limit?, courseId?, learnerId?, status? }`                                                    |
| `lms.admin.learners`         | Admin: list learners        | `{ page?, limit?, search? }`                                                                           |
| `lms.admin.analytics`        | Admin: platform analytics   | `{ startDate?, endDate? }`                                                                             |

---

## 8. Real-time

### WebSocket Channel Naming

The LMS plugin uses a consistent channel naming scheme:

| Channel Pattern                                | Purpose                  | Who Subscribes       |
| ---------------------------------------------- | ------------------------ | -------------------- |
| `org:{orgId}:lms:session:{sessionId}`          | Live session updates     | Session participants |
| `org:{orgId}:lms:course:{courseId}:instructor` | Instructor notifications | Course instructor    |
| `org:{actorId}:actor:{actorId}:lms`            | Learner notifications    | Individual learner   |
| `org:{orgId}:lms:admin`                        | Admin notifications      | LMS administrators   |

### Using Channel Helpers

```typescript
import {
  sessionChannel,
  instructorChannel,
  learnerChannel,
  adminChannel,
} from "@projectx/compose-lms";

// Generate channel names
const sessionChan = sessionChannel("org-123", "session-456");
// "org:org-123:lms:session:session-456"

const instructorChan = instructorChannel("org-123", "course-456");
// "org:org-123:lms:course:course-456:instructor"

const learnerChan = learnerChannel("org-123", "learner-789");
// "org:learner-789:actor:learner-789:lms"

const adminChan = adminChannel("org-123");
// "org:org-123:lms:admin"
```

### Bridging LMS Events to WebSocket

The `LMSRealtimeBridge` automatically forwards LMS events to WebSocket channels:

```typescript
import {
  createLMSRealtimeBridge,
  registerLMSRealtime,
} from "@projectx/compose-lms";

// Create bridge
const bridge = createLMSRealtimeBridge(realtimeGateway);

// Register with event bus (starts forwarding)
registerLMSRealtime(bridge, eventBus);

// Or manually forward specific event patterns
bridge.forward("course.*", (event) => {
  return `org:${event.orgId}:lms:admin`;
});
```

### Event Forwarding Rules

The bridge includes default forwarding rules:

| Event Pattern                 | Target Channel               |
| ----------------------------- | ---------------------------- |
| `session.*`                   | Session participants channel |
| `enrollment.*`                | Course instructor channel    |
| `submission.*`                | Course instructor channel    |
| `module.unlocked`             | Individual learner channel   |
| `certificate.issued`          | Individual learner channel   |
| `course.submitted-for-review` | Admin channel                |

### WebSocket Message Types

```typescript
import type { LmsWsMessage, LmsWsMessageType } from "@projectx/compose-lms";

// Message types
type LmsWsMessageType =
  | "session:state" // Session status changes
  | "session:presence" // Participant join/leave
  | "enrollment:new" // New enrollment notification
  | "submission:new" // New submission notification
  | "module:unlock" // Module unlocked notification
  | "certificate:ready"; // Certificate ready notification

// Message structure
interface LmsWsMessage {
  type: LmsWsMessageType;
  channel: string;
  data: unknown;
  timestamp: number;
}
```

### Manual Broadcasting

```typescript
// Broadcast session state
bridge.broadcastSessionState("org-123", "session-456", {
  status: "live",
  participantCount: 15,
});

// Broadcast session presence
bridge.broadcastSessionPresence("org-123", "session-456", {
  type: "join",
  userId: "learner-789",
  name: "John Doe",
});

// Notify instructor of new enrollment
bridge.notifyInstructor("org-123", "course-456", {
  type: "enrollment:new",
  learnerName: "Jane Smith",
  enrolledAt: Date.now(),
});

// Notify learner of unlocked module
bridge.notifyLearner("org-123", "learner-789", {
  type: "module:unlock",
  moduleName: "Advanced Patterns",
  courseId: "course-456",
});
```

---

## 9. Testing

### Mocking the Context

Create a mock context for unit testing:

```typescript
import type {
  LMSPluginContext,
  EventBus,
  FSMEngine,
  RuleEngine,
  Scheduler,
  Queue,
  Logger,
  DatabaseClient,
} from "@projectx/compose-lms";

function createMockContext(): LMSPluginContext {
  const eventHandlers = new Map<string, Set<(event: any) => Promise<void>>>();

  const mockEventBus: EventBus = {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((pattern, handler) => {
      if (!eventHandlers.has(pattern)) {
        eventHandlers.set(pattern, new Set());
      }
      eventHandlers.get(pattern)!.add(handler);
      return () => {
        eventHandlers.get(pattern)?.delete(handler);
      };
    }),
  };

  const mockFsmEngine: FSMEngine = {
    register: vi.fn(),
    transition: vi.fn().mockResolvedValue({}),
    getState: vi.fn().mockResolvedValue("draft"),
  };

  const mockRuleEngine: RuleEngine = {
    evaluate: vi.fn().mockReturnValue(true),
    register: vi.fn(),
    resolve: vi.fn(),
  };

  const mockScheduler: Scheduler = {
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  };

  const mockQueue: Queue = {
    add: vi.fn().mockResolvedValue({ id: "job-1", status: "waiting" }),
    getJob: vi.fn().mockResolvedValue(null),
  };

  const mockLogger: Logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  const mockDb: DatabaseClient = {
    query: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
  };

  return {
    eventBus: mockEventBus,
    fsmEngine: mockFsmEngine,
    ruleEngine: mockRuleEngine,
    scheduler: mockScheduler,
    queue: mockQueue,
    realtime: {
      broadcast: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
    db: mockDb,
    logger: mockLogger,
    dispatch: vi.fn().mockResolvedValue({}),
    query: vi.fn().mockResolvedValue(null),
    config: {
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
      adapters: {},
    },
  };
}
```

### Testing Plugin Initialization

```typescript
import { createLMSPlugin, LMS_MANIFEST } from "@projectx/compose-lms";

describe("LMS Plugin", () => {
  it("should initialize successfully", async () => {
    const context = createMockContext();
    const lms = createLMSPlugin();

    await lms.init(context);

    expect(context.fsmEngine.register).toHaveBeenCalledTimes(5);
    expect(context.scheduler.schedule).toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledWith(
      "LMSPlugin initialized successfully",
      expect.objectContaining({
        entities: LMS_MANIFEST.entities.length,
        events: LMS_MANIFEST.events.length,
      }),
    );
  });

  it("should return correct manifest", () => {
    const lms = createLMSPlugin();
    const manifest = lms.getManifest();

    expect(manifest.id).toBe("lms");
    expect(manifest.name).toBe("Learning Management System");
    expect(manifest.requiredCapabilities).toContain("eventBus");
  });

  it("should shutdown cleanly", async () => {
    const context = createMockContext();
    const lms = createLMSPlugin();

    await lms.init(context);
    await lms.shutdown();

    expect(context.logger.info).toHaveBeenCalledWith(
      "LMSPlugin shutdown complete",
    );
  });
});
```

### Testing Command Handlers

```typescript
import {
  courseCreateHandler,
  type CourseCreatePayload,
} from "@projectx/compose-lms";

describe("courseCreateHandler", () => {
  it("should create course with valid input", async () => {
    const ctx = {
      actor: {
        id: "instructor-1",
        roles: ["instructor"],
        orgId: "org-1",
        type: "human",
      },
      org: { id: "org-1", slug: "test-org", settings: {} },
      correlationId: "corr-1",
      emit: vi.fn(),
      query: vi.fn(),
    };

    const command = {
      type: "lms.course.create",
      payload: {
        title: "Test Course",
        slug: "test-course",
        description: "A test course",
        type: "self-paced",
        level: "beginner",
        price: { amount: 1000, currency: "USD" },
        currency: "USD",
      },
      actorId: "instructor-1",
      orgId: "org-1",
      correlationId: "corr-1",
    };

    const course = await courseCreateHandler(command, ctx as any);

    expect(course.title).toBe("Test Course");
    expect(course.status).toBe("draft");
    expect(ctx.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "course.created" }),
    );
  });

  it("should reject unauthorized users", async () => {
    const ctx = {
      actor: {
        id: "user-1",
        roles: ["learner"],
        orgId: "org-1",
        type: "human",
      },
      org: { id: "org-1", slug: "test-org", settings: {} },
      correlationId: "corr-1",
      emit: vi.fn(),
      query: vi.fn(),
    };

    const command = {
      type: "lms.course.create",
      payload: {
        title: "Test",
        slug: "test",
        description: "Test",
        type: "self-paced",
        level: "beginner",
        price: { amount: 0, currency: "USD" },
        currency: "USD",
      },
      actorId: "user-1",
      orgId: "org-1",
      correlationId: "corr-1",
    };

    await expect(courseCreateHandler(command, ctx as any)).rejects.toThrow(
      "Permission denied",
    );
  });
});
```

### Testing Query Handlers

```typescript
import { queryHandlers } from "@projectx/compose-lms";

describe("Query Handlers", () => {
  it("should list published courses for non-admin users", async () => {
    const mockResults = [
      { id: "course-1", title: "Course 1", status: "published" },
    ];
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(mockResults),
    };

    const ctx = {
      actor: {
        id: "user-1",
        roles: ["learner"],
        orgId: "org-1",
        type: "human",
      },
      org: { id: "org-1", slug: "test-org", settings: {} },
      db: mockDb,
    };

    const query = {
      type: "lms.courses.list",
      params: { page: 1, limit: 20 },
      actorId: "user-1",
      orgId: "org-1",
    };

    const handler = queryHandlers.get("lms.courses.list")!;
    const result = await handler(query, ctx as any);

    expect(result.data).toEqual(mockResults);
  });
});
```

### Integration Test Setup

```typescript
import { createLMSPlugin, type LMSPluginContext } from "@projectx/compose-lms";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@projectx/compose-lms/db/schema";

describe("LMS Integration", () => {
  let db: ReturnType<typeof drizzle>;
  let lms: ReturnType<typeof createLMSPlugin>;
  let context: LMSPluginContext;

  beforeAll(async () => {
    const client = postgres(process.env.TEST_DATABASE_URL!);
    db = drizzle(client, { schema });

    // Run migrations
    await client`CREATE TABLE IF NOT EXISTS lms_categories (...)`;
    // ... setup other tables
  });

  afterAll(async () => {
    await lms?.shutdown();
    await db.$client.end();
  });

  beforeEach(async () => {
    // Clean tables
    await db.delete(schema.lmsCourses);
    await db.delete(schema.lmsCategories);

    // Create context with real database
    context = createTestContext(db);
    lms = createLMSPlugin();
    await lms.init(context);
  });

  it("should handle full course lifecycle", async () => {
    // Create course
    const course = await context.dispatch({
      type: "lms.course.create",
      payload: {
        title: "Full Cycle Course",
        slug: "full-cycle",
        description: "Testing full lifecycle",
        type: "self-paced",
        level: "beginner",
        price: { amount: 0, currency: "USD" },
        currency: "USD",
      },
      actorId: "instructor-1",
      orgId: "org-1",
      correlationId: "test-1",
    });

    expect(course.status).toBe("draft");

    // Add module
    const module = await context.dispatch({
      type: "lms.module.create",
      payload: {
        courseId: course.id,
        title: "Introduction",
        type: "video",
        contentRef: "video-123",
      },
      actorId: "instructor-1",
      orgId: "org-1",
      correlationId: "test-2",
    });

    expect(module.courseId).toBe(course.id);
  });
});
```

---

## 10. Troubleshooting

### Common Integration Issues

#### Plugin Fails to Initialize

**Symptom:** `LMSPlugin initializing...` logged but no success message

**Causes & Solutions:**

1. **Missing required capabilities**

   ```
   Error: Cannot read property 'register' of undefined
   ```

   Ensure all required capabilities are provided in context:
   - `eventBus`, `fsmEngine`, `ruleEngine`, `scheduler`, `queue`, `db`, `logger`, `dispatch`, `query`

2. **FSM registration failure**

   ```
   Error: FSM 'course' already registered
   ```

   Check that FSMs aren't registered twice. The plugin handles this internally.

3. **Scheduler not accepting jobs**
   ```
   Error: Failed to register scheduled job
   ```
   Verify the scheduler supports cron expressions and repeat options.

#### Command Execution Fails

**Symptom:** Commands throw errors or return null

**Common causes:**

1. **Permission denied**

   ```
   Error: Permission denied: course:create
   ```

   Ensure actor has required roles:
   - Course operations: `lms-admin`, `instructor`, or `content-reviewer`
   - Enrollment operations: `learner` (for own), `lms-admin`, or `org-admin`
   - Admin operations: `lms-admin`

2. **Entity not found**

   ```
   Error: Course not found
   ```

   Verify entity exists and belongs to the correct organization:

   ```typescript
   // Check organization context
   console.log("Org ID:", command.orgId);
   // Verify entity
   const entity = await query({
     type: "lms.courses.getBySlug",
     params: { slug: "course-slug" },
   });
   ```

3. **Invalid state transition**
   ```
   Error: Course must be in draft status to submit for review
   ```
   Check current state before transitioning:
   ```typescript
   const course = await query({
     type: "lms.courses.getBySlug",
     params: { slug },
   });
   console.log("Current status:", course.status);
   ```

#### Events Not Being Received

**Symptom:** Subscribed handlers not invoked

**Solutions:**

1. **Verify subscription pattern**

   ```typescript
   // Correct: Use wildcard for multiple events
   eventBus.subscribe("enrollment.*", handler);

   // Wrong: Full event type as pattern
   eventBus.subscribe("enrollment.created", handler); // This works but only for exact match
   ```

2. **Check event is being published**

   ```typescript
   // Add debug logging
   const originalPublish = eventBus.publish;
   eventBus.publish = async (event) => {
     console.log("Event published:", event.type);
     return originalPublish(event);
   };
   ```

3. **Verify organization context**
   Events are scoped to organizations. Ensure subscriber and publisher use same org context.

#### Query Returns Empty Results

**Symptom:** Queries return empty arrays or null

**Solutions:**

1. **Check deleted records**
   The schema uses soft deletes. Records with `deletedAt` are excluded:

   ```typescript
   // Check if record exists (including deleted)
   SELECT * FROM lms_courses WHERE id = 'course-123';
   ```

2. **Verify actor permissions**
   Non-admin users only see published courses:

   ```typescript
   // For testing, use admin context
   const ctx = { actor: { roles: ['lms-admin'], ... } };
   ```

3. **Check organization filtering**
   All queries filter by `organizationId`:
   ```typescript
   // Ensure correct org in query
   query.orgId === course.organizationId;
   ```

#### Real-time Not Working

**Symptom:** WebSocket clients not receiving updates

**Solutions:**

1. **Verify realtime gateway**

   ```typescript
   if (!context.realtime) {
     console.warn("Realtime gateway not available");
   }
   ```

2. **Check channel subscription**

   ```typescript
   // Client should subscribe to correct channel
   const channel = `org:${orgId}:lms:session:${sessionId}`;
   websocket.send(JSON.stringify({ type: "subscribe", channel }));
   ```

3. **Verify bridge is registered**
   ```typescript
   import { registerLMSRealtime } from "@projectx/compose-lms";
   registerLMSRealtime(bridge, eventBus);
   ```

### Debugging Tips

#### Enable Debug Logging

```typescript
const lms = createLMSPlugin();

await lms.init({
  ...context,
  logger: {
    info: (msg, meta) => console.log("[INFO]", msg, meta),
    error: (msg, meta) => console.error("[ERROR]", msg, meta),
    warn: (msg, meta) => console.warn("[WARN]", msg, meta),
    debug: (msg, meta) => console.log("[DEBUG]", msg, meta), // Enable debug
  },
});
```

#### Trace Command Execution

```typescript
const originalDispatch = context.dispatch;
context.dispatch = async (command) => {
  console.log("Dispatching:", command.type, command.payload);
  const start = Date.now();
  try {
    const result = await originalDispatch(command);
    console.log("Result:", command.type, Date.now() - start, "ms");
    return result;
  } catch (error) {
    console.error("Error:", command.type, error);
    throw error;
  }
};
```

#### Inspect Event Flow

```typescript
const events: any[] = [];
const originalPublish = context.eventBus.publish;
context.eventBus.publish = async (event) => {
  events.push({ ...event, timestamp: Date.now() });
  return originalPublish(event);
};

// After operation
console.log(
  "Events emitted:",
  events.map((e) => e.type),
);
```

#### Database Query Inspection

```typescript
// Using drizzle-orm logger
const db = drizzle(client, {
  schema,
  logger: {
    logQuery: (query, params) => {
      console.log("SQL:", query);
      console.log("Params:", params);
    },
  },
});
```

#### Health Check Endpoint

```typescript
app.get("/health/lms", async (req, res) => {
  const manifest = lms.getManifest();
  const config = lms.getConfig();

  res.json({
    status: "healthy",
    version: manifest.version,
    features: config.features,
    entities: manifest.entities.length,
    pendingJobs: manifest.migrations.length,
  });
});
```

---

## Appendix: Complete Manifest

```typescript
const LMS_MANIFEST = {
  id: "lms",
  name: "Learning Management System",
  version: "1.0.0",
  description:
    "Full-featured LMS compose - courses, enrollments, certificates, cohorts",

  requiredCapabilities: [
    "eventBus",
    "fsmEngine",
    "ruleEngine",
    "scheduler",
    "queue",
    "database",
  ],

  optionalCapabilities: ["realtime", "payment", "videoMeeting", "storage"],

  entities: [
    "Course",
    "CourseModule",
    "Enrollment",
    "ModuleProgress",
    "Assignment",
    "Submission",
    "Certificate",
    "Cohort",
    "LiveSession",
    "CourseReview",
    "Category",
  ],

  events: [
    /* 36 event types */
  ],
  commands: [
    /* 42 command types */
  ],
  queries: [
    /* 29 query types */
  ],
  fsms: ["course", "enrollment", "submission", "liveSession", "cohort"],

  migrations: [
    "0001_lms_categories",
    "0002_lms_courses",
    "0003_lms_course_modules",
    "0004_lms_enrollments",
    "0005_lms_module_progress",
    "0006_lms_assignments",
    "0007_lms_submissions",
    "0008_lms_certificates",
    "0009_lms_cohorts",
    "0010_lms_live_sessions",
    "0011_lms_course_reviews",
  ],
};
```
