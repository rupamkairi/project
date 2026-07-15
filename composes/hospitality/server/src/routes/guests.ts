import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { persons, parties } from '@db/schema/party'
import { hspReservation } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count, ilike, or } from 'drizzle-orm'
import { requirePermission, isManager, isGuest } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createGuestsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/guests' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'guest:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      const conds = [
        eq(persons.organizationId, actor.orgId),
        eq(persons.type, 'guest'),
        isNull(persons.deletedAt),
      ]
      if (q.search)
        conds.push(
          or(
            ilike(persons.email, `%${q.search}%`),
            ilike(persons.firstName, `%${q.search}%`),
            ilike(persons.lastName, `%${q.search}%`),
          )!,
        )

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(persons)
          .where(and(...conds))
          .orderBy(desc(persons.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(persons)
          .where(and(...conds)),
      ])

      return listResponse(items.map(shapeGuest), c?.value ?? 0, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'guest:read')
      const { id } = (ctx as any).params
      const [person] = await db
        .select()
        .from(persons)
        .where(
          and(
            eq(persons.id, id),
            eq(persons.organizationId, actor.orgId),
            eq(persons.type, 'guest'),
            isNull(persons.deletedAt),
          ),
        )
        .limit(1)
      if (!person) {
        ;(ctx as any).set.status = 404
        return { error: 'Guest not found' }
      }

      // Get stay history
      const stayHistory = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            eq(hspReservation.personId, id),
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
          ),
        )
        .orderBy(desc(hspReservation.checkIn))
        .limit(20)
      return { ...shapeGuest(person), stayHistory }
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'guest:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()

      let partyId = body.partyId ?? null
      if (!partyId && body.companyName) {
        const [p] = await db
          .insert(parties)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            type: 'company',
            name: body.companyName,
            domain: body.domain ?? null,
            industry: body.industry ?? null,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning({ id: parties.id })
        partyId = p?.id ?? null
      }

      const [person] = await db
        .insert(persons)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          type: 'guest',
          firstName: body.firstName ?? null,
          lastName: body.lastName ?? null,
          email: body.email ?? null,
          phone: body.phone ?? null,
          source: body.source ?? null,
          partyId,
          actorId: null,
          meta: {
            preferences: body.preferences ?? {},
            specialRequests: body.specialRequests,
            companionIds: body.companionIds ?? [],
            identityDocuments: body.identityDocuments ?? [],
            nationality: body.nationality,
            dateOfBirth: body.dateOfBirth,
            vipStatus: body.vipStatus ?? null,
            notes: body.notes,
          },
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return shapeGuest(person!)
    })
    .patch('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'guest:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db
        .select()
        .from(persons)
        .where(
          and(
            eq(persons.id, id),
            eq(persons.organizationId, actor.orgId),
            isNull(persons.deletedAt),
          ),
        )
        .limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Guest not found' }
      }

      const meta = { ...(existing.meta ?? {}) }
      const metaKeys = [
        'preferences',
        'specialRequests',
        'companionIds',
        'identityDocuments',
        'nationality',
        'dateOfBirth',
        'vipStatus',
        'notes',
      ]
      for (const k of metaKeys) if (body[k] !== undefined) meta[k] = body[k]

      const [updated] = await db
        .update(persons)
        .set({
          firstName: body.firstName ?? existing.firstName,
          lastName: body.lastName ?? existing.lastName,
          email: body.email ?? existing.email,
          phone: body.phone ?? existing.phone,
          partyId: body.partyId ?? existing.partyId,
          meta,
          updatedAt: new Date(),
        })
        .where(eq(persons.id, id))
        .returning()
      return shapeGuest(updated!)
    })
    .delete('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'guest:delete')
      const { id } = (ctx as any).params
      await db.update(persons).set({ deletedAt: new Date() }).where(eq(persons.id, id))
      return { success: true }
    })
    .get('/:id/stays', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'guest:read')
      const { id } = (ctx as any).params
      const stays = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            eq(hspReservation.personId, id),
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
          ),
        )
        .orderBy(desc(hspReservation.checkIn))
      return listResponse(stays, stays.length, 1, 100)
    })
}

function shapeGuest(person: any) {
  const meta = person.meta ?? {}
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    phone: person.phone,
    source: person.source,
    partyId: person.partyId,
    preferences: meta.preferences ?? {},
    specialRequests: meta.specialRequests,
    companionIds: meta.companionIds ?? [],
    identityDocuments: meta.identityDocuments ?? [],
    nationality: meta.nationality,
    dateOfBirth: meta.dateOfBirth,
    vipStatus: meta.vipStatus,
    notes: meta.notes,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
  }
}
