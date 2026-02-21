import type {
  Command,
  CommandHandler,
  SystemContext,
} from "../../../apps/server/src/core/cqrs";
import type {
  ID,
  Timestamp,
  Entity,
  Meta,
} from "../../../apps/server/src/core/entity";
import type { Money } from "../../../apps/server/src/core/primitives";

type CourseStatus = "draft" | "under-review" | "published" | "archived";
type EnrollmentStatus =
  | "pending-payment"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "refunded";
type ModuleProgressStatus = "not-started" | "in-progress" | "completed";
type SubmissionStatus =
  | "submitted"
  | "grading"
  | "graded"
  | "returned"
  | "late";
type CohortStatus = "scheduled" | "active" | "completed" | "cancelled";
type LiveSessionStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled"
  | "recorded";

interface CertificateTemplate {
  title: string;
  body: string;
  expiresAfterDays?: number;
  logoDocId?: ID;
}

interface Course extends Entity {
  title: string;
  slug: string;
  description: string;
  instructorId: ID;
  categoryId: ID;
  status: CourseStatus;
  type: "self-paced" | "cohort" | "live-only" | "hybrid";
  level: "beginner" | "intermediate" | "advanced" | "all-levels";
  language: string;
  prerequisites: string[];
  durationHours: number;
  moduleCount: number;
  price: Money;
  compareAtPrice?: Money;
  currency: string;
  enrolledCount: number;
  completedCount: number;
  rating: number;
  reviewCount: number;
  completionThreshold: number;
  tags: string[];
  thumbnailDocId?: ID;
  previewVideoUrl?: string;
  syllabusDocId?: ID;
  certificateTemplate: CertificateTemplate;
  publishedAt?: Timestamp;
  archivedAt?: Timestamp;
}

interface CourseModule extends Entity {
  courseId: ID;
  title: string;
  description?: string;
  order: number;
  type:
    | "video"
    | "article"
    | "quiz"
    | "assignment"
    | "live-session"
    | "download";
  contentRef?: string;
  contentDocId?: ID;
  estimatedMinutes: number;
  isFree: boolean;
  isPublished: boolean;
  requiredPrevious: boolean;
}

interface Enrollment extends Entity {
  learnerId: ID;
  courseId: ID;
  cohortId?: ID;
  status: EnrollmentStatus;
  paymentId?: ID;
  couponCode?: string;
  pricePaid: Money;
  completionPct: number;
  completedAt?: Timestamp;
  certificateId?: ID;
  expiresAt?: Timestamp;
  lastAccessedAt?: Timestamp;
}

interface ModuleProgress extends Entity {
  enrollmentId: ID;
  moduleId: ID;
  learnerId: ID;
  courseId: ID;
  status: ModuleProgressStatus;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  progressPct: number;
  quizScore?: number;
  quizAttempts: number;
  timeSpentSec: number;
}

interface Assignment extends Entity {
  courseId: ID;
  moduleId: ID;
  title: string;
  description: string;
  type: "quiz" | "file-upload" | "text-response" | "peer-review" | "project";
  dueHoursAfterEnrollment?: number;
  absoluteDueDate?: Timestamp;
  maxScore: number;
  passingScore: number;
  allowLateSubmission: boolean;
  maxAttempts: number;
}

interface Submission extends Entity {
  assignmentId: ID;
  learnerId: ID;
  enrollmentId: ID;
  attemptNumber: number;
  status: SubmissionStatus;
  content?: string;
  attachmentIds: ID[];
  score?: number;
  maxScore: number;
  feedback?: string;
  gradedBy?: ID;
  gradedAt?: Timestamp;
  submittedAt: Timestamp;
}

interface Certificate extends Entity {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  verificationCode: string;
  issuedAt: Timestamp;
  expiresAt?: Timestamp;
  documentId: ID;
  revoked: boolean;
  revokedReason?: string;
  revokedAt?: Timestamp;
}

interface Cohort extends Entity {
  courseId: ID;
  name: string;
  instructorId: ID;
  startDate: Timestamp;
  endDate: Timestamp;
  capacity: number;
  enrolledCount: number;
  status: CohortStatus;
  timezone: string;
  sessionIds: ID[];
}

interface LiveSession extends Entity {
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  scheduledAt: Timestamp;
  durationMinutes: number;
  meetingUrl: string;
  recordingUrl?: string;
  status: LiveSessionStatus;
  attendeeCount: number;
}

export interface DomainEvent {
  type: string;
  payload: Record<string, unknown>;
  orgId: ID;
  actorId: ID;
  timestamp: Timestamp;
  correlationId: ID;
}

export interface CommandContext extends SystemContext {
  emit(event: DomainEvent): void;
  query<T>(type: string, params: unknown): Promise<T>;
}

export type LmsCommand<T = unknown> = Command<T>;
export type LmsCommandHandler<
  TCommand extends LmsCommand,
  TResult = unknown,
> = (command: TCommand, context: CommandContext) => Promise<TResult>;

function hasRole(ctx: SystemContext, roles: string[]): boolean {
  return ctx.actor.roles.some((r) => roles.includes(r));
}

function isOwn(ctx: SystemContext, entityId: ID): boolean {
  return ctx.actor.id === entityId;
}

function createEvent(
  type: string,
  payload: Record<string, unknown>,
  ctx: SystemContext,
  correlationId: ID,
): DomainEvent {
  return {
    type,
    payload,
    orgId: ctx.org.id,
    actorId: ctx.actor.id,
    timestamp: Date.now(),
    correlationId,
  };
}

function createEntityBase(orgId: ID): {
  organizationId: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  meta: Meta;
} {
  const now = Date.now();
  return {
    organizationId: orgId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: {},
  };
}

function updateEntityBase<T extends Entity>(
  entity: T,
): Pick<T, "updatedAt" | "version"> {
  return {
    updatedAt: Date.now(),
    version: entity.version + 1,
  } as Pick<T, "updatedAt" | "version">;
}

// ============================================================================
// COURSE COMMANDS
// ============================================================================

export interface CourseCreatePayload {
  title: string;
  slug: string;
  description: string;
  categoryId?: ID;
  type: Course["type"];
  level: Course["level"];
  language?: string;
  price: Money;
  currency: string;
  completionThreshold?: number;
  tags?: string[];
  prerequisites?: string[];
  durationHours?: number;
}

export const courseCreateHandler: LmsCommandHandler<
  LmsCommand<CourseCreatePayload>,
  Course
> = async (cmd, ctx) => {
  if (!hasRole(ctx, ["lms-admin", "instructor"])) {
    throw new Error("Permission denied: course:create");
  }

  const course: Course = {
    id: `course_${Date.now()}`,
    ...createEntityBase(ctx.org.id),
    title: cmd.payload.title,
    slug: cmd.payload.slug,
    description: cmd.payload.description,
    instructorId: ctx.actor.id,
    categoryId: cmd.payload.categoryId ?? "",
    status: "draft",
    type: cmd.payload.type,
    level: cmd.payload.level,
    language: cmd.payload.language ?? "en",
    prerequisites: cmd.payload.prerequisites ?? [],
    durationHours: cmd.payload.durationHours ?? 0,
    moduleCount: 0,
    price: cmd.payload.price,
    compareAtPrice: undefined,
    currency: cmd.payload.currency,
    enrolledCount: 0,
    completedCount: 0,
    rating: 0,
    reviewCount: 0,
    completionThreshold: cmd.payload.completionThreshold ?? 80,
    tags: cmd.payload.tags ?? [],
    thumbnailDocId: undefined,
    previewVideoUrl: undefined,
    syllabusDocId: undefined,
    certificateTemplate: {
      title: "Certificate of Completion",
      body: "This certifies that {{learnerName}} has successfully completed {{courseTitle}}",
    },
    publishedAt: undefined,
    archivedAt: undefined,
  };

  ctx.emit(
    createEvent(
      "course.created",
      {
        courseId: course.id,
        title: course.title,
        instructorId: course.instructorId,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return course;
};

export interface CourseUpdatePayload {
  courseId: ID;
  title?: string;
  description?: string;
  categoryId?: ID;
  level?: Course["level"];
  language?: string;
  price?: Money;
  compareAtPrice?: Money;
  completionThreshold?: number;
  tags?: string[];
  prerequisites?: string[];
  durationHours?: number;
  thumbnailDocId?: ID;
  previewVideoUrl?: string;
  syllabusDocId?: ID;
  certificateTemplate?: Course["certificateTemplate"];
}

export const courseUpdateHandler: LmsCommandHandler<
  LmsCommand<CourseUpdatePayload>,
  Course
> = async (cmd, ctx) => {
  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: course:update");
  }

  if (course.status !== "draft" && !isAdmin) {
    throw new Error("Cannot update course that is not in draft status");
  }

  const updatedCourse: Course = {
    ...course,
    ...cmd.payload,
    ...updateEntityBase(course),
    id: course.id,
    instructorId: course.instructorId,
    status: course.status,
  };

  ctx.emit(
    createEvent(
      "course.updated",
      { courseId: updatedCourse.id, changes: Object.keys(cmd.payload) },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCourse;
};

export interface CourseSubmitReviewPayload {
  courseId: ID;
}

export const courseSubmitReviewHandler: LmsCommandHandler<
  LmsCommand<CourseSubmitReviewPayload>,
  Course
> = async (cmd, ctx) => {
  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: course:submit-review");
  }

  if (course.status !== "draft") {
    throw new Error("Course must be in draft status to submit for review");
  }

  if (course.moduleCount === 0) {
    throw new Error(
      "Course must have at least one module to submit for review",
    );
  }

  if (!course.price || course.price.amount === undefined) {
    throw new Error("Course must have a price set to submit for review");
  }

  const updatedCourse: Course = {
    ...course,
    ...updateEntityBase(course),
    status: "under-review",
  };

  ctx.emit(
    createEvent(
      "course.submitted-for-review",
      {
        courseId: updatedCourse.id,
        title: updatedCourse.title,
        instructorId: updatedCourse.instructorId,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCourse;
};

export interface CourseApprovePayload {
  courseId: ID;
}

export const courseApproveHandler: LmsCommandHandler<
  LmsCommand<CourseApprovePayload>,
  Course
> = async (cmd, ctx) => {
  if (!hasRole(ctx, ["lms-admin", "content-reviewer"])) {
    throw new Error("Permission denied: course:approve");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  if (course.status !== "under-review") {
    throw new Error("Course must be under review to approve");
  }

  const now = Date.now();
  const updatedCourse: Course = {
    ...course,
    ...updateEntityBase(course),
    status: "published",
    publishedAt: now,
  };

  ctx.emit(
    createEvent(
      "course.published",
      {
        courseId: updatedCourse.id,
        title: updatedCourse.title,
        instructorId: updatedCourse.instructorId,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCourse;
};

export interface CourseRejectPayload {
  courseId: ID;
  reason: string;
}

export const courseRejectHandler: LmsCommandHandler<
  LmsCommand<CourseRejectPayload>,
  Course
> = async (cmd, ctx) => {
  if (!hasRole(ctx, ["lms-admin", "content-reviewer"])) {
    throw new Error("Permission denied: course:reject");
  }

  if (!cmd.payload.reason || cmd.payload.reason.trim() === "") {
    throw new Error("Rejection reason is required");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  if (course.status !== "under-review") {
    throw new Error("Course must be under review to reject");
  }

  const updatedCourse: Course = {
    ...course,
    ...updateEntityBase(course),
    status: "draft",
  };

  ctx.emit(
    createEvent(
      "course.rejected",
      {
        courseId: updatedCourse.id,
        title: updatedCourse.title,
        instructorId: updatedCourse.instructorId,
        reason: cmd.payload.reason,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCourse;
};

export interface CourseArchivePayload {
  courseId: ID;
  overrideSafetyCheck?: boolean;
}

export const courseArchiveHandler: LmsCommandHandler<
  LmsCommand<CourseArchivePayload>,
  Course
> = async (cmd, ctx) => {
  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: course:archive");
  }

  if (course.status !== "published") {
    throw new Error("Only published courses can be archived");
  }

  if (!cmd.payload.overrideSafetyCheck && !isAdmin) {
    const activeEnrollments = await ctx.query<number>(
      "lms.enrollment.countActive",
      {
        courseId: course.id,
      },
    );
    if (activeEnrollments > 0) {
      throw new Error("Cannot archive course with active enrollments");
    }
  }

  const now = Date.now();
  const updatedCourse: Course = {
    ...course,
    ...updateEntityBase(course),
    status: "archived",
    archivedAt: now,
  };

  ctx.emit(
    createEvent(
      "course.archived",
      { courseId: updatedCourse.id, title: updatedCourse.title },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCourse;
};

export interface CourseRestorePayload {
  courseId: ID;
}

export const courseRestoreHandler: LmsCommandHandler<
  LmsCommand<CourseRestorePayload>,
  Course
> = async (cmd, ctx) => {
  if (!hasRole(ctx, ["lms-admin"])) {
    throw new Error("Permission denied: course:restore (admin only)");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  if (course.status !== "archived") {
    throw new Error("Only archived courses can be restored");
  }

  const updatedCourse: Course = {
    ...course,
    ...updateEntityBase(course),
    status: "draft",
    archivedAt: undefined,
  };

  ctx.emit(
    createEvent(
      "course.restored",
      { courseId: updatedCourse.id, title: updatedCourse.title },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCourse;
};

// ============================================================================
// MODULE COMMANDS
// ============================================================================

export interface ModuleCreatePayload {
  courseId: ID;
  title: string;
  description?: string;
  type: CourseModule["type"];
  contentRef?: string;
  contentDocId?: ID;
  estimatedMinutes?: number;
  isFree?: boolean;
  requiredPrevious?: boolean;
}

export const moduleCreateHandler: LmsCommandHandler<
  LmsCommand<ModuleCreatePayload>,
  CourseModule
> = async (cmd, ctx) => {
  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: module:create");
  }

  const existingModules = await ctx.query<CourseModule[]>(
    "lms.module.listByCourse",
    {
      courseId: cmd.payload.courseId,
    },
  );

  const nextOrder = existingModules.length;

  const module: CourseModule = {
    id: `module_${Date.now()}`,
    ...createEntityBase(ctx.org.id),
    courseId: cmd.payload.courseId,
    title: cmd.payload.title,
    description: cmd.payload.description,
    order: nextOrder,
    type: cmd.payload.type,
    contentRef: cmd.payload.contentRef,
    contentDocId: cmd.payload.contentDocId,
    estimatedMinutes: cmd.payload.estimatedMinutes ?? 0,
    isFree: cmd.payload.isFree ?? false,
    isPublished: false,
    requiredPrevious: cmd.payload.requiredPrevious ?? false,
  };

  ctx.emit(
    createEvent(
      "module.created",
      { moduleId: module.id, courseId: module.courseId, title: module.title },
      ctx,
      cmd.correlationId,
    ),
  );

  return module;
};

export interface ModuleUpdatePayload {
  moduleId: ID;
  title?: string;
  description?: string;
  type?: CourseModule["type"];
  contentRef?: string;
  contentDocId?: ID;
  estimatedMinutes?: number;
  isFree?: boolean;
  isPublished?: boolean;
  requiredPrevious?: boolean;
}

export const moduleUpdateHandler: LmsCommandHandler<
  LmsCommand<ModuleUpdatePayload>,
  CourseModule
> = async (cmd, ctx) => {
  const module = await ctx.query<CourseModule>("lms.module.get", {
    id: cmd.payload.moduleId,
  });

  if (!module) {
    throw new Error("Module not found");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: module.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: module:update");
  }

  const updatedModule: CourseModule = {
    ...module,
    ...cmd.payload,
    ...updateEntityBase(module),
    id: module.id,
    courseId: module.courseId,
    order: module.order,
  };

  ctx.emit(
    createEvent(
      "module.updated",
      {
        moduleId: updatedModule.id,
        courseId: updatedModule.courseId,
        changes: Object.keys(cmd.payload),
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedModule;
};

export interface ModuleDeletePayload {
  moduleId: ID;
}

export const moduleDeleteHandler: LmsCommandHandler<
  LmsCommand<ModuleDeletePayload>,
  void
> = async (cmd, ctx) => {
  const module = await ctx.query<CourseModule>("lms.module.get", {
    id: cmd.payload.moduleId,
  });

  if (!module) {
    throw new Error("Module not found");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: module.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: module:delete");
  }

  ctx.emit(
    createEvent(
      "module.deleted",
      { moduleId: module.id, courseId: module.courseId, title: module.title },
      ctx,
      cmd.correlationId,
    ),
  );
};

export interface ModuleReorderPayload {
  courseId: ID;
  moduleOrder: { moduleId: ID; order: number }[];
}

export const moduleReorderHandler: LmsCommandHandler<
  LmsCommand<ModuleReorderPayload>,
  CourseModule[]
> = async (cmd, ctx) => {
  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: module:reorder");
  }

  const modules = await ctx.query<CourseModule[]>("lms.module.listByCourse", {
    courseId: cmd.payload.courseId,
  });

  const orderMap = new Map(
    cmd.payload.moduleOrder.map((m) => [m.moduleId, m.order]),
  );

  const updatedModules = modules.map((m) => ({
    ...m,
    ...updateEntityBase(m),
    order: orderMap.get(m.id) ?? m.order,
  }));

  ctx.emit(
    createEvent(
      "module.reordered",
      { courseId: cmd.payload.courseId, moduleOrder: cmd.payload.moduleOrder },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedModules;
};

// ============================================================================
// ENROLLMENT COMMANDS
// ============================================================================

export interface EnrollmentCreatePayload {
  courseId: ID;
  learnerId: ID;
  cohortId?: ID;
  pricePaid: Money;
  couponCode?: string;
  paymentId?: ID;
  status?: EnrollmentStatus;
  expiresAt?: Timestamp;
}

export const enrollmentCreateHandler: LmsCommandHandler<
  LmsCommand<EnrollmentCreatePayload>,
  Enrollment
> = async (cmd, ctx) => {
  const isAdmin = hasRole(ctx, ["lms-admin", "org-admin"]);
  const isOwnLearner = isOwn(ctx, cmd.payload.learnerId);

  if (!isAdmin && !isOwnLearner) {
    throw new Error("Permission denied: enrollment:create");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  if (course.status !== "published") {
    throw new Error("Cannot enroll in unpublished course");
  }

  const existingEnrollment = await ctx.query<Enrollment | null>(
    "lms.enrollment.findActive",
    {
      learnerId: cmd.payload.learnerId,
      courseId: cmd.payload.courseId,
    },
  );

  if (existingEnrollment) {
    throw new Error("Learner already has an active enrollment for this course");
  }

  let status: EnrollmentStatus = cmd.payload.status ?? "pending-payment";

  if (course.price.amount === 0) {
    status = "active";
  }

  if (cmd.payload.cohortId) {
    const cohort = await ctx.query<Cohort>("lms.cohort.get", {
      id: cmd.payload.cohortId,
    });

    if (!cohort) {
      throw new Error("Cohort not found");
    }

    if (cohort.courseId !== cmd.payload.courseId) {
      throw new Error("Cohort does not belong to this course");
    }

    if (cohort.enrolledCount >= cohort.capacity) {
      throw new Error("Cohort is at full capacity");
    }
  }

  const enrollment: Enrollment = {
    id: `enrollment_${Date.now()}`,
    ...createEntityBase(ctx.org.id),
    learnerId: cmd.payload.learnerId,
    courseId: cmd.payload.courseId,
    cohortId: cmd.payload.cohortId,
    status,
    paymentId: cmd.payload.paymentId,
    couponCode: cmd.payload.couponCode,
    pricePaid: cmd.payload.pricePaid,
    completionPct: 0,
    completedAt: undefined,
    certificateId: undefined,
    expiresAt: cmd.payload.expiresAt,
    lastAccessedAt: undefined,
  };

  ctx.emit(
    createEvent(
      status === "active" ? "enrollment.activated" : "enrollment.created",
      {
        enrollmentId: enrollment.id,
        learnerId: enrollment.learnerId,
        courseId: enrollment.courseId,
        cohortId: enrollment.cohortId,
        status: enrollment.status,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return enrollment;
};

export interface EnrollmentCancelPayload {
  enrollmentId: ID;
  reason?: string;
}

export const enrollmentCancelHandler: LmsCommandHandler<
  LmsCommand<EnrollmentCancelPayload>,
  Enrollment
> = async (cmd, ctx) => {
  const enrollment = await ctx.query<Enrollment>("lms.enrollment.get", {
    id: cmd.payload.enrollmentId,
  });

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin", "org-admin"]);
  const isOwner = isOwn(ctx, enrollment.learnerId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: enrollment:cancel");
  }

  if (enrollment.status === "completed") {
    throw new Error("Cannot cancel completed enrollment");
  }

  if (enrollment.status === "cancelled" || enrollment.status === "refunded") {
    throw new Error("Enrollment is already cancelled or refunded");
  }

  const updatedEnrollment: Enrollment = {
    ...enrollment,
    ...updateEntityBase(enrollment),
    status: "cancelled",
  };

  ctx.emit(
    createEvent(
      "enrollment.cancelled",
      {
        enrollmentId: updatedEnrollment.id,
        learnerId: updatedEnrollment.learnerId,
        courseId: updatedEnrollment.courseId,
        reason: cmd.payload.reason,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedEnrollment;
};

export interface EnrollmentCompletePayload {
  enrollmentId: ID;
}

export const enrollmentCompleteHandler: LmsCommandHandler<
  LmsCommand<EnrollmentCompletePayload>,
  Enrollment
> = async (cmd, ctx) => {
  const enrollment = await ctx.query<Enrollment>("lms.enrollment.get", {
    id: cmd.payload.enrollmentId,
  });

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  if (enrollment.status !== "active") {
    throw new Error("Only active enrollments can be completed");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: enrollment.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  if (enrollment.completionPct < course.completionThreshold) {
    throw new Error(
      `Completion threshold not met. Required: ${course.completionThreshold}%, Current: ${enrollment.completionPct}%`,
    );
  }

  const now = Date.now();
  const updatedEnrollment: Enrollment = {
    ...enrollment,
    ...updateEntityBase(enrollment),
    status: "completed",
    completedAt: now,
  };

  ctx.emit(
    createEvent(
      "enrollment.completed",
      {
        enrollmentId: updatedEnrollment.id,
        learnerId: updatedEnrollment.learnerId,
        courseId: updatedEnrollment.courseId,
        completionPct: updatedEnrollment.completionPct,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedEnrollment;
};

export interface EnrollmentPaymentConfirmPayload {
  enrollmentId: ID;
  paymentId: ID;
}

export const enrollmentPaymentConfirmHandler: LmsCommandHandler<
  LmsCommand<EnrollmentPaymentConfirmPayload>,
  Enrollment
> = async (cmd, ctx) => {
  const enrollment = await ctx.query<Enrollment>("lms.enrollment.get", {
    id: cmd.payload.enrollmentId,
  });

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  if (enrollment.status !== "pending-payment") {
    throw new Error("Enrollment is not pending payment");
  }

  const updatedEnrollment: Enrollment = {
    ...enrollment,
    ...updateEntityBase(enrollment),
    status: "active",
    paymentId: cmd.payload.paymentId,
  };

  ctx.emit(
    createEvent(
      "enrollment.activated",
      {
        enrollmentId: updatedEnrollment.id,
        learnerId: updatedEnrollment.learnerId,
        courseId: updatedEnrollment.courseId,
        cohortId: updatedEnrollment.cohortId,
        paymentId: cmd.payload.paymentId,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedEnrollment;
};

// ============================================================================
// PROGRESS COMMANDS
// ============================================================================

export interface ProgressUpdatePayload {
  enrollmentId: ID;
  moduleId: ID;
  learnerId: ID;
  progressPct: number;
  timeSpentSec?: number;
}

export const progressUpdateHandler: LmsCommandHandler<
  LmsCommand<ProgressUpdatePayload>,
  ModuleProgress
> = async (cmd, ctx) => {
  if (!isOwn(ctx, cmd.payload.learnerId)) {
    const isAdmin = hasRole(ctx, ["lms-admin"]);
    if (!isAdmin) {
      throw new Error("Permission denied: progress:update");
    }
  }

  const enrollment = await ctx.query<Enrollment>("lms.enrollment.get", {
    id: cmd.payload.enrollmentId,
  });

  if (!enrollment || enrollment.learnerId !== cmd.payload.learnerId) {
    throw new Error("Enrollment not found or does not belong to learner");
  }

  if (enrollment.status !== "active") {
    throw new Error("Enrollment is not active");
  }

  const existingProgress = await ctx.query<ModuleProgress | null>(
    "lms.progress.getByModule",
    {
      enrollmentId: cmd.payload.enrollmentId,
      moduleId: cmd.payload.moduleId,
    },
  );

  const now = Date.now();

  let progress: ModuleProgress;

  if (!existingProgress) {
    progress = {
      id: `progress_${Date.now()}`,
      ...createEntityBase(ctx.org.id),
      enrollmentId: cmd.payload.enrollmentId,
      moduleId: cmd.payload.moduleId,
      learnerId: cmd.payload.learnerId,
      courseId: enrollment.courseId,
      status: "in-progress",
      startedAt: now,
      completedAt: undefined,
      progressPct: Math.min(100, Math.max(0, cmd.payload.progressPct)),
      quizScore: undefined,
      quizAttempts: 0,
      timeSpentSec: cmd.payload.timeSpentSec ?? 0,
    };
  } else {
    progress = {
      ...existingProgress,
      ...updateEntityBase(existingProgress),
      status:
        existingProgress.status === "not-started"
          ? "in-progress"
          : existingProgress.status,
      progressPct: Math.min(100, Math.max(0, cmd.payload.progressPct)),
      timeSpentSec:
        existingProgress.timeSpentSec + (cmd.payload.timeSpentSec ?? 0),
    };

    if (progress.status === "not-started") {
      progress.startedAt = now;
    }
  }

  ctx.emit(
    createEvent(
      "progress.updated",
      {
        progressId: progress.id,
        enrollmentId: progress.enrollmentId,
        moduleId: progress.moduleId,
        learnerId: progress.learnerId,
        progressPct: progress.progressPct,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return progress;
};

export interface ProgressCompletePayload {
  enrollmentId: ID;
  moduleId: ID;
  learnerId: ID;
  quizScore?: number;
}

export const progressCompleteHandler: LmsCommandHandler<
  LmsCommand<ProgressCompletePayload>,
  ModuleProgress
> = async (cmd, ctx) => {
  if (!isOwn(ctx, cmd.payload.learnerId)) {
    const isAdmin = hasRole(ctx, ["lms-admin"]);
    if (!isAdmin) {
      throw new Error("Permission denied: progress:complete");
    }
  }

  const enrollment = await ctx.query<Enrollment>("lms.enrollment.get", {
    id: cmd.payload.enrollmentId,
  });

  if (!enrollment || enrollment.learnerId !== cmd.payload.learnerId) {
    throw new Error("Enrollment not found or does not belong to learner");
  }

  if (enrollment.status !== "active") {
    throw new Error("Enrollment is not active");
  }

  const existingProgress = await ctx.query<ModuleProgress | null>(
    "lms.progress.getByModule",
    {
      enrollmentId: cmd.payload.enrollmentId,
      moduleId: cmd.payload.moduleId,
    },
  );

  const now = Date.now();

  let progress: ModuleProgress;

  if (!existingProgress) {
    progress = {
      id: `progress_${Date.now()}`,
      ...createEntityBase(ctx.org.id),
      enrollmentId: cmd.payload.enrollmentId,
      moduleId: cmd.payload.moduleId,
      learnerId: cmd.payload.learnerId,
      courseId: enrollment.courseId,
      status: "completed",
      startedAt: now,
      completedAt: now,
      progressPct: 100,
      quizScore: cmd.payload.quizScore,
      quizAttempts: cmd.payload.quizScore !== undefined ? 1 : 0,
      timeSpentSec: 0,
    };
  } else {
    progress = {
      ...existingProgress,
      ...updateEntityBase(existingProgress),
      status: "completed",
      completedAt: now,
      progressPct: 100,
      quizScore: cmd.payload.quizScore ?? existingProgress.quizScore,
      quizAttempts:
        cmd.payload.quizScore !== undefined
          ? existingProgress.quizAttempts + 1
          : existingProgress.quizAttempts,
    };
  }

  ctx.emit(
    createEvent(
      "module.completed",
      {
        progressId: progress.id,
        enrollmentId: progress.enrollmentId,
        moduleId: progress.moduleId,
        learnerId: progress.learnerId,
        courseId: progress.courseId,
        quizScore: progress.quizScore,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return progress;
};

// ============================================================================
// ASSIGNMENT COMMANDS
// ============================================================================

export interface AssignmentCreatePayload {
  courseId: ID;
  moduleId: ID;
  title: string;
  description: string;
  type: Assignment["type"];
  dueHoursAfterEnrollment?: number;
  absoluteDueDate?: Timestamp;
  maxScore?: number;
  passingScore?: number;
  allowLateSubmission?: boolean;
  maxAttempts?: number;
}

export const assignmentCreateHandler: LmsCommandHandler<
  LmsCommand<AssignmentCreatePayload>,
  Assignment
> = async (cmd, ctx) => {
  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: assignment:create");
  }

  const module = await ctx.query<CourseModule>("lms.module.get", {
    id: cmd.payload.moduleId,
  });

  if (!module || module.courseId !== cmd.payload.courseId) {
    throw new Error("Module not found or does not belong to course");
  }

  const assignment: Assignment = {
    id: `assignment_${Date.now()}`,
    ...createEntityBase(ctx.org.id),
    courseId: cmd.payload.courseId,
    moduleId: cmd.payload.moduleId,
    title: cmd.payload.title,
    description: cmd.payload.description,
    type: cmd.payload.type,
    dueHoursAfterEnrollment: cmd.payload.dueHoursAfterEnrollment,
    absoluteDueDate: cmd.payload.absoluteDueDate,
    maxScore: cmd.payload.maxScore ?? 100,
    passingScore: cmd.payload.passingScore ?? 60,
    allowLateSubmission: cmd.payload.allowLateSubmission ?? false,
    maxAttempts: cmd.payload.maxAttempts ?? 1,
  };

  ctx.emit(
    createEvent(
      "assignment.created",
      {
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        moduleId: assignment.moduleId,
        title: assignment.title,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return assignment;
};

export interface AssignmentUpdatePayload {
  assignmentId: ID;
  title?: string;
  description?: string;
  type?: Assignment["type"];
  dueHoursAfterEnrollment?: number;
  absoluteDueDate?: Timestamp;
  maxScore?: number;
  passingScore?: number;
  allowLateSubmission?: boolean;
  maxAttempts?: number;
}

export const assignmentUpdateHandler: LmsCommandHandler<
  LmsCommand<AssignmentUpdatePayload>,
  Assignment
> = async (cmd, ctx) => {
  const assignment = await ctx.query<Assignment>("lms.assignment.get", {
    id: cmd.payload.assignmentId,
  });

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: assignment.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: assignment:update");
  }

  const updatedAssignment: Assignment = {
    ...assignment,
    ...cmd.payload,
    ...updateEntityBase(assignment),
    id: assignment.id,
    courseId: assignment.courseId,
    moduleId: assignment.moduleId,
  };

  ctx.emit(
    createEvent(
      "assignment.updated",
      {
        assignmentId: updatedAssignment.id,
        courseId: updatedAssignment.courseId,
        changes: Object.keys(cmd.payload),
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedAssignment;
};

export interface AssignmentDeletePayload {
  assignmentId: ID;
}

export const assignmentDeleteHandler: LmsCommandHandler<
  LmsCommand<AssignmentDeletePayload>,
  void
> = async (cmd, ctx) => {
  const assignment = await ctx.query<Assignment>("lms.assignment.get", {
    id: cmd.payload.assignmentId,
  });

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: assignment.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: assignment:delete");
  }

  ctx.emit(
    createEvent(
      "assignment.deleted",
      {
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        moduleId: assignment.moduleId,
      },
      ctx,
      cmd.correlationId,
    ),
  );
};

// ============================================================================
// SUBMISSION COMMANDS
// ============================================================================

export interface SubmissionCreatePayload {
  assignmentId: ID;
  learnerId: ID;
  enrollmentId: ID;
  content?: string;
  attachmentIds?: ID[];
}

export const submissionCreateHandler: LmsCommandHandler<
  LmsCommand<SubmissionCreatePayload>,
  Submission
> = async (cmd, ctx) => {
  if (!isOwn(ctx, cmd.payload.learnerId)) {
    throw new Error("Permission denied: submission:create");
  }

  const assignment = await ctx.query<Assignment>("lms.assignment.get", {
    id: cmd.payload.assignmentId,
  });

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const enrollment = await ctx.query<Enrollment>("lms.enrollment.get", {
    id: cmd.payload.enrollmentId,
  });

  if (!enrollment || enrollment.learnerId !== cmd.payload.learnerId) {
    throw new Error("Enrollment not found or does not belong to learner");
  }

  if (enrollment.courseId !== assignment.courseId) {
    throw new Error("Assignment does not belong to enrolled course");
  }

  if (enrollment.status !== "active") {
    throw new Error("Enrollment is not active");
  }

  const previousSubmissions = await ctx.query<Submission[]>(
    "lms.submission.listByAssignmentAndLearner",
    {
      assignmentId: cmd.payload.assignmentId,
      learnerId: cmd.payload.learnerId,
    },
  );

  const attemptNumber = previousSubmissions.length + 1;

  if (attemptNumber > assignment.maxAttempts) {
    throw new Error(`Maximum attempts (${assignment.maxAttempts}) exceeded`);
  }

  const now = Date.now();

  if (
    assignment.absoluteDueDate &&
    now > assignment.absoluteDueDate &&
    !assignment.allowLateSubmission
  ) {
    throw new Error("Assignment submission deadline has passed");
  }

  const isLate = assignment.absoluteDueDate
    ? now > assignment.absoluteDueDate
    : false;

  const submission: Submission = {
    id: `submission_${Date.now()}`,
    ...createEntityBase(ctx.org.id),
    assignmentId: cmd.payload.assignmentId,
    learnerId: cmd.payload.learnerId,
    enrollmentId: cmd.payload.enrollmentId,
    attemptNumber,
    status: isLate ? "late" : "submitted",
    content: cmd.payload.content,
    attachmentIds: cmd.payload.attachmentIds ?? [],
    score: undefined,
    maxScore: assignment.maxScore,
    feedback: undefined,
    gradedBy: undefined,
    gradedAt: undefined,
    submittedAt: now,
  };

  ctx.emit(
    createEvent(
      "submission.received",
      {
        submissionId: submission.id,
        assignmentId: submission.assignmentId,
        learnerId: submission.learnerId,
        courseId: assignment.courseId,
        moduleId: assignment.moduleId,
        attemptNumber: submission.attemptNumber,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return submission;
};

export interface SubmissionGradePayload {
  submissionId: ID;
  score: number;
  feedback?: string;
}

export const submissionGradeHandler: LmsCommandHandler<
  LmsCommand<SubmissionGradePayload>,
  Submission
> = async (cmd, ctx) => {
  const submission = await ctx.query<Submission>("lms.submission.get", {
    id: cmd.payload.submissionId,
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  const assignment = await ctx.query<Assignment>("lms.assignment.get", {
    id: submission.assignmentId,
  });

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: assignment.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: submission:grade");
  }

  if (submission.status === "graded") {
    throw new Error("Submission is already graded");
  }

  if (cmd.payload.score < 0 || cmd.payload.score > assignment.maxScore) {
    throw new Error(`Score must be between 0 and ${assignment.maxScore}`);
  }

  const now = Date.now();
  const updatedSubmission: Submission = {
    ...submission,
    ...updateEntityBase(submission),
    status: "graded",
    score: cmd.payload.score,
    feedback: cmd.payload.feedback,
    gradedBy: ctx.actor.id,
    gradedAt: now,
  };

  const passed = cmd.payload.score >= assignment.passingScore;

  ctx.emit(
    createEvent(
      "submission.graded",
      {
        submissionId: updatedSubmission.id,
        assignmentId: updatedSubmission.assignmentId,
        learnerId: updatedSubmission.learnerId,
        courseId: assignment.courseId,
        moduleId: assignment.moduleId,
        score: updatedSubmission.score,
        maxScore: updatedSubmission.maxScore,
        passed,
        feedback: updatedSubmission.feedback,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedSubmission;
};

// ============================================================================
// CERTIFICATE COMMANDS
// ============================================================================

export interface CertificateCreatePayload {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  verificationCode: string;
  documentId: ID;
  expiresAt?: Timestamp;
}

export const certificateCreateHandler: LmsCommandHandler<
  LmsCommand<CertificateCreatePayload>,
  Certificate
> = async (cmd, ctx) => {
  if (ctx.actor.type !== "system") {
    throw new Error("Permission denied: certificate:create (system only)");
  }

  const enrollment = await ctx.query<Enrollment>("lms.enrollment.get", {
    id: cmd.payload.enrollmentId,
  });

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  if (enrollment.status !== "completed") {
    throw new Error("Enrollment must be completed to issue certificate");
  }

  if (enrollment.certificateId) {
    throw new Error("Certificate already issued for this enrollment");
  }

  const now = Date.now();
  const certificate: Certificate = {
    id: `cert_${Date.now()}`,
    ...createEntityBase(ctx.org.id),
    enrollmentId: cmd.payload.enrollmentId,
    learnerId: cmd.payload.learnerId,
    courseId: cmd.payload.courseId,
    verificationCode: cmd.payload.verificationCode,
    issuedAt: now,
    expiresAt: cmd.payload.expiresAt,
    documentId: cmd.payload.documentId,
    revoked: false,
    revokedReason: undefined,
    revokedAt: undefined,
  };

  ctx.emit(
    createEvent(
      "certificate.issued",
      {
        certificateId: certificate.id,
        enrollmentId: certificate.enrollmentId,
        learnerId: certificate.learnerId,
        courseId: certificate.courseId,
        verificationCode: certificate.verificationCode,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return certificate;
};

export interface CertificateRevokePayload {
  certificateId: ID;
  reason: string;
}

export const certificateRevokeHandler: LmsCommandHandler<
  LmsCommand<CertificateRevokePayload>,
  Certificate
> = async (cmd, ctx) => {
  if (!hasRole(ctx, ["lms-admin"])) {
    throw new Error("Permission denied: certificate:revoke (admin only)");
  }

  if (!cmd.payload.reason || cmd.payload.reason.trim() === "") {
    throw new Error("Revocation reason is required");
  }

  const certificate = await ctx.query<Certificate>("lms.certificate.get", {
    id: cmd.payload.certificateId,
  });

  if (!certificate) {
    throw new Error("Certificate not found");
  }

  if (certificate.revoked) {
    throw new Error("Certificate is already revoked");
  }

  const now = Date.now();
  const updatedCertificate: Certificate = {
    ...certificate,
    ...updateEntityBase(certificate),
    revoked: true,
    revokedReason: cmd.payload.reason,
    revokedAt: now,
  };

  ctx.emit(
    createEvent(
      "certificate.revoked",
      {
        certificateId: updatedCertificate.id,
        learnerId: updatedCertificate.learnerId,
        courseId: updatedCertificate.courseId,
        reason: cmd.payload.reason,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCertificate;
};

// ============================================================================
// COHORT COMMANDS
// ============================================================================

export interface CohortCreatePayload {
  courseId: ID;
  name: string;
  instructorId: ID;
  startDate: Timestamp;
  endDate: Timestamp;
  capacity?: number;
  timezone?: string;
}

export const cohortCreateHandler: LmsCommandHandler<
  LmsCommand<CohortCreatePayload>,
  Cohort
> = async (cmd, ctx) => {
  const course = await ctx.query<Course>("lms.course.get", {
    id: cmd.payload.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, course.instructorId);
  const isInstructor = isOwn(ctx, cmd.payload.instructorId);

  if (!isAdmin && !isOwner && !isInstructor) {
    throw new Error("Permission denied: cohort:create");
  }

  if (course.type === "self-paced") {
    throw new Error("Cannot create cohort for self-paced course");
  }

  if (cmd.payload.startDate >= cmd.payload.endDate) {
    throw new Error("Start date must be before end date");
  }

  const cohort: Cohort = {
    id: `cohort_${Date.now()}`,
    ...createEntityBase(ctx.org.id),
    courseId: cmd.payload.courseId,
    name: cmd.payload.name,
    instructorId: cmd.payload.instructorId,
    startDate: cmd.payload.startDate,
    endDate: cmd.payload.endDate,
    capacity: cmd.payload.capacity ?? 50,
    enrolledCount: 0,
    status: "scheduled",
    timezone: cmd.payload.timezone ?? "UTC",
    sessionIds: [],
  };

  ctx.emit(
    createEvent(
      "cohort.created",
      {
        cohortId: cohort.id,
        courseId: cohort.courseId,
        name: cohort.name,
        instructorId: cohort.instructorId,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return cohort;
};

export interface CohortUpdatePayload {
  cohortId: ID;
  name?: string;
  instructorId?: ID;
  startDate?: Timestamp;
  endDate?: Timestamp;
  capacity?: number;
  timezone?: string;
}

export const cohortUpdateHandler: LmsCommandHandler<
  LmsCommand<CohortUpdatePayload>,
  Cohort
> = async (cmd, ctx) => {
  const cohort = await ctx.query<Cohort>("lms.cohort.get", {
    id: cmd.payload.cohortId,
  });

  if (!cohort) {
    throw new Error("Cohort not found");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: cohort.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, cohort.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: cohort:update");
  }

  const startDate = cmd.payload.startDate ?? cohort.startDate;
  const endDate = cmd.payload.endDate ?? cohort.endDate;

  if (startDate >= endDate) {
    throw new Error("Start date must be before end date");
  }

  if (cmd.payload.capacity && cmd.payload.capacity < cohort.enrolledCount) {
    throw new Error(
      `Cannot reduce capacity below current enrollment (${cohort.enrolledCount})`,
    );
  }

  const updatedCohort: Cohort = {
    ...cohort,
    ...cmd.payload,
    ...updateEntityBase(cohort),
    id: cohort.id,
    courseId: cohort.courseId,
    enrolledCount: cohort.enrolledCount,
    status: cohort.status,
    sessionIds: cohort.sessionIds,
  };

  ctx.emit(
    createEvent(
      "cohort.updated",
      {
        cohortId: updatedCohort.id,
        courseId: updatedCohort.courseId,
        changes: Object.keys(cmd.payload),
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCohort;
};

export interface CohortCancelPayload {
  cohortId: ID;
  reason?: string;
}

export const cohortCancelHandler: LmsCommandHandler<
  LmsCommand<CohortCancelPayload>,
  Cohort
> = async (cmd, ctx) => {
  const cohort = await ctx.query<Cohort>("lms.cohort.get", {
    id: cmd.payload.cohortId,
  });

  if (!cohort) {
    throw new Error("Cohort not found");
  }

  const course = await ctx.query<Course>("lms.course.get", {
    id: cohort.courseId,
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, cohort.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: cohort:cancel");
  }

  if (cohort.status === "cancelled" || cohort.status === "completed") {
    throw new Error("Cohort is already cancelled or completed");
  }

  const updatedCohort: Cohort = {
    ...cohort,
    ...updateEntityBase(cohort),
    status: "cancelled",
  };

  ctx.emit(
    createEvent(
      "cohort.cancelled",
      {
        cohortId: updatedCohort.id,
        courseId: updatedCohort.courseId,
        name: updatedCohort.name,
        enrolledCount: updatedCohort.enrolledCount,
        reason: cmd.payload.reason,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedCohort;
};

// ============================================================================
// LIVE SESSION COMMANDS
// ============================================================================

export interface SessionCreatePayload {
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  scheduledAt: Timestamp;
  durationMinutes?: number;
  meetingUrl: string;
}

export const sessionCreateHandler: LmsCommandHandler<
  LmsCommand<SessionCreatePayload>,
  LiveSession
> = async (cmd, ctx) => {
  const cohort = await ctx.query<Cohort>("lms.cohort.get", {
    id: cmd.payload.cohortId,
  });

  if (!cohort) {
    throw new Error("Cohort not found");
  }

  if (cohort.courseId !== cmd.payload.courseId) {
    throw new Error("Cohort does not belong to this course");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, cohort.instructorId);
  const isInstructor = isOwn(ctx, cmd.payload.instructorId);

  if (!isAdmin && !isOwner && !isInstructor) {
    throw new Error("Permission denied: session:create");
  }

  if (cohort.status === "cancelled" || cohort.status === "completed") {
    throw new Error(
      "Cannot create sessions for cancelled or completed cohorts",
    );
  }

  const session: LiveSession = {
    id: `session_${Date.now()}`,
    ...createEntityBase(ctx.org.id),
    cohortId: cmd.payload.cohortId,
    courseId: cmd.payload.courseId,
    instructorId: cmd.payload.instructorId,
    title: cmd.payload.title,
    scheduledAt: cmd.payload.scheduledAt,
    durationMinutes: cmd.payload.durationMinutes ?? 60,
    meetingUrl: cmd.payload.meetingUrl,
    recordingUrl: undefined,
    status: "scheduled",
    attendeeCount: 0,
  };

  ctx.emit(
    createEvent(
      "session.created",
      {
        sessionId: session.id,
        cohortId: session.cohortId,
        courseId: session.courseId,
        title: session.title,
        scheduledAt: session.scheduledAt,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return session;
};

export interface SessionStartPayload {
  sessionId: ID;
}

export const sessionStartHandler: LmsCommandHandler<
  LmsCommand<SessionStartPayload>,
  LiveSession
> = async (cmd, ctx) => {
  const session = await ctx.query<LiveSession>("lms.session.get", {
    id: cmd.payload.sessionId,
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, session.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: session:start");
  }

  if (session.status !== "scheduled") {
    throw new Error("Only scheduled sessions can be started");
  }

  const now = Date.now();
  const scheduledTime = session.scheduledAt;
  const windowMs = 15 * 60 * 1000;

  if (now < scheduledTime - windowMs) {
    throw new Error(
      "Session can only be started within 15 minutes of scheduled time",
    );
  }

  const updatedSession: LiveSession = {
    ...session,
    ...updateEntityBase(session),
    status: "live",
  };

  ctx.emit(
    createEvent(
      "session.started",
      {
        sessionId: updatedSession.id,
        cohortId: updatedSession.cohortId,
        courseId: updatedSession.courseId,
        meetingUrl: updatedSession.meetingUrl,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedSession;
};

export interface SessionEndPayload {
  sessionId: ID;
}

export const sessionEndHandler: LmsCommandHandler<
  LmsCommand<SessionEndPayload>,
  LiveSession
> = async (cmd, ctx) => {
  const session = await ctx.query<LiveSession>("lms.session.get", {
    id: cmd.payload.sessionId,
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, session.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: session:end");
  }

  if (session.status !== "live") {
    throw new Error("Only live sessions can be ended");
  }

  const now = Date.now();
  const updatedSession: LiveSession = {
    ...session,
    ...updateEntityBase(session),
    status: "ended",
  };

  ctx.emit(
    createEvent(
      "session.ended",
      {
        sessionId: updatedSession.id,
        cohortId: updatedSession.cohortId,
        courseId: updatedSession.courseId,
        durationMinutes: Math.round((now - session.scheduledAt) / 60000),
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedSession;
};

export interface SessionCancelPayload {
  sessionId: ID;
  reason?: string;
}

export const sessionCancelHandler: LmsCommandHandler<
  LmsCommand<SessionCancelPayload>,
  LiveSession
> = async (cmd, ctx) => {
  const session = await ctx.query<LiveSession>("lms.session.get", {
    id: cmd.payload.sessionId,
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, session.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: session:cancel");
  }

  if (session.status === "cancelled") {
    throw new Error("Session is already cancelled");
  }

  if (session.status === "ended" || session.status === "recorded") {
    throw new Error("Cannot cancel ended or recorded sessions");
  }

  const updatedSession: LiveSession = {
    ...session,
    ...updateEntityBase(session),
    status: "cancelled",
  };

  ctx.emit(
    createEvent(
      "session.cancelled",
      {
        sessionId: updatedSession.id,
        cohortId: updatedSession.cohortId,
        courseId: updatedSession.courseId,
        title: updatedSession.title,
        scheduledAt: updatedSession.scheduledAt,
        reason: cmd.payload.reason,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedSession;
};

export interface SessionUploadRecordingPayload {
  sessionId: ID;
  recordingUrl: string;
}

export const sessionUploadRecordingHandler: LmsCommandHandler<
  LmsCommand<SessionUploadRecordingPayload>,
  LiveSession
> = async (cmd, ctx) => {
  const session = await ctx.query<LiveSession>("lms.session.get", {
    id: cmd.payload.sessionId,
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const isAdmin = hasRole(ctx, ["lms-admin"]);
  const isOwner = isOwn(ctx, session.instructorId);

  if (!isAdmin && !isOwner) {
    throw new Error("Permission denied: session:upload-recording");
  }

  if (session.status !== "ended") {
    throw new Error("Recording can only be uploaded for ended sessions");
  }

  const updatedSession: LiveSession = {
    ...session,
    ...updateEntityBase(session),
    status: "recorded",
    recordingUrl: cmd.payload.recordingUrl,
  };

  ctx.emit(
    createEvent(
      "session.recorded",
      {
        sessionId: updatedSession.id,
        cohortId: updatedSession.cohortId,
        courseId: updatedSession.courseId,
        recordingUrl: updatedSession.recordingUrl,
      },
      ctx,
      cmd.correlationId,
    ),
  );

  return updatedSession;
};

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

export const lmsCommandHandlers: Record<string, CommandHandler<any>> = {
  "lms.course.create": courseCreateHandler as CommandHandler<any>,
  "lms.course.update": courseUpdateHandler as CommandHandler<any>,
  "lms.course.submit-review": courseSubmitReviewHandler as CommandHandler<any>,
  "lms.course.approve": courseApproveHandler as CommandHandler<any>,
  "lms.course.reject": courseRejectHandler as CommandHandler<any>,
  "lms.course.archive": courseArchiveHandler as CommandHandler<any>,
  "lms.course.restore": courseRestoreHandler as CommandHandler<any>,

  "lms.module.create": moduleCreateHandler as CommandHandler<any>,
  "lms.module.update": moduleUpdateHandler as CommandHandler<any>,
  "lms.module.delete": moduleDeleteHandler as CommandHandler<any>,
  "lms.module.reorder": moduleReorderHandler as CommandHandler<any>,

  "lms.enrollment.create": enrollmentCreateHandler as CommandHandler<any>,
  "lms.enrollment.cancel": enrollmentCancelHandler as CommandHandler<any>,
  "lms.enrollment.complete": enrollmentCompleteHandler as CommandHandler<any>,
  "lms.enrollment.payment-confirm":
    enrollmentPaymentConfirmHandler as CommandHandler<any>,

  "lms.progress.update": progressUpdateHandler as CommandHandler<any>,
  "lms.progress.complete": progressCompleteHandler as CommandHandler<any>,

  "lms.assignment.create": assignmentCreateHandler as CommandHandler<any>,
  "lms.assignment.update": assignmentUpdateHandler as CommandHandler<any>,
  "lms.assignment.delete": assignmentDeleteHandler as CommandHandler<any>,

  "lms.submission.create": submissionCreateHandler as CommandHandler<any>,
  "lms.submission.grade": submissionGradeHandler as CommandHandler<any>,

  "lms.certificate.create": certificateCreateHandler as CommandHandler<any>,
  "lms.certificate.revoke": certificateRevokeHandler as CommandHandler<any>,

  "lms.cohort.create": cohortCreateHandler as CommandHandler<any>,
  "lms.cohort.update": cohortUpdateHandler as CommandHandler<any>,
  "lms.cohort.cancel": cohortCancelHandler as CommandHandler<any>,

  "lms.session.create": sessionCreateHandler as CommandHandler<any>,
  "lms.session.start": sessionStartHandler as CommandHandler<any>,
  "lms.session.end": sessionEndHandler as CommandHandler<any>,
  "lms.session.cancel": sessionCancelHandler as CommandHandler<any>,
  "lms.session.upload-recording":
    sessionUploadRecordingHandler as CommandHandler<any>,
};

export function registerLmsCommands(mediator: {
  registerCommand(type: string, handler: CommandHandler<any>): void;
}): void {
  for (const [type, handler] of Object.entries(lmsCommandHandlers)) {
    mediator.registerCommand(type, handler);
  }
}
