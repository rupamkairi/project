import type { ID, ActorContext, Logger } from "../interfaces";
import type { Timestamp, Money } from "../types";

export interface RouteContext {
  actor: {
    id: ID;
    type: "user" | "system" | "api-key";
    roles: string[];
    permissions: string[];
  };
  org: {
    id: ID;
  };
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string>;
}

export interface RouteResult<T = unknown> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

export type RouteHandler<T = unknown> = (
  ctx: RouteContext,
) => Promise<RouteResult<T>>;

export interface RouteDefinition {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  handler: RouteHandler;
  middleware: MiddlewareFunction[];
  metadata?: {
    public?: boolean;
    permission?: string;
    role?: string[];
    description?: string;
  };
}

export type MiddlewareFunction = (
  ctx: RouteContext,
  next: () => Promise<RouteResult>,
) => Promise<RouteResult>;

export function isAuthenticated(
  ctx: RouteContext,
  next: () => Promise<RouteResult>,
): Promise<RouteResult> {
  if (!ctx.actor || ctx.actor.type === "system") {
    return Promise.resolve({
      status: 401,
      body: { error: "Unauthorized", code: "AUTH_REQUIRED" },
    });
  }
  return next();
}

export function hasRole(roles: string[]): MiddlewareFunction {
  return (ctx: RouteContext, next: () => Promise<RouteResult>) => {
    if (!ctx.actor) {
      return Promise.resolve({
        status: 401,
        body: { error: "Unauthorized", code: "AUTH_REQUIRED" },
      });
    }
    const hasRequiredRole = ctx.actor.roles.some((r) => roles.includes(r));
    if (!hasRequiredRole) {
      return Promise.resolve({
        status: 403,
        body: { error: "Forbidden", code: "INSUFFICIENT_ROLE" },
      });
    }
    return next();
  };
}

export function hasPermission(permission: string): MiddlewareFunction {
  return (ctx: RouteContext, next: () => Promise<RouteResult>) => {
    if (!ctx.actor) {
      return Promise.resolve({
        status: 401,
        body: { error: "Unauthorized", code: "AUTH_REQUIRED" },
      });
    }
    const hasRequiredPermission =
      ctx.actor.permissions.includes("*:*") ||
      ctx.actor.permissions.includes(permission);
    if (!hasRequiredPermission) {
      return Promise.resolve({
        status: 403,
        body: { error: "Forbidden", code: "INSUFFICIENT_PERMISSION" },
      });
    }
    return next();
  };
}

export function isOwn(
  getResourceOwnerId: (ctx: RouteContext) => Promise<ID | null>,
): MiddlewareFunction {
  return async (ctx: RouteContext, next: () => Promise<RouteResult>) => {
    if (!ctx.actor) {
      return {
        status: 401,
        body: { error: "Unauthorized", code: "AUTH_REQUIRED" },
      };
    }
    const isAdmin = ctx.actor.roles.some((r) =>
      ["lms-admin", "admin"].includes(r),
    );
    if (isAdmin) {
      return next();
    }
    const ownerId = await getResourceOwnerId(ctx);
    if (!ownerId || ownerId !== ctx.actor.id) {
      return {
        status: 403,
        body: { error: "Forbidden", code: "NOT_RESOURCE_OWNER" },
      };
    }
    return next();
  };
}

const routes: RouteDefinition[] = [];

function registerRoute(
  method: RouteDefinition["method"],
  path: string,
  handler: RouteHandler,
  middleware: MiddlewareFunction[] = [],
  metadata?: RouteDefinition["metadata"],
): void {
  routes.push({ method, path, handler, middleware, metadata });
}

function publicRoute(): MiddlewareFunction[] {
  return [];
}

function authenticated(): MiddlewareFunction[] {
  return [isAuthenticated];
}

function learnerOnly(): MiddlewareFunction[] {
  return [
    isAuthenticated,
    hasRole(["learner", "instructor", "lms-admin", "org-admin"]),
  ];
}

function instructorOnly(): MiddlewareFunction[] {
  return [isAuthenticated, hasRole(["instructor", "lms-admin"])];
}

function adminOnly(): MiddlewareFunction[] {
  return [isAuthenticated, hasRole(["lms-admin"])];
}

function reviewerOnly(): MiddlewareFunction[] {
  return [isAuthenticated, hasRole(["lms-admin", "content-reviewer"])];
}

const getBody = (ctx: RouteContext): Record<string, unknown> =>
  (ctx.body as Record<string, unknown>) || {};

registerRoute(
  "GET",
  "/lms/courses",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.courses.list", params: ctx.query },
  }),
  publicRoute(),
  { public: true, description: "List published courses" },
);

registerRoute(
  "GET",
  "/lms/courses/:slug",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.courses.getBySlug", params: { slug: ctx.params.slug } },
  }),
  publicRoute(),
  { public: true, description: "Get course by slug" },
);

registerRoute(
  "GET",
  "/lms/categories",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.categories.list", params: ctx.query },
  }),
  publicRoute(),
  { public: true, description: "List categories" },
);

registerRoute(
  "GET",
  "/lms/search",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.courses.search", params: ctx.query },
  }),
  publicRoute(),
  { public: true, description: "Search courses" },
);

registerRoute(
  "GET",
  "/lms/courses/:id/modules",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.courses.modules",
      params: { courseId: ctx.params.id, ...ctx.query },
    },
  }),
  learnerOnly(),
  { description: "Get course modules (enrollment-gated)" },
);

registerRoute(
  "POST",
  "/lms/auth/register",
  async (ctx) => ({
    status: 201,
    body: { command: "auth.register", payload: ctx.body },
  }),
  publicRoute(),
  { public: true, description: "Register new user" },
);

registerRoute(
  "POST",
  "/lms/auth/login",
  async (ctx) => ({
    status: 200,
    body: { command: "auth.login", payload: ctx.body },
  }),
  publicRoute(),
  { public: true, description: "Login user" },
);

registerRoute(
  "POST",
  "/lms/auth/logout",
  async (ctx) => ({
    status: 200,
    body: { command: "auth.logout", payload: ctx.body },
  }),
  authenticated(),
  { description: "Logout user" },
);

registerRoute(
  "POST",
  "/lms/auth/forgot-password",
  async (ctx) => ({
    status: 200,
    body: { command: "auth.forgotPassword", payload: ctx.body },
  }),
  publicRoute(),
  { public: true, description: "Request password reset" },
);

registerRoute(
  "POST",
  "/lms/auth/reset-password",
  async (ctx) => ({
    status: 200,
    body: { command: "auth.resetPassword", payload: ctx.body },
  }),
  publicRoute(),
  { public: true, description: "Reset password" },
);

registerRoute(
  "GET",
  "/lms/enrollments",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.enrollments.list", params: ctx.query },
  }),
  learnerOnly(),
  { permission: "enrollment:read", description: "Get my enrollments" },
);

registerRoute(
  "POST",
  "/lms/enrollments",
  async (ctx) => ({
    status: 201,
    body: { command: "lms.enrollment.create", payload: ctx.body },
  }),
  learnerOnly(),
  { permission: "enrollment:create", description: "Create enrollment" },
);

registerRoute(
  "GET",
  "/lms/enrollments/:id",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.enrollments.get", params: { id: ctx.params.id } },
  }),
  learnerOnly(),
  { permission: "enrollment:read", description: "Get enrollment" },
);

registerRoute(
  "POST",
  "/lms/enrollments/:id/cancel",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.enrollment.cancel",
      payload: { enrollmentId: ctx.params.id },
    },
  }),
  learnerOnly(),
  { permission: "enrollment:cancel", description: "Cancel enrollment" },
);

registerRoute(
  "GET",
  "/lms/enrollments/:id/progress",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.enrollments.progress",
      params: { enrollmentId: ctx.params.id },
    },
  }),
  learnerOnly(),
  { permission: "enrollment:read", description: "Get enrollment progress" },
);

registerRoute(
  "GET",
  "/lms/learn/:courseSlug",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.learn.course",
      params: { courseSlug: ctx.params.courseSlug },
    },
  }),
  learnerOnly(),
  { description: "Course learning page" },
);

registerRoute(
  "GET",
  "/lms/learn/:courseSlug/modules/:id",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.learn.module",
      params: { courseId: ctx.params.courseSlug, moduleId: ctx.params.id },
    },
  }),
  learnerOnly(),
  { description: "Module content" },
);

registerRoute(
  "POST",
  "/lms/learn/:courseSlug/modules/:id/complete",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.progress.complete",
      payload: { moduleId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  learnerOnly(),
  { description: "Mark module complete" },
);

registerRoute(
  "POST",
  "/lms/learn/:courseSlug/modules/:id/progress",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.progress.update",
      payload: { moduleId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  learnerOnly(),
  { description: "Update progress (heartbeat)" },
);

registerRoute(
  "GET",
  "/lms/assignments/:id",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.assignments.get", params: { id: ctx.params.id } },
  }),
  learnerOnly(),
  { description: "Get assignment" },
);

registerRoute(
  "POST",
  "/lms/assignments/:id/submissions",
  async (ctx) => ({
    status: 201,
    body: {
      command: "lms.submission.create",
      payload: { assignmentId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  learnerOnly(),
  { permission: "submission:create", description: "Submit assignment" },
);

registerRoute(
  "GET",
  "/lms/submissions/:id",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.submissions.get", params: { id: ctx.params.id } },
  }),
  learnerOnly(),
  { description: "Get submission" },
);

registerRoute(
  "GET",
  "/lms/submissions/:id/feedback",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.submissions.get",
      params: { id: ctx.params.id, includeFeedback: true },
    },
  }),
  learnerOnly(),
  { description: "Get submission feedback" },
);

registerRoute(
  "GET",
  "/lms/certificates",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.certificates.list", params: ctx.query },
  }),
  learnerOnly(),
  { permission: "certificate:read", description: "Get my certificates" },
);

registerRoute(
  "GET",
  "/lms/certificates/:id",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.certificates.get", params: { id: ctx.params.id } },
  }),
  learnerOnly(),
  { permission: "certificate:read", description: "Get certificate" },
);

registerRoute(
  "GET",
  "/lms/certificates/:id/download",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.certificates.download", params: { id: ctx.params.id } },
  }),
  learnerOnly(),
  { permission: "certificate:read", description: "Download certificate PDF" },
);

registerRoute(
  "GET",
  "/lms/verify/:code",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.certificates.verify",
      params: { code: ctx.params.code },
    },
  }),
  publicRoute(),
  { public: true, description: "Public certificate verification" },
);

registerRoute(
  "GET",
  "/lms/cohorts/:id/sessions",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.cohorts.sessions",
      params: { cohortId: ctx.params.id },
    },
  }),
  learnerOnly(),
  { description: "Get cohort sessions" },
);

registerRoute(
  "GET",
  "/lms/sessions/:id",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.sessions.get", params: { id: ctx.params.id } },
  }),
  learnerOnly(),
  { description: "Get session details" },
);

registerRoute(
  "POST",
  "/lms/sessions/:id/start",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.session.start",
      payload: { sessionId: ctx.params.id },
    },
  }),
  instructorOnly(),
  { permission: "session:start", description: "Start live session" },
);

registerRoute(
  "POST",
  "/lms/sessions/:id/end",
  async (ctx) => ({
    status: 200,
    body: { command: "lms.session.end", payload: { sessionId: ctx.params.id } },
  }),
  instructorOnly(),
  { description: "End live session" },
);

registerRoute(
  "GET",
  "/lms/instructor/courses",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.instructor.courses", params: ctx.query },
  }),
  instructorOnly(),
  { permission: "course:read", description: "Get instructor's courses" },
);

registerRoute(
  "POST",
  "/lms/instructor/courses",
  async (ctx) => ({
    status: 201,
    body: { command: "lms.course.create", payload: ctx.body },
  }),
  instructorOnly(),
  { permission: "course:create", description: "Create course" },
);

registerRoute(
  "GET",
  "/lms/instructor/courses/:id",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.courses.get", params: { id: ctx.params.id } },
  }),
  instructorOnly(),
  { permission: "course:read", description: "Get course" },
);

registerRoute(
  "PATCH",
  "/lms/instructor/courses/:id",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.course.update",
      payload: { courseId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  instructorOnly(),
  { permission: "course:update", description: "Update course" },
);

registerRoute(
  "POST",
  "/lms/instructor/courses/:id/submit-review",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.course.submitReview",
      payload: { courseId: ctx.params.id },
    },
  }),
  instructorOnly(),
  { description: "Submit course for review" },
);

registerRoute(
  "GET",
  "/lms/instructor/courses/:id/modules",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.modules.listByCourse",
      params: { courseId: ctx.params.id },
    },
  }),
  instructorOnly(),
  { permission: "module:read", description: "Get course modules" },
);

registerRoute(
  "POST",
  "/lms/instructor/courses/:id/modules",
  async (ctx) => ({
    status: 201,
    body: {
      command: "lms.module.create",
      payload: { courseId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  instructorOnly(),
  { permission: "module:create", description: "Create module" },
);

registerRoute(
  "PATCH",
  "/lms/instructor/modules/:id",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.module.update",
      payload: { moduleId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  instructorOnly(),
  { permission: "module:update", description: "Update module" },
);

registerRoute(
  "DELETE",
  "/lms/instructor/modules/:id",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.module.delete",
      payload: { moduleId: ctx.params.id },
    },
  }),
  instructorOnly(),
  { permission: "module:update", description: "Delete module" },
);

registerRoute(
  "GET",
  "/lms/instructor/courses/:id/enrollments",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.instructor.enrollments",
      params: { courseId: ctx.params.id, ...ctx.query },
    },
  }),
  instructorOnly(),
  { permission: "enrollment:read", description: "Get course enrollments" },
);

registerRoute(
  "GET",
  "/lms/instructor/courses/:id/analytics",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.instructor.analytics",
      params: { courseId: ctx.params.id },
    },
  }),
  instructorOnly(),
  { permission: "analytics:read", description: "Get course analytics" },
);

registerRoute(
  "GET",
  "/lms/instructor/cohorts",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.instructor.cohorts", params: ctx.query },
  }),
  instructorOnly(),
  { permission: "cohort:read", description: "Get instructor's cohorts" },
);

registerRoute(
  "POST",
  "/lms/instructor/cohorts",
  async (ctx) => ({
    status: 201,
    body: { command: "lms.cohort.create", payload: ctx.body },
  }),
  instructorOnly(),
  { permission: "cohort:create", description: "Create cohort" },
);

registerRoute(
  "PATCH",
  "/lms/instructor/cohorts/:id",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.cohort.update",
      payload: { cohortId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  instructorOnly(),
  { permission: "cohort:manage", description: "Update cohort" },
);

registerRoute(
  "POST",
  "/lms/instructor/cohorts/:id/sessions",
  async (ctx) => ({
    status: 201,
    body: {
      command: "lms.session.create",
      payload: { cohortId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  instructorOnly(),
  { permission: "session:create", description: "Create session" },
);

registerRoute(
  "GET",
  "/lms/instructor/assignments/:id/submissions",
  async (ctx) => ({
    status: 200,
    body: {
      query: "lms.submissions.list",
      params: { assignmentId: ctx.params.id, ...ctx.query },
    },
  }),
  instructorOnly(),
  { permission: "submission:grade", description: "Get assignment submissions" },
);

registerRoute(
  "POST",
  "/lms/instructor/submissions/:id/grade",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.submission.grade",
      payload: { submissionId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  instructorOnly(),
  { permission: "submission:grade", description: "Grade submission" },
);

registerRoute(
  "GET",
  "/lms/admin/courses",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.admin.courses", params: ctx.query },
  }),
  adminOnly(),
  { permission: "course:read", description: "Get all courses" },
);

registerRoute(
  "POST",
  "/lms/admin/courses/:id/approve",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.course.approve",
      payload: { courseId: ctx.params.id },
    },
  }),
  reviewerOnly(),
  { permission: "course:publish", description: "Approve course" },
);

registerRoute(
  "POST",
  "/lms/admin/courses/:id/reject",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.course.reject",
      payload: { courseId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  reviewerOnly(),
  { permission: "course:publish", description: "Reject course" },
);

registerRoute(
  "GET",
  "/lms/admin/enrollments",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.admin.enrollments", params: ctx.query },
  }),
  adminOnly(),
  { permission: "enrollment:manage", description: "Get all enrollments" },
);

registerRoute(
  "GET",
  "/lms/admin/learners",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.admin.learners", params: ctx.query },
  }),
  adminOnly(),
  { description: "Get all learners" },
);

registerRoute(
  "POST",
  "/lms/admin/learners/:id/suspend",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.learner.suspend",
      payload: { learnerId: ctx.params.id },
    },
  }),
  adminOnly(),
  { description: "Suspend learner" },
);

registerRoute(
  "GET",
  "/lms/admin/certificates",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.admin.certificates", params: ctx.query },
  }),
  adminOnly(),
  { permission: "certificate:read", description: "Get all certificates" },
);

registerRoute(
  "POST",
  "/lms/admin/certificates/:id/revoke",
  async (ctx) => ({
    status: 200,
    body: {
      command: "lms.certificate.revoke",
      payload: { certificateId: ctx.params.id, ...getBody(ctx) },
    },
  }),
  adminOnly(),
  { permission: "certificate:revoke", description: "Revoke certificate" },
);

registerRoute(
  "GET",
  "/lms/admin/analytics/overview",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.admin.analytics", params: ctx.query },
  }),
  adminOnly(),
  { permission: "analytics:read", description: "Get analytics overview" },
);

registerRoute(
  "GET",
  "/lms/admin/analytics/revenue",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.admin.analytics.revenue", params: ctx.query },
  }),
  adminOnly(),
  { permission: "analytics:read", description: "Get revenue analytics" },
);

registerRoute(
  "GET",
  "/lms/admin/analytics/courses",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.admin.analytics.courses", params: ctx.query },
  }),
  adminOnly(),
  { permission: "analytics:read", description: "Get course analytics" },
);

registerRoute(
  "GET",
  "/lms/admin/analytics/instructors",
  async (ctx) => ({
    status: 200,
    body: { query: "lms.admin.analytics.instructors", params: ctx.query },
  }),
  adminOnly(),
  { permission: "analytics:read", description: "Get instructor analytics" },
);

registerRoute(
  "PATCH",
  "/lms/admin/settings",
  async (ctx) => ({
    status: 200,
    body: { command: "lms.settings.update", payload: ctx.body },
  }),
  adminOnly(),
  { description: "Update LMS settings" },
);

registerRoute(
  "POST",
  "/webhooks/payment",
  async (ctx) => ({
    status: 200,
    body: { command: "webhook.payment.handle", payload: ctx.body },
  }),
  publicRoute(),
  { public: true, description: "Handle payment webhooks" },
);

registerRoute(
  "POST",
  "/webhooks/zoom",
  async (ctx) => ({
    status: 200,
    body: { command: "webhook.zoom.handle", payload: ctx.body },
  }),
  publicRoute(),
  { public: true, description: "Handle Zoom webhooks" },
);

export function createLMSRoutes(): RouteDefinition[] {
  return [...routes];
}

export { routes as lmsRoutes };
