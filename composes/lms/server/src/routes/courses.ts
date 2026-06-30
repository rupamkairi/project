import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { generateId } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, desc, asc, inArray, sql, count } from "drizzle-orm"
import {
  lmsCourseDetail,
  lmsModule,
  lmsLesson,
  lmsCourseReview,
} from "../db/schema/lms"
import { persons } from "@db/schema/party"
import { catItems, catCategories } from "@db/schema/catalog"
import { pipelines, pipelineStages } from "@db/schema/pipeline"
import { transactions, transactionLines } from "@db/schema/commerce"

// ── Auth helper ────────────────────────────────────────

function getActor(ctx: any): { id: string; orgId: string; roles: string[] } {
  const actor = (ctx as any).actor
  if (!actor) throw new Error("AUTH_REQUIRED")
  return { id: actor.id, orgId: actor.orgId, roles: actor.roles ?? [] }
}

function hasPermission(actor: { roles: string[] }, perm: string): boolean {
  return actor.roles.includes("lms-admin") || actor.roles.includes(perm) || actor.roles.includes("*:*")
}

// ── Pipeline helper ────────────────────────────────────

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

// ── Courses ────────────────────────────────────────────

export function courseRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "" })

    // ── Public Catalog ──

    .get("/courses", async (ctx) => {
      const actor = getActor(ctx)
      const q = (ctx as any).query ?? {}
      const page = parseInt(q.page as string) || 1
      const limit = parseInt(q.limit as string) || 20
      const offset = (page - 1) * limit

      const items = await db.select().from(catItems).where(
        and(
          eq(catItems.organizationId, actor.orgId),
          eq(catItems.type, "course"),
          eq(catItems.status, "active"),
          isNull(catItems.deletedAt),
        ),
      ).orderBy(desc(catItems.createdAt)).limit(limit).offset(offset)

      const [{ total }] = await db.select({ total: count() }).from(catItems).where(
        and(eq(catItems.organizationId, actor.orgId), eq(catItems.type, "course"), eq(catItems.status, "active")),
      )

      const itemIds = items.map((i) => i.id)
      const details = itemIds.length > 0
        ? await db.select().from(lmsCourseDetail).where(
            and(eq(lmsCourseDetail.organizationId, actor.orgId), inArray(lmsCourseDetail.itemId, itemIds)),
          )
        : []

      const instructorIds = details.map((d) => d.instructorId).filter(Boolean) as string[]
      const instructors = instructorIds.length > 0
        ? await db.select().from(persons).where(inArray(persons.id, instructorIds))
        : []
      const instructorMap = new Map(instructors.map((i) => [i.id, `${i.firstName ?? ""} ${i.lastName ?? ""}`.trim()]))

      const detailMap = new Map(details.map((d) => [d.itemId, d]))

      const data = items.map((item) => {
        const detail = detailMap.get(item.id)
        const meta = item.meta as Record<string, unknown> ?? {}
        return {
          id: item.id,
          title: item.name,
          code: (item as any).sku ?? null,
          instructorName: detail ? instructorMap.get(detail.instructorId ?? "") ?? null : null,
          level: detail?.level ?? null,
          durationHours: detail?.durationHours ?? null,
          language: detail?.language ?? null,
          thumbnailUrl: detail?.thumbnailUrl ?? null,
          price: meta.price ?? null,
          currency: meta.currency ?? null,
          createdAt: item.createdAt,
        }
      })

      return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
    })

    .get("/courses/:slug", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any

      const item = await db.select().from(catItems).where(
        and(eq(catItems.slug, params.slug), eq(catItems.organizationId, actor.orgId), eq(catItems.type, "course"), isNull(catItems.deletedAt)),
      ).limit(1)

      if (!item[0]) {
        set.status = 404
        return { error: "Course not found" }
      }

      const detail = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.itemId, item[0].id), isNull(lmsCourseDetail.deletedAt)),
      ).limit(1)

      let instructorName: string | null = null
      if (detail[0]?.instructorId) {
        const inst = await db.select().from(persons).where(eq(persons.id, detail[0].instructorId)).limit(1)
        instructorName = inst[0] ? `${inst[0].firstName ?? ""} ${inst[0].lastName ?? ""}`.trim() : null
      }

      const modules = await db.select().from(lmsModule).where(
        and(eq(lmsModule.itemId, item[0].id), eq(lmsModule.isPublished, true), isNull(lmsModule.deletedAt)),
      ).orderBy(asc(lmsModule.position))

      const moduleIds = modules.map((m) => m.id)
      const lessons = moduleIds.length > 0
        ? await db.select().from(lmsLesson).where(
            and(inArray(lmsLesson.moduleId, moduleIds), eq(lmsLesson.isPublished, true), isNull(lmsLesson.deletedAt)),
          ).orderBy(asc(lmsLesson.position))
        : []

      const meta = item[0].meta as Record<string, unknown> ?? {}
      return {
        id: item[0].id,
        title: item[0].name,
        slug: item[0].slug,
        description: meta.description as string ?? null,
        instructorName,
        level: detail[0]?.level ?? null,
        durationHours: detail[0]?.durationHours ?? null,
        language: detail[0]?.language ?? "en",
        thumbnailUrl: detail[0]?.thumbnailUrl ?? null,
        prerequisites: detail[0]?.prerequisites ?? [],
        completionThreshold: detail[0]?.completionThreshold ?? 80,
        price: meta.price as number ?? null,
        currency: meta.currency as string ?? null,
        modules: modules.map((m) => ({
          id: m.id,
          title: m.title,
          position: m.position,
          lessons: lessons.filter((l) => l.moduleId === m.id).map((l) => ({
            id: l.id, title: l.title, position: l.position, contentType: l.contentType, durationMinutes: l.durationMinutes, isFree: l.isFree,
          })),
        })),
      }
    })

    // ── Categories ──

    .get("/categories", async (ctx) => {
      const actor = getActor(ctx)
      const cats = await db.select().from(catCategories).where(
        and(eq(catCategories.organizationId, actor.orgId), eq(catCategories.status, "active")),
      ).orderBy(asc(catCategories.sortOrder))
      return { data: cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId })) }
    })

    // ── Instructor: Create Course ──

    .post("/instructor/courses", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:create")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }

      const { body, set } = ctx as any
      const { title, description, categoryId, level, language, price, currency, completionThreshold } = body

      const itemId = `crs_${generateId().slice(0, 20)}`
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + itemId.slice(-6)

      await db.insert(catItems).values({
        id: itemId,
        organizationId: actor.orgId,
        name: title,
        slug,
        type: "course",
        categoryId: categoryId ?? null,
        description: description ?? "",
        status: "draft",
        meta: { price: price ?? 0, currency: currency ?? "USD", description: description ?? "" },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      })

      await db.insert(lmsCourseDetail).values({
        id: `lms_cd_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        itemId,
        instructorId: actor.id,
        level: level ?? "all",
        durationHours: 0,
        language: language ?? "en",
        completionThreshold: completionThreshold ?? 80,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        meta: {},
      })

      return { id: itemId, title, slug, level: level ?? "all", status: "draft" }
    }, {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
        level: t.Optional(t.String()),
        language: t.Optional(t.String()),
        price: t.Optional(t.Number()),
        currency: t.Optional(t.String()),
        completionThreshold: t.Optional(t.Number()),
      }),
    })

    // ── Instructor: List Own Courses ──

    .get("/instructor/courses", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:read")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }

      const details = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.organizationId, actor.orgId), eq(lmsCourseDetail.instructorId, actor.id), isNull(lmsCourseDetail.deletedAt)),
      ).orderBy(desc(lmsCourseDetail.createdAt))

      const itemIds = details.map((d) => d.itemId)
      const items = itemIds.length > 0
        ? await db.select().from(catItems).where(inArray(catItems.id, itemIds))
        : []
      const itemMap = new Map(items.map((i) => [i.id, i]))

      const modCounts = itemIds.length > 0
        ? await db.select({ itemId: lmsModule.itemId, count: sql<number>`count(*)` }).from(lmsModule).where(
            and(inArray(lmsModule.itemId, itemIds), isNull(lmsModule.deletedAt)),
          ).groupBy(lmsModule.itemId)
        : []
      const modCountMap = new Map(modCounts.map((m) => [m.itemId, m.count]))

      return {
        data: details.map((d) => {
          const item = itemMap.get(d.itemId)
          return {
            id: d.itemId, title: item?.name ?? "", slug: item?.slug ?? "",
            level: d.level, language: d.language, status: item?.status ?? "draft",
            isPublished: d.isPublished, publishedAt: d.publishedAt,
            moduleCount: modCountMap.get(d.itemId) ?? 0, createdAt: d.createdAt,
          }
        }),
      }
    })

    // ── Instructor: Get Course Detail ──

    .get("/instructor/courses/:id", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any

      const detail = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.itemId, params.id), eq(lmsCourseDetail.organizationId, actor.orgId), isNull(lmsCourseDetail.deletedAt)),
      ).limit(1)

      if (!detail[0]) { set.status = 404; return { error: "Course not found" } }

      if (!hasPermission(actor, "course:admin") && detail[0].instructorId !== actor.id) {
        set.status = 403; return { error: "FORBIDDEN" }
      }

      const item = await db.select().from(catItems).where(eq(catItems.id, params.id)).limit(1)
      const modules = await db.select().from(lmsModule).where(
        and(eq(lmsModule.itemId, params.id), isNull(lmsModule.deletedAt)),
      ).orderBy(asc(lmsModule.position))

      return {
        id: params.id, title: item[0]?.name ?? "", slug: item[0]?.slug ?? "",
        description: (item[0]?.meta as any)?.description ?? null,
        level: detail[0].level, durationHours: detail[0].durationHours, language: detail[0].language,
        instructorId: detail[0].instructorId, prerequisites: detail[0].prerequisites,
        thumbnailUrl: detail[0].thumbnailUrl, completionThreshold: detail[0].completionThreshold,
        isPublished: detail[0].isPublished, publishedAt: detail[0].publishedAt,
        status: item[0]?.status ?? "draft",
        modules: modules.map((m) => ({ id: m.id, title: m.title, position: m.position, isPublished: m.isPublished })),
        createdAt: detail[0].createdAt,
      }
    })

    // ── Instructor: Update Course ──

    .patch("/instructor/courses/:id", async (ctx) => {
      const actor = getActor(ctx)
      const { params, body, set } = ctx as any

      const detail = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.itemId, params.id), eq(lmsCourseDetail.organizationId, actor.orgId), isNull(lmsCourseDetail.deletedAt)),
      ).limit(1)

      if (!detail[0]) { set.status = 404; return { error: "Course not found" } }
      if (!hasPermission(actor, "course:update") && detail[0].instructorId !== actor.id) {
        set.status = 403; return { error: "FORBIDDEN" }
      }

      const { description, level, language, durationHours, prerequisites, thumbnailUrl, completionThreshold } = body

      await db.update(lmsCourseDetail).set({
        level: level ?? detail[0].level, language: language ?? detail[0].language,
        durationHours: durationHours ?? detail[0].durationHours,
        prerequisites: prerequisites ?? detail[0].prerequisites,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : detail[0].thumbnailUrl,
        completionThreshold: completionThreshold ?? detail[0].completionThreshold,
        updatedAt: new Date(),
      }).where(eq(lmsCourseDetail.itemId, params.id))

      if (description !== undefined) {
        const existingMeta = (detail[0].meta ?? {}) as Record<string, unknown>
        await db.update(catItems).set({
          meta: { ...existingMeta, description },
          updatedAt: new Date(),
        }).where(eq(catItems.id, params.id))
      }

      return { id: params.id, updated: true }
    }, {
      body: t.Object({
        description: t.Optional(t.String()), level: t.Optional(t.String()),
        language: t.Optional(t.String()), durationHours: t.Optional(t.Number()),
        prerequisites: t.Optional(t.Array(t.String())), thumbnailUrl: t.Optional(t.String()),
        completionThreshold: t.Optional(t.Number()),
      }),
    })

    // ── Submit for Review ──

    .post("/instructor/courses/:id/submit-review", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any

      const detail = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.itemId, params.id), eq(lmsCourseDetail.organizationId, actor.orgId), isNull(lmsCourseDetail.deletedAt)),
      ).limit(1)

      if (!detail[0]) { set.status = 404; return { error: "Course not found" } }
      if (!hasPermission(actor, "course:update") && detail[0].instructorId !== actor.id) {
        set.status = 403; return { error: "FORBIDDEN" }
      }

      const modCount = await db.select({ count: count() }).from(lmsModule).where(
        and(eq(lmsModule.itemId, params.id), isNull(lmsModule.deletedAt)),
      )
      if (modCount[0].count === 0) {
        set.status = 400; return { error: "Course must have at least 1 module" }
      }

      await db.update(catItems).set({ status: "draft", updatedAt: new Date() }).where(eq(catItems.id, params.id))

      await db.insert(lmsCourseReview).values({
        id: `rev_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId, itemId: params.id, reviewerId: actor.id, status: "pending",
        createdAt: new Date(), updatedAt: new Date(), version: 1, meta: {},
      })

      return { id: params.id, status: "under-review" }
    })

    // ── Admin: List All Courses ──

    .get("/admin/courses", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:read")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }

      const details = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.organizationId, actor.orgId), isNull(lmsCourseDetail.deletedAt)),
      ).orderBy(desc(lmsCourseDetail.createdAt))

      const itemIds = details.map((d) => d.itemId)
      const items = itemIds.length > 0 ? await db.select().from(catItems).where(inArray(catItems.id, itemIds)) : []
      const itemMap = new Map(items.map((i) => [i.id, i]))

      const instructorIds = details.map((d) => d.instructorId).filter(Boolean) as string[]
      const instructors = instructorIds.length > 0 ? await db.select().from(persons).where(inArray(persons.id, instructorIds)) : []
      const instructorMap = new Map(instructors.map((i) => [i.id, `${i.firstName ?? ""} ${i.lastName ?? ""}`.trim()]))

      const reviews = itemIds.length > 0 ? await db.select().from(lmsCourseReview).where(
        and(inArray(lmsCourseReview.itemId, itemIds), eq(lmsCourseReview.status, "pending")),
      ) : []

      return {
        data: details.map((d) => {
          const item = itemMap.get(d.itemId)
          return {
            id: d.itemId, title: item?.name ?? "", slug: item?.slug ?? "",
            instructorName: instructorMap.get(d.instructorId ?? "") ?? null,
            isPublished: d.isPublished, status: item?.status ?? "draft",
            hasPendingReview: reviews.some((r) => r.itemId === d.itemId),
            createdAt: d.createdAt,
          }
        }),
      }
    })

    // ── Admin: Approve Course ──

    .post("/admin/courses/:id/approve", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:publish")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }

      const { params } = ctx as any
      await db.update(catItems).set({ status: "active", updatedAt: new Date() }).where(eq(catItems.id, params.id))
      await db.update(lmsCourseDetail).set({ isPublished: true, publishedAt: new Date(), updatedAt: new Date() }).where(eq(lmsCourseDetail.itemId, params.id))
      await db.update(lmsCourseReview).set({ status: "approved", reviewedAt: new Date(), updatedAt: new Date() }).where(
        and(eq(lmsCourseReview.itemId, params.id), eq(lmsCourseReview.status, "pending")),
      )

      return { id: params.id, status: "published" }
    })

    // ── Admin: Reject Course ──

    .post("/admin/courses/:id/reject", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:publish")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }

      const { params, body, set } = ctx as any
      if (!body.reason) { set.status = 400; return { error: "Rejection reason is required" } }

      await db.update(catItems).set({ status: "draft", updatedAt: new Date() }).where(eq(catItems.id, params.id))
      await db.update(lmsCourseReview).set({
        status: "rejected", notes: body.reason, reviewedAt: new Date(), updatedAt: new Date(),
      }).where(and(eq(lmsCourseReview.itemId, params.id), eq(lmsCourseReview.status, "pending")))

      return { id: params.id, status: "rejected", reason: body.reason }
    }, { body: t.Object({ reason: t.String({ minLength: 1 }) }) })

    // ── Admin: Archive Course ──

    .post("/admin/courses/:id/archive", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:archive")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" } }

      const { params } = ctx as any
      await db.update(catItems).set({ status: "archived", updatedAt: new Date() }).where(eq(catItems.id, params.id))
      await db.update(lmsCourseDetail).set({ isPublished: false, updatedAt: new Date() }).where(eq(lmsCourseDetail.itemId, params.id))
      return { id: params.id, status: "archived" }
    })
}
