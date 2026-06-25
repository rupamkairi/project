import { Elysia } from "elysia"
import type { Mediator } from "@core"
import type { EventBus, Scheduler } from "@core"
import { courseRoutes } from "./routes/courses"
import { enrollmentRoutes } from "./routes/enrollments"
import { learningRoutes } from "./routes/learning"
import { assignmentRoutes } from "./routes/assignments"
import { cohortRoutes } from "./routes/cohorts"
import { certificateRoutes } from "./routes/certificates"
import { analyticsRoutes } from "./routes/analytics"
import { discussionRoutes } from "./routes/discussions"
import { webhookRoutes } from "./routes/webhook"
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
    .use(courseRoutes(mediator))
    .use(enrollmentRoutes(mediator))
    .use(learningRoutes(mediator))
    .use(assignmentRoutes(mediator))
    .use(cohortRoutes(mediator))
    .use(certificateRoutes(mediator))
    .use(analyticsRoutes(mediator))
    .use(discussionRoutes(mediator))
    .use(webhookRoutes(mediator))
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
