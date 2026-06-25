import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { generateId } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, asc, desc, count, inArray } from "drizzle-orm"
import {
  lmsCohort,
  lmsCohortMember,
  lmsWaitlist,
} from "../db/schema/lms"
import { persons } from "@db/schema/party"
import { transactions, transactionLines } from "@db/schema/commerce"
import { activities } from "@db/schema/activity"
import { pipelines, pipelineStages } from "@db/schema/pipeline"

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

export function cohortRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "" })

    .get("/instructor/courses/:id/cohorts", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "cohort:create")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params } = ctx as any

      const cohorts = await db.select().from(lmsCohort).where(
        and(eq(lmsCohort.itemId, params.id), eq(lmsCohort.organizationId, actor.orgId), isNull(lmsCohort.deletedAt)),
      ).orderBy(desc(lmsCohort.startDate))

      const cohortIds = cohorts.map((c) => c.id)
      const memberCounts = cohortIds.length > 0
        ? await db.select({ cohortId: lmsCohortMember.cohortId, count: count() }).from(lmsCohortMember).where(
            and(inArray(lmsCohortMember.cohortId, cohortIds), eq(lmsCohortMember.organizationId, actor.orgId)),
          ).groupBy(lmsCohortMember.cohortId)
        : []
      const memberCountMap = new Map(memberCounts.map((m) => [m.cohortId, m.count]))

      return { data: cohorts.map((c) => ({ id: c.id, name: c.name, startDate: c.startDate, endDate: c.endDate, maxSize: c.maxSize, status: c.status, memberCount: memberCountMap.get(c.id) ?? 0 })) }
    })

    .post("/instructor/courses/:id/cohorts", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "cohort:create")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params, body, set } = ctx as any
      const { name, startDate, endDate, maxSize } = body

      const [cohort] = await db.insert(lmsCohort).values({
        id: `coh_${generateId().slice(0, 20)}`, organizationId: actor.orgId, itemId: params.id, name,
        startDate: new Date(startDate), endDate: new Date(endDate), maxSize: maxSize ?? 50, status: "scheduled",
        instructorId: actor.id, createdAt: new Date(), updatedAt: new Date(), version: 1,
      }).returning()

      return cohort
    }, { body: t.Object({ name: t.String({ minLength: 1 }), startDate: t.String(), endDate: t.String(), maxSize: t.Optional(t.Number()) }) })

    .patch("/instructor/cohorts/:id", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "cohort:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params, body, set } = ctx as any
      const existing = await db.select().from(lmsCohort).where(
        and(eq(lmsCohort.id, params.id), eq(lmsCohort.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Cohort not found" }}

      await db.update(lmsCohort).set({
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : existing[0].startDate,
        endDate: body.endDate ? new Date(body.endDate) : existing[0].endDate,
        updatedAt: new Date(),
      }).where(eq(lmsCohort.id, params.id))
      return { id: params.id, updated: true }
    }, { body: t.Object({ name: t.Optional(t.String()), startDate: t.Optional(t.String()), endDate: t.Optional(t.String()), maxSize: t.Optional(t.Number()) }) })

    .post("/instructor/cohorts/:id/activate", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "cohort:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params, set } = ctx as any
      const existing = await db.select().from(lmsCohort).where(
        and(eq(lmsCohort.id, params.id), eq(lmsCohort.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Cohort not found" }}
      if (existing[0].status !== "scheduled") { set.status = 400; return { error: `Cannot activate cohort in '${existing[0].status}' status` }}

      await db.update(lmsCohort).set({ status: "active", updatedAt: new Date() }).where(eq(lmsCohort.id, params.id))
      return { id: params.id, status: "active" }
    })

    .post("/instructor/cohorts/:id/complete", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "cohort:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params, set } = ctx as any
      const existing = await db.select().from(lmsCohort).where(
        and(eq(lmsCohort.id, params.id), eq(lmsCohort.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Cohort not found" }}
      if (existing[0].status !== "active") { set.status = 400; return { error: "Cannot complete cohort in '${existing[0].status}' status" }}

      await db.update(lmsCohort).set({ status: "completed", updatedAt: new Date() }).where(eq(lmsCohort.id, params.id))
      return { id: params.id, status: "completed" }
    })

    .post("/instructor/cohorts/:id/cancel", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "cohort:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params, set } = ctx as any
      const existing = await db.select().from(lmsCohort).where(
        and(eq(lmsCohort.id, params.id), eq(lmsCohort.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Cohort not found" }}

      const members = await db.select().from(lmsCohortMember).where(
        and(eq(lmsCohortMember.cohortId, params.id), eq(lmsCohortMember.organizationId, actor.orgId)),
      )
      const droppedStageId = await getStageId(actor.orgId, "lms.enrollment", "Dropped")
      for (const member of members) {
        if (member.transactionId && droppedStageId) {
          await db.update(transactions).set({ stageId: droppedStageId, updatedAt: new Date() }).where(eq(transactions.id, member.transactionId))
        }
      }

      await db.update(lmsCohort).set({ status: "cancelled", updatedAt: new Date() }).where(eq(lmsCohort.id, params.id))
      return { id: params.id, status: "cancelled" }
    })

    .get("/admin/cohorts", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "enrollment:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const cohorts = await db.select().from(lmsCohort).where(
        and(eq(lmsCohort.organizationId, actor.orgId), isNull(lmsCohort.deletedAt)),
      ).orderBy(desc(lmsCohort.createdAt))

      // Cohort routes don't have courses import — skip course name resolution
      return { data: cohorts.map((c) => ({ id: c.id, name: c.name, startDate: c.startDate, endDate: c.endDate, maxSize: c.maxSize, status: c.status })) }
    })

    .get("/instructor/cohorts/:id/sessions", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "session:create")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params } = ctx as any
      const sessions = await db.select().from(activities).where(
        and(eq(activities.organizationId, actor.orgId), eq(activities.type, "meeting"), eq(activities.entityId, params.id), eq(activities.entityType, "lms.cohort"), isNull(activities.deletedAt)),
      ).orderBy(desc(activities.dueAt))
      return { data: sessions.map((s) => ({ id: s.id, title: s.subject, description: s.body, scheduledAt: s.dueAt, status: s.status, completedAt: s.completedAt, actorId: s.actorId })) }
    })

    .post("/instructor/cohorts/:id/sessions", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "session:create")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params, body } = ctx as any
      const { title, description, scheduledAt, durationMinutes, meetingUrl } = body

      const [session] = await db.insert(activities).values({
        id: `ses_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        type: "meeting",
        subject: title,
        body: description ?? "",
        status: "pending",
        actorId: actor.id,
        entityId: params.id,
        entityType: "lms.cohort",
        dueAt: new Date(scheduledAt),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        meta: { durationMinutes, meetingUrl },
      }).returning()

      return { id: session?.id, title, scheduledAt }
    }, { body: t.Object({ title: t.String({ minLength: 1 }), description: t.Optional(t.String()), scheduledAt: t.String(), durationMinutes: t.Optional(t.Number()), meetingUrl: t.Optional(t.String()) }) })

    .patch("/instructor/sessions/:id", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "session:create")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params, body, set } = ctx as any
      const existing = await db.select().from(activities).where(
        and(eq(activities.id, params.id), eq(activities.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Session not found" }}
      await db.update(activities).set({
        subject: body.title ?? existing[0].subject, body: body.description ?? existing[0].body,
        dueAt: body.scheduledAt ? new Date(body.scheduledAt) : existing[0].dueAt, updatedAt: new Date(),
      }).where(eq(activities.id, params.id))
      return { id: params.id, updated: true }
    }, { body: t.Object({ title: t.Optional(t.String()), description: t.Optional(t.String()), scheduledAt: t.Optional(t.String()), durationMinutes: t.Optional(t.Number()) }) })

    .delete("/instructor/sessions/:id", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "session:create")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params, set } = ctx as any
      const existing = await db.select().from(activities).where(
        and(eq(activities.id, params.id), eq(activities.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Session not found" }}
      await db.update(activities).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(activities.id, params.id))
      return { id: params.id, deleted: true }
    })

    .post("/cohorts/:id/waitlist", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { set.status = 404; return { error: "Learner profile not found" }}

      const existing = await db.select().from(lmsWaitlist).where(
        and(eq(lmsWaitlist.cohortId, params.id), eq(lmsWaitlist.personId, personId), eq(lmsWaitlist.status, "waiting")),
      ).limit(1)
      if (existing[0]) { set.status = 409; return { error: "Already on waitlist" }}

      const maxPos = await db.select({ max: count() }).from(lmsWaitlist).where(
        and(eq(lmsWaitlist.cohortId, params.id), eq(lmsWaitlist.organizationId, actor.orgId)),
      )

      const [entry] = await db.insert(lmsWaitlist).values({
        id: `wlt_${generateId().slice(0, 20)}`, organizationId: actor.orgId, cohortId: params.id, personId,
        status: "waiting", position: (maxPos[0]?.max ?? 0) + 1,
        createdAt: new Date(), updatedAt: new Date(), version: 1,
      }).returning()
      return { id: entry?.id, cohortId: params.id, status: "waitlisted" }
    })

    .delete("/cohorts/:id/waitlist", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { set.status = 404; return { error: "Learner profile not found" }}
      await db.update(lmsWaitlist).set({ status: "expired", updatedAt: new Date() }).where(
        and(eq(lmsWaitlist.cohortId, params.id), eq(lmsWaitlist.personId, personId), eq(lmsWaitlist.organizationId, actor.orgId), eq(lmsWaitlist.status, "waiting")),
      )
      return { cohortId: params.id, removed: true }
    })

    .get("/learner/sessions", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { ;(ctx as any).set.status = 404; return { error: "Learner profile not found" }}

      const enrollments = await db.select()
        .from(transactions)
        .innerJoin(transactionLines, eq(transactionLines.transactionId, transactions.id))
        .where(and(eq(transactions.personId, personId), eq(transactions.organizationId, actor.orgId), eq(transactions.type, "order")))

      const courseIds = enrollments.map((e) => e.transaction_lines.itemId).filter(Boolean) as string[]
      if (courseIds.length === 0) return { data: [] }

      const cohorts = await db.select().from(lmsCohort).where(
        and(inArray(lmsCohort.itemId, courseIds), eq(lmsCohort.organizationId, actor.orgId), eq(lmsCohort.status, "active")),
      )

      const cohortMap = new Map(cohorts.map((c) => [c.id, c]))
      const cohortIds = cohorts.map((c) => c.id)

      const sessions = await db.select().from(activities).where(
        and(eq(activities.organizationId, actor.orgId), eq(activities.type, "meeting"), eq(activities.entityType, "lms.cohort"), inArray(activities.entityId, cohortIds), isNull(activities.deletedAt)),
      ).orderBy(asc(activities.dueAt))

      return {
        data: sessions.map((s) => {
          const cohort = cohortMap.get(s.entityId ?? "")
          return { id: s.id, cohortName: cohort?.name ?? null, title: s.subject, description: s.body, scheduledAt: s.dueAt, status: s.status, meetingUrl: (s.meta as any)?.meetingUrl ?? null }
        }),
      }
    })
}
