import type {
  Query,
  ID,
  Timestamp,
  Money,
  ActorContext,
  Logger,
  Repository,
  Filter,
  PaginatedResult,
} from "../interfaces";
import type {
  Course,
  CourseModule,
  Enrollment,
  ModuleProgress,
  Assignment,
  Submission,
  Certificate,
  Cohort,
  LiveSession,
  CourseStatus,
  CourseLevel,
} from "../types";
import type {
  LmsCourse,
  LmsCategory,
  LmsCourseModule,
  LmsEnrollment,
  LmsModuleProgress,
  LmsAssignment,
  LmsSubmission,
  LmsCertificate,
  LmsCohort,
  LmsLiveSession,
} from "../db/schema/index";
import {
  lmsCourses,
  lmsCategories,
  lmsCourseModules,
  lmsEnrollments,
  lmsModuleProgress,
  lmsAssignments,
  lmsSubmissions,
  lmsCertificates,
  lmsCohorts,
  lmsLiveSessions,
} from "../db/schema/index";
import {
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  sql,
  inArray,
  isNull,
} from "drizzle-orm";

interface DbClient {
  select(): any;
  insert(table: any): any;
  update(table: any): any;
  delete(table: any): any;
}

interface LmsContext extends ActorContext {
  db: DbClient;
}

function hasRole(ctx: ActorContext, roles: string[]): boolean {
  return ctx.actor.roles.some((r) => roles.includes(r));
}

function isAdmin(ctx: ActorContext): boolean {
  return hasRole(ctx, ["lms-admin", "admin"]);
}

function isInstructor(ctx: ActorContext): boolean {
  return hasRole(ctx, ["instructor", "lms-admin", "content-reviewer"]);
}

function isLearner(ctx: ActorContext): boolean {
  return hasRole(ctx, [
    "learner",
    "instructor",
    "lms-admin",
    "org-admin",
    "content-reviewer",
  ]);
}

function getDb(ctx: ActorContext): DbClient {
  return (ctx as LmsContext).db;
}

function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    pageSize: limit,
  };
}

export type QueryHandler<TParams = unknown, TResult = unknown> = (
  query: Query<TParams>,
  ctx: ActorContext,
) => Promise<TResult>;

export const queryHandlers: Map<string, QueryHandler<any, any>> = new Map();

queryHandlers.set(
  "lms.courses.list",
  async (
    query: Query<{
      page?: number;
      limit?: number;
      status?: CourseStatus;
      level?: CourseLevel;
      categoryId?: ID;
      instructorId?: ID;
      tags?: string[];
      minPrice?: number;
      maxPrice?: number;
      search?: string;
    }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsCourse>> => {
    const db = getDb(ctx);
    const {
      page = 1,
      limit = 20,
      status,
      level,
      categoryId,
      instructorId,
      tags,
      minPrice,
      maxPrice,
      search,
    } = query.params;
    const conditions: any[] = [
      eq(lmsCourses.organizationId, query.orgId),
      isNull(lmsCourses.deletedAt),
    ];

    if (!isAdmin(ctx)) {
      conditions.push(eq(lmsCourses.status, "published"));
    } else if (status) {
      conditions.push(eq(lmsCourses.status, status));
    }

    if (level) conditions.push(eq(lmsCourses.level, level));
    if (categoryId) conditions.push(eq(lmsCourses.categoryId, categoryId));
    if (instructorId)
      conditions.push(eq(lmsCourses.instructorId, instructorId));
    if (minPrice !== undefined)
      conditions.push(sql`${lmsCourses.priceAmount} >= ${minPrice}`);
    if (maxPrice !== undefined)
      conditions.push(sql`${lmsCourses.priceAmount} <= ${maxPrice}`);
    if (search) {
      conditions.push(
        or(
          ilike(lmsCourses.title, `%${search}%`),
          ilike(lmsCourses.description, `%${search}%`),
        ),
      );
    }

    const results = await db
      .select()
      .from(lmsCourses)
      .where(and(...conditions))
      .orderBy(desc(lmsCourses.publishedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsCourses)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.courses.getBySlug",
  async (
    query: Query<{ slug: string }>,
    ctx: ActorContext,
  ): Promise<LmsCourse | null> => {
    const db = getDb(ctx);
    const conditions = [
      eq(lmsCourses.organizationId, query.orgId),
      eq(lmsCourses.slug, query.params.slug),
      isNull(lmsCourses.deletedAt),
    ];

    if (!isAdmin(ctx)) {
      conditions.push(eq(lmsCourses.status, "published"));
    }

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(and(...conditions))
      .limit(1);
    return course ?? null;
  },
);

queryHandlers.set(
  "lms.courses.search",
  async (
    query: Query<{
      q: string;
      page?: number;
      limit?: number;
      filters?: {
        level?: CourseLevel;
        categoryId?: ID;
        minPrice?: number;
        maxPrice?: number;
        tags?: string[];
      };
    }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsCourse>> => {
    const db = getDb(ctx);
    const { q, page = 1, limit = 20, filters } = query.params;
    const conditions: any[] = [
      eq(lmsCourses.organizationId, query.orgId),
      eq(lmsCourses.status, "published"),
      isNull(lmsCourses.deletedAt),
      or(
        ilike(lmsCourses.title, `%${q}%`),
        ilike(lmsCourses.description, `%${q}%`),
        ilike(sql`${lmsCourses.tags}::text`, `%"${q}"%`),
      ),
    ];

    if (filters?.level) conditions.push(eq(lmsCourses.level, filters.level));
    if (filters?.categoryId)
      conditions.push(eq(lmsCourses.categoryId, filters.categoryId));
    if (filters?.minPrice !== undefined)
      conditions.push(sql`${lmsCourses.priceAmount} >= ${filters.minPrice}`);
    if (filters?.maxPrice !== undefined)
      conditions.push(sql`${lmsCourses.priceAmount} <= ${filters.maxPrice}`);

    const results = await db
      .select()
      .from(lmsCourses)
      .where(and(...conditions))
      .orderBy(desc(lmsCourses.rating))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsCourses)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.categories.list",
  async (
    query: Query<{ parentId?: ID; includeInactive?: boolean }>,
    ctx: ActorContext,
  ): Promise<LmsCategory[]> => {
    const db = getDb(ctx);
    const conditions: any[] = [
      eq(lmsCategories.organizationId, query.orgId),
      isNull(lmsCategories.deletedAt),
    ];

    if (query.params.parentId) {
      conditions.push(eq(lmsCategories.parentId, query.params.parentId));
    } else {
      conditions.push(isNull(lmsCategories.parentId));
    }

    if (!query.params.includeInactive) {
      conditions.push(eq(lmsCategories.status, "active"));
    }

    return db
      .select()
      .from(lmsCategories)
      .where(and(...conditions))
      .orderBy(asc(lmsCategories.sortOrder));
  },
);

queryHandlers.set(
  "lms.courses.modules",
  async (
    query: Query<{ courseId: ID; enrollmentId?: ID }>,
    ctx: ActorContext,
  ): Promise<LmsCourseModule[]> => {
    const db = getDb(ctx);
    const courseConditions = [
      eq(lmsCourses.organizationId, query.orgId),
      eq(lmsCourses.id, query.params.courseId),
      isNull(lmsCourses.deletedAt),
    ];

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(and(...courseConditions))
      .limit(1);
    if (!course) return [];

    const isInstructorOfCourse = course.instructorId === ctx.actor.id;
    const canAccessAll = isAdmin(ctx) || isInstructorOfCourse;

    let enrollment: LmsEnrollment | undefined;
    if (query.params.enrollmentId) {
      [enrollment] = await db
        .select()
        .from(lmsEnrollments)
        .where(
          and(
            eq(lmsEnrollments.id, query.params.enrollmentId),
            eq(lmsEnrollments.learnerId, ctx.actor.id),
            eq(lmsEnrollments.status, "active"),
          ),
        )
        .limit(1);
    } else if (!canAccessAll && isLearner(ctx)) {
      [enrollment] = await db
        .select()
        .from(lmsEnrollments)
        .where(
          and(
            eq(lmsEnrollments.courseId, query.params.courseId),
            eq(lmsEnrollments.learnerId, ctx.actor.id),
            eq(lmsEnrollments.status, "active"),
          ),
        )
        .limit(1);
    }

    const modules = await db
      .select()
      .from(lmsCourseModules)
      .where(
        and(
          eq(lmsCourseModules.organizationId, query.orgId),
          eq(lmsCourseModules.courseId, query.params.courseId),
          isNull(lmsCourseModules.deletedAt),
        ),
      )
      .orderBy(asc(lmsCourseModules.order));

    if (canAccessAll || enrollment) {
      return modules.filter((m: LmsCourseModule) => m.isPublished);
    }

    return modules.filter((m: LmsCourseModule) => m.isPublished && m.isFree);
  },
);

queryHandlers.set(
  "lms.enrollments.list",
  async (
    query: Query<{
      page?: number;
      limit?: number;
      status?: string;
      courseId?: ID;
    }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsEnrollment>> => {
    const db = getDb(ctx);
    const { page = 1, limit = 20, status, courseId } = query.params;
    const conditions: any[] = [
      eq(lmsEnrollments.organizationId, query.orgId),
      eq(lmsEnrollments.learnerId, ctx.actor.id),
      isNull(lmsEnrollments.deletedAt),
    ];

    if (status) conditions.push(eq(lmsEnrollments.status, status));
    if (courseId) conditions.push(eq(lmsEnrollments.courseId, courseId));

    const results = await db
      .select()
      .from(lmsEnrollments)
      .where(and(...conditions))
      .orderBy(desc(lmsEnrollments.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsEnrollments)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.enrollments.get",
  async (
    query: Query<{ id: ID }>,
    ctx: ActorContext,
  ): Promise<LmsEnrollment | null> => {
    const db = getDb(ctx);
    const [enrollment] = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.organizationId, query.orgId),
          eq(lmsEnrollments.id, query.params.id),
          isNull(lmsEnrollments.deletedAt),
        ),
      )
      .limit(1);

    if (!enrollment) return null;

    if (enrollment.learnerId !== ctx.actor.id && !isAdmin(ctx)) {
      const [course] = await db
        .select()
        .from(lmsCourses)
        .where(eq(lmsCourses.id, enrollment.courseId))
        .limit(1);
      if (!course || course.instructorId !== ctx.actor.id) {
        return null;
      }
    }

    return enrollment;
  },
);

queryHandlers.set(
  "lms.enrollments.progress",
  async (
    query: Query<{ enrollmentId: ID }>,
    ctx: ActorContext,
  ): Promise<{
    enrollment: LmsEnrollment;
    modules: (LmsCourseModule & { progress?: LmsModuleProgress })[];
    overallProgress: number;
  } | null> => {
    const db = getDb(ctx);
    const [enrollment] = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.organizationId, query.orgId),
          eq(lmsEnrollments.id, query.params.enrollmentId),
          isNull(lmsEnrollments.deletedAt),
        ),
      )
      .limit(1);

    if (!enrollment) return null;

    if (enrollment.learnerId !== ctx.actor.id && !isAdmin(ctx)) {
      return null;
    }

    const modules = await db
      .select()
      .from(lmsCourseModules)
      .where(
        and(
          eq(lmsCourseModules.organizationId, query.orgId),
          eq(lmsCourseModules.courseId, enrollment.courseId),
          eq(lmsCourseModules.isPublished, true),
          isNull(lmsCourseModules.deletedAt),
        ),
      )
      .orderBy(asc(lmsCourseModules.order));

    const progressRecords = await db
      .select()
      .from(lmsModuleProgress)
      .where(
        and(
          eq(lmsModuleProgress.organizationId, query.orgId),
          eq(lmsModuleProgress.enrollmentId, enrollment.id),
          isNull(lmsModuleProgress.deletedAt),
        ),
      );

    const progressMap = new Map(
      progressRecords.map((p: LmsModuleProgress) => [p.moduleId, p]),
    );
    const modulesWithProgress = modules.map((m: LmsCourseModule) => ({
      ...m,
      progress: progressMap.get(m.id),
    }));

    return {
      enrollment,
      modules: modulesWithProgress,
      overallProgress: enrollment.completionPct,
    };
  },
);

queryHandlers.set(
  "lms.learn.course",
  async (
    query: Query<{ courseSlug: string }>,
    ctx: ActorContext,
  ): Promise<{
    course: LmsCourse;
    enrollment?: LmsEnrollment;
    modules: LmsCourseModule[];
  } | null> => {
    const db = getDb(ctx);
    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(
        and(
          eq(lmsCourses.organizationId, query.orgId),
          eq(lmsCourses.slug, query.params.courseSlug),
          eq(lmsCourses.status, "published"),
          isNull(lmsCourses.deletedAt),
        ),
      )
      .limit(1);

    if (!course) return null;

    const [enrollment] = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.organizationId, query.orgId),
          eq(lmsEnrollments.courseId, course.id),
          eq(lmsEnrollments.learnerId, ctx.actor.id),
          eq(lmsEnrollments.status, "active"),
          isNull(lmsEnrollments.deletedAt),
        ),
      )
      .limit(1);

    const modules = await db
      .select()
      .from(lmsCourseModules)
      .where(
        and(
          eq(lmsCourseModules.organizationId, query.orgId),
          eq(lmsCourseModules.courseId, course.id),
          eq(lmsCourseModules.isPublished, true),
          isNull(lmsCourseModules.deletedAt),
        ),
      )
      .orderBy(asc(lmsCourseModules.order));

    return { course, enrollment, modules };
  },
);

queryHandlers.set(
  "lms.learn.module",
  async (
    query: Query<{ courseId: ID; moduleId: ID }>,
    ctx: ActorContext,
  ): Promise<{
    module: LmsCourseModule;
    progress?: LmsModuleProgress;
    assignment?: LmsAssignment;
  } | null> => {
    const db = getDb(ctx);
    const [module] = await db
      .select()
      .from(lmsCourseModules)
      .where(
        and(
          eq(lmsCourseModules.organizationId, query.orgId),
          eq(lmsCourseModules.id, query.params.moduleId),
          eq(lmsCourseModules.courseId, query.params.courseId),
          eq(lmsCourseModules.isPublished, true),
          isNull(lmsCourseModules.deletedAt),
        ),
      )
      .limit(1);

    if (!module) return null;

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(eq(lmsCourses.id, module.courseId))
      .limit(1);
    if (!course) return null;

    if (!module.isFree) {
      const [enrollment] = await db
        .select()
        .from(lmsEnrollments)
        .where(
          and(
            eq(lmsEnrollments.organizationId, query.orgId),
            eq(lmsEnrollments.courseId, query.params.courseId),
            eq(lmsEnrollments.learnerId, ctx.actor.id),
            eq(lmsEnrollments.status, "active"),
            isNull(lmsEnrollments.deletedAt),
          ),
        )
        .limit(1);

      const isInstructorOrAdmin =
        course.instructorId === ctx.actor.id || isAdmin(ctx);
      if (!enrollment && !isInstructorOrAdmin) {
        return null;
      }

      if (enrollment) {
        const [progress] = await db
          .select()
          .from(lmsModuleProgress)
          .where(
            and(
              eq(lmsModuleProgress.enrollmentId, enrollment.id),
              eq(lmsModuleProgress.moduleId, module.id),
            ),
          )
          .limit(1);

        let assignment: LmsAssignment | undefined;
        if (module.type === "assignment") {
          [assignment] = await db
            .select()
            .from(lmsAssignments)
            .where(eq(lmsAssignments.moduleId, module.id))
            .limit(1);
        }

        return { module, progress, assignment };
      }
    }

    let assignment: LmsAssignment | undefined;
    if (module.type === "assignment") {
      [assignment] = await db
        .select()
        .from(lmsAssignments)
        .where(eq(lmsAssignments.moduleId, module.id))
        .limit(1);
    }

    return { module, assignment };
  },
);

queryHandlers.set(
  "lms.progress.get",
  async (
    query: Query<{ enrollmentId: ID; moduleId: ID }>,
    ctx: ActorContext,
  ): Promise<LmsModuleProgress | null> => {
    const db = getDb(ctx);
    const [enrollment] = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.organizationId, query.orgId),
          eq(lmsEnrollments.id, query.params.enrollmentId),
          isNull(lmsEnrollments.deletedAt),
        ),
      )
      .limit(1);

    if (!enrollment) return null;

    if (enrollment.learnerId !== ctx.actor.id && !isAdmin(ctx)) {
      return null;
    }

    const [progress] = await db
      .select()
      .from(lmsModuleProgress)
      .where(
        and(
          eq(lmsModuleProgress.organizationId, query.orgId),
          eq(lmsModuleProgress.enrollmentId, query.params.enrollmentId),
          eq(lmsModuleProgress.moduleId, query.params.moduleId),
          isNull(lmsModuleProgress.deletedAt),
        ),
      )
      .limit(1);

    return progress ?? null;
  },
);

queryHandlers.set(
  "lms.assignments.get",
  async (
    query: Query<{ id: ID }>,
    ctx: ActorContext,
  ): Promise<LmsAssignment | null> => {
    const db = getDb(ctx);
    const [assignment] = await db
      .select()
      .from(lmsAssignments)
      .where(
        and(
          eq(lmsAssignments.organizationId, query.orgId),
          eq(lmsAssignments.id, query.params.id),
          isNull(lmsAssignments.deletedAt),
        ),
      )
      .limit(1);

    if (!assignment) return null;

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(eq(lmsCourses.id, assignment.courseId))
      .limit(1);
    if (!course) return null;

    const isInstructorOrAdmin =
      course.instructorId === ctx.actor.id || isAdmin(ctx);
    if (isInstructorOrAdmin) return assignment;

    const [enrollment] = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.learnerId, ctx.actor.id),
          eq(lmsEnrollments.courseId, assignment.courseId),
          eq(lmsEnrollments.status, "active"),
        ),
      )
      .limit(1);

    return enrollment ? assignment : null;
  },
);

queryHandlers.set(
  "lms.submissions.get",
  async (
    query: Query<{ id: ID }>,
    ctx: ActorContext,
  ): Promise<LmsSubmission | null> => {
    const db = getDb(ctx);
    const [submission] = await db
      .select()
      .from(lmsSubmissions)
      .where(
        and(
          eq(lmsSubmissions.organizationId, query.orgId),
          eq(lmsSubmissions.id, query.params.id),
          isNull(lmsSubmissions.deletedAt),
        ),
      )
      .limit(1);

    if (!submission) return null;

    if (submission.learnerId !== ctx.actor.id && !isAdmin(ctx)) {
      const [assignment] = await db
        .select()
        .from(lmsAssignments)
        .where(eq(lmsAssignments.id, submission.assignmentId))
        .limit(1);
      if (!assignment) return null;

      const [course] = await db
        .select()
        .from(lmsCourses)
        .where(eq(lmsCourses.id, assignment.courseId))
        .limit(1);
      if (!course || course.instructorId !== ctx.actor.id) {
        return null;
      }
    }

    return submission;
  },
);

queryHandlers.set(
  "lms.submissions.list",
  async (
    query: Query<{
      assignmentId: ID;
      page?: number;
      limit?: number;
      status?: string;
    }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsSubmission>> => {
    const db = getDb(ctx);
    const { assignmentId, page = 1, limit = 20, status } = query.params;

    const [assignment] = await db
      .select()
      .from(lmsAssignments)
      .where(
        and(
          eq(lmsAssignments.organizationId, query.orgId),
          eq(lmsAssignments.id, assignmentId),
          isNull(lmsAssignments.deletedAt),
        ),
      )
      .limit(1);

    if (!assignment) {
      return createPaginatedResult([], 0, page, limit);
    }

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(eq(lmsCourses.id, assignment.courseId))
      .limit(1);
    const isInstructorOrAdmin =
      (course && course.instructorId === ctx.actor.id) || isAdmin(ctx);

    if (!isInstructorOrAdmin) {
      const conditions: any[] = [
        eq(lmsSubmissions.organizationId, query.orgId),
        eq(lmsSubmissions.assignmentId, assignmentId),
        eq(lmsSubmissions.learnerId, ctx.actor.id),
        isNull(lmsSubmissions.deletedAt),
      ];
      if (status) conditions.push(eq(lmsSubmissions.status, status));

      const results = await db
        .select()
        .from(lmsSubmissions)
        .where(and(...conditions))
        .orderBy(desc(lmsSubmissions.submittedAt))
        .limit(limit)
        .offset((page - 1) * limit);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(lmsSubmissions)
        .where(and(...conditions));
      return createPaginatedResult(results, Number(count), page, limit);
    }

    const conditions: any[] = [
      eq(lmsSubmissions.organizationId, query.orgId),
      eq(lmsSubmissions.assignmentId, assignmentId),
      isNull(lmsSubmissions.deletedAt),
    ];
    if (status) conditions.push(eq(lmsSubmissions.status, status));

    const results = await db
      .select()
      .from(lmsSubmissions)
      .where(and(...conditions))
      .orderBy(desc(lmsSubmissions.submittedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsSubmissions)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.certificates.list",
  async (
    query: Query<{ page?: number; limit?: number }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsCertificate>> => {
    const db = getDb(ctx);
    const { page = 1, limit = 20 } = query.params;

    const conditions = [
      eq(lmsCertificates.organizationId, query.orgId),
      eq(lmsCertificates.learnerId, ctx.actor.id),
      eq(lmsCertificates.revoked, false),
      isNull(lmsCertificates.deletedAt),
    ];

    const results = await db
      .select()
      .from(lmsCertificates)
      .where(and(...conditions))
      .orderBy(desc(lmsCertificates.issuedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsCertificates)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.certificates.get",
  async (
    query: Query<{ id: ID }>,
    ctx: ActorContext,
  ): Promise<LmsCertificate | null> => {
    const db = getDb(ctx);
    const [certificate] = await db
      .select()
      .from(lmsCertificates)
      .where(
        and(
          eq(lmsCertificates.organizationId, query.orgId),
          eq(lmsCertificates.id, query.params.id),
          isNull(lmsCertificates.deletedAt),
        ),
      )
      .limit(1);

    if (!certificate) return null;

    if (certificate.learnerId !== ctx.actor.id && !isAdmin(ctx)) {
      return null;
    }

    return certificate;
  },
);

queryHandlers.set(
  "lms.certificates.verify",
  async (
    query: Query<{ code: string }>,
    ctx: ActorContext,
  ): Promise<{
    valid: boolean;
    certificate?: LmsCertificate;
    course?: LmsCourse;
  }> => {
    const db = getDb(ctx);
    const [certificate] = await db
      .select()
      .from(lmsCertificates)
      .where(eq(lmsCertificates.verificationCode, query.params.code))
      .limit(1);

    if (!certificate) {
      return { valid: false };
    }

    if (certificate.revoked) {
      return { valid: false, certificate };
    }

    if (certificate.expiresAt && new Date(certificate.expiresAt) < new Date()) {
      return { valid: false, certificate };
    }

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(eq(lmsCourses.id, certificate.courseId))
      .limit(1);

    return { valid: true, certificate, course };
  },
);

queryHandlers.set(
  "lms.certificates.download",
  async (
    query: Query<{ id: ID }>,
    ctx: ActorContext,
  ): Promise<{ downloadUrl: string; filename: string } | null> => {
    const db = getDb(ctx);
    const [certificate] = await db
      .select()
      .from(lmsCertificates)
      .where(
        and(
          eq(lmsCertificates.organizationId, query.orgId),
          eq(lmsCertificates.id, query.params.id),
          eq(lmsCertificates.revoked, false),
          isNull(lmsCertificates.deletedAt),
        ),
      )
      .limit(1);

    if (!certificate) return null;

    if (certificate.learnerId !== ctx.actor.id && !isAdmin(ctx)) {
      return null;
    }

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(eq(lmsCourses.id, certificate.courseId))
      .limit(1);
    const filename = `certificate-${course?.slug ?? "course"}.pdf`;

    return {
      downloadUrl: `/api/v1/documents/${certificate.documentId}/download`,
      filename,
    };
  },
);

queryHandlers.set(
  "lms.cohorts.get",
  async (
    query: Query<{ id: ID }>,
    ctx: ActorContext,
  ): Promise<LmsCohort | null> => {
    const db = getDb(ctx);
    const [cohort] = await db
      .select()
      .from(lmsCohorts)
      .where(
        and(
          eq(lmsCohorts.organizationId, query.orgId),
          eq(lmsCohorts.id, query.params.id),
          isNull(lmsCohorts.deletedAt),
        ),
      )
      .limit(1);

    if (!cohort) return null;

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(eq(lmsCourses.id, cohort.courseId))
      .limit(1);
    const isInstructorOrAdmin =
      (course && course.instructorId === ctx.actor.id) || isAdmin(ctx);

    if (isInstructorOrAdmin) return cohort;

    const [enrollment] = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.cohortId, cohort.id),
          eq(lmsEnrollments.learnerId, ctx.actor.id),
          eq(lmsEnrollments.status, "active"),
        ),
      )
      .limit(1);

    return enrollment ? cohort : null;
  },
);

queryHandlers.set(
  "lms.cohorts.sessions",
  async (
    query: Query<{ cohortId: ID }>,
    ctx: ActorContext,
  ): Promise<LmsLiveSession[]> => {
    const db = getDb(ctx);
    const [cohort] = await db
      .select()
      .from(lmsCohorts)
      .where(
        and(
          eq(lmsCohorts.organizationId, query.orgId),
          eq(lmsCohorts.id, query.params.cohortId),
          isNull(lmsCohorts.deletedAt),
        ),
      )
      .limit(1);

    if (!cohort) return [];

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(eq(lmsCourses.id, cohort.courseId))
      .limit(1);
    const isInstructorOrAdmin =
      (course && course.instructorId === ctx.actor.id) || isAdmin(ctx);

    if (!isInstructorOrAdmin) {
      const [enrollment] = await db
        .select()
        .from(lmsEnrollments)
        .where(
          and(
            eq(lmsEnrollments.cohortId, cohort.id),
            eq(lmsEnrollments.learnerId, ctx.actor.id),
            eq(lmsEnrollments.status, "active"),
          ),
        )
        .limit(1);

      if (!enrollment) return [];
    }

    return db
      .select()
      .from(lmsLiveSessions)
      .where(
        and(
          eq(lmsLiveSessions.organizationId, query.orgId),
          eq(lmsLiveSessions.cohortId, query.params.cohortId),
          isNull(lmsLiveSessions.deletedAt),
        ),
      )
      .orderBy(asc(lmsLiveSessions.scheduledAt));
  },
);

queryHandlers.set(
  "lms.sessions.get",
  async (
    query: Query<{ id: ID }>,
    ctx: ActorContext,
  ): Promise<LmsLiveSession | null> => {
    const db = getDb(ctx);
    const [session] = await db
      .select()
      .from(lmsLiveSessions)
      .where(
        and(
          eq(lmsLiveSessions.organizationId, query.orgId),
          eq(lmsLiveSessions.id, query.params.id),
          isNull(lmsLiveSessions.deletedAt),
        ),
      )
      .limit(1);

    if (!session) return null;

    const isInstructorOrAdmin =
      session.instructorId === ctx.actor.id || isAdmin(ctx);
    if (isInstructorOrAdmin) return session;

    const [enrollment] = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.cohortId, session.cohortId),
          eq(lmsEnrollments.learnerId, ctx.actor.id),
          eq(lmsEnrollments.status, "active"),
        ),
      )
      .limit(1);

    return enrollment ? session : null;
  },
);

queryHandlers.set(
  "lms.instructor.courses",
  async (
    query: Query<{
      page?: number;
      limit?: number;
      status?: CourseStatus;
    }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsCourse>> => {
    const db = getDb(ctx);
    if (!isInstructor(ctx)) {
      return createPaginatedResult([], 0, 1, 20);
    }

    const { page = 1, limit = 20, status } = query.params;
    const conditions: any[] = [
      eq(lmsCourses.organizationId, query.orgId),
      eq(lmsCourses.instructorId, ctx.actor.id),
      isNull(lmsCourses.deletedAt),
    ];

    if (status) conditions.push(eq(lmsCourses.status, status));

    const results = await db
      .select()
      .from(lmsCourses)
      .where(and(...conditions))
      .orderBy(desc(lmsCourses.updatedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsCourses)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.instructor.enrollments",
  async (
    query: Query<{
      courseId: ID;
      page?: number;
      limit?: number;
      status?: string;
    }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsEnrollment>> => {
    const db = getDb(ctx);
    const { courseId, page = 1, limit = 20, status } = query.params;

    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(
        and(
          eq(lmsCourses.organizationId, query.orgId),
          eq(lmsCourses.id, courseId),
          isNull(lmsCourses.deletedAt),
        ),
      )
      .limit(1);

    if (!course) {
      return createPaginatedResult([], 0, page, limit);
    }

    if (course.instructorId !== ctx.actor.id && !isAdmin(ctx)) {
      return createPaginatedResult([], 0, page, limit);
    }

    const conditions: any[] = [
      eq(lmsEnrollments.organizationId, query.orgId),
      eq(lmsEnrollments.courseId, courseId),
      isNull(lmsEnrollments.deletedAt),
    ];

    if (status) conditions.push(eq(lmsEnrollments.status, status));

    const results = await db
      .select()
      .from(lmsEnrollments)
      .where(and(...conditions))
      .orderBy(desc(lmsEnrollments.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsEnrollments)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.instructor.analytics",
  async (
    query: Query<{ courseId: ID }>,
    ctx: ActorContext,
  ): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    averageCompletion: number;
    averageRating: number;
    reviewCount: number;
    revenue: Money;
  } | null> => {
    const db = getDb(ctx);
    const [course] = await db
      .select()
      .from(lmsCourses)
      .where(
        and(
          eq(lmsCourses.organizationId, query.orgId),
          eq(lmsCourses.id, query.params.courseId),
          isNull(lmsCourses.deletedAt),
        ),
      )
      .limit(1);

    if (!course) return null;

    if (course.instructorId !== ctx.actor.id && !isAdmin(ctx)) {
      return null;
    }

    const enrollments = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.organizationId, query.orgId),
          eq(lmsEnrollments.courseId, query.params.courseId),
          isNull(lmsEnrollments.deletedAt),
        ),
      );

    const activeEnrollments = enrollments.filter(
      (e: LmsEnrollment) => e.status === "active",
    ).length;
    const completedEnrollments = enrollments.filter(
      (e: LmsEnrollment) => e.status === "completed",
    ).length;
    const totalRevenue = enrollments.reduce(
      (sum: number, e: LmsEnrollment) => sum + e.pricePaidAmount,
      0,
    );
    const avgCompletion =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce(
              (sum: number, e: LmsEnrollment) => sum + e.completionPct,
              0,
            ) / enrollments.length,
          )
        : 0;

    return {
      totalEnrollments: enrollments.length,
      activeEnrollments,
      completedEnrollments,
      averageCompletion: avgCompletion,
      averageRating: course.rating,
      reviewCount: course.reviewCount,
      revenue: { amount: totalRevenue, currency: course.priceCurrency },
    };
  },
);

queryHandlers.set(
  "lms.instructor.submissions",
  async (
    query: Query<{
      page?: number;
      limit?: number;
      status?: string;
    }>,
    ctx: ActorContext,
  ): Promise<
    PaginatedResult<
      LmsSubmission & { course?: LmsCourse; assignment?: LmsAssignment }
    >
  > => {
    const db = getDb(ctx);
    if (!isInstructor(ctx)) {
      return createPaginatedResult([], 0, 1, 20);
    }

    const { page = 1, limit = 20, status } = query.params;

    const instructorCourses = await db
      .select()
      .from(lmsCourses)
      .where(
        and(
          eq(lmsCourses.organizationId, query.orgId),
          eq(lmsCourses.instructorId, ctx.actor.id),
          isNull(lmsCourses.deletedAt),
        ),
      );

    if (instructorCourses.length === 0) {
      return createPaginatedResult([], 0, page, limit);
    }

    const courseIds = instructorCourses.map((c: LmsCourse) => c.id);

    const assignments = await db
      .select()
      .from(lmsAssignments)
      .where(
        and(
          eq(lmsAssignments.organizationId, query.orgId),
          inArray(lmsAssignments.courseId, courseIds),
          isNull(lmsAssignments.deletedAt),
        ),
      );

    if (assignments.length === 0) {
      return createPaginatedResult([], 0, page, limit);
    }

    const assignmentIds = assignments.map((a: LmsAssignment) => a.id);

    const conditions: any[] = [
      eq(lmsSubmissions.organizationId, query.orgId),
      inArray(lmsSubmissions.assignmentId, assignmentIds),
      isNull(lmsSubmissions.deletedAt),
    ];

    if (status) {
      conditions.push(eq(lmsSubmissions.status, status));
    } else {
      conditions.push(
        or(
          eq(lmsSubmissions.status, "submitted"),
          eq(lmsSubmissions.status, "grading"),
        ),
      );
    }

    const results = await db
      .select()
      .from(lmsSubmissions)
      .where(and(...conditions))
      .orderBy(desc(lmsSubmissions.submittedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsSubmissions)
      .where(and(...conditions));

    const assignmentMap = new Map(
      assignments.map((a: LmsAssignment) => [a.id, a]),
    );
    const courseMap = new Map(
      instructorCourses.map((c: LmsCourse) => [c.id, c]),
    );

    const enrichedResults = results.map((s: LmsSubmission) => {
      const assignment = assignmentMap.get(s.assignmentId);
      const course = assignment
        ? courseMap.get(assignment.courseId)
        : undefined;
      return { ...s, assignment, course };
    });

    return createPaginatedResult(enrichedResults, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.admin.courses",
  async (
    query: Query<{
      page?: number;
      limit?: number;
      status?: CourseStatus;
      instructorId?: ID;
      search?: string;
    }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsCourse>> => {
    const db = getDb(ctx);
    if (!isAdmin(ctx)) {
      return createPaginatedResult([], 0, 1, 20);
    }

    const { page = 1, limit = 20, status, instructorId, search } = query.params;
    const conditions: any[] = [
      eq(lmsCourses.organizationId, query.orgId),
      isNull(lmsCourses.deletedAt),
    ];

    if (status) conditions.push(eq(lmsCourses.status, status));
    if (instructorId)
      conditions.push(eq(lmsCourses.instructorId, instructorId));
    if (search) {
      conditions.push(
        or(
          ilike(lmsCourses.title, `%${search}%`),
          ilike(lmsCourses.description, `%${search}%`),
        ),
      );
    }

    const results = await db
      .select()
      .from(lmsCourses)
      .where(and(...conditions))
      .orderBy(desc(lmsCourses.updatedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsCourses)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.admin.enrollments",
  async (
    query: Query<{
      page?: number;
      limit?: number;
      courseId?: ID;
      learnerId?: ID;
      status?: string;
    }>,
    ctx: ActorContext,
  ): Promise<PaginatedResult<LmsEnrollment>> => {
    const db = getDb(ctx);
    if (!isAdmin(ctx)) {
      return createPaginatedResult([], 0, 1, 20);
    }

    const { page = 1, limit = 20, courseId, learnerId, status } = query.params;
    const conditions: any[] = [
      eq(lmsEnrollments.organizationId, query.orgId),
      isNull(lmsEnrollments.deletedAt),
    ];

    if (courseId) conditions.push(eq(lmsEnrollments.courseId, courseId));
    if (learnerId) conditions.push(eq(lmsEnrollments.learnerId, learnerId));
    if (status) conditions.push(eq(lmsEnrollments.status, status));

    const results = await db
      .select()
      .from(lmsEnrollments)
      .where(and(...conditions))
      .orderBy(desc(lmsEnrollments.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lmsEnrollments)
      .where(and(...conditions));

    return createPaginatedResult(results, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.admin.learners",
  async (
    query: Query<{
      page?: number;
      limit?: number;
      search?: string;
    }>,
    ctx: ActorContext,
  ): Promise<
    PaginatedResult<{
      learnerId: ID;
      enrollmentCount: number;
      completedCount: number;
      totalSpent: Money;
    }>
  > => {
    const db = getDb(ctx);
    if (!isAdmin(ctx)) {
      return createPaginatedResult([], 0, 1, 20);
    }

    const { page = 1, limit = 20 } = query.params;

    const results = await db
      .select({
        learnerId: lmsEnrollments.learnerId,
        enrollmentCount: sql<number>`count(*)`,
        completedCount: sql<number>`count(*) filter (where ${lmsEnrollments.status} = 'completed')`,
        totalSpentAmount: sql<number>`sum(${lmsEnrollments.pricePaidAmount})`,
        currency: sql<string>`max(${lmsEnrollments.pricePaidCurrency})`,
      })
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.organizationId, query.orgId),
          isNull(lmsEnrollments.deletedAt),
        ),
      )
      .groupBy(lmsEnrollments.learnerId)
      .limit(limit)
      .offset((page - 1) * limit);

    const formattedResults = results.map((r: any) => ({
      learnerId: r.learnerId,
      enrollmentCount: Number(r.enrollmentCount),
      completedCount: Number(r.completedCount),
      totalSpent: { amount: Number(r.totalSpentAmount), currency: r.currency },
    }));

    const [{ count }] = await db
      .select({
        count: sql<number>`count(distinct ${lmsEnrollments.learnerId})`,
      })
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.organizationId, query.orgId),
          isNull(lmsEnrollments.deletedAt),
        ),
      );

    return createPaginatedResult(formattedResults, Number(count), page, limit);
  },
);

queryHandlers.set(
  "lms.admin.analytics",
  async (
    query: Query<{ startDate?: Timestamp; endDate?: Timestamp }>,
    ctx: ActorContext,
  ): Promise<{
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    totalRevenue: Money;
    certificatesIssued: number;
    topCourses: { courseId: ID; title: string; enrollments: number }[];
  }> => {
    const db = getDb(ctx);
    if (!isAdmin(ctx)) {
      throw new Error("Unauthorized");
    }

    const courses = await db
      .select()
      .from(lmsCourses)
      .where(
        and(
          eq(lmsCourses.organizationId, query.orgId),
          isNull(lmsCourses.deletedAt),
        ),
      );

    const enrollments = await db
      .select()
      .from(lmsEnrollments)
      .where(
        and(
          eq(lmsEnrollments.organizationId, query.orgId),
          isNull(lmsEnrollments.deletedAt),
        ),
      );

    const certificates = await db
      .select()
      .from(lmsCertificates)
      .where(
        and(
          eq(lmsCertificates.organizationId, query.orgId),
          eq(lmsCertificates.revoked, false),
          isNull(lmsCertificates.deletedAt),
        ),
      );

    const courseEnrollmentCounts = new Map<ID, number>();
    enrollments.forEach((e: LmsEnrollment) => {
      courseEnrollmentCounts.set(
        e.courseId,
        (courseEnrollmentCounts.get(e.courseId) ?? 0) + 1,
      );
    });

    const topCourses = courses
      .map((c: LmsCourse) => ({
        courseId: c.id,
        title: c.title,
        enrollments: courseEnrollmentCounts.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 5);

    const totalRevenue = enrollments.reduce(
      (sum: number, e: LmsEnrollment) => sum + e.pricePaidAmount,
      0,
    );
    const currency = courses[0]?.priceCurrency ?? "USD";

    return {
      totalCourses: courses.length,
      publishedCourses: courses.filter(
        (c: LmsCourse) => c.status === "published",
      ).length,
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(
        (e: LmsEnrollment) => e.status === "active",
      ).length,
      completedEnrollments: enrollments.filter(
        (e: LmsEnrollment) => e.status === "completed",
      ).length,
      totalRevenue: { amount: totalRevenue, currency },
      certificatesIssued: certificates.length,
      topCourses,
    };
  },
);

export function registerLmsQueryHandlers(mediator: {
  registerQuery: (type: string, handler: QueryHandler<any, any>) => void;
}): void {
  for (const [type, handler] of queryHandlers) {
    mediator.registerQuery(type, handler);
  }
}

export { queryHandlers as lmsQueryHandlers };
