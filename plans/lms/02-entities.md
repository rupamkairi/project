# Phase 2 — Entities

All tables use `createId()` (ULID) for primary keys. Timestamps as ISO strings.

---

```typescript
// lms_categories
export const lmsCategories = pgTable("lms_categories", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  parentId: text("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_courses
export const lmsCourses = pgTable("lms_courses", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  instructorId: text("instructor_id").notNull(),
  categoryId: text("category_id"),
  status: text("status").notNull().default("draft"),
  // draft | under-review | published | archived
  type: text("type").notNull().default("self-paced"),
  // self-paced | cohort | live-only | hybrid
  level: text("level").notNull().default("all-levels"),
  language: text("language").default("en"),
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  durationHours: numeric("duration_hours", { precision: 5, scale: 1 }),
  moduleCount: integer("module_count").default(0),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  enrolledCount: integer("enrolled_count").default(0),
  completedCount: integer("completed_count").default(0),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  completionThreshold: integer("completion_threshold").default(80),
  tags: jsonb("tags").$type<string[]>().default([]),
  thumbnailDocId: text("thumbnail_doc_id"),
  previewVideoUrl: text("preview_video_url"),
  certificateTemplate: jsonb("certificate_template").$type<{
    title: string;
    body: string;
    expiresAfterDays?: number;
    logoDocId?: string;
  }>(),
  publishedAt: timestamp("published_at"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// lms_course_modules
export const lmsCourseModules = pgTable("lms_course_modules", {
  id: text("id").primaryKey().$defaultFn(createId),
  courseId: text("course_id").notNull().references(() => lmsCourses.id),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull(),
  type: text("type").notNull(),
  // video | article | quiz | assignment | live-session | download
  contentRef: text("content_ref"),  // video URL, article URL
  contentDocId: text("content_doc_id"),  // for downloads
  estimatedMinutes: integer("estimated_minutes").default(0),
  isFree: boolean("is_free").default(false),
  isPublished: boolean("is_published").default(false),
  requiredPrevious: boolean("required_previous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_enrollments
export const lmsEnrollments = pgTable("lms_enrollments", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  learnerId: text("learner_id").notNull(),
  courseId: text("course_id").notNull().references(() => lmsCourses.id),
  cohortId: text("cohort_id"),
  status: text("status").notNull().default("pending-payment"),
  // pending-payment | active | completed | expired | cancelled | refunded
  paymentId: text("payment_id"),
  couponCode: text("coupon_code"),
  pricePaid: numeric("price_paid", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").default("USD"),
  completionPct: integer("completion_pct").default(0),
  completedAt: timestamp("completed_at"),
  certificateId: text("certificate_id"),
  expiresAt: timestamp("expires_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_module_progress
export const lmsModuleProgress = pgTable("lms_module_progress", {
  id: text("id").primaryKey().$defaultFn(createId),
  enrollmentId: text("enrollment_id").notNull().references(() => lmsEnrollments.id),
  moduleId: text("module_id").notNull().references(() => lmsCourseModules.id),
  learnerId: text("learner_id").notNull(),
  courseId: text("course_id").notNull(),
  status: text("status").notNull().default("not-started"),
  // not-started | in-progress | completed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  progressPct: integer("progress_pct").default(0),
  quizScore: numeric("quiz_score", { precision: 5, scale: 2 }),
  quizAttempts: integer("quiz_attempts").default(0),
  timeSpentSec: integer("time_spent_sec").default(0),
});

// lms_assignments
export const lmsAssignments = pgTable("lms_assignments", {
  id: text("id").primaryKey().$defaultFn(createId),
  courseId: text("course_id").notNull().references(() => lmsCourses.id),
  moduleId: text("module_id").references(() => lmsCourseModules.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  // quiz | file-upload | text-response | peer-review | project
  dueHoursAfterEnrollment: integer("due_hours_after_enrollment"),
  absoluteDueDate: timestamp("absolute_due_date"),
  maxScore: numeric("max_score", { precision: 6, scale: 2 }).default("100"),
  passingScore: numeric("passing_score", { precision: 6, scale: 2 }).default("60"),
  allowLateSubmission: boolean("allow_late_submission").default(false),
  maxAttempts: integer("max_attempts").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_submissions
export const lmsSubmissions = pgTable("lms_submissions", {
  id: text("id").primaryKey().$defaultFn(createId),
  assignmentId: text("assignment_id").notNull().references(() => lmsAssignments.id),
  learnerId: text("learner_id").notNull(),
  enrollmentId: text("enrollment_id").notNull().references(() => lmsEnrollments.id),
  attemptNumber: integer("attempt_number").default(1),
  status: text("status").notNull().default("submitted"),
  // submitted | grading | graded | returned | late
  content: text("content"),
  attachmentIds: jsonb("attachment_ids").$type<string[]>().default([]),
  score: numeric("score", { precision: 6, scale: 2 }),
  maxScore: numeric("max_score", { precision: 6, scale: 2 }),
  feedback: text("feedback"),
  gradedBy: text("graded_by"),
  gradedAt: timestamp("graded_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// lms_quiz_questions
export const lmsQuizQuestions = pgTable("lms_quiz_questions", {
  id: text("id").primaryKey().$defaultFn(createId),
  moduleId: text("module_id").notNull().references(() => lmsCourseModules.id),
  question: text("question").notNull(),
  type: text("type").notNull(),  // mcq | text | true-false
  options: jsonb("options").$type<{ id: string; text: string }[]>(),
  correctAnswer: jsonb("correct_answer"),  // string or string[]
  points: numeric("points", { precision: 5, scale: 2 }).default("1"),
  explanation: text("explanation"),
  sortOrder: integer("sort_order").default(0),
});

// lms_cohorts
export const lmsCohorts = pgTable("lms_cohorts", {
  id: text("id").primaryKey().$defaultFn(createId),
  courseId: text("course_id").notNull().references(() => lmsCourses.id),
  name: text("name").notNull(),
  instructorId: text("instructor_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  capacity: integer("capacity").notNull(),
  enrolledCount: integer("enrolled_count").default(0),
  status: text("status").notNull().default("scheduled"),
  // scheduled | active | completed | cancelled
  timezone: text("timezone").default("UTC"),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_live_sessions
export const lmsLiveSessions = pgTable("lms_live_sessions", {
  id: text("id").primaryKey().$defaultFn(createId),
  cohortId: text("cohort_id").notNull().references(() => lmsCohorts.id),
  courseId: text("course_id").notNull(),
  instructorId: text("instructor_id").notNull(),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  meetingUrl: text("meeting_url").notNull(),
  recordingUrl: text("recording_url"),
  status: text("status").notNull().default("scheduled"),
  // scheduled | live | ended | recorded | cancelled
  attendeeCount: integer("attendee_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_session_attendance
export const lmsSessionAttendance = pgTable("lms_session_attendance", {
  id: text("id").primaryKey().$defaultFn(createId),
  sessionId: text("session_id").notNull().references(() => lmsLiveSessions.id),
  learnerId: text("learner_id").notNull(),
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
  durationMinutes: integer("duration_minutes").default(0),
});

// lms_certificates
export const lmsCertificates = pgTable("lms_certificates", {
  id: text("id").primaryKey().$defaultFn(createId),
  enrollmentId: text("enrollment_id").notNull().references(() => lmsEnrollments.id),
  learnerId: text("learner_id").notNull(),
  courseId: text("course_id").notNull(),
  verificationCode: text("verification_code").notNull().unique(),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  documentId: text("document_id"),
  revoked: boolean("revoked").default(false),
  revokedReason: text("revoked_reason"),
  revokedAt: timestamp("revoked_at"),
});

// lms_reviews
export const lmsReviews = pgTable("lms_reviews", {
  id: text("id").primaryKey().$defaultFn(createId),
  courseId: text("course_id").notNull().references(() => lmsCourses.id),
  learnerId: text("learner_id").notNull(),
  enrollmentId: text("enrollment_id").notNull(),
  rating: integer("rating").notNull(),  // 1-5
  comment: text("comment"),
  isVerified: boolean("is_verified").default(true),  // purchased enrollment
  createdAt: timestamp("created_at").defaultNow(),
});

// lms_waitlist
export const lmsWaitlist = pgTable("lms_waitlist", {
  id: text("id").primaryKey().$defaultFn(createId),
  cohortId: text("cohort_id").notNull().references(() => lmsCohorts.id),
  learnerId: text("learner_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  notifiedAt: timestamp("notified_at"),
  status: text("status").default("waiting"),  // waiting | notified | enrolled | expired
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

// lms_org_config
export const lmsOrgConfig = pgTable("lms_org_config", {
  orgId: text("org_id").primaryKey(),
  defaultCompletionThreshold: integer("default_completion_threshold").default(80),
  refundWindowDays: integer("refund_window_days").default(14),
  inactivityNudgeDays: integer("inactivity_nudge_days").default(7),
  maxQuizAttempts: integer("max_quiz_attempts").default(3),
  certificateExpiresAfterDays: integer("certificate_expires_after_days"),  // null = never
  allowLateSubmissionDefault: boolean("allow_late_submission_default").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```
