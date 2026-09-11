import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { rstPartners } from '../db/schema/restaurant.js'
import { and, eq } from 'drizzle-orm'

export function createPartnerRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/partners' })
    .get('/', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const partnerType = url.searchParams.get('type')
      const outletId = url.searchParams.get('outletId')
      const where: any[] = [eq(rstPartners.organizationId, session.orgId)]
      if (partnerType) where.push(eq(rstPartners.partnerType, partnerType))
      const partners = await db.query.rstPartners.findMany({
        where: and(...where),
        orderBy: (t, { asc }) => [asc(t.name)],
      })
      return { data: partners }
    })

    .post('/', async ({ body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [partner] = await db
        .insert(rstPartners)
        .values({
          id: generateId(),
          organizationId: session.orgId,
          partyId: input.partyId,
          partnerType: input.partnerType,
          name: input.name,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          platform: input.platform,
          storeId: input.storeId,
          agreementNotes: input.agreementNotes,
          commissionPct: input.commissionPct,
          serviceAreas: input.serviceAreas ?? [],
          handoffMethod: input.handoffMethod ?? 'manual',
          apiKeyHash: input.apiKeyHash,
          isActive: true,
        })
        .returning()
      return { data: partner }
    })

    .patch('/:id', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const existing = await db.query.rstPartners.findFirst({
        where: and(eq(rstPartners.id, params.id), eq(rstPartners.organizationId, session.orgId)),
      })
      if (!existing)
        return new Response(JSON.stringify({ message: 'Partner not found' }), { status: 404 })

      const [updated] = await db
        .update(rstPartners)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(rstPartners.id, params.id))
        .returning()
      return { data: updated }
    })

    .post('/:id/toggle', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [updated] = await db
        .update(rstPartners)
        .set({ isActive: input.active, updatedAt: new Date() })
        .where(eq(rstPartners.id, params.id))
        .returning()
      return { data: updated }
    })
}
