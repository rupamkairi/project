import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { generateId } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, asc, desc, count, inArray } from "drizzle-orm"
import {
  lmsAssignment,
  lmsSubmission,
  lmsModule,
  lmsCourseDetail,
} from "../db/schema/lms"
import { persons } from "@db/schema/party"
import { transactions, transactionLines } from "@db/schema/commerce"

// ── Helpers ─────────────────────────────────────────────

function getActor(ctx: any) {
  const actor = (ctx as any).actor
  if (!actor) throw new Error("AUTH_REQUIRED")
  return { id: actor.id, orgId: actor.orgId, roles: actor.roles ?? [] }
}

function hasPermission(actor: { roles: string[] }, perm: string): boolean {
  return actor.roles.includes("lms-admin") || actor.roles.includes(perm) || actor.roles.includes("*:*")
}

async function getPersonIdFromActor(actorId: string, orgId: string): Promise<string | null> {
  const person = await db.select().from(persons).where(
    and(eq(persons.actorId, actorId), eq(persons.organizationId, orgId)),
  ).limit(1)
  return person[0]?.id ?? null
}

// ── Routes ─────────────────────────────────────────────

export function assignmentRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "" })

    // ── Instructor: List Assignments for Course ──

    .get("/instructor/courses/:id/assignments", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:update")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }
      const { params } = ctx as any

      const modules = await db.select().from(lmsModule).where(
        and(eq(lmsModule.itemId, params.id), eq(lmsModule.organizationId, actor.orgId)),
      )

      if (modules.length === 0) return { data: [] }

      const moduleIds = modules.map((m) => m.id)
      const assignments = await db.select().from(lmsAssignment).where(
        and(inArray(lmsAssignment.moduleId, moduleIds), eq(lmsAssignment.organizationId, actor.orgId), isNull(lmsAssignment.deletedAt)),
      ).orderBy(asc(lmsAssignment.dueOffsetDays))

      const moduleMap = new Map(modules.map((m) => [m.id, m.title]))

      return {
        data: assignments.map((a) => ({
          id: a.id,
          moduleId: a.moduleId,
          moduleTitle: moduleMap.get(a.moduleId) ?? null,
          title: a.title,
          dueOffsetDays: a.dueOffsetDays,
          maxScore: a.maxScore,
          allowLateSubmission: a.allowLateSubmission,
          latePenaltyPercent: a.latePenaltyPercent,
          createdAt: a.createdAt,
        })),
      }
    })

    // ── Instructor: Create Assignment ──

    .post("/instructor/courses/:id/assignments", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:update")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }

      const { params, body, set } = ctx as any
      const { moduleId, title, instructions, dueOffsetDays, maxScore, allowLateSubmission, latePenaltyPercent } = body

      const mod = await db.select().from(lmsModule).where(
        and(eq(lmsModule.id, moduleId), eq(lmsModule.itemId, params.id), eq(lmsModule.organizationId, actor.orgId)),
      ).limit(1)

      if (!mod[0]) {
        set.status = 404
        return { error: "Module not found in this course" }
      }

      const [assignment] = await db.insert(lmsAssignment).values({
        id: `asg_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        moduleId,
        title,
        instructions: instructions ?? "",
        dueOffsetDays: dueOffsetDays ?? 7,
        maxScore: maxScore ?? 100,
        allowLateSubmission: allowLateSubmission ?? false,
        latePenaltyPercent: latePenaltyPercent ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        meta: {},
      }).returning()

      return { id: assignment?.id, title, moduleId }
    }, {
      body: t.Object({
        moduleId: t.String({ minLength: 1 }),
        title: t.String({ minLength: 1 }),
        instructions: t.Optional(t.String()),
        dueOffsetDays: t.Optional(t.Number()),
        maxScore: t.Optional(t.Number()),
        allowLateSubmission: t.Optional(t.Boolean()),
        latePenaltyPercent: t.Optional(t.Number()),
      }),
    })

    // ── Instructor: Update Assignment ──

    .patch("/instructor/assignments/:id", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:update")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }

      const { params, body, set } = ctx as any

      const existing = await db.select().from(lmsAssignment).where(
        and(eq(lmsAssignment.id, params.id), eq(lmsAssignment.organizationId, actor.orgId)),
      ).limit(1)

      if (!existing[0]) {
        set.status = 404
        return { error: "Assignment not found" }
      }

      await db.update(lmsAssignment).set({
        ...body,
        updatedAt: new Date(),
      }).where(eq(lmsAssignment.id, params.id))

      return { id: params.id, updated: true }
    }, {
      body: t.Object({
        title: t.Optional(t.String()),
        instructions: t.Optional(t.String()),
        dueOffsetDays: t.Optional(t.Number()),
        maxScore: t.Optional(t.Number()),
        allowLateSubmission: t.Optional(t.Boolean()),
        latePenaltyPercent: t.Optional(t.Number()),
      }),
    })

    // ── Instructor: Delete Assignment ──

    .delete("/instructor/assignments/:id", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:update")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }

      const { params, set } = ctx as any

      const existing = await db.select().from(lmsAssignment).where(
        and(eq(lmsAssignment.id, params.id), eq(lmsAssignment.organizationId, actor.orgId)),
      ).limit(1)

      if (!existing[0]) {
        set.status = 404
        return { error: "Assignment not found" }
      }

      await db.update(lmsAssignment).set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(lmsAssignment.id, params.id))

      return { id: params.id, deleted: true }
    })

    // ── Learner: View Assignment ──

    .get("/assignments/:id", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any

      const assignment = await db.select().from(lmsAssignment).where(
        and(eq(lmsAssignment.id, params.id), isNull(lmsAssignment.deletedAt)),
      ).limit(1)

      if (!assignment[0]) {
        set.status = 404
        return { error: "Assignment not found" }
      }

      // Get previous submissions for this learner
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      const submissions = personId
        ? await db.select().from(lmsSubmission).where(
            and(eq(lmsSubmission.assignmentId, params.id), eq(lmsSubmission.personId, personId)),
          ).orderBy(desc(lmsSubmission.submittedAt))
        : []

      return {
        id: assignment[0].id,
        title: assignment[0].title,
        instructions: assignment[0].instructions,
        dueOffsetDays: assignment[0].dueOffsetDays,
        maxScore: assignment[0].maxScore,
        allowLateSubmission: assignment[0].allowLateSubmission,
        submissionsUsed: submissions.length,
        latestSubmission: submissions[0] ?? null,
      }
    })

    // ── Learner: Submit Assignment ──

    .post("/assignments/:id/submit", async (ctx) => {
      const actor = getActor(ctx)
      const { params, body, set } = ctx as any
      const { content, attachmentUrls } = body

      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) {
        set.status = 404
        return { error: "Learner profile not found" }
      }

      // Verify assignment exists
      const assignment = await db.select().from(lmsAssignment).where(
        and(eq(lmsAssignment.id, params.id), isNull(lmsAssignment.deletedAt)),
      ).limit(1)

      if (!assignment[0]) {
        set.status = 404
        return { error: "Assignment not found" }
      }

      // Check enrollment
      const mod = await db.select().from(lmsModule).where(
        and(eq(lmsModule.id, assignment[0].moduleId), isNull(lmsModule.deletedAt)),
      ).limit(1)

      if (!mod[0]) {
        set.status = 404
        return { error: "Module not found" }
      }

      const enrollment = await db.select()
        .from(transactions)
        .innerJoin(transactionLines, eq(transactionLines.transactionId, transactions.id))
        .where(
          and(
            eq(transactions.personId, personId),
            eq(transactions.organizationId, actor.orgId),
            eq(transactions.type, "order"),
            eq(transactionLines.itemId, mod[0].itemId),
            isNull(transactions.deletedAt),
          ),
        ).limit(1)

      if (!enrollment[0]) {
        set.status = 403
        return { error: "NOT_ENROLLED" }
      }

      // Check previous attempts
      const prevAttempts = await db.select({ count: count() }).from(lmsSubmission).where(
        and(eq(lmsSubmission.assignmentId, params.id), eq(lmsSubmission.personId, personId)),
      )

      const [submission] = await db.insert(lmsSubmission).values({
        id: `sub_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        assignmentId: params.id,
        personId,
        submittedAt: new Date(),
        content: content ?? "",
        attachmentUrls: attachmentUrls ?? [],
        maxScore: assignment[0].maxScore ?? 100,
        status: "submitted",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        meta: {},
      }).returning()

      return {
        id: submission?.id,
        attemptNumber: prevAttempts[0].count + 1,
        status: "submitted",
      }
    }, {
      body: t.Object({
        content: t.Optional(t.String()),
        attachmentUrls: t.Optional(t.Array(t.String())),
      }),
    })

    // ── Grade Submission ──

    .patch("/submissions/:id/grade", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "submission:grade")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }

      const { params, body, set } = ctx as any
      const { score, feedback } = body

      const submission = await db.select().from(lmsSubmission).where(
        and(eq(lmsSubmission.id, params.id), eq(lmsSubmission.organizationId, actor.orgId)),
      ).limit(1)

      if (!submission[0]) {
        set.status = 404
        return { error: "Submission not found" }
      }

      if (submission[0].status !== "submitted") {
        set.status = 400
        return { error: "Submission already graded" }
      }

      await db.update(lmsSubmission).set({
        score,
        feedback: feedback ?? "",
        gradedBy: actor.id,
        gradedAt: new Date(),
        status: "graded",
        updatedAt: new Date(),
      }).where(eq(lmsSubmission.id, params.id))

      return {
        id: params.id,
        score,
        maxScore: submission[0].maxScore,
        status: "graded",
      }
    }, {
      body: t.Object({
        score: t.Number({ minimum: 0 }),
        feedback: t.Optional(t.String()),
      }),
    })

    // ── Instructor: Get Submissions for Assignment ──

    .get("/instructor/assignments/:id/submissions", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "submission:grade")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }

      const { params } = ctx as any

      const submissions = await db.select().from(lmsSubmission).where(
        and(eq(lmsSubmission.assignmentId, params.id), eq(lmsSubmission.organizationId, actor.orgId)),
      ).orderBy(desc(lmsSubmission.submittedAt))

      const personIds = submissions.map((s) => s.personId).filter(Boolean) as string[]
      const people = personIds.length > 0
        ? await db.select().from(persons).where(inArray(persons.id, personIds))
        : []
      const personMap = new Map(people.map((p) => [p.id, `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()]))

      return {
        data: submissions.map((s) => ({
          id: s.id,
          learnerName: personMap.get(s.personId) ?? null,
          submittedAt: s.submittedAt,
          content: s.content,
          score: s.score,
          maxScore: s.maxScore,
          feedback: s.feedback,
          status: s.status,
          gradedAt: s.gradedAt,
        })),
      }
    })

    // ── Get Single Submission ──

    .get("/submissions/:id", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any

      const submission = await db.select().from(lmsSubmission).where(
        and(eq(lmsSubmission.id, params.id), eq(lmsSubmission.organizationId, actor.orgId)),
      ).limit(1)

      if (!submission[0]) {
        set.status = 404
        return { error: "Submission not found" }
      }

      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      const isOwner = submission[0].personId === personId
      if (!isOwner && !hasPermission(actor, "submission:grade")) {
        set.status = 403
        return { error: "FORBIDDEN" }
      }

      return submission[0]
    })
}
