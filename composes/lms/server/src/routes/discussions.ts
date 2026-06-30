import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { generateId } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, desc, asc } from "drizzle-orm"
import {
  lmsDiscussion,
  lmsDiscussionReply,
  lmsLesson,
} from "../db/schema/lms"
import { persons } from "@db/schema/party"

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

function hasPermission(actor: { roles: string[] }, perm: string): boolean {
  return actor.roles.includes("lms-admin") || actor.roles.includes(perm) || actor.roles.includes("*:*")
}

export function discussionRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "" })

    // ── List discussions for a lesson ──

    .get("/lessons/:lessonId/discussions", async (ctx) => {
      const actor = getActor(ctx)
      const { params } = ctx as any

      const discussions = await db.select().from(lmsDiscussion).where(
        and(eq(lmsDiscussion.lessonId, params.lessonId), eq(lmsDiscussion.organizationId, actor.orgId), isNull(lmsDiscussion.deletedAt)),
      ).orderBy(desc(lmsDiscussion.createdAt))

      const personIds = discussions.map((d) => d.personId).filter(Boolean) as string[]
      const people = personIds.length > 0
        ? await db.select().from(persons).where(eq(persons.organizationId, actor.orgId)).then((all) =>
            all.filter((p) => personIds.includes(p.id)))
        : []
      const personMap = new Map(people.map((p) => [p.id, `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()]))

      return {
        data: discussions.map((d) => ({
          id: d.id,
          body: d.body,
          authorName: personMap.get(d.personId) ?? "Unknown",
          isPinned: d.isPinned,
          isResolved: d.isResolved,
          replyCount: 0,
          createdAt: d.createdAt,
        })),
      }
    })

    // ── Create discussion ──

    .post("/lessons/:lessonId/discussions", async (ctx) => {
      const actor = getActor(ctx)
      const { params, body, set } = ctx as any
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { set.status = 404; return { error: "Learner profile not found" }}

      const lesson = await db.select().from(lmsLesson).where(
        and(eq(lmsLesson.id, params.lessonId), eq(lmsLesson.organizationId, actor.orgId), isNull(lmsLesson.deletedAt)),
      ).limit(1)
      if (!lesson[0]) { set.status = 404; return { error: "Lesson not found" }}

      const [discussion] = await db.insert(lmsDiscussion).values({
        id: `dsc_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        lessonId: params.lessonId,
        personId,
        body: body.body,
        isPinned: false,
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }).returning()

      return { id: discussion?.id, lessonId: params.lessonId }
    }, { body: t.Object({ body: t.String({ minLength: 1 }) }) })

    // ── Mark discussion resolved ──

    .patch("/discussions/:id/resolve", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any
      const existing = await db.select().from(lmsDiscussion).where(
        and(eq(lmsDiscussion.id, params.id), eq(lmsDiscussion.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Discussion not found" }}
      if (!hasPermission(actor, "lms-admin") && existing[0].personId !== await getPersonIdFromActor(actor.id, actor.orgId)) {
        set.status = 403; return { error: "FORBIDDEN" }}

      await db.update(lmsDiscussion).set({ isResolved: true, updatedAt: new Date() }).where(eq(lmsDiscussion.id, params.id))
      return { id: params.id, resolved: true }
    })

    // ── Pin discussion (instructor/admin) ──

    .patch("/discussions/:id/pin", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "course:update")) { ;(ctx as any).set.status = 403; return { error: "FORBIDDEN" }}
      const { params, set } = ctx as any
      const existing = await db.select().from(lmsDiscussion).where(
        and(eq(lmsDiscussion.id, params.id), eq(lmsDiscussion.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Discussion not found" }}

      await db.update(lmsDiscussion).set({ isPinned: !existing[0].isPinned, updatedAt: new Date() }).where(eq(lmsDiscussion.id, params.id))
      return { id: params.id, pinned: !existing[0].isPinned }
    })

    // ── List replies ──

    .get("/discussions/:id/replies", async (ctx) => {
      const actor = getActor(ctx)
      const { params } = ctx as any
      const replies = await db.select().from(lmsDiscussionReply).where(
        and(eq(lmsDiscussionReply.discussionId, params.id), eq(lmsDiscussionReply.organizationId, actor.orgId)),
      ).orderBy(asc(lmsDiscussionReply.createdAt))

      const personIds = replies.map((r) => r.personId).filter(Boolean) as string[]
      const people = personIds.length > 0
        ? await db.select().from(persons).where(eq(persons.organizationId, actor.orgId)).then((all) =>
            all.filter((p) => personIds.includes(p.id)))
        : []
      const personMap = new Map(people.map((p) => [p.id, `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()]))

      return { data: replies.map((r) => ({ id: r.id, body: r.body, authorName: personMap.get(r.personId) ?? "Unknown", createdAt: r.createdAt })) }
    })

    // ── Create reply ──

    .post("/discussions/:id/replies", async (ctx) => {
      const actor = getActor(ctx)
      const { params, body, set } = ctx as any
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) { set.status = 404; return { error: "Learner profile not found" }}

      const discussion = await db.select().from(lmsDiscussion).where(
        and(eq(lmsDiscussion.id, params.id), eq(lmsDiscussion.organizationId, actor.orgId)),
      ).limit(1)
      if (!discussion[0]) { set.status = 404; return { error: "Discussion not found" }}

      const [reply] = await db.insert(lmsDiscussionReply).values({
        id: `dsc_r_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        discussionId: params.id,
        personId,
        body: body.body,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }).returning()

      return { id: reply?.id }
    }, { body: t.Object({ body: t.String({ minLength: 1 }) }) })

    // ── Delete discussion ──

    .delete("/discussions/:id", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any
      const existing = await db.select().from(lmsDiscussion).where(
        and(eq(lmsDiscussion.id, params.id), eq(lmsDiscussion.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Discussion not found" }}
      if (!hasPermission(actor, "course:update") && existing[0].personId !== await getPersonIdFromActor(actor.id, actor.orgId)) {
        set.status = 403; return { error: "FORBIDDEN" }}

      await db.update(lmsDiscussion).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(lmsDiscussion.id, params.id))
      return { id: params.id, deleted: true }
    })

    // ── Delete reply ──

    .delete("/replies/:id", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any
      const existing = await db.select().from(lmsDiscussionReply).where(
        and(eq(lmsDiscussionReply.id, params.id), eq(lmsDiscussionReply.organizationId, actor.orgId)),
      ).limit(1)
      if (!existing[0]) { set.status = 404; return { error: "Reply not found" }}
      // Only instructor/admin or author can delete
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!hasPermission(actor, "course:update") && existing[0].personId !== personId) {
        set.status = 403; return { error: "FORBIDDEN" }}

      await db.update(lmsDiscussionReply).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(lmsDiscussionReply.id, params.id))
      return { id: params.id, deleted: true }
    })
}
