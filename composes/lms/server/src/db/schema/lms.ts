import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core"
import { baseColumns, moneyColumns } from "@db/schema/helpers"

// ── Enums ─────────────────────────────────────────────

export const contentTypeEnum = pgEnum("lms_content_type", [
  "video",
  "text",
  "pdf",
  "embed",
  "quiz",
])

export const questionTypeEnum = pgEnum("lms_question_type", [
  "mcq",
  "true_false",
  "short_answer",
])

export const courseLevelEnum = pgEnum("lms_course_level", [
  "beginner",
  "intermediate",
  "advanced",
  "all",
])

export const submissionStatusEnum = pgEnum("lms_submission_status", [
  "submitted",
  "grading",
  "graded",
  "returned",
])

export const cohortStatusEnum = pgEnum("lms_cohort_status", [
  "scheduled",
  "active",
  "completed",
  "cancelled",
])

export const sessionStatusEnum = pgEnum("lms_session_status", [
  "scheduled",
  "live",
  "ended",
  "recorded",
  "cancelled",
])

export const courseReviewStatusEnum = pgEnum("lms_course_review_status", [
  "pending",
  "approved",
  "rejected",
])

export const waitlistStatusEnum = pgEnum("lms_waitlist_status", [
  "waiting",
  "notified",
  "expired",
  "enrolled",
])

export const couponDiscountTypeEnum = pgEnum("lms_coupon_discount_type", [
  "percentage",
  "fixed",
])

// ── Detail Tables ──────────────────────────────────────

// Extends cat_items (filtered by type = "course")
export const lmsCourseDetail = pgTable(
  "lms_course_detail",
  {
    ...baseColumns,
    itemId: text("item_id").notNull(), // → cat_items
    instructorId: text("instructor_id"), // → persons (type = "instructor")
    level: courseLevelEnum("level").notNull().default("all"),
    durationHours: integer("duration_hours"),
    language: text("language").notNull().default("en"),
    prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default([]),
    thumbnailUrl: text("thumbnail_url"),
    introductionVideoUrl: text("introduction_video_url"),
    completionThreshold: integer("completion_threshold").notNull().default(80),
    certificateTemplateId: text("certificate_template_id"),
    allowDiscussion: boolean("allow_discussion").notNull().default(true),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at"),
  },
  (table) => [
    uniqueIndex("lms_course_detail_item_idx").on(table.organizationId, table.itemId),
    index("lms_course_detail_instructor_idx").on(table.organizationId, table.instructorId),
  ],
)

// Course modules (child of cat_items course)
export const lmsModule = pgTable(
  "lms_modules",
  {
    ...baseColumns,
    itemId: text("item_id").notNull(), // → cat_items (course)
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
    requiredPrevious: boolean("required_previous").notNull().default(true),
    previousModuleId: text("previous_module_id"), // → lms_modules (self-ref)
  },
  (table) => [
    index("lms_modules_course_idx").on(table.organizationId, table.itemId),
    index("lms_modules_course_position_idx").on(table.organizationId, table.itemId, table.position),
  ],
)

// Individual lessons within a module
export const lmsLesson = pgTable(
  "lms_lessons",
  {
    ...baseColumns,
    moduleId: text("module_id").notNull(), // → lms_modules
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    contentType: contentTypeEnum("content_type").notNull().default("video"),
    contentUrl: text("content_url"),
    contentBody: text("content_body"), // For text-based lessons
    durationMinutes: integer("duration_minutes"),
    isFree: boolean("is_free").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    attachmentUrl: text("attachment_url"),
  },
  (table) => [
    index("lms_lessons_module_idx").on(table.organizationId, table.moduleId),
    index("lms_lessons_module_position_idx").on(table.organizationId, table.moduleId, table.position),
  ],
)

// Assignments (per module)
export const lmsAssignment = pgTable(
  "lms_assignments",
  {
    ...baseColumns,
    moduleId: text("module_id").notNull(), // → lms_modules
    title: text("title").notNull(),
    instructions: text("instructions"),
    dueOffsetDays: integer("due_offset_days").notNull().default(7), // Days from enrollment start
    maxScore: integer("max_score").notNull().default(100),
    allowLateSubmission: boolean("allow_late_submission").notNull().default(false),
    latePenaltyPercent: integer("late_penalty_percent").default(0),
    attachmentRequired: boolean("attachment_required").notNull().default(false),
    rubrics: jsonb("rubrics").$type<Record<string, unknown>[]>().default([]),
  },
  (table) => [
    index("lms_assignments_module_idx").on(table.organizationId, table.moduleId),
  ],
)

// Student submissions
export const lmsSubmission = pgTable(
  "lms_submissions",
  {
    ...baseColumns,
    assignmentId: text("assignment_id").notNull(), // → lms_assignments
    personId: text("person_id").notNull(), // → persons (student)
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    content: text("content"),
    attachmentUrls: jsonb("attachment_urls").$type<string[]>().default([]),
    score: integer("score"),
    maxScore: integer("max_score"),
    gradedAt: timestamp("graded_at"),
    gradedBy: text("graded_by"), // → persons (instructor)
    feedback: text("feedback"),
    status: submissionStatusEnum("status").notNull().default("submitted"),
    isLate: boolean("is_late").notNull().default(false),
  },
  (table) => [
    index("lms_submissions_assignment_idx").on(table.organizationId, table.assignmentId),
    index("lms_submissions_person_idx").on(table.organizationId, table.personId),
    index("lms_submissions_status_idx").on(table.organizationId, table.status),
  ],
)

// Quizzes (attached to a lesson)
export const lmsQuiz = pgTable(
  "lms_quizzes",
  {
    ...baseColumns,
    lessonId: text("lesson_id").notNull(), // → lms_lessons
    title: text("title").notNull(),
    description: text("description"),
    passingScore: integer("passing_score").notNull().default(60), // Percentage
    timeLimitMinutes: integer("time_limit_minutes"),
    maxAttempts: integer("max_attempts").notNull().default(3),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
    showResultImmediately: boolean("show_result_immediately").notNull().default(true),
  },
  (table) => [
    index("lms_quizzes_lesson_idx").on(table.organizationId, table.lessonId),
  ],
)

// Quiz questions
export const lmsQuizQuestion = pgTable(
  "lms_quiz_questions",
  {
    ...baseColumns,
    quizId: text("quiz_id").notNull(), // → lms_quizzes
    question: text("question").notNull(),
    type: questionTypeEnum("type").notNull().default("mcq"),
    position: integer("position").notNull().default(0),
    options: jsonb("options").$type<{ label: string; value: string }[]>().default([]),
    correctAnswer: text("correct_answer"),
    correctAnswers: jsonb("correct_answers").$type<string[]>().default([]), // For multi-select
    explanation: text("explanation"),
    points: integer("points").notNull().default(1),
  },
  (table) => [
    index("lms_quiz_questions_quiz_idx").on(table.organizationId, table.quizId),
    index("lms_quiz_questions_quiz_position_idx").on(table.organizationId, table.quizId, table.position),
  ],
)

// Quiz submissions (attempts)
export const lmsQuizSubmission = pgTable(
  "lms_quiz_submissions",
  {
    ...baseColumns,
    quizId: text("quiz_id").notNull(), // → lms_quizzes
    lessonId: text("lesson_id").notNull(), // → lms_lessons
    personId: text("person_id").notNull(), // → persons
    enrollmentId: text("enrollment_id"), // → transactions
    score: integer("score").notNull().default(0),
    maxScore: integer("max_score").notNull().default(0),
    percentage: integer("percentage").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    answers: jsonb("answers").$type<{ questionId: string; answer: string; isCorrect: boolean }[]>().default([]),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    timeSpentSeconds: integer("time_spent_seconds"),
  },
  (table) => [
    index("lms_quiz_submissions_quiz_person_idx").on(table.organizationId, table.quizId, table.personId),
    index("lms_quiz_submissions_enrollment_idx").on(table.organizationId, table.enrollmentId),
  ],
)

// Certificates issued to learners
export const lmsCertificate = pgTable(
  "lms_certificates",
  {
    ...baseColumns,
    itemId: text("item_id").notNull(), // → cat_items (course)
    transactionId: text("transaction_id"), // → transactions (enrollment)
    personId: text("person_id").notNull(), // → persons
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    certificateNo: text("certificate_no").notNull(),
    verificationCode: text("verification_code").notNull(),
    expiresAt: timestamp("expires_at"),
    templateId: text("template_id"), // → doc_documents
    pdfUrl: text("pdf_url"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    uniqueIndex("lms_certificates_verification_code_idx").on(table.verificationCode),
    uniqueIndex("lms_certificates_person_course_idx").on(table.organizationId, table.personId, table.itemId),
    index("lms_certificates_person_idx").on(table.organizationId, table.personId),
  ],
)

// Cohorts (course groups/classes)
export const lmsCohort = pgTable(
  "lms_cohorts",
  {
    ...baseColumns,
    itemId: text("item_id").notNull(), // → cat_items (course)
    name: text("name").notNull(),
    description: text("description"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    maxSize: integer("max_size").notNull().default(50),
    status: cohortStatusEnum("status").notNull().default("scheduled"),
    instructorId: text("instructor_id"), // → persons
  },
  (table) => [
    index("lms_cohorts_course_idx").on(table.organizationId, table.itemId),
    index("lms_cohorts_status_idx").on(table.organizationId, table.status),
  ],
)

// Cohort members (enrolled learners)
export const lmsCohortMember = pgTable(
  "lms_cohort_members",
  {
    ...baseColumns,
    cohortId: text("cohort_id").notNull(), // → lms_cohorts
    personId: text("person_id").notNull(), // → persons
    transactionId: text("transaction_id"), // → transactions (enrollment)
    enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("lms_cohort_members_cohort_person_idx").on(table.organizationId, table.cohortId, table.personId),
    index("lms_cohort_members_cohort_idx").on(table.organizationId, table.cohortId),
  ],
)

// Learner progress (per lesson)
export const lmsProgress = pgTable(
  "lms_progress",
  {
    ...baseColumns,
    itemId: text("item_id").notNull(), // → cat_items (course)
    moduleId: text("module_id"), // → lms_modules
    lessonId: text("lesson_id").notNull(), // → lms_lessons
    personId: text("person_id").notNull(), // → persons
    transactionId: text("transaction_id"), // → transactions (enrollment)
    completedAt: timestamp("completed_at"),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    lastPosition: integer("last_position").default(0),
    score: integer("score"), // Quiz score if lesson is a quiz
    isCompleted: boolean("is_completed").notNull().default(false),
  },
  (table) => [
    uniqueIndex("lms_progress_person_lesson_idx").on(table.organizationId, table.personId, table.lessonId),
    index("lms_progress_person_course_idx").on(table.organizationId, table.personId, table.itemId),
    index("lms_progress_transaction_idx").on(table.organizationId, table.transactionId),
  ],
)

// Lesson discussions
export const lmsDiscussion = pgTable(
  "lms_discussions",
  {
    ...baseColumns,
    lessonId: text("lesson_id").notNull(), // → lms_lessons
    personId: text("person_id").notNull(), // → persons
    body: text("body").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    isResolved: boolean("is_resolved").notNull().default(false),
  },
  (table) => [
    index("lms_discussions_lesson_idx").on(table.organizationId, table.lessonId),
    index("lms_discussions_person_idx").on(table.organizationId, table.personId),
  ],
)

// Discussion replies
export const lmsDiscussionReply = pgTable(
  "lms_discussion_replies",
  {
    ...baseColumns,
    discussionId: text("discussion_id").notNull(), // → lms_discussions
    personId: text("person_id").notNull(), // → persons
    body: text("body").notNull(),
  },
  (table) => [
    index("lms_discussion_replies_discussion_idx").on(table.organizationId, table.discussionId),
  ],
)

// Course reviews (for review pipeline — content-reviewer approval)
export const lmsCourseReview = pgTable(
  "lms_course_reviews",
  {
    ...baseColumns,
    itemId: text("item_id").notNull(), // → cat_items (course)
    reviewerId: text("reviewer_id").notNull(), // → persons
    status: courseReviewStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    reviewedAt: timestamp("reviewed_at"),
  },
  (table) => [
    uniqueIndex("lms_course_reviews_course_reviewer_idx").on(table.organizationId, table.itemId, table.reviewerId),
  ],
)

// Coupons / discount codes
export const lmsCoupon = pgTable(
  "lms_coupons",
  {
    ...baseColumns,
    code: text("code").notNull(),
    discountType: couponDiscountTypeEnum("discount_type").notNull().default("percentage"),
    discountValue: integer("discount_value").notNull(), // Percentage points or cents
    maxUses: integer("max_uses").notNull().default(100),
    usedCount: integer("used_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),
    minAmount: integer("min_amount"), // Min cart amount in cents
    applicableItemIds: jsonb("applicable_item_ids").$type<string[]>().default([]), // Empty = all courses
  },
  (table) => [
    uniqueIndex("lms_coupons_code_org_idx").on(table.organizationId, table.code),
    index("lms_coupons_active_idx").on(table.organizationId, table.isActive),
  ],
)

// Waitlist for full cohorts
export const lmsWaitlist = pgTable(
  "lms_waitlist",
  {
    ...baseColumns,
    cohortId: text("cohort_id").notNull(), // → lms_cohorts
    personId: text("person_id").notNull(), // → persons
    status: waitlistStatusEnum("status").notNull().default("waiting"),
    notifiedAt: timestamp("notified_at"),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("lms_waitlist_cohort_person_idx").on(table.organizationId, table.cohortId, table.personId),
  ],
)

// Stripe payment events (idempotency)
export const lmsPaymentEvent = pgTable(
  "lms_payment_events",
  {
    ...baseColumns,
    stripeEventId: text("stripe_event_id").notNull(),
    eventType: text("event_type").notNull(),
    transactionId: text("transaction_id"), // → transactions
    processed: boolean("processed").notNull().default(true),
  },
  (table) => [
    uniqueIndex("lms_payment_events_stripe_id_idx").on(table.stripeEventId),
  ],
)

// Organization-level LMS config
export const lmsOrgConfig = pgTable(
  "lms_org_config",
  {
    ...baseColumns,
    organizationId: text("organization_id").notNull(),
    defaultCompletionThreshold: integer("default_completion_threshold").notNull().default(80),
    maxQuizAttempts: integer("max_quiz_attempts").notNull().default(3),
    allowGuestAccess: boolean("allow_guest_access").notNull().default(false),
    certificateLogoUrl: text("certificate_logo_url"),
    certificateSignatureName: text("certificate_signature_name"),
    certificateSignatureTitle: text("certificate_signature_title"),
    paymentProvider: text("payment_provider").notNull().default("stripe"),
    videoProvider: text("video_provider").notNull().default("vimeo"),
    videoCdnBaseUrl: text("video_cdn_base_url"),
  },
  (table) => [
    uniqueIndex("lms_org_config_org_idx").on(table.organizationId),
  ],
)

// ── Types ──────────────────────────────────────────────

export type LmsCourseDetail = typeof lmsCourseDetail.$inferSelect
export type LmsModule = typeof lmsModule.$inferSelect
export type LmsLesson = typeof lmsLesson.$inferSelect
export type LmsAssignment = typeof lmsAssignment.$inferSelect
export type LmsSubmission = typeof lmsSubmission.$inferSelect
export type LmsQuiz = typeof lmsQuiz.$inferSelect
export type LmsQuizQuestion = typeof lmsQuizQuestion.$inferSelect
export type LmsQuizSubmission = typeof lmsQuizSubmission.$inferSelect
export type LmsCertificate = typeof lmsCertificate.$inferSelect
export type LmsCohort = typeof lmsCohort.$inferSelect
export type LmsCohortMember = typeof lmsCohortMember.$inferSelect
export type LmsProgress = typeof lmsProgress.$inferSelect
export type LmsDiscussion = typeof lmsDiscussion.$inferSelect
export type LmsDiscussionReply = typeof lmsDiscussionReply.$inferSelect
export type LmsCourseReview = typeof lmsCourseReview.$inferSelect
export type LmsCoupon = typeof lmsCoupon.$inferSelect
export type LmsWaitlist = typeof lmsWaitlist.$inferSelect
export type LmsPaymentEvent = typeof lmsPaymentEvent.$inferSelect
export type LmsOrgConfig = typeof lmsOrgConfig.$inferSelect
