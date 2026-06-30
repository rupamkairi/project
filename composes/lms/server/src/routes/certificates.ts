import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { generateId } from "@core"
import { db } from "@db/client"
import { and, eq, isNull, desc, inArray } from "drizzle-orm"
import {
  lmsCertificate,
  lmsCourseDetail,
} from "../db/schema/lms"
import { persons } from "@db/schema/party"
import { catItems } from "@db/schema/catalog"
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

function generateCertificateNo(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = "LMS-"
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ── Routes ─────────────────────────────────────────────

export function createCertificateRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "" })

    // ── Issue Certificate (Internal) ──

    .post("/certificates/issue/:transactionId", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any

      // Find the enrollment transaction
      const enrollment = await db.select().from(transactions).where(
        and(eq(transactions.id, params.transactionId), eq(transactions.organizationId, actor.orgId)),
      ).limit(1)

      if (!enrollment[0]) {
        set.status = 404
        return { error: "Enrollment not found" }
      }

      // Get course via transaction line
      const line = await db.select().from(transactionLines).where(
        eq(transactionLines.transactionId, params.transactionId),
      ).limit(1)

      if (!line[0]?.itemId) {
        set.status = 400
        return { error: "Course not found in enrollment" }
      }

      const itemId = line[0].itemId

      // Check course detail for certificate template
      const detail = await db.select().from(lmsCourseDetail).where(
        and(eq(lmsCourseDetail.itemId, itemId), eq(lmsCourseDetail.organizationId, actor.orgId)),
      ).limit(1)

      // No certificate template — don't issue
      if (!detail[0]?.certificateTemplateId) {
        return { skipped: true, reason: "No certificate template configured" }
      }

      // Guard: don't double-issue
      const existing = await db.select().from(lmsCertificate).where(
        eq(lmsCertificate.transactionId, params.transactionId),
      ).limit(1)

      if (existing[0]) {
        return { skipped: true, reason: "Certificate already issued" }
      }

      // Generate unique certificate number
      let certificateNo = generateCertificateNo()
      let retries = 0
      while (retries < 5) {
        const dup = await db.select().from(lmsCertificate).where(
          eq(lmsCertificate.certificateNo, certificateNo),
        ).limit(1)
        if (!dup[0]) break
        certificateNo = generateCertificateNo()
        retries++
      }

      const verificationCode = certificateNo

      // Issue certificate
      const [cert] = await db.insert(lmsCertificate).values({
        id: `crt_${generateId().slice(0, 20)}`,
        organizationId: actor.orgId,
        itemId,
        transactionId: params.transactionId,
        personId: enrollment[0].personId ?? "",
        issuedAt: new Date(),
        certificateNo,
        verificationCode,
        templateId: detail[0].certificateTemplateId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        meta: {},
      }).returning()

      return {
        id: cert?.id,
        certificateNo,
        verificationCode,
        issuedAt: cert?.issuedAt,
      }
    })

    // ── Get Certificate ──

    .get("/certificates/:id", async (ctx) => {
      const actor = getActor(ctx)
      const { params, set } = ctx as any

      const cert = await db.select().from(lmsCertificate).where(
        and(eq(lmsCertificate.id, params.id), eq(lmsCertificate.organizationId, actor.orgId)),
      ).limit(1)

      if (!cert[0]) {
        set.status = 404
        return { error: "Certificate not found" }
      }

      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      const isOwner = cert[0].personId === personId
      if (!isOwner && !hasPermission(actor, "certificate:read")) {
        set.status = 403
        return { error: "FORBIDDEN" }
      }

      // Resolve names
      const person = await db.select().from(persons).where(eq(persons.id, cert[0].personId)).limit(1)
      const course = await db.select().from(catItems).where(eq(catItems.id, cert[0].itemId)).limit(1)

      return {
        id: cert[0].id,
        certificateNo: cert[0].certificateNo,
        verificationCode: cert[0].verificationCode,
        learnerName: person[0] ? `${person[0].firstName ?? ""} ${person[0].lastName ?? ""}`.trim() : null,
        courseTitle: course[0]?.name ?? null,
        issuedAt: cert[0].issuedAt,
        expiresAt: cert[0].expiresAt,
        isRevoked: cert[0].isRevoked,
        pdfUrl: cert[0].pdfUrl,
      }
    })

    // ── Public Verify ──

    .get("/verify/:code", async (ctx) => {
      const { params, set } = ctx as any
      const code = (params.code as string).toUpperCase()

      const cert = await db.select().from(lmsCertificate).where(
        eq(lmsCertificate.verificationCode, code),
      ).limit(1)

      if (!cert[0]) {
        return { valid: false, error: "Certificate not found" }
      }

      if (cert[0].isRevoked) {
        return { valid: false, error: "Certificate has been revoked" }
      }

      if (cert[0].expiresAt && cert[0].expiresAt < new Date()) {
        return { valid: false, error: "Certificate has expired" }
      }

      const person = await db.select().from(persons).where(eq(persons.id, cert[0].personId)).limit(1)
      const course = await db.select().from(catItems).where(eq(catItems.id, cert[0].itemId)).limit(1)

      return {
        valid: true,
        certificate: {
          certificateNo: cert[0].certificateNo,
          learnerName: person[0] ? `${person[0].firstName ?? ""} ${person[0].lastName ?? ""}`.trim() : null,
          courseTitle: course[0]?.name ?? null,
          issuedAt: cert[0].issuedAt,
          expiresAt: cert[0].expiresAt,
        },
      }
    })

    // ── Revoke Certificate ──

    .post("/admin/certificates/:id/revoke", async (ctx) => {
      const actor = getActor(ctx)
      if (!hasPermission(actor, "certificate:revoke")) {
        ;(ctx as any).set.status = 403
        return { error: "FORBIDDEN" }
      }

      const { params, body, set } = ctx as any

      const cert = await db.select().from(lmsCertificate).where(
        and(eq(lmsCertificate.id, params.id), eq(lmsCertificate.organizationId, actor.orgId)),
      ).limit(1)

      if (!cert[0]) {
        set.status = 404
        return { error: "Certificate not found" }
      }

      if (cert[0].isRevoked) {
        set.status = 400
        return { error: "Certificate already revoked" }
      }

      await db.update(lmsCertificate).set({
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(lmsCertificate.id, params.id))

      return { id: params.id, revoked: true }
    }, {
      body: t.Object({
        reason: t.Optional(t.String()),
      }),
    })

    // ── Learner: List Own Certificates ──

    .get("/learner/certificates", async (ctx) => {
      const actor = getActor(ctx)
      const personId = await getPersonIdFromActor(actor.id, actor.orgId)
      if (!personId) {
        ;(ctx as any).set.status = 404
        return { error: "Learner profile not found" }
      }

      const certs = await db.select().from(lmsCertificate).where(
        and(
          eq(lmsCertificate.personId, personId),
          eq(lmsCertificate.organizationId, actor.orgId),
          eq(lmsCertificate.isRevoked, false),
        ),
      ).orderBy(desc(lmsCertificate.issuedAt))

      const itemIds = certs.map((c) => c.itemId)
      const courses = itemIds.length > 0
        ? await db.select().from(catItems).where(inArray(catItems.id, itemIds))
        : []
      const courseMap = new Map(courses.map((c) => [c.id, c.name]))

      return {
        certificates: certs.map((c) => ({
          id: c.id,
          courseTitle: courseMap.get(c.itemId) ?? null,
          certificateNo: c.certificateNo,
          verificationCode: c.verificationCode,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
          isExpired: c.expiresAt ? c.expiresAt < new Date() : false,
          pdfUrl: c.pdfUrl,
          verifyUrl: `/lms/verify/${c.verificationCode}`,
        })),
      }
    })
}
