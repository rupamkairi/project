import { Elysia } from 'elysia'
import { eq } from 'drizzle-orm'
import { db } from '@db/client'
import { taxTemplates, taxRates } from '@db/schema/tax'
import type { Mediator } from '@core'

export function createTaxRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/tax' })
    .get('/profiles', async () => {
      const results = await db.select().from(taxTemplates)
      return { data: results }
    })
    .post('/profiles', async ({ body }) => {
      const result = await db
        .insert(taxTemplates)
        .values({ ...body, id: crypto.randomUUID(), organizationId: '', meta: {}, version: 1 })
        .returning()
      return result[0]
    })
    .get('/profiles/:id/rates', async ({ params }) => {
      const results = await db.select().from(taxRates).where(eq(taxRates.templateId, params.id))
      return { data: results }
    })
    .post('/profiles/:id/rates', async ({ params, body }) => {
      const input = body as any
      const result = await db
        .insert(taxRates)
        .values({
          name: input.name,
          jurisdiction: input.jurisdiction,
          productType: input.productType,
          isDefault: input.isDefault ?? false,
          rateBps: input.rateBps ?? Math.round(Number(input.rate ?? 0) * 100),
          templateId: params.id,
          id: crypto.randomUUID(),
          organizationId: '',
          meta: {},
          version: 1,
        })
        .returning()
      return result[0]
    })
    .patch('/rates/:rateId', async ({ params, body }) => {
      const result = await db
        .update(taxRates)
        .set(body as any)
        .where(eq(taxRates.id, params.rateId))
        .returning()
      return result[0]
    })
    .delete('/rates/:rateId', async ({ params }) => {
      await db.delete(taxRates).where(eq(taxRates.id, params.rateId))
      return { success: true }
    })
}
