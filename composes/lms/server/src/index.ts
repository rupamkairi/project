import { Elysia } from "elysia"
import type { Mediator } from "@core"
import type { EventBus, Scheduler } from "@core"
import { createCourseRoutes } from "./routes/courses"
import { createEnrollmentRoutes } from "./routes/enrollments"
import { createLearningRoutes } from "./routes/learning"
import { createAssignmentRoutes } from "./routes/assignments"
import { createCohortRoutes } from "./routes/cohorts"
import { createCertificateRoutes } from "./routes/certificates"
import { createAnalyticsRoutes } from "./routes/analytics"
import { createDiscussionRoutes } from "./routes/discussions"
import { createWebhookRoutes } from "./routes/webhook"
import { registerLmsHooks, registerLmsJobs, LMS_FSMs } from "./backend"

export function createLmsCompose(mediator: Mediator, bus?: EventBus, scheduler?: Scheduler) {
  // Register FSMs with the mediator's FSM engine (if available via mediator.context)
  try {
    const ctx = mediator as any
    if (ctx.fsm?.register) {
      for (const machine of LMS_FSMs) {
        ctx.fsm.register(machine)
      }
    }
  } catch {
    // FSM engine may not be exposed on mediator — skip gracefully
  }

  // Register hooks if bus is available
  if (bus) {
    registerLmsHooks(bus, mediator)
  }

  // Register jobs if scheduler is available
  if (scheduler) {
    registerLmsJobs(scheduler, mediator)
  }

  return new Elysia({ prefix: "/lms" })
    .use(createCourseRoutes(mediator))
    .use(createEnrollmentRoutes(mediator))
    .use(createLearningRoutes(mediator))
    .use(createAssignmentRoutes(mediator))
    .use(createCohortRoutes(mediator))
    .use(createCertificateRoutes(mediator))
    .use(createAnalyticsRoutes(mediator))
    .use(createDiscussionRoutes(mediator))
    .use(createWebhookRoutes(mediator))
}

export type LmsApp = ReturnType<typeof createLmsCompose>

// Re-export schema
export {
  lmsCourseDetail,
  lmsModule,
  lmsLesson,
  lmsAssignment,
  lmsSubmission,
  lmsQuiz,
  lmsQuizQuestion,
  lmsCertificate,
  lmsCohort,
  lmsCohortMember,
  lmsProgress,
  lmsDiscussion,
  lmsDiscussionReply,
  lmsCourseReview,
  lmsCoupon,
  lmsWaitlist,
  lmsQuizSubmission,
  lmsPaymentEvent,
  lmsOrgConfig,
  type LmsCourseDetail,
  type LmsModule,
  type LmsLesson,
  type LmsAssignment,
  type LmsSubmission,
  type LmsQuiz,
  type LmsQuizQuestion,
  type LmsCertificate,
  type LmsCohort,
  type LmsCohortMember,
  type LmsProgress,
  type LmsDiscussion,
  type LmsDiscussionReply,
  type LmsCourseReview,
  type LmsCoupon,
  type LmsWaitlist,
  type LmsQuizSubmission,
  type LmsPaymentEvent,
  type LmsOrgConfig,
} from "./db/schema/lms"

// Re-export seed
export { seedLms } from "./db/seed/lms"

// Re-export backend
export { registerLmsHooks, registerLmsJobs, LMS_FSMs, seedLmsPipelines, debouncedHeartbeatWrite, getOrgConfig } from "./backend"
