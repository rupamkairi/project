import { Elysia, t } from "elysia"
import type { Mediator } from "@core"
import { generateId } from "@core"
import { db } from "@db/client"
import { and, eq } from "drizzle-orm"
import { lmsPaymentEvent } from "../db/schema/lms"
import { transactions } from "@db/schema/commerce"
import { pipelines, pipelineStages } from "@db/schema/pipeline"

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

export function createWebhookRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "" })

    // ── Stripe Webhook Handler (idempotent) ──

    .post("/stripe/webhook", async (ctx) => {
      const { body, set } = ctx as any
      const event = body as {
        id: string
        type: string
        data?: { object?: { id?: string; metadata?: Record<string, unknown> } }
      }

      // Idempotency guard: skip if already processed
      const existingEvent = await db.select().from(lmsPaymentEvent).where(
        eq(lmsPaymentEvent.stripeEventId, event.id),
      ).limit(1)

      if (existingEvent.length > 0) {
        return { received: true, processed: true }
      }

      // Handle event types
      switch (event.type) {
        case "checkout.session.completed":
        case "payment_intent.succeeded": {
          const metadata = event.data?.object?.metadata ?? {}
          const transactionId = metadata.transactionId as string

          if (transactionId) {
            const txn = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1)
            if (txn[0]) {
              const inProgressStageId = await getStageId(txn[0].organizationId, "lms.enrollment", "In Progress")
              if (inProgressStageId) {
                await db.update(transactions).set({ stageId: inProgressStageId, updatedAt: new Date() })
                  .where(eq(transactions.id, transactionId))
              }

              // Record idempotency
              await db.insert(lmsPaymentEvent).values({
                id: `pay_evt_${generateId().slice(0, 20)}`,
                organizationId: txn[0].organizationId,
                stripeEventId: event.id,
                eventType: event.type,
                transactionId,
                processed: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
              })
            }
          }
          break
        }

        case "payment_intent.payment_failed": {
          const metadata = event.data?.object?.metadata ?? {}
          const transactionId = metadata.transactionId as string
          if (transactionId) {
            const txn = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1)
            if (txn[0]) {
              await db.insert(lmsPaymentEvent).values({
                id: `pay_evt_${generateId().slice(0, 20)}`,
                organizationId: txn[0].organizationId,
                stripeEventId: event.id,
                eventType: event.type,
                transactionId,
                processed: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
              })
            }
          }
          break
        }

        default:
          // Record unknown events for audit
          await db.insert(lmsPaymentEvent).values({
            id: `pay_evt_${generateId().slice(0, 20)}`,
            organizationId: "unknown",
            stripeEventId: event.id,
            eventType: event.type,
            processed: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          })
      }

      return { received: true }
    }, {
      body: t.Object({
        id: t.String(),
        type: t.String(),
        data: t.Optional(t.Object({
          object: t.Optional(t.Object({
            id: t.Optional(t.String()),
            metadata: t.Optional(t.Record(t.String(), t.Unknown())),
          })),
        })),
      }),
    })
}
