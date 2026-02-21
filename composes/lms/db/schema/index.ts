import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { lmsBaseColumns, moneyColumns } from "./helpers";

export const courseStatusEnum = pgEnum("lms_course_status", [
  "draft",
  "under-review",
  "published",
  "archived",
]);

export const courseTypeEnum = pgEnum("lms_course_type", [
  "self-paced",
  "cohort",
  "live-only",
  "hybrid",
]);

export const courseLevelEnum = pgEnum("lms_course_level", [
  "beginner",
  "intermediate",
  "advanced",
  "all-levels",
]);

export const courseModuleTypeEnum = pgEnum("lms_course_module_type", [
  "video",
  "article",
  "quiz",
  "assignment",
  "live-session",
  "download",
]);

export const enrollmentStatusEnum = pgEnum("lms_enrollment_status", [
  "pending-payment",
  "active",
  "completed",
  "expired",
  "cancelled",
  "refunded",
]);

export const moduleProgressStatusEnum = pgEnum("lms_module_progress_status", [
  "not-started",
  "in-progress",
  "completed",
]);

export const assignmentTypeEnum = pgEnum("lms_assignment_type", [
  "quiz",
  "file-upload",
  "text-response",
  "peer-review",
  "project",
]);

export const submissionStatusEnum = pgEnum("lms_submission_status", [
  "submitted",
  "grading",
  "graded",
  "returned",
  "late",
]);

export const cohortStatusEnum = pgEnum("lms_cohort_status", [
  "scheduled",
  "active",
  "completed",
  "cancelled",
]);

export const liveSessionStatusEnum = pgEnum("lms_live_session_status", [
  "scheduled",
  "live",
  "ended",
  "cancelled",
  "recorded",
]);

export const reviewStatusEnum = pgEnum("lms_review_status", [
  "pending",
  "approved",
  "rejected",
]);

export const lmsCategories = pgTable(
  "lms_categories",
  {
    ...lmsBaseColumns,
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: text("parent_id"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"),
  },
  (table) => [
    uniqueIndex("lms_categories_org_slug_idx").on(
      table.organizationId,
      table.slug,
    ),
    index("lms_categories_org_parent_idx").on(
      table.organizationId,
      table.parentId,
    ),
    index("lms_categories_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const lmsCourses = pgTable(
  "lms_courses",
  {
    ...lmsBaseColumns,
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    instructorId: text("instructor_id").notNull(),
    categoryId: text("category_id"),
    status: courseStatusEnum("status").notNull().default("draft"),
    type: courseTypeEnum("type").notNull().default("self-paced"),
    level: courseLevelEnum("level").notNull().default("beginner"),
    language: text("language").notNull().default("en"),
    prerequisites: jsonb("prerequisites").notNull().default("[]"),
    durationHours: integer("duration_hours").notNull().default(0),
    moduleCount: integer("module_count").notNull().default(0),
    ...moneyColumns("price"),
    compareAtPriceAmount: integer("compare_at_price_amount"),
    compareAtPriceCurrency: text("compare_at_price_currency"),
    enrolledCount: integer("enrolled_count").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),
    rating: integer("rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    completionThreshold: integer("completion_threshold").notNull().default(80),
    tags: jsonb("tags").notNull().default("[]"),
    thumbnailDocId: text("thumbnail_doc_id"),
    previewVideoUrl: text("preview_video_url"),
    syllabusDocId: text("syllabus_doc_id"),
    certificateTemplate: jsonb("certificate_template").notNull().default("{}"),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    uniqueIndex("lms_courses_org_slug_idx").on(
      table.organizationId,
      table.slug,
    ),
    index("lms_courses_org_instructor_idx").on(
      table.organizationId,
      table.instructorId,
    ),
    index("lms_courses_org_category_idx").on(
      table.organizationId,
      table.categoryId,
    ),
    index("lms_courses_org_status_idx").on(table.organizationId, table.status),
    index("lms_courses_org_type_idx").on(table.organizationId, table.type),
    index("lms_courses_org_level_idx").on(table.organizationId, table.level),
    index("lms_courses_org_published_idx").on(
      table.organizationId,
      table.publishedAt,
    ),
  ],
);

export const lmsCourseModules = pgTable(
  "lms_course_modules",
  {
    ...lmsBaseColumns,
    courseId: text("course_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    type: courseModuleTypeEnum("type").notNull().default("video"),
    contentRef: text("content_ref"),
    contentDocId: text("content_doc_id"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(0),
    isFree: boolean("is_free").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    requiredPrevious: boolean("required_previous").notNull().default(false),
  },
  (table) => [
    index("lms_course_modules_org_course_idx").on(
      table.organizationId,
      table.courseId,
    ),
    index("lms_course_modules_org_course_order_idx").on(
      table.organizationId,
      table.courseId,
      table.order,
    ),
    index("lms_course_modules_org_type_idx").on(
      table.organizationId,
      table.type,
    ),
  ],
);

export const lmsEnrollments = pgTable(
  "lms_enrollments",
  {
    ...lmsBaseColumns,
    learnerId: text("learner_id").notNull(),
    courseId: text("course_id").notNull(),
    cohortId: text("cohort_id"),
    status: enrollmentStatusEnum("status").notNull().default("pending-payment"),
    paymentId: text("payment_id"),
    couponCode: text("coupon_code"),
    ...moneyColumns("pricePaid"),
    completionPct: integer("completion_pct").notNull().default(0),
    completedAt: timestamp("completed_at"),
    certificateId: text("certificate_id"),
    expiresAt: timestamp("expires_at"),
    lastAccessedAt: timestamp("last_accessed_at"),
  },
  (table) => [
    index("lms_enrollments_org_learner_idx").on(
      table.organizationId,
      table.learnerId,
    ),
    index("lms_enrollments_org_course_idx").on(
      table.organizationId,
      table.courseId,
    ),
    index("lms_enrollments_org_cohort_idx").on(
      table.organizationId,
      table.cohortId,
    ),
    index("lms_enrollments_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("lms_enrollments_org_learner_course_idx").on(
      table.organizationId,
      table.learnerId,
      table.courseId,
    ),
    index("lms_enrollments_org_expires_idx").on(
      table.organizationId,
      table.expiresAt,
    ),
  ],
);

export const lmsModuleProgress = pgTable(
  "lms_module_progress",
  {
    ...lmsBaseColumns,
    enrollmentId: text("enrollment_id").notNull(),
    moduleId: text("module_id").notNull(),
    learnerId: text("learner_id").notNull(),
    courseId: text("course_id").notNull(),
    status: moduleProgressStatusEnum("status").notNull().default("not-started"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    progressPct: integer("progress_pct").notNull().default(0),
    quizScore: integer("quiz_score"),
    quizAttempts: integer("quiz_attempts").notNull().default(0),
    timeSpentSec: integer("time_spent_sec").notNull().default(0),
  },
  (table) => [
    index("lms_module_progress_org_enrollment_idx").on(
      table.organizationId,
      table.enrollmentId,
    ),
    index("lms_module_progress_org_module_idx").on(
      table.organizationId,
      table.moduleId,
    ),
    index("lms_module_progress_org_learner_idx").on(
      table.organizationId,
      table.learnerId,
    ),
    index("lms_module_progress_org_course_idx").on(
      table.organizationId,
      table.courseId,
    ),
    index("lms_module_progress_org_enrollment_module_idx").on(
      table.organizationId,
      table.enrollmentId,
      table.moduleId,
    ),
    index("lms_module_progress_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const lmsAssignments = pgTable(
  "lms_assignments",
  {
    ...lmsBaseColumns,
    courseId: text("course_id").notNull(),
    moduleId: text("module_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: assignmentTypeEnum("type").notNull().default("quiz"),
    dueHoursAfterEnrollment: integer("due_hours_after_enrollment"),
    absoluteDueDate: timestamp("absolute_due_date"),
    maxScore: integer("max_score").notNull().default(100),
    passingScore: integer("passing_score").notNull().default(60),
    allowLateSubmission: boolean("allow_late_submission")
      .notNull()
      .default(false),
    maxAttempts: integer("max_attempts").notNull().default(1),
  },
  (table) => [
    index("lms_assignments_org_course_idx").on(
      table.organizationId,
      table.courseId,
    ),
    index("lms_assignments_org_module_idx").on(
      table.organizationId,
      table.moduleId,
    ),
    index("lms_assignments_org_type_idx").on(table.organizationId, table.type),
    index("lms_assignments_org_due_date_idx").on(
      table.organizationId,
      table.absoluteDueDate,
    ),
  ],
);

export const lmsSubmissions = pgTable(
  "lms_submissions",
  {
    ...lmsBaseColumns,
    assignmentId: text("assignment_id").notNull(),
    learnerId: text("learner_id").notNull(),
    enrollmentId: text("enrollment_id").notNull(),
    attemptNumber: integer("attempt_number").notNull().default(1),
    status: submissionStatusEnum("status").notNull().default("submitted"),
    content: text("content"),
    attachmentIds: jsonb("attachment_ids").notNull().default("[]"),
    score: integer("score"),
    maxScore: integer("max_score").notNull().default(100),
    feedback: text("feedback"),
    gradedBy: text("graded_by"),
    gradedAt: timestamp("graded_at"),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  },
  (table) => [
    index("lms_submissions_org_assignment_idx").on(
      table.organizationId,
      table.assignmentId,
    ),
    index("lms_submissions_org_learner_idx").on(
      table.organizationId,
      table.learnerId,
    ),
    index("lms_submissions_org_enrollment_idx").on(
      table.organizationId,
      table.enrollmentId,
    ),
    index("lms_submissions_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("lms_submissions_org_assignment_learner_idx").on(
      table.organizationId,
      table.assignmentId,
      table.learnerId,
    ),
    index("lms_submissions_org_graded_by_idx").on(
      table.organizationId,
      table.gradedBy,
    ),
  ],
);

export const lmsCertificates = pgTable(
  "lms_certificates",
  {
    ...lmsBaseColumns,
    enrollmentId: text("enrollment_id").notNull(),
    learnerId: text("learner_id").notNull(),
    courseId: text("course_id").notNull(),
    verificationCode: text("verification_code").notNull(),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    documentId: text("document_id").notNull(),
    revoked: boolean("revoked").notNull().default(false),
    revokedReason: text("revoked_reason"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    uniqueIndex("lms_certificates_verification_code_idx").on(
      table.verificationCode,
    ),
    index("lms_certificates_org_enrollment_idx").on(
      table.organizationId,
      table.enrollmentId,
    ),
    index("lms_certificates_org_learner_idx").on(
      table.organizationId,
      table.learnerId,
    ),
    index("lms_certificates_org_course_idx").on(
      table.organizationId,
      table.courseId,
    ),
    index("lms_certificates_org_revoked_idx").on(
      table.organizationId,
      table.revoked,
    ),
    index("lms_certificates_org_expires_idx").on(
      table.organizationId,
      table.expiresAt,
    ),
  ],
);

export const lmsCohorts = pgTable(
  "lms_cohorts",
  {
    ...lmsBaseColumns,
    courseId: text("course_id").notNull(),
    name: text("name").notNull(),
    instructorId: text("instructor_id").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    capacity: integer("capacity").notNull().default(50),
    enrolledCount: integer("enrolled_count").notNull().default(0),
    status: cohortStatusEnum("status").notNull().default("scheduled"),
    timezone: text("timezone").notNull().default("UTC"),
    sessionIds: jsonb("session_ids").notNull().default("[]"),
  },
  (table) => [
    index("lms_cohorts_org_course_idx").on(
      table.organizationId,
      table.courseId,
    ),
    index("lms_cohorts_org_instructor_idx").on(
      table.organizationId,
      table.instructorId,
    ),
    index("lms_cohorts_org_status_idx").on(table.organizationId, table.status),
    index("lms_cohorts_org_start_date_idx").on(
      table.organizationId,
      table.startDate,
    ),
    index("lms_cohorts_org_end_date_idx").on(
      table.organizationId,
      table.endDate,
    ),
  ],
);

export const lmsLiveSessions = pgTable(
  "lms_live_sessions",
  {
    ...lmsBaseColumns,
    cohortId: text("cohort_id").notNull(),
    courseId: text("course_id").notNull(),
    instructorId: text("instructor_id").notNull(),
    title: text("title").notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    meetingUrl: text("meeting_url").notNull(),
    recordingUrl: text("recording_url"),
    status: liveSessionStatusEnum("status").notNull().default("scheduled"),
    attendeeCount: integer("attendee_count").notNull().default(0),
  },
  (table) => [
    index("lms_live_sessions_org_cohort_idx").on(
      table.organizationId,
      table.cohortId,
    ),
    index("lms_live_sessions_org_course_idx").on(
      table.organizationId,
      table.courseId,
    ),
    index("lms_live_sessions_org_instructor_idx").on(
      table.organizationId,
      table.instructorId,
    ),
    index("lms_live_sessions_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("lms_live_sessions_org_scheduled_idx").on(
      table.organizationId,
      table.scheduledAt,
    ),
  ],
);

export const lmsCourseReviews = pgTable(
  "lms_course_reviews",
  {
    ...lmsBaseColumns,
    courseId: text("course_id").notNull(),
    reviewerId: text("reviewer_id").notNull(),
    processInstanceId: text("process_instance_id"),
    status: reviewStatusEnum("status").notNull().default("pending"),
    feedback: text("feedback"),
    reviewedAt: timestamp("reviewed_at"),
  },
  (table) => [
    index("lms_course_reviews_org_course_idx").on(
      table.organizationId,
      table.courseId,
    ),
    index("lms_course_reviews_org_reviewer_idx").on(
      table.organizationId,
      table.reviewerId,
    ),
    index("lms_course_reviews_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("lms_course_reviews_org_process_instance_idx").on(
      table.organizationId,
      table.processInstanceId,
    ),
  ],
);

export type LmsCategory = typeof lmsCategories.$inferSelect;
export type LmsCourse = typeof lmsCourses.$inferSelect;
export type LmsCourseModule = typeof lmsCourseModules.$inferSelect;
export type LmsEnrollment = typeof lmsEnrollments.$inferSelect;
export type LmsModuleProgress = typeof lmsModuleProgress.$inferSelect;
export type LmsAssignment = typeof lmsAssignments.$inferSelect;
export type LmsSubmission = typeof lmsSubmissions.$inferSelect;
export type LmsCertificate = typeof lmsCertificates.$inferSelect;
export type LmsCohort = typeof lmsCohorts.$inferSelect;
export type LmsLiveSession = typeof lmsLiveSessions.$inferSelect;
export type LmsCourseReview = typeof lmsCourseReviews.$inferSelect;
