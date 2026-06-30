# Phase 2 — Entities

All lms_ detail tables use `createId()` (ULID) for primary keys. Timestamps as ISO strings.

---

## Master Tables (reused — do not define in LMS compose)

These tables are owned by foundation modules. LMS compose reads and filters them. Never recreate these as standalone lms_ tables.

### cat_items (courses)

- `type: "course"`
- `name` — course title
- `sku` — course code
- `description` stored in `meta`
- Pricing via `cat_price_lists`
- `instructorId: text` — points to `persons.id` (type=instructor), stored in `meta.instructorId`
- LMS reads: `where type = 'course' and organizationId = orgId`

### persons (students / instructors)

- `type: "student"` | `"instructor"`
- `firstName`, `lastName`, `email`, `phone`
- `actorId: nullable` — links to platform login when user has account
- LMS reads learners: `where type = 'student' and organizationId = orgId`
- LMS reads instructors: `where type = 'instructor' and organizationId = orgId`

### transactions (enrollments)

- `type: "order"`
- `personId` → student (`persons.id`)
- Course referenced in `transaction_lines` as `itemId` → `cat_items.id`
- `stageId` → enrollment pipeline stage
- Enrollment = transaction of type "order" for the course item
- Created via mediator command: `commerce.createTransaction`

### activities (live sessions)

- `type: "meeting"`
- `subject` — session title
- `body` — agenda
- `dueAt` — scheduled time
- `completedAt` — when the session ended
- `entityId` + `entityType`: `"lms.course"` or `"lms.cohort"`
- `actorId` → instructor (`persons.id`) who runs it
- Created via mediator command: `activity.log`

### pipelines + pipeline_stages

- `entityType: "lms.enrollment"` — stages: Enrolled → In Progress → Completed | Dropped
- `entityType: "lms.course"` — stages: Draft → Review → Published | Archived
- Seeded via `seedPipeline(orgId, entityType, stages)` from `apps/server/src/infra/db/seed.ts`

---

## Detail Tables (LMS-owned, lms_ prefixed)

```typescript
// lms_course_detail
export const lmsCourseDetail = pgTable("lms_course_detail", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id").notNull(),           // cat_items.id — the course
  instructorId: text("instructor_id").notNull(), // persons.id (type=instructor)
  level: text("level").notNull().default("beginner"),
  // beginner | intermediate | advanced
  durationHours: numeric("duration_hours", { precision: 5, scale: 1 }),
  language: text("language").default("en"),
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  // array of cat_items.id (other courses)
  certificateTemplateId: text("certificate_template_id"),
  completionThreshold: integer("completion_threshold").default(80),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// lms_modules (course sections)
export const lmsModules = pgTable("lms_modules", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id").notNull(),  // cat_items.id — the course
  title: text("title").notNull(),
  position: integer("position").notNull(),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_lessons (individual lessons with content type)
export const lmsLessons = pgTable("lms_lessons", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  moduleId: text("module_id").notNull().references(() => lmsModules.id),
  title: text("title").notNull(),
  position: integer("position").notNull(),
  contentType: text("content_type").notNull(),
  // video | text | pdf | embed | quiz
  contentUrl: text("content_url"),
  durationMinutes: integer("duration_minutes"),
  isFree: boolean("is_free").default(false),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_assignments
export const lmsAssignments = pgTable("lms_assignments", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  moduleId: text("module_id").notNull().references(() => lmsModules.id),
  title: text("title").notNull(),
  instructions: text("instructions"),
  dueOffsetDays: integer("due_offset_days"),
  maxScore: numeric("max_score", { precision: 6, scale: 2 }).default("100"),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_submissions
export const lmsSubmissions = pgTable("lms_submissions", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  assignmentId: text("assignment_id").notNull().references(() => lmsAssignments.id),
  personId: text("person_id").notNull(),  // persons.id — student
  submittedAt: timestamp("submitted_at").defaultNow(),
  content: text("content"),  // text or file url
  score: numeric("score", { precision: 6, scale: 2 }),
  gradedAt: timestamp("graded_at"),
  feedback: text("feedback"),
});

// lms_quizzes
export const lmsQuizzes = pgTable("lms_quizzes", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  lessonId: text("lesson_id").notNull().references(() => lmsLessons.id),
  title: text("title").notNull(),
  passingScore: integer("passing_score").default(70),
  timeLimitMinutes: integer("time_limit_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_quiz_questions
export const lmsQuizQuestions = pgTable("lms_quiz_questions", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  quizId: text("quiz_id").notNull().references(() => lmsQuizzes.id),
  question: text("question").notNull(),
  type: text("type").notNull(),  // mcq | true_false | short_answer
  position: integer("position").notNull(),
  options: jsonb("options").$type<{ text: string; isCorrect: boolean }[]>(),
  explanation: text("explanation"),
});

// lms_certificates
export const lmsCertificates = pgTable("lms_certificates", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  transactionId: text("transaction_id").notNull(),  // transactions.id — the enrollment order
  personId: text("person_id").notNull(),             // persons.id — student
  issuedAt: timestamp("issued_at").defaultNow(),
  certificateNo: text("certificate_no").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  templateId: text("template_id"),
});

// lms_cohorts
export const lmsCohorts = pgTable("lms_cohorts", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id").notNull(),  // cat_items.id — the course
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  maxSize: integer("max_size"),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_cohort_members
export const lmsCohortMembers = pgTable("lms_cohort_members", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  cohortId: text("cohort_id").notNull().references(() => lmsCohorts.id),
  personId: text("person_id").notNull(),       // persons.id — student
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  transactionId: text("transaction_id"),        // transactions.id — the enrollment order
});

// lms_progress (lesson-level completion tracking)
export const lmsProgress = pgTable("lms_progress", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  personId: text("person_id").notNull(),    // persons.id — student
  lessonId: text("lesson_id").notNull().references(() => lmsLessons.id),
  completedAt: timestamp("completed_at"),
  watchedSeconds: integer("watched_seconds"),  // for video lessons
  score: numeric("score", { precision: 5, scale: 2 }),  // for quiz lessons
}, (t) => ({
  uniq: uniqueIndex("lms_progress_uniq").on(t.organizationId, t.personId, t.lessonId),
}));

// lms_discussions
export const lmsDiscussions = pgTable("lms_discussions", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  lessonId: text("lesson_id").notNull().references(() => lmsLessons.id),
  personId: text("person_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_discussion_replies
export const lmsDiscussionReplies = pgTable("lms_discussion_replies", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  discussionId: text("discussion_id").notNull().references(() => lmsDiscussions.id),
  personId: text("person_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Retained LMS Business Config

These config/operational tables remain lms-owned as they have no equivalent master table:

```typescript
// lms_org_config
export const lmsOrgConfig = pgTable("lms_org_config", {
  orgId: text("org_id").primaryKey(),
  defaultCompletionThreshold: integer("default_completion_threshold").default(80),
  refundWindowDays: integer("refund_window_days").default(14),
  inactivityNudgeDays: integer("inactivity_nudge_days").default(7),
  maxQuizAttempts: integer("max_quiz_attempts").default(3),
  certificateExpiresAfterDays: integer("certificate_expires_after_days"),
  allowLateSubmissionDefault: boolean("allow_late_submission_default").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// lms_coupons
export const lmsCoupons = pgTable("lms_coupons", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),  // percentage | fixed
  value: numeric("value", { precision: 8, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  courseIds: jsonb("course_ids").$type<string[]>().default([]),  // empty = all
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```
