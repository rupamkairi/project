import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { generateId } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, desc, asc, count, inArray, sql, gt } from "drizzle-orm"
import {
  lmsProgress,
  lmsModule,
  lmsLesson,
  lmsQuiz,
  lmsQuizQuestion,
  lmsQuizSubmission,
} from "../db/schema/lms"
import { persons } from "@db/schema/party"
import { transactions, transactionLines } from "@db/schema/commerce"
import { pipelines, pipelineStages } from "@db/schema/pipeline"
import { debouncedHeartbeatWrite, getOrgConfig } from "../backend"

function getActor(ctx: any) {
  const actor = (ctx as any).actor
  if (!actor) throw new Error("AUTH_REQUIRED")
  return { id: actor.id, orgId: actor.orgId, roles: actor.roles ?? [] }
}

async function getPersonIdFromActor(actorId: string, orgId: string): Promise<string | null> {
  const person = await db.select().from(persons).where(
    and(eq(persons.actorId, actorId), eq(persons.organizationId, orgId)),
  ).limit(1)
  return person[0]?.id ?? null
}

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

export function learningRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "" })

    // ── Module progress ──

    .get("/progress/:courseId", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { ;(ctx as any).set.status = 404; return { error: "Learner profile not found" } }

      const { params } = ctx as any
      const progress = await db.select().from(lmsProgress).where(
        and(eq(lmsProgress.personId, personId), eq(lmsProgress.itemId, params.courseId), eq(lmsProgress.organizationId, actor.orgId)),
      )

      return {
        data: progress.map((p) => ({
          moduleId: p.moduleId, lessonId: p.lessonId, isCompleted: p.isCompleted, watchedSeconds: p.watchedSeconds, lastPosition: p.lastPosition, score: p.score, updatedAt: p.updatedAt,
        })),
      }
    })

    // ── Video Heartbeat (debounced) ──

    .post("/progress/heartbeat", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { ;(ctx as any).set.status = 404; return { error: "Learner profile not found" } }

      const { body } = ctx as any
      const { itemId, moduleId, lessonId, watchedSeconds, lastPosition, isCompleted } = body

      const existing = await db.select().from(lmsProgress).where(
        and(eq(lmsProgress.organizationId, actor.orgId), eq(lmsProgress.personId, personId), eq(lmsProgress.lessonId, lessonId)),
      ).limit(1)

      if (existing[0]) {
        // Use debounced write for updates (max 1 DB write per 10s per person+lesson)
        debouncedHeartbeatWrite(personId, lessonId, {
          watchedSeconds: Math.max((existing[0].watchedSeconds ?? 0), watchedSeconds),
          lastPosition: lastPosition ?? existing[0].lastPosition,
          isCompleted: isCompleted ?? existing[0].isCompleted,
        })
        return { id: existing[0].id, isCompleted: isCompleted ?? existing[0].isCompleted }
      }

      // First write always hits DB
      const [progress] = await db.insert(lmsProgress).values({
        id: `prog_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        personId,
        itemId: itemId ?? moduleId,
        moduleId,
        lessonId,
        watchedSeconds,
        lastPosition: lastPosition ?? 0,
        isCompleted: isCompleted ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }).returning()

      return { id: progress?.id, isCompleted: isCompleted ?? false }
    }, {
      body: t.Object({
        itemId: t.String({ minLength: 1 }),
        moduleId: t.String({ minLength: 1 }),
        lessonId: t.String({ minLength: 1 }),
        watchedSeconds: t.Number(),
        lastPosition: t.Optional(t.Number()),
        isCompleted: t.Optional(t.Boolean()),
      }),
    })

    // ── Sequential Unlock Check ──

    .get("/unlock/:courseId/modules", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { ;(ctx as any).set.status = 404; return { error: "Learner profile not found" } }

      const { params } = ctx as any
      const modules = await db.select().from(lmsModule).where(
        and(eq(lmsModule.itemId, params.courseId), eq(lmsModule.organizationId, actor.orgId), isNull(lmsModule.deletedAt)),
      ).orderBy(asc(lmsModule.position))

      if (modules.length === 0) return { data: [] }

      const firstMod = modules[0]
      if (!firstMod.requiredPrevious) {
        return { data: modules.map((m) => ({ id: m.id, title: m.title, position: m.position, unlocked: true, isLocked: false })) }
      }

      const progress = await db.select().from(lmsProgress).where(
        and(eq(lmsProgress.personId, personId), eq(lmsProgress.itemId, params.courseId), eq(lmsProgress.organizationId, actor.orgId)),
      )

      const completedModuleIds = new Set(progress.filter((p) => p.isCompleted).map((p) => p.moduleId))

      return {
        data: modules.map((m) => {
          if (m.position === 1) return { id: m.id, title: m.title, position: m.position, unlocked: true, isLocked: false }
          const prev = modules.find((mod) => mod.position === m.position - 1)
          const unlocked = prev ? completedModuleIds.has(prev.id) : false
          return { id: m.id, title: m.title, position: m.position, unlocked, isLocked: !unlocked }
        }),
      }
    })

    // ── Quiz Submit ──

    .post("/quiz/submit", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { ;(ctx as any).set.status = 404; return { error: "Learner profile not found" } }

      const { body, set } = ctx as any
      const { itemId, moduleId, lessonId, quizId, answers } = body

      // Enforce max quiz attempts from org config
      const orgConfig = await getOrgConfig(actor.orgId)
      const attempts = await db.select({ count: count() }).from(lmsQuizSubmission)
        .where(and(
          eq(lmsQuizSubmission.quizId, quizId),
          eq(lmsQuizSubmission.personId, personId),
          eq(lmsQuizSubmission.organizationId, actor.orgId),
        ))
      if (attempts[0].count >= (orgConfig?.maxQuizAttempts ?? 3)) {
        set.status = 403
        return { error: "MAX_QUIZ_ATTEMPTS_REACHED", maxAttempts: orgConfig?.maxQuizAttempts ?? 3 }
      }

      // Get quiz config
      const quiz = await db.select().from(lmsQuiz).where(
        and(eq(lmsQuiz.id, quizId), eq(lmsQuiz.lessonId, lessonId), eq(lmsQuiz.organizationId, actor.orgId)),
      ).limit(1)

      if (!quiz[0]) { ;(ctx as any).set.status = 404; return { error: "Quiz not found" } }

      // Get questions
      const questions = await db.select().from(lmsQuizQuestion).where(
        and(eq(lmsQuizQuestion.quizId, quizId), eq(lmsQuizQuestion.organizationId, actor.orgId)),
      ).orderBy(asc(lmsQuizQuestion.position))

      // Grade
      let totalPoints = 0
      let earnedPoints = 0
      const gradedAnswers: { questionId: string; answer: string; isCorrect: boolean }[] = []

      for (const question of questions) {
        totalPoints += question.points
        const answer = answers.find((a: any) => a.questionId === question.id)
        if (!answer) {
          gradedAnswers.push({ questionId: question.id, answer: "", isCorrect: false })
          continue
        }
        let isCorrect = false
        if (question.type === "true_false" || question.type === "mcq") {
          isCorrect = answer.selectedOption === question.correctAnswer
        } else if (question.type === "short_answer") {
          isCorrect = answer.text?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()
        }
        if (isCorrect) earnedPoints += question.points
        gradedAnswers.push({
          questionId: question.id,
          answer: answer.selectedOption ?? answer.text ?? "",
          isCorrect,
        })
      }

      const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      const passed = percentage >= (quiz[0].passingScore ?? 60)

      const [submission] = await db.insert(lmsQuizSubmission).values({
        id: `qsb_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        quizId,
        lessonId,
        personId,
        score: earnedPoints,
        maxScore: totalPoints,
        percentage,
        passed,
        answers: gradedAnswers,
        startedAt: new Date(),
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }).returning()

      // Update progress
      if (passed) {
        const existing = await db.select().from(lmsProgress).where(
          and(eq(lmsProgress.organizationId, actor.orgId), eq(lmsProgress.personId, personId), eq(lmsProgress.lessonId, lessonId)),
        ).limit(1)

        if (existing[0]) {
          await db.update(lmsProgress).set({ isCompleted: true, score: percentage, updatedAt: new Date() }).where(eq(lmsProgress.id, existing[0].id))
        } else {
          await db.insert(lmsProgress).values({
            id: `prog_${generateId().slice(0, 20)}`,
            organizationId: actor.orgId, personId, itemId: itemId ?? moduleId, moduleId, lessonId,
            watchedSeconds: 0, lastPosition: 0, isCompleted: true, score: percentage,
            createdAt: new Date(), updatedAt: new Date(), version: 1,
          })
        }
      }

      return {
        submissionId: submission?.id,
        percentage,
        passed,
        earnedPoints,
        totalPoints,
        showResultImmediately: quiz[0].showResultImmediately ?? true,
      }
    }, {
      body: t.Object({
        itemId: t.String({ minLength: 1 }),
        moduleId: t.String({ minLength: 1 }),
        lessonId: t.String({ minLength: 1 }),
        quizId: t.String({ minLength: 1 }),
        answers: t.Array(t.Object({
          questionId: t.String({ minLength: 1 }),
          selectedOption: t.Optional(t.String()),
          text: t.Optional(t.String()),
        })),
      }),
    })

    // ── Course Completion ──

    .post("/progress/complete/:courseId", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { ;(ctx as any).set.status = 404; return { error: "Learner profile not found" } }

      const { params } = ctx as any
      const modules = await db.select().from(lmsModule).where(
        and(eq(lmsModule.itemId, params.courseId), eq(lmsModule.organizationId, actor.orgId), isNull(lmsModule.deletedAt)),
      )

      const progress = await db.select().from(lmsProgress).where(
        and(eq(lmsProgress.personId, personId), eq(lmsProgress.itemId, params.courseId), eq(lmsProgress.organizationId, actor.orgId)),
      )

      const completedLessons = progress.filter((p) => p.isCompleted)

      // Count total lessons
      const moduleIds = modules.map((m) => m.id)
      const totalLessons = moduleIds.length > 0
        ? (await db.select({ count: count() }).from(lmsLesson).where(inArray(lmsLesson.moduleId, moduleIds)))[0]?.count ?? 1
        : 1

      const completionPct = Math.round((completedLessons.length / totalLessons) * 100)
      const threshold = 80 // default

      if (completionPct < threshold) {
        ;(ctx as any).set.status = 400
        return { error: "Completion threshold not met", progress: completionPct }
      }

      const completedStageId = await getStageId(actor.orgId, "lms.enrollment", "Completed")
      if (completedStageId) {
        await db.update(transactions).set({ stageId: completedStageId, updatedAt: new Date() }).where(
          and(eq(transactions.organizationId, actor.orgId), eq(transactions.personId, personId), eq(transactions.type, "order")),
        )
      }

      return { courseId: params.courseId, completed: true, progress: completionPct }
    })
}
