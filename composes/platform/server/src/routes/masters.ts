import Elysia, { t } from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import type { AuthActor } from '@projectx/plugin-auth-server'

function pageParams(q: Record<string, unknown>) {
  const page = parseInt(String(q.page ?? '')) || 1
  const limit = parseInt(String(q.limit ?? '')) || 20
  return { page, limit, offset: (page - 1) * limit }
}

function listBody<T>(items: T[], total: number, page: number, limit: number) {
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

function emptyToUndef(value: unknown) {
  if (value === '' || value === null) return undefined
  return value
}

export function createMastersRoutes(mediator: Mediator) {
  return new Elysia()
    .use(personRoutes(mediator))
    .use(partyRoutes(mediator))
    .use(locationRoutes(mediator))
    .use(transactionRoutes(mediator))
    .use(pipelineRoutes(mediator))
    .use(activityRoutes(mediator))
}

function dispatch(
  mediator: Mediator,
  actor: AuthActor,
  type: string,
  payload: Record<string, unknown>,
) {
  return mediator.dispatch({
    type,
    payload,
    actorId: actor.id,
    orgId: actor.orgId,
    correlationId: generateId(),
  })
}

function query<T>(
  mediator: Mediator,
  actor: AuthActor,
  type: string,
  params: Record<string, unknown>,
) {
  return mediator.query<T>({
    type,
    params,
    actorId: actor.id,
    orgId: actor.orgId,
  })
}

function personRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/persons' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const q = ((ctx as any).query ?? {}) as Record<string, unknown>
      const { page, limit, offset } = pageParams(q)
      const result = await query<{ items: any[]; total: number }>(mediator, actor, 'party.listPersons', {
        limit,
        offset,
        type: emptyToUndef(q.type),
      })
      return listBody(result.items, result.total, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const row = await query<any>(mediator, actor, 'party.getPerson', { id })
      if (!row) {
        ;(ctx as any).set.status = 404
        return { error: 'Person not found' }
      }
      return row
    })
    .post(
      '/',
      async (ctx) => {
        const actor = (ctx as any).actor as AuthActor
        const body = (ctx as any).body as Record<string, unknown>
        try {
          return await dispatch(mediator, actor, 'party.createPerson', {
            type: body.type,
            firstName: emptyToUndef(body.firstName),
            lastName: emptyToUndef(body.lastName),
            email: emptyToUndef(body.email),
            phone: emptyToUndef(body.phone),
            source: emptyToUndef(body.source),
            partyId: emptyToUndef(body.partyId),
          })
        } catch (err) {
          ;(ctx as any).set.status = 400
          return { error: err instanceof Error ? err.message : 'Failed to create person' }
        }
      },
      {
        body: t.Object({
          type: t.Optional(t.String()),
          firstName: t.Optional(t.String()),
          lastName: t.Optional(t.String()),
          email: t.Optional(t.String()),
          phone: t.Optional(t.String()),
          source: t.Optional(t.String()),
          partyId: t.Optional(t.String()),
        }),
      },
    )
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'party.updatePerson', { id, ...body })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to update person' }
      }
    })
    .delete('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      await dispatch(mediator, actor, 'party.deletePerson', { id })
      return { success: true }
    })
}

function partyRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/parties' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const q = ((ctx as any).query ?? {}) as Record<string, unknown>
      const { page, limit, offset } = pageParams(q)
      const result = await query<{ items: any[]; total: number }>(mediator, actor, 'party.listParties', {
        limit,
        offset,
        type: emptyToUndef(q.type),
      })
      return listBody(result.items, result.total, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const row = await query<any>(mediator, actor, 'party.getParty', { id })
      if (!row) {
        ;(ctx as any).set.status = 404
        return { error: 'Party not found' }
      }
      return row
    })
    .post(
      '/',
      async (ctx) => {
        const actor = (ctx as any).actor as AuthActor
        const body = (ctx as any).body as Record<string, unknown>
        try {
          return await dispatch(mediator, actor, 'party.createParty', {
            type: body.type,
            name: body.name,
            domain: emptyToUndef(body.domain),
            industry: emptyToUndef(body.industry),
            employeeCount: body.employeeCount,
          })
        } catch (err) {
          ;(ctx as any).set.status = 400
          return { error: err instanceof Error ? err.message : 'Failed to create party' }
        }
      },
      {
        body: t.Object({
          type: t.Optional(t.String()),
          name: t.String(),
          domain: t.Optional(t.String()),
          industry: t.Optional(t.String()),
          employeeCount: t.Optional(t.Number()),
        }),
      },
    )
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'party.updateParty', { id, ...body })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to update party' }
      }
    })
    .delete('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      await dispatch(mediator, actor, 'party.deleteParty', { id })
      return { success: true }
    })
}

function locationRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/locations' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const q = ((ctx as any).query ?? {}) as Record<string, unknown>
      const { page, limit, offset } = pageParams(q)
      const result = await query<{ items: any[]; total: number }>(mediator, actor, 'location.list', {
        limit,
        offset,
        type: emptyToUndef(q.type),
        status: emptyToUndef(q.status),
      })
      return listBody(result.items, result.total, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const row = await query<any>(mediator, actor, 'location.get', { id })
      if (!row) {
        ;(ctx as any).set.status = 404
        return { error: 'Location not found' }
      }
      return row
    })
    .post(
      '/',
      async (ctx) => {
        const actor = (ctx as any).actor as AuthActor
        const body = (ctx as any).body as Record<string, unknown>
        try {
          return await dispatch(mediator, actor, 'location.create', {
            type: body.type,
            name: body.name,
            code: emptyToUndef(body.code),
            capacity: body.capacity,
            parentId: emptyToUndef(body.parentId),
            status: emptyToUndef(body.status) ?? 'active',
          })
        } catch (err) {
          ;(ctx as any).set.status = 400
          return { error: err instanceof Error ? err.message : 'Failed to create location' }
        }
      },
      {
        body: t.Object({
          type: t.String(),
          name: t.String(),
          code: t.Optional(t.String()),
          capacity: t.Optional(t.Number()),
          parentId: t.Optional(t.String()),
          status: t.Optional(t.String()),
        }),
      },
    )
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'location.update', { id, ...body })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to update location' }
      }
    })
    .delete('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      await dispatch(mediator, actor, 'location.delete', { id })
      return { success: true }
    })
}

function transactionRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/transactions' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const q = ((ctx as any).query ?? {}) as Record<string, unknown>
      const { page, limit, offset } = pageParams(q)
      const result = await query<{ items: any[]; total: number }>(
        mediator,
        actor,
        'commerce.listTransactions',
        { limit, offset, type: emptyToUndef(q.type) },
      )
      return listBody(result.items, result.total, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const row = await query<any>(mediator, actor, 'commerce.getTransaction', { id })
      if (!row) {
        ;(ctx as any).set.status = 404
        return { error: 'Transaction not found' }
      }
      return row
    })
    .post(
      '/',
      async (ctx) => {
        const actor = (ctx as any).actor as AuthActor
        const body = (ctx as any).body as Record<string, unknown>
        try {
          return await dispatch(mediator, actor, 'commerce.createTransaction', {
            type: body.type,
            referenceNo: emptyToUndef(body.referenceNo),
            personId: emptyToUndef(body.personId),
            partyId: emptyToUndef(body.partyId),
            stageId: emptyToUndef(body.stageId),
            currency: emptyToUndef(body.currency) ?? 'USD',
            taxAmount: body.taxAmount,
            lines: body.lines ?? [],
          })
        } catch (err) {
          ;(ctx as any).set.status = 400
          return { error: err instanceof Error ? err.message : 'Failed to create transaction' }
        }
      },
      {
        body: t.Object({
          type: t.String(),
          referenceNo: t.Optional(t.String()),
          personId: t.Optional(t.String()),
          partyId: t.Optional(t.String()),
          stageId: t.Optional(t.String()),
          currency: t.Optional(t.String()),
          taxAmount: t.Optional(t.Number()),
          lines: t.Optional(
            t.Array(
              t.Object({
                itemId: t.Optional(t.String()),
                description: t.Optional(t.String()),
                qty: t.Optional(t.Number()),
                unitPriceAmount: t.Optional(t.Number()),
                currency: t.Optional(t.String()),
                taxRate: t.Optional(t.Number()),
              }),
            ),
          ),
        }),
      },
    )
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'commerce.updateTransaction', { id, ...body })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to update transaction' }
      }
    })
    .delete('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      await dispatch(mediator, actor, 'commerce.deleteTransaction', { id })
      return { success: true }
    })
    .post('/:id/lines', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'commerce.addLine', {
          transactionId: id,
          ...body,
        })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to add line' }
      }
    })
    .delete('/:id/lines/:lineId', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { lineId } = (ctx as any).params
      await dispatch(mediator, actor, 'commerce.removeLine', { id: lineId })
      return { success: true }
    })
}

function pipelineRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/pipelines' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const q = ((ctx as any).query ?? {}) as Record<string, unknown>
      const { page, limit, offset } = pageParams(q)
      const result = await query<{ items: any[]; total: number }>(mediator, actor, 'pipeline.list', {
        limit,
        offset,
        entityType: emptyToUndef(q.type) ?? emptyToUndef(q.entityType),
      })
      return listBody(result.items, result.total, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const row = await query<any>(mediator, actor, 'pipeline.get', { id })
      if (!row) {
        ;(ctx as any).set.status = 404
        return { error: 'Pipeline not found' }
      }
      const stages = await query<any[]>(mediator, actor, 'pipeline.getStages', { pipelineId: id })
      return { ...row, stages }
    })
    .post(
      '/',
      async (ctx) => {
        const actor = (ctx as any).actor as AuthActor
        const body = (ctx as any).body as Record<string, unknown>
        try {
          return await dispatch(mediator, actor, 'pipeline.create', {
            name: body.name,
            entityType: body.entityType,
            isDefault: body.isDefault ?? false,
            stages: body.stages ?? [],
          })
        } catch (err) {
          ;(ctx as any).set.status = 400
          return { error: err instanceof Error ? err.message : 'Failed to create pipeline' }
        }
      },
      {
        body: t.Object({
          name: t.String(),
          entityType: t.String(),
          isDefault: t.Optional(t.Boolean()),
          stages: t.Optional(t.Array(t.Object({ name: t.String() }))),
        }),
      },
    )
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'pipeline.update', { id, ...body })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to update pipeline' }
      }
    })
    .delete('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      await dispatch(mediator, actor, 'pipeline.delete', { id })
      return { success: true }
    })
    .post('/:id/stages', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'pipeline.addStage', {
          pipelineId: id,
          name: body.name,
          position: body.position,
        })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to add stage' }
      }
    })
    .patch('/:id/stages/:stageId', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { stageId } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'pipeline.updateStage', { id: stageId, ...body })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to update stage' }
      }
    })
    .delete('/:id/stages/:stageId', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { stageId } = (ctx as any).params
      await dispatch(mediator, actor, 'pipeline.removeStage', { id: stageId })
      return { success: true }
    })
    .post('/:id/stages/reorder', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as { order?: string[] }
      await dispatch(mediator, actor, 'pipeline.reorderStages', {
        pipelineId: id,
        order: body.order ?? [],
      })
      return { success: true }
    })
}

function activityRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/activities' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const q = ((ctx as any).query ?? {}) as Record<string, unknown>
      const { page, limit, offset } = pageParams(q)
      const result = await query<{ items: any[]; total: number }>(mediator, actor, 'activity.list', {
        limit,
        offset,
        type: emptyToUndef(q.type),
        status: emptyToUndef(q.status),
      })
      return listBody(result.items, result.total, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const row = await query<any>(mediator, actor, 'activity.get', { id })
      if (!row) {
        ;(ctx as any).set.status = 404
        return { error: 'Activity not found' }
      }
      return row
    })
    .post(
      '/',
      async (ctx) => {
        const actor = (ctx as any).actor as AuthActor
        const body = (ctx as any).body as Record<string, unknown>
        try {
          return await dispatch(mediator, actor, 'activity.log', {
            type: body.type,
            subject: emptyToUndef(body.subject),
            body: emptyToUndef(body.body),
            entityType: emptyToUndef(body.entityType),
            entityId: emptyToUndef(body.entityId),
            dueAt: body.dueAt ? new Date(String(body.dueAt)) : undefined,
          })
        } catch (err) {
          ;(ctx as any).set.status = 400
          return { error: err instanceof Error ? err.message : 'Failed to log activity' }
        }
      },
      {
        body: t.Object({
          type: t.String(),
          subject: t.Optional(t.String()),
          body: t.Optional(t.String()),
          entityType: t.Optional(t.String()),
          entityId: t.Optional(t.String()),
          dueAt: t.Optional(t.String()),
        }),
      },
    )
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      const body = ((ctx as any).body ?? {}) as Record<string, unknown>
      try {
        return await dispatch(mediator, actor, 'activity.update', {
          id,
          subject: emptyToUndef(body.subject),
          body: emptyToUndef(body.body),
          dueAt: body.dueAt ? new Date(String(body.dueAt)) : undefined,
        })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to update activity' }
      }
    })
    .delete('/:id', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      await dispatch(mediator, actor, 'activity.delete', { id })
      return { success: true }
    })
    .post('/:id/complete', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      try {
        return await dispatch(mediator, actor, 'activity.complete', { id })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to complete activity' }
      }
    })
    .post('/:id/cancel', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      const { id } = (ctx as any).params
      try {
        return await dispatch(mediator, actor, 'activity.cancel', { id })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Failed to cancel activity' }
      }
    })
}
