/**
 * LMS Backend Logic — FSMs, Hooks, Jobs, Business Rules
 *
 * Wires into the EventBus and Scheduler from the compose factory.
 */
import { generateId } from "@core"
import type { Mediator, EventBus, Scheduler, StateMachine } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, count, inArray, lt, gt, gte, lte, sql } from "drizzle-orm"
import {
  lmsCourseDetail,
  lmsModule,
  lmsLesson,
  lmsProgress,
  lmsCertificate,
  lmsCohortMember,
  lmsCohort,
  lmsQuizSubmission,
  lmsSubmission,
  lmsCoupon,
  lmsWaitlist,
  lmsOrgConfig,
  lmsPaymentEvent,
} from "./db/schema/lms"
import { persons } from "@db/schema/party"
import { catItems } from "@db/schema/catalog"
import { transactions, transactionLines } from "@db/schema/commerce"
import { activities } from "@db/schema/activity"
import { pipelines, pipelineStages } from "@db/schema/pipeline"
import { seedPipeline } from "@db/seed"

// ═════════════════════════════════════════════════════════
// 1. FSM Definitions (6 entities)
// ═════════════════════════════════════════════════════════

export const lmsCourseFSM: StateMachine<string, string> = {
  id: "lms.course",
  entityType: "lms.course",
  initial: "draft",
  states: {
    draft: {
      on: { submit: { target: "in-review" } },
    },
    "in-review": {
      on: { approve: { target: "published" }, reject: { target: "draft" } },
    },
    published: {
      on: { archive: { target: "archived" } },
    },
    archived: {
      on: { restore: { target: "draft" } },
    },
  },
}

export const lmsEnrollmentFSM: StateMachine<string, string> = {
  id: "lms.enrollment",
  entityType: "lms.enrollment",
  initial: "enrolled",
  states: {
    enrolled: {
      on: { activate: { target: "in-progress" } },
    },
    "in-progress": {
      on: { complete: { target: "completed" }, drop: { target: "dropped" }, expire: { target: "dropped" } },
    },
    completed: { terminal: true },
    dropped: { terminal: true },
  },
}

export const lmsSubmissionFSM: StateMachine<string, string> = {
  id: "lms.submission",
  entityType: "lms.submission",
  initial: "submitted",
  states: {
    submitted: {
      on: { grade: { target: "graded" }, startGrading: { target: "grading" } },
    },
    grading: {
      on: { grade: { target: "graded" } },
    },
    graded: {
      on: { returnToStudent: { target: "returned" } },
    },
    returned: {
      on: { resubmit: { target: "submitted" } },
    },
  },
}

export const lmsCohortFSM: StateMachine<string, string> = {
  id: "lms.cohort",
  entityType: "lms.cohort",
  initial: "scheduled",
  states: {
    scheduled: {
      on: { activate: { target: "active" } },
    },
    active: {
      on: { complete: { target: "completed" }, cancel: { target: "cancelled" } },
    },
    completed: { terminal: true },
    cancelled: { terminal: true },
  },
}

export const lmsLiveSessionFSM: StateMachine<string, string> = {
  id: "lms.session",
  entityType: "lms.session",
  initial: "scheduled",
  states: {
    scheduled: {
      on: { start: { target: "live" } },
    },
    live: {
      on: { end: { target: "ended" } },
    },
    ended: {
      on: { publishRecording: { target: "recorded" }, cancel: { target: "cancelled" } },
    },
    recorded: { terminal: true },
    cancelled: { terminal: true },
  },
}

export const lmsProgressFSM: StateMachine<string, string> = {
  id: "lms.progress",
  entityType: "lms.progress",
  initial: "not-started",
  states: {
    "not-started": {
      on: { start: { target: "in-progress" } },
    },
    "in-progress": {
      on: { complete: { target: "completed" } },
    },
    completed: { terminal: true },
  },
}

export const LMS_FSMs = [
  lmsCourseFSM,
  lmsEnrollmentFSM,
  lmsSubmissionFSM,
  lmsCohortFSM,
  lmsLiveSessionFSM,
  lmsProgressFSM,
]

// ═════════════════════════════════════════════════════════
// 2. Pipeline Seed Helper
// ═════════════════════════════════════════════════════════

export async function seedLmsPipelines(orgId: string) {
  const enrollment = await seedPipeline(orgId, "lms.enrollment", [
    { name: "Enrolled" },
    { name: "In Progress" },
    { name: "Completed" },
    { name: "Dropped" },
  ])
  const course = await seedPipeline(orgId, "lms.course", [
    { name: "Draft" },
    { name: "In Review" },
    { name: "Published" },
    { name: "Archived" },
  ])

  return { enrollmentStageIds: enrollment.stageIds, courseStageIds: course.stageIds }
}

// ═════════════════════════════════════════════════════════
// 3. Heartbeat Debounce (in-memory)
// ═════════════════════════════════════════════════════════

const heartbeatTimers = new Map<string, ReturnType<typeof setTimeout>>()

function heartbeatKey(personId: string, lessonId: string): string {
  return `${personId}:${lessonId}`
}

export function debouncedHeartbeatWrite(
  personId: string,
  lessonId: string,
  data: { watchedSeconds: number; lastPosition: number; isCompleted: boolean },
) {
  const key = heartbeatKey(personId, lessonId)
  const existing = heartbeatTimers.get(key)
  if (existing) clearTimeout(existing)

  heartbeatTimers.set(key, setTimeout(async () => {
    try {
      await db.update(lmsProgress).set({
        watchedSeconds: data.watchedSeconds,
        lastPosition: data.lastPosition,
        isCompleted: data.isCompleted ?? false,
        updatedAt: new Date(),
      }).where(
        and(eq(lmsProgress.personId, personId), eq(lmsProgress.lessonId, lessonId)),
      )
    } catch (err) {
      console.error(`[lms heartbeat] failed for ${key}:`, err)
    } finally {
      heartbeatTimers.delete(key)
    }
  }, 10_000))
}

// ═════════════════════════════════════════════════════════
// 4. Org Config Cache
// ═════════════════════════════════════════════════════════

const orgConfigCache = new Map<string, typeof lmsOrgConfig.$inferSelect>()

export async function getOrgConfig(orgId: string) {
  const cached = orgConfigCache.get(orgId)
  if (cached) return cached

  const config = await db.select().from(lmsOrgConfig).where(eq(lmsOrgConfig.organizationId, orgId)).limit(1)
  if (config[0]) orgConfigCache.set(orgId, config[0])
  return config[0] ?? null
}

export function invalidateOrgConfigCache(orgId: string) {
  orgConfigCache.delete(orgId)
}

// ═════════════════════════════════════════════════════════
// 5. Hooks Registration
// ═════════════════════════════════════════════════════════

function makeEvent(type: string, aggregateId: string, aggregateType: string, payload: Record<string, unknown>, actorId: string, orgId: string) {
  return {
    id: generateId(),
    type,
    aggregateId,
    aggregateType,
    payload,
    actorId,
    orgId,
    correlationId: generateId(),
    occurredAt: Date.now(),
    version: 1,
    source: "lms",
  }
}

export function registerLmsHooks(bus: EventBus, mediator: Mediator) {

  // Hook 1: Lesson completed → check if course is fully complete
  bus.subscribe("lms.lesson.completed", async (event: any) => {
    const payload = (event as any).payload ?? event
    const { personId, itemId } = payload
    const orgId = payload.orgId ?? (event as any).orgId

    const allLessons = await db.select({ id: lmsLesson.id }).from(lmsLesson)
      .innerJoin(lmsModule, eq(lmsModule.id, lmsLesson.moduleId))
      .where(and(eq(lmsModule.itemId, itemId), eq(lmsLesson.organizationId, orgId), isNull(lmsLesson.deletedAt)))

    const allLessonIds = allLessons.map((l) => l.id)
    if (allLessonIds.length === 0) return

    const [completed] = await db.select({ count: count() }).from(lmsProgress)
      .where(and(
        eq(lmsProgress.personId, personId),
        eq(lmsProgress.organizationId, orgId),
        inArray(lmsProgress.lessonId, allLessonIds),
        eq(lmsProgress.isCompleted, true),
      ))

    const detail = await db.select().from(lmsCourseDetail).where(
      and(eq(lmsCourseDetail.itemId, itemId), eq(lmsCourseDetail.organizationId, orgId)),
    ).limit(1)

    const pct = Math.round((completed.count / allLessonIds.length) * 100)
    if (pct >= (detail[0]?.completionThreshold ?? 80)) {
      const enrollmentTxn = await db.select().from(transactions)
        .innerJoin(transactionLines, eq(transactionLines.transactionId, transactions.id))
        .where(and(
          eq(transactions.type, "order"),
          eq(transactions.personId, personId),
          eq(transactions.organizationId, orgId),
          eq(transactionLines.itemId, itemId),
        )).limit(1)

      if (enrollmentTxn[0]) {
        const completedStageId = await getStageId(orgId, "lms.enrollment", "Completed")
        if (completedStageId) {
          await db.update(transactions).set({ stageId: completedStageId, updatedAt: new Date() })
            .where(eq(transactions.id, enrollmentTxn[0].transactions.id))
        }

        bus.publish(makeEvent(
          "lms.enrollment.completed",
          enrollmentTxn[0].transactions.id,
          "lms.enrollment",
          { personId, itemId, transactionId: enrollmentTxn[0].transactions.id, orgId, percentage: pct },
          "system",
          orgId,
        ))
      }
    }
  })

  // Hook 2: Enrollment completed → issue certificate automatically
  bus.subscribe("lms.enrollment.completed", async (event: any) => {
    const payload = (event as any).payload ?? event
    const { personId, itemId, transactionId, orgId } = payload

    const detail = await db.select().from(lmsCourseDetail).where(
      and(eq(lmsCourseDetail.itemId, itemId), eq(lmsCourseDetail.organizationId, orgId)),
    ).limit(1)
    if (!detail[0]?.certificateTemplateId) return

    const existing = await db.select().from(lmsCertificate).where(
      and(eq(lmsCertificate.transactionId, transactionId), eq(lmsCertificate.personId, personId)),
    ).limit(1)
    if (existing[0]) return

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let certificateNo = "LMS-"
    for (let i = 0; i < 8; i++) certificateNo += chars.charAt(Math.floor(Math.random() * chars.length))

    await db.insert(lmsCertificate).values({
      id: `crt_${generateId().slice(0, 20)}`,
      organizationId: orgId, itemId, transactionId, personId,
      issuedAt: new Date(), certificateNo, verificationCode: certificateNo,
      templateId: detail[0].certificateTemplateId,
      createdAt: new Date(), updatedAt: new Date(), version: 1,
    })
  })

  // Hook 3: Enrollment activated → send notification
  bus.subscribe("lms.enrollment.activated", async (event: any) => {
    const payload = (event as any).payload ?? event
    const { personId, itemId } = payload
    const orgId = payload.orgId ?? (event as any).orgId
    await mediator.dispatch({
      type: "notification.send",
      payload: { personId, template: "enrollment-confirmed", data: { itemId } },
      actorId: "system", orgId, correlationId: generateId(),
    }).catch(() => {})
  })

  // Hook 4: Cohort cancelled → drop all active enrollment transactions
  bus.subscribe("lms.cohort.cancelled", async (event: any) => {
    const payload = (event as any).payload ?? event
    const { cohortId } = payload
    const orgId = payload.orgId ?? (event as any).orgId

    const members = await db.select().from(lmsCohortMember).where(eq(lmsCohortMember.cohortId, cohortId))
    const droppedStageId = await getStageId(orgId, "lms.enrollment", "Dropped")
    for (const member of members) {
      if (member.transactionId && droppedStageId) {
        await db.update(transactions).set({ stageId: droppedStageId, updatedAt: new Date() }).where(eq(transactions.id, member.transactionId))
      }
    }
  })

  // Hook 5: Course published → notify (stub)
  bus.subscribe("lms.course.published", async () => {
    console.log("[lms] course published — broadcast trigger")
  })

  // Hook 6: Payment succeeded → advance enrollment to In Progress
  bus.subscribe("payment.succeeded", async (event: any) => {
    const payload = (event as any).payload ?? event
    const metadata = payload.metadata ?? payload
    if (metadata?.transactionId) {
      const orgId = metadata.orgId ?? (event as any).orgId
      const inProgressStageId = await getStageId(orgId, "lms.enrollment", "In Progress")
      if (inProgressStageId) {
        await db.update(transactions).set({ stageId: inProgressStageId, updatedAt: new Date() }).where(eq(transactions.id, metadata.transactionId))
      }
      bus.publish(makeEvent(
        "lms.enrollment.activated",
        metadata.transactionId,
        "lms.enrollment",
        { transactionId: metadata.transactionId, personId: metadata.personId, itemId: metadata.itemId, orgId },
        "system", orgId,
      ))
    }
  })

  // Hook 7: Assignment graded → notify learner
  bus.subscribe("lms.assignment.graded", async (event: any) => {
    const payload = (event as any).payload ?? event
    const { personId, assignmentTitle, score, maxScore, feedback, orgId } = payload
    await mediator.dispatch({
      type: "notification.send",
      payload: { personId, template: "lms.assignment.graded", data: { assignmentTitle, score, maxScore, feedback } },
      actorId: "system", orgId, correlationId: generateId(),
    }).catch(() => {})
  })

  // Hook 8: Session created in <15 min → trigger reminder
  bus.subscribe("lms.session.scheduled", async (event: any) => {
    const payload = (event as any).payload ?? event
    const { activityId, scheduledAt, orgId } = payload
    const diff = new Date(scheduledAt).getTime() - Date.now()
    if (diff <= 15 * 60_000 && diff > 0) {
      const session = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1)
      if (session[0]) {
        await mediator.dispatch({
          type: "notification.broadcast",
          payload: { entityId: session[0].entityId, entityType: "lms.cohort", template: "lms.live.session.reminder", data: { sessionTitle: session[0].subject, sessionStart: session[0].dueAt } },
          actorId: "system", orgId, correlationId: generateId(),
        }).catch(() => {})
      }
    }
  })
}

// ═════════════════════════════════════════════════════════
// 6. Jobs Registration
// ═════════════════════════════════════════════════════════

export function registerLmsJobs(scheduler: Scheduler, mediator: Mediator) {

  // Job 1: Expire stale enrollments (daily at midnight)
  scheduler.define(
    "lms.expire-enrollments",
    "0 0 * * *",
    async () => {
      const configs = await db.select().from(lmsOrgConfig)
      for (const config of configs) {
        const droppedStageId = await getStageId(config.organizationId, "lms.enrollment", "Dropped")
        if (!droppedStageId) continue

        // Find inactive enrollments (no progress in 90 days)
        const cutoff = new Date(Date.now() - 90 * 86400_000)
        const inactiveTxns = await db.select({
          id: transactions.id,
          personId: transactions.personId,
        }).from(transactions)
          .leftJoin(lmsProgress, and(
            eq(lmsProgress.transactionId, transactions.id),
            gt(lmsProgress.updatedAt, cutoff),
          ))
          .where(and(
            eq(transactions.organizationId, config.organizationId),
            eq(transactions.type, "order"),
            isNull(lmsProgress.id),
          ))

        for (const txn of inactiveTxns) {
          await db.update(transactions).set({ stageId: droppedStageId, updatedAt: new Date() })
            .where(eq(transactions.id, txn.id))
          mediator.dispatch({
            type: "notification.send",
            payload: { personId: txn.personId, template: "enrollment-expired", data: {} },
            actorId: "system",
            orgId: config.organizationId,
            correlationId: generateId(),
          }).catch(() => {})
        }
      }
    },
    { timezone: "UTC" },
  )

  // Job 2: Inactivity nudge (daily 9AM)
  scheduler.define(
    "lms.inactivity-nudge",
    "0 9 * * *",
    async () => {
      const configs = await db.select().from(lmsOrgConfig)
      for (const config of configs) {
        const nudgeDays = (config as any).meta?.inactivityNudgeDays ?? 7
        const cutoff = new Date(Date.now() - nudgeDays * 86400_000)
        const inactive = await db.select({
          id: transactions.id,
          personId: transactions.personId,
          itemId: transactionLines.itemId,
        }).from(transactions)
          .innerJoin(transactionLines, eq(transactionLines.transactionId, transactions.id))
          .leftJoin(lmsProgress, and(
            eq(lmsProgress.transactionId, transactions.id),
            gt(lmsProgress.updatedAt, cutoff),
          ))
          .where(and(
            eq(transactions.organizationId, config.organizationId),
            eq(transactions.type, "order"),
            isNull(lmsProgress.id),
          ))

        for (const enr of inactive) {
          mediator.dispatch({
            type: "notification.send",
            payload: { personId: enr.personId, template: "inactivity-nudge", data: { itemId: enr.itemId } },
            actorId: "system",
            orgId: config.organizationId,
            correlationId: generateId(),
          }).catch(() => {})
        }
      }
    },
    { timezone: "UTC" },
  )

  // Job 3: Live session reminders (every 5 min)
  scheduler.define(
    "lms.session-reminders",
    "*/5 * * * *",
    async () => {
      const now = Date.now()
      const windowStart = new Date(now + 14 * 60_000)
      const windowEnd = new Date(now + 15 * 60_000)

      const upcoming = await db.select().from(activities).where(
        and(
          eq(activities.type, "meeting"),
          eq(activities.status, "pending"),
          gte(activities.dueAt, windowStart),
          lte(activities.dueAt, windowEnd),
        ),
      )

      for (const session of upcoming) {
        mediator.dispatch({
          type: "notification.broadcast",
          payload: { entityId: session.entityId, entityType: "lms.cohort", template: "lms.live.session.reminder", data: { sessionTitle: session.subject, sessionStart: session.dueAt } },
          actorId: "system",
          orgId: session.organizationId,
          correlationId: generateId(),
        }).catch(() => {})
      }
    },
    { timezone: "UTC" },
  )

  // Job 4: Waitlist expiry (every 30 min)
  scheduler.define(
    "lms.waitlist-expiry",
    "*/30 * * * *",
    async () => {
      await db.update(lmsWaitlist).set({ status: "expired" })
        .where(and(
          eq(lmsWaitlist.status, "notified"),
          lt(lmsWaitlist.notifiedAt, sql`now() - interval '48 hours'`),
        ))
    },
    { timezone: "UTC" },
  )

  // Job 5: Nightly analytics aggregation (2AM)
  scheduler.define(
    "lms.analytics-aggregate",
    "0 2 * * *",
    async () => {
      console.log("[lms] nightly analytics aggregation — placeholder")
    },
    { timezone: "UTC" },
  )
}

// ═════════════════════════════════════════════════════════
// 7. Helpers
// ═════════════════════════════════════════════════════════

async function getStageId(orgId: string, entityType: string, stageName: string): Promise<string | null> {
  const pipe = await db.select().from(pipelines).where(
    and(eq(pipelines.organizationId, orgId), eq(pipelines.entityType, entityType)),
  ).limit(1)
  if (!pipe[0]) return null
  const stage = await db.select().from(pipelineStages).where(
    and(eq(pipelineStages.pipelineId, pipe[0].id), eq(pipelineStages.name, stageName)),
  ).limit(1)
  return stage[0]?.id ?? null
}
