import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent, NotFoundError, ConflictError } from '@core'

export function createOutletRoutes(mediator: Mediator, bus: EventBus) {
  return (
    new Elysia({ prefix: '/outlets' })
      .get('/', async ({ request }) => {
        const session = (request as any).session
        const outlets = await mediator.query({
          type: 'location.list',
          params: { orgId: session.orgId, type: 'outlet' },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        return { data: outlets }
      })

      .get('/:id', async ({ params, request }) => {
        const session = (request as any).session
        const outlet = await mediator.query({
          type: 'location.get',
          params: { locationId: params.id },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        if (!outlet) throw new NotFoundError('Outlet not found')
        const tables = await mediator
          .query({
            type: 'location.list',
            params: { orgId: session.orgId, type: 'table', parentId: params.id },
            actorId: session.actorId,
            orgId: session.orgId,
          })
          .catch(() => [])
        return { data: { ...outlet, tables } }
      })

      .post('/', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const outlet = await mediator.dispatch({
          type: 'location.create',
          payload: {
            type: 'outlet',
            name: input.name,
            code: input.code,
            meta: {
              address: input.address,
              phone: input.phone,
              timezone: input.timezone ?? 'Asia/Kolkata',
              operatingHours: input.operatingHours ?? {
                monday: { open: '09:00', close: '22:00' },
                tuesday: { open: '09:00', close: '22:00' },
                wednesday: { open: '09:00', close: '22:00' },
                thursday: { open: '09:00', close: '22:00' },
                friday: { open: '09:00', close: '23:00' },
                saturday: { open: '09:00', close: '23:00' },
                sunday: { open: '09:00', close: '22:00' },
              },
              serviceModes: input.serviceModes ?? ['dine-in', 'takeaway', 'pickup'],
              taxSettings: input.taxSettings ?? {
                cgstPct: '2.5',
                sgstPct: '2.5',
                serviceChargePct: '0',
              },
              currency: input.currency ?? 'INR',
              currencySymbol: input.currencySymbol ?? '₹',
              printers: input.printers ?? [],
              kitchenStations: input.kitchenStations ?? [
                'general',
                'hot',
                'cold',
                'beverages',
                'bakery',
              ],
              receiptSettings: input.receiptSettings ?? {
                headerText: '',
                footerText: 'Thank you!',
                showTaxSplit: true,
              },
            },
          },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        return { data: outlet }
      })

      .patch('/:id', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const outlet = await mediator.dispatch({
          type: 'location.update',
          payload: { locationId: params.id, ...input },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        return { data: outlet }
      })

      .post('/:id/open', async ({ params, request }) => {
        const session = (request as any).session
        await mediator.dispatch({
          type: 'location.updateStatus',
          payload: { locationId: params.id, status: 'active' },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        await bus.publish(
          createDomainEvent(
            'rst.outlet.opened',
            params.id,
            'rst.outlet',
            { outletId: params.id, orgId: session.orgId },
            session.orgId,
          ),
        )
        return { data: { outletId: params.id, status: 'active' } }
      })

      .post('/:id/close', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        if (!input?.reason) throw new ConflictError('pauseReason required')
        await mediator.dispatch({
          type: 'location.updateStatus',
          payload: { locationId: params.id, status: 'inactive' },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        await bus.publish(
          createDomainEvent(
            'rst.outlet.closed',
            params.id,
            'rst.outlet',
            { outletId: params.id, orgId: session.orgId, reason: input.reason },
            session.orgId,
          ),
        )
        return { data: { outletId: params.id, status: 'inactive' } }
      })

      // ── Tables ──
      .get('/:id/tables', async ({ params, request }) => {
        const session = (request as any).session
        const tables = await mediator.query({
          type: 'location.list',
          params: { orgId: session.orgId, type: 'table', parentId: params.id },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        return { data: tables }
      })

      .post('/:id/tables', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const table = await mediator.dispatch({
          type: 'location.create',
          payload: {
            type: 'table',
            parentId: params.id,
            name: input.name,
            code: input.code ?? input.name,
            meta: {
              capacity: input.capacity ?? 4,
              section: input.section,
              shape: input.shape ?? 'rectangle',
              position: input.position ?? { x: 0, y: 0 },
              isActive: true,
            },
          },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        return { data: table }
      })

      .post('/:id/tables/bulk', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const created: any[] = []
        for (const t of input.tables) {
          const table = await mediator.dispatch({
            type: 'location.create',
            payload: {
              type: 'table',
              parentId: params.id,
              name: t.name,
              code: t.code ?? t.name,
              meta: {
                capacity: t.capacity ?? 4,
                section: t.section,
                shape: t.shape ?? 'rectangle',
                position: t.position ?? { x: 0, y: 0 },
                isActive: true,
              },
            },
            actorId: session.actorId,
            orgId: session.orgId,
            correlationId: generateId(),
          })
          created.push(table)
        }
        return { data: created }
      })
  )
}
