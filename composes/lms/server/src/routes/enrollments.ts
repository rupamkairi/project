import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { generateId } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, desc, count, sql, inArray } from "drizzle-orm"
import {
  lmsCourseDetail,
  lmsCohortMember,
  lmsCoupon,
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

async function getPersonIdFromActor(actorId: string, orgId: string): Promise<string | null> {
  const person = await db.select().from(persons).where(
    and(eq(persons.actorId, actorId), eq(persons.organizationId, orgId)),
  ).limit(1)
  return person[0]?.id ?? null
}

async function validateCoupon(code: string, courseId: string, orgId: string) {
  const coupon = await db.select().from(lmsCoupon).where(
    and(eq(lmsCoupon.code, code.toUpperCase()), eq(lmsCoupon.organizationId, orgId), eq(lmsCoupon.isActive, true)),
  ).limit(1)
  if (!coupon[0]) throw new Error("COUPON_NOT_FOUND")
  if (coupon[0].expiresAt && coupon[0].expiresAt < new Date()) throw new Error("COUPON_EXPIRED")
  if (coupon[0].maxUses && coupon[0].usedCount >= coupon[0].maxUses) throw new Error("COUPON_EXHAUSTED")
  const applicableItems = coupon[0].applicableItemIds as string[]
  if (applicableItems?.length > 0 && !applicableItems.includes(courseId)) throw new Error("COUPON_NOT_APPLICABLE")
  return coupon[0]
}

export function enrollmentRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "" })

    .get("/enrollments", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { ;(ctx as any).set.status = 404; return { error: "Learner profile not found" } }

      const enrollments = await db.select().from(transactions).where(
        and(eq(transactions.personId, personId), eq(transactions.organizationId, actor.orgId), eq(transactions.type, "order"), isNull(transactions.deletedAt)),
      ).orderBy(desc(transactions.createdAt))

      const txnIds = enrollments.map((e) => e.id)
      const lines = txnIds.length > 0 ? await db.select().from(transactionLines).where(inArray(transactionLines.transactionId, txnIds)) : []
      const itemIds = lines.map((l) => l.itemId).filter(Boolean) as string[]
      const courses = itemIds.length > 0 ? await db.select().from(catItems).where(inArray(catItems.id, itemIds)) : []
      const courseMap = new Map(courses.map((c) => [c.id, c.name]))
      const details = itemIds.length > 0 ? await db.select().from(lmsCourseDetail).where(inArray(lmsCourseDetail.itemId, itemIds)) : []
      const detailMap = new Map(details.map((d) => [d.itemId, d]))
      const stageIds = enrollments.map((e) => e.stageId).filter(Boolean) as string[]
      const stages = stageIds.length > 0 ? await db.select().from(pipelineStages).where(inArray(pipelineStages.id, stageIds)) : []
      const stageMap = new Map(stages.map((s) => [s.id, s.name]))

      return {
        data: enrollments.map((e) => {
          const line = lines.find((l) => l.transactionId === e.id)
          const course = line?.itemId ? courseMap.get(line.itemId) : null
          const detail = line?.itemId ? detailMap.get(line.itemId) : null
          return {
            id: e.id, courseId: line?.itemId ?? null, courseTitle: course ?? null, level: detail?.level ?? null,
            stageName: stageMap.get(e.stageId ?? "") ?? null, totalAmount: e.totalAmount, totalCurrency: e.totalCurrency, createdAt: e.createdAt,
          }
        }),
      }
    })

    .get("/enrollments/:id", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any
      const enrollment = await db.select().from(transactions).where(
        and(eq(transactions.id, params.id), eq(transactions.organizationId, actor.orgId)),
      ).limit(1)
      if (!enrollment[0]) { set.status = 404; return { error: "Enrollment not found" } }
      const lines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, params.id))
      const course = lines[0]?.itemId ? await db.select().from(catItems).where(eq(catItems.id, lines[0].itemId)).limit(1) : null
      const stage = enrollment[0].stageId ? await db.select().from(pipelineStages).where(eq(pipelineStages.id, enrollment[0].stageId)).limit(1) : null
      return {
        id: enrollment[0].id, personId: enrollment[0].personId, courseId: lines[0]?.itemId ?? null,
        courseTitle: course?.[0]?.name ?? null, stageName: stage?.[0]?.name ?? null,
        totalAmount: enrollment[0].totalAmount, totalCurrency: enrollment[0].totalCurrency, createdAt: enrollment[0].createdAt,
      }
    })

    .post("/enrollments", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "enrollment:create")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { body, set } = ctx as any
      const { courseId, cohortId, couponCode } = body

      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { set.status = 400; return { error: "Learner profile not found. Contact admin." } }

      // Get course price from catItems.meta
      const course = await db.select().from(catItems).where(eq(catItems.id, courseId)).limit(1)
      if (!course[0]) { set.status = 404; return { error: "Course not found" }}
      const meta = course[0].meta as Record<string, unknown> ?? {}
      let finalPrice = (meta.price as number) ?? 0
      const currency = (meta.currency as string) ?? "USD"

      let coupon: any = null
      if (couponCode) {
        coupon = await validateCoupon(couponCode, courseId, actor.orgId)
        if (coupon.discountType === "percentage") {
          finalPrice = Math.max(0, finalPrice - Math.round(finalPrice * (coupon.discountValue / 100)))
        } else {
          finalPrice = Math.max(0, finalPrice - coupon.discountValue)
        }
      }

      const enrolledStageId = await getStageId(actor.orgId, "lms.enrollment", "Enrolled")
      const inProgressStageId = await getStageId(actor.orgId, "lms.enrollment", "In Progress")

      const result = await db.transaction(async (tx) => {
        const existing = await tx.select().from(transactions).innerJoin(transactionLines, eq(transactionLines.transactionId, transactions.id)).where(
          and(eq(transactions.type, "order"), eq(transactions.personId, personId), eq(transactionLines.itemId, courseId), isNull(transactions.deletedAt)),
        ).limit(1)
        if (existing.length > 0) throw new Error("ALREADY_ENROLLED")

        const txnId = `enr_${generateId().slice(0, 20)}`
        const targetStageId = finalPrice === 0 ? (inProgressStageId ?? enrolledStageId) : enrolledStageId

        await tx.insert(transactions).values({
          id: txnId, organizationId: actor.orgId, type: "order", personId, stageId: targetStageId,
          totalAmount: finalPrice, totalCurrency: currency,
          meta: coupon ? { couponCode, cohortId } : { cohortId },
          createdAt: new Date(), updatedAt: new Date(), version: 1,
        })

        await tx.insert(transactionLines).values({
          id: `txl_${generateId().slice(0, 20)}`, organizationId: actor.orgId, transactionId: txnId,
          itemId: courseId, qty: 1, unitPriceAmount: finalPrice, unitPriceCurrency: currency,
          lineTotalAmount: finalPrice, lineTotalCurrency: currency,
          createdAt: new Date(), updatedAt: new Date(), version: 1,
        })

        if (cohortId && finalPrice === 0) {
          await tx.insert(lmsCohortMember).values({
            id: `chm_${generateId().slice(0, 20)}`, organizationId: actor.orgId, cohortId, personId, transactionId: txnId,
            enrolledAt: new Date(), createdAt: new Date(), updatedAt: new Date(), version: 1, meta: {},
          })
        }

        if (coupon) {
          const updated = await tx.update(lmsCoupon).set({
            usedCount: sql`${lmsCoupon.usedCount} + 1`,
            updatedAt: new Date(),
          }).where(
            and(
              eq(lmsCoupon.code, coupon.code),
              eq(lmsCoupon.organizationId, actor.orgId),
              sql`${lmsCoupon.usedCount} < ${lmsCoupon.maxUses}`,
            ),
          ).returning()

          if (updated.length === 0) throw new Error("COUPON_EXHAUSTED")
        }

        return { id: txnId, free: finalPrice === 0 }
      }).catch((err: Error) => {
        if (err.message === "ALREADY_ENROLLED") { set.status = 409; return { error: "Already enrolled in this course" } }
        if (err.message?.startsWith("COUPON_")) { set.status = 400; return { error: err.message }}
        set.status = 500; return { error: err.message }
      })

      if (result && "error" in result) return result
      return { id: (result as any).id, status: (result as any).free ? "active" : "pending-payment", isFree: (result as any).free }
    }, {
      body: t.Object({ courseId: t.String({ minLength: 1 }), cohortId: t.Optional(t.String()), couponCode: t.Optional(t.String()) }),
    })

    .post("/enrollments/:id/cancel", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any
      const enrollment = await db.select().from(transactions).where(
        and(eq(transactions.id, params.id), eq(transactions.organizationId, actor.orgId)),
      ).limit(1)
      if (!enrollment[0]) { set.status = 404; return { error: "Enrollment not found" } }
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (enrollment[0].personId !== personId && !hasPermission(actor, "enrollment:manage")) {
        set.status = 403; return { error: "FORBIDDEN" }
      }
      const droppedStageId = await getStageId(actor.orgId, "lms.enrollment", "Dropped")
      if (droppedStageId) await db.update(transactions).set({ stageId: droppedStageId, updatedAt: new Date() }).where(eq(transactions.id, params.id))
      return { id: params.id, status: "cancelled" }
    })

    .get("/admin/enrollments", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "enrollment:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const q = (ctx as any).query ?? {}
      const page = parseInt(q.page as string) || 1
      const limit = parseInt(q.limit as string) || 20
      const offset = (page - 1) * limit

      const enrollments = await db.select().from(transactions).where(
        and(eq(transactions.organizationId, actor.orgId), eq(transactions.type, "order")),
      ).orderBy(desc(transactions.createdAt)).limit(limit).offset(offset)

      const [{ total }] = await db.select({ total: count() }).from(transactions).where(
        and(eq(transactions.organizationId, actor.orgId), eq(transactions.type, "order")),
      )

      const personIds = enrollments.map((e) => e.personId).filter(Boolean) as string[]
      const people = personIds.length > 0 ? await db.select().from(persons).where(inArray(persons.id, personIds)) : []
      const personMap = new Map(people.map((p) => [p.id, `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()]))

      const txnIds = enrollments.map((e) => e.id)
      const lines = txnIds.length > 0 ? await db.select().from(transactionLines).where(inArray(transactionLines.transactionId, txnIds)) : []
      const itemIds = lines.map((l) => l.itemId).filter(Boolean) as string[]
      const courses = itemIds.length > 0 ? await db.select().from(catItems).where(inArray(catItems.id, itemIds)) : []
      const courseMap = new Map(courses.map((c) => [c.id, c.name]))

      return {
        data: enrollments.map((e) => {
          const line = lines.find((l) => l.transactionId === e.id)
          return { id: e.id, learnerName: personMap.get(e.personId ?? "") ?? null, courseTitle: line?.itemId ? courseMap.get(line.itemId) ?? null : null, totalAmount: e.totalAmount, stageId: e.stageId, createdAt: e.createdAt }
        }),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    })

    .post("/admin/enrollments/bulk", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "enrollment:manage")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }
      const { body, set } = ctx as any
      const { courseId, learnerIds, cohortId } = body
      if (learnerIds.length > 500) { set.status = 400; return { error: "Max 500 learners per bulk enrollment" }}

      const inProgressStageId = await getStageId(actor.orgId, "lms.enrollment", "In Progress")
      const errors: { learnerId: string; reason: string }[] = []
      let enrolled = 0; let skipped = 0

      for (const learnerId of learnerIds) {
        try {
          const existing = await db.select().from(transactions).innerJoin(transactionLines, eq(transactionLines.transactionId, transactions.id)).where(
            and(eq(transactions.type, "order"), eq(transactions.personId, learnerId), eq(transactionLines.itemId, courseId), isNull(transactions.deletedAt)),
          ).limit(1)
          if (existing.length > 0) { skipped++; continue }
          const txnId = `enr_${generateId().slice(0, 20)}`
          await db.insert(transactions).values({
            id: txnId, organizationId: actor.orgId, type: "order", personId: learnerId, stageId: inProgressStageId,
            totalAmount: 0, totalCurrency: "USD", meta: { bulkEnrollment: true, cohortId },
            createdAt: new Date(), updatedAt: new Date(), version: 1,
          })
          await db.insert(transactionLines).values({
            id: `txl_${generateId().slice(0, 20)}`, organizationId: actor.orgId, transactionId: txnId, itemId: courseId, qty: 1,
            unitPriceAmount: 0, unitPriceCurrency: "USD", lineTotalAmount: 0, lineTotalCurrency: "USD",
            createdAt: new Date(), updatedAt: new Date(), version: 1,
          })
          if (cohortId) {
            await db.insert(lmsCohortMember).values({
              id: `chm_${generateId().slice(0, 20)}`, organizationId: actor.orgId, cohortId, personId: learnerId, transactionId: txnId,
              enrolledAt: new Date(), createdAt: new Date(), updatedAt: new Date(), version: 1, meta: {},
            })
          }
          enrolled++
        } catch (err: any) { errors.push({ learnerId, reason: err.message }) }
      }
      return { enrolled, skipped, errors }
    }, { body: t.Object({ courseId: t.String({ minLength: 1 }), learnerIds: t.Array(t.String(), { minItems: 1, maxItems: 500 }), cohortId: t.Optional(t.String()) }) })
}
