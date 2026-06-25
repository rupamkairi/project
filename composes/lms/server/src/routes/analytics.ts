import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, count, inArray, sql } from "drizzle-orm"
import {
  lmsCourseDetail,
  lmsProgress,
  lmsLesson,
  lmsModule,
  lmsCertificate,
} from "../db/schema/lms"
import { persons } from "@db/schema/party"
import { catItems } from "@db/schema/catalog"
import { transactions, transactionLines } from "@db/schema/commerce"
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

export function analyticsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "" })

    .get("/admin/analytics/overview", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "enrollment:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }

      const q = (ctx as any).query ?? {}
      const dateFrom = q.dateFrom ? new Date(q.dateFrom) : new Date(0)
      const dateTo = q.dateTo ? new Date(q.dateTo) : new Date()

      const allEnrollments = await db.select().from(transactions).where(
        and(eq(transactions.organizationId, actor.orgId), eq(transactions.type, "order")),
      )
      const periodEnrollments = allEnrollments.filter((e) => e.createdAt >= dateFrom && e.createdAt <= dateTo)

      const droppedStageId = await getStageId(actor.orgId, "lms.enrollment", "Dropped")
      const completedStageId = await getStageId(actor.orgId, "lms.enrollment", "Completed")
      const activeStageId = await getStageId(actor.orgId, "lms.enrollment", "In Progress")

      const active = allEnrollments.filter(
        (e) => e.stageId === activeStageId || (e.stageId && !droppedStageId && !completedStageId),
      )
      const completed = allEnrollments.filter((e) => e.stageId === completedStageId)
      const dropped = allEnrollments.filter((e) => e.stageId === droppedStageId)

      const completionRate = active.length + completed.length > 0
        ? Math.round((completed.length / (active.length + completed.length)) * 100)
        : 0

      const courseDetails = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.organizationId, actor.orgId), isNull(lmsCourseDetail.deletedAt)),
      )
      const published = courseDetails.filter((d) => d.isPublished)

      const totalRevenue = allEnrollments.reduce((sum, e) => sum + (e.totalAmount ?? 0), 0)
      const periodRevenue = periodEnrollments.reduce((sum, e) => sum + (e.totalAmount ?? 0), 0)
      const avgOrderValue = allEnrollments.length > 0 ? Math.round(totalRevenue / allEnrollments.length) : 0

      // Top courses by revenue
      const lineItems = await db.select().from(transactionLines).where(eq(transactionLines.organizationId, actor.orgId))
      const courseRevenueMap = new Map<string, { enrollments: number; revenue: number }>()
      for (const line of lineItems) {
        if (!line.itemId) continue
        const txn = allEnrollments.find((e) => e.id === line.transactionId)
        if (!txn) continue
        const existing = courseRevenueMap.get(line.itemId) ?? { enrollments: 0, revenue: 0 }
        existing.enrollments += line.qty
        existing.revenue += txn.totalAmount ?? 0
        courseRevenueMap.set(line.itemId, existing)
      }

      const itemIds = Array.from(courseRevenueMap.keys())
      const courses = itemIds.length > 0 ? await db.select().from(catItems).where(inArray(catItems.id, itemIds)) : []
      const courseNameMap = new Map(courses.map((c) => [c.id, c.name]))

      const topCourses = Array.from(courseRevenueMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10)
        .map(([courseId, data]) => ({
          courseId, title: courseNameMap.get(courseId) ?? null, enrollments: data.enrollments, revenue: data.revenue,
        }))

      return {
        enrollments: { total: allEnrollments.length, active: active.length, completed: completed.length, cancelled: dropped.length, periodNew: periodEnrollments.length, completionRate },
        courses: { total: courseDetails.length, published: published.length, underReview: courseDetails.length - published.length },
        revenue: { total: totalRevenue, periodRevenue, avgOrderValue },
        topCourses,
      }
    })

    .get("/admin/analytics/revenue", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "enrollment:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const enrollments = await db.select().from(transactions).where(
        and(eq(transactions.organizationId, actor.orgId), eq(transactions.type, "order")),
      )
      const totalRevenue = enrollments.reduce((sum, e) => sum + (e.totalAmount ?? 0), 0)
      const paidCount = enrollments.filter((e) => (e.totalAmount ?? 0) > 0).length
      return { totalRevenue, paidEnrollments: paidCount, freeEnrollments: enrollments.length - paidCount, totalEnrollments: enrollments.length, avgRevenuePerPaid: paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0 }
    })

    .get("/instructor/analytics/courses/:id", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:read")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { params } = ctx as any
      const itemId = params.id

      const detail = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.itemId, itemId), eq(lmsCourseDetail.organizationId, actor.orgId)),
      ).limit(1)
      if (!detail[0]) { ;(ctx as any).set.status = 404; return { error: "Course not found" } }

      const enrollments = await db.select()
        .from(transactions)
        .innerJoin(transactionLines, eq(transactionLines.transactionId, transactions.id))
        .where(and(eq(transactions.organizationId, actor.orgId), eq(transactions.type, "order"), eq(transactionLines.itemId, itemId)))

      const completedStageId = await getStageId(actor.orgId, "lms.enrollment", "Completed")
      const activeCount = enrollments.filter((e) => e.transactions.stageId !== completedStageId).length
      const completedCount = enrollments.filter((e) => e.transactions.stageId === completedStageId).length
      const totalRevenue = enrollments.reduce((sum, e) => sum + (e.transactions.totalAmount ?? 0), 0)

      const modules = await db.select().from(lmsModule).where(
        and(eq(lmsModule.itemId, itemId), eq(lmsModule.organizationId, actor.orgId)),
      ).orderBy(lmsModule.position)

      const moduleIds = modules.map((m) => m.id)
      const personIds = enrollments.map((e) => e.transactions.personId).filter(Boolean) as string[]
      const allProgress = personIds.length > 0 && itemId
        ? await db.select().from(lmsProgress).where(
            and(inArray(lmsProgress.personId, personIds), eq(lmsProgress.itemId, itemId)),
          )
        : []

      const moduleAnalytics = modules.map((mod) => {
        const modProgress = allProgress.filter((p) => p.moduleId === mod.id)
        const completedMod = modProgress.filter((p) => p.isCompleted)
        return {
          moduleId: mod.id, title: mod.title,
          completedCount: completedMod.length,
          completionRate: modProgress.length > 0 ? Math.round((completedMod.length / modProgress.length) * 100) : 0,
        }
      })

      const item = await db.select().from(catItems).where(eq(catItems.id, itemId)).limit(1)
      return {
        course: { id: itemId, title: item[0]?.name ?? "", isPublished: detail[0].isPublished, publishedAt: detail[0].publishedAt },
        enrollments: { total: enrollments.length, active: activeCount, completed: completedCount, completionRate: enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0 },
        revenue: { total: totalRevenue },
        modules: moduleAnalytics,
      }
    })

    .get("/instructor/analytics/overview", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:read")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const details = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.organizationId, actor.orgId), eq(lmsCourseDetail.instructorId, actor.id), isNull(lmsCourseDetail.deletedAt)),
      )
      const itemIds = details.map((d) => d.itemId)
      const publishedCount = details.filter((d) => d.isPublished).length
      const lineItems = itemIds.length > 0 ? await db.select().from(transactionLines).where(inArray(transactionLines.itemId, itemIds)) : []
      const totalEnrollments = lineItems.reduce((sum, l) => sum + l.qty, 0)
      return { courses: { total: details.length, published: publishedCount }, totalEnrollments }
    })

    .get("/learner/analytics", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { ;(ctx as any).set.status = 404; return { error: "Learner profile not found" } }

      const enrollments = await db.select().from(transactions).where(
        and(eq(transactions.personId, personId), eq(transactions.organizationId, actor.orgId), eq(transactions.type, "order")),
      )
      const completedStageId = await getStageId(actor.orgId, "lms.enrollment", "Completed")
      const activeCount = enrollments.filter((e) => e.stageId !== completedStageId).length
      const completedCount = enrollments.filter((e) => e.stageId === completedStageId).length

      const allProgress = await db.select().from(lmsProgress).where(
        and(eq(lmsProgress.personId, personId), eq(lmsProgress.organizationId, actor.orgId)),
      )
      const completedLessons = allProgress.filter((p) => p.isCompleted)
      const totalWatchSeconds = allProgress.reduce((sum, p) => sum + (p.watchedSeconds ?? 0), 0)

      const [certificateCount] = await db.select({ count: count() }).from(lmsCertificate).where(
        and(eq(lmsCertificate.personId, personId), eq(lmsCertificate.isRevoked, false)),
      )

      const lineItems = await db.select().from(transactionLines).where(eq(transactionLines.organizationId, actor.orgId))
      const courseIds = enrollments.map((e) => lineItems.find((l) => l.transactionId === e.id)?.itemId).filter(Boolean) as string[]
      const courses = courseIds.length > 0 ? await db.select().from(catItems).where(inArray(catItems.id, courseIds)) : []
      const courseNameMap = new Map(courses.map((c) => [c.id, c.name]))

      const allCourseIds = [...new Set(courseIds)]
      const modules = allCourseIds.length > 0 ? await db.select().from(lmsModule).where(inArray(lmsModule.itemId, allCourseIds)) : []
      const moduleIds = modules.map((m) => m.id)
      const allLessons = moduleIds.length > 0 ? await db.select().from(lmsLesson).where(inArray(lmsLesson.moduleId, moduleIds)) : []

      const lessonsByCourse = new Map<string, number>()
      for (const mod of modules) {
        const count = allLessons.filter((l) => l.moduleId === mod.id).length
        lessonsByCourse.set(mod.itemId, (lessonsByCourse.get(mod.itemId) ?? 0) + count)
      }

      const courseSummaries = courseIds.map((courseId) => {
        const personProgress = allProgress.filter((p) => p.itemId === courseId)
        const courseLessonCount = lessonsByCourse.get(courseId) ?? 1
        const completeCount = personProgress.filter((p) => p.isCompleted).length
        const lastAccessed = personProgress.length > 0
          ? personProgress.reduce((latest, p) => p.updatedAt > latest ? p.updatedAt : latest, personProgress[0].updatedAt)
          : null
        return { courseId, title: courseNameMap.get(courseId) ?? null, completionPct: Math.round((completeCount / courseLessonCount) * 100), lastAccessedAt: lastAccessed, timeSpentMinutes: Math.round(personProgress.reduce((sum, p) => sum + (p.watchedSeconds ?? 0), 0) / 60) }
      })

      return { enrollments: { total: enrollments.length, active: activeCount, completed: completedCount }, totalHoursSpent: Math.round(totalWatchSeconds / 3600), certificates: certificateCount?.count ?? 0, courseSummaries }
    })
}
