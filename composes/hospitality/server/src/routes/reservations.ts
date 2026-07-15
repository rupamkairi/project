import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { persons } from '@db/schema/party'
import { locations } from '@db/schema/location'
import { hspReservation, hspReservationRoom, hspRoomStatusHistory } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count, ilike, or, gte, lte, lt, inArray } from 'drizzle-orm'
import { requirePermission, isManager, isOperational } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

let counter = 0

function generateReservationNumber(): string {
  counter++
  const prefix = 'RES'
  const num = String(counter).padStart(6, '0')
  return `${prefix}${num}`
}

export function createReservationsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/reservations' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      const conds = [
        eq(hspReservation.organizationId, actor.orgId),
        isNull(hspReservation.deletedAt),
      ]
      if (q.propertyId) conds.push(eq(hspReservation.propertyId, String(q.propertyId)))
      if (q.status) conds.push(eq(hspReservation.status, String(q.status)))
      if (q.fromDate) conds.push(gte(hspReservation.checkIn, String(q.fromDate)))
      if (q.toDate) conds.push(lte(hspReservation.checkOut, String(q.toDate)))
      if (q.search) {
        conds.push(ilike(hspReservation.reservationNumber, `%${q.search}%`)!)
      }
      if (q.groupId) conds.push(eq(hspReservation.groupId, String(q.groupId)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(hspReservation)
          .where(and(...conds))
          .orderBy(desc(hspReservation.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(hspReservation)
          .where(and(...conds)),
      ])

      return listResponse(items.map(shapeReservation), c?.value ?? 0, page, limit)
    })
    .get('/availability', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:read')
      const q = (ctx as any).query ?? {}
      const fromDate = String(q.fromDate ?? '')
      const toDate = String(q.toDate ?? '')
      const propertyId = String(q.propertyId ?? '')
      if (!fromDate || !toDate || !propertyId)
        return { error: 'fromDate, toDate, propertyId required' }

      // Find all rooms in property, exclude those blocked/out-of-order
      const rooms = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, actor.orgId),
            eq(locations.type, 'room'),
            isNull(locations.deletedAt),
            eq(locations.parentId, propertyId),
          ),
        )

      // Find overlapping reservations to exclude occupied rooms
      const overlapping = await db
        .select({ roomLocationId: hspReservationRoom.assignedRoomId })
        .from(hspReservationRoom)
        .innerJoin(hspReservation, eq(hspReservation.id, hspReservationRoom.reservationId))
        .where(
          and(
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
            inArray(hspReservation.status, ['confirmed', 'hold']),
            lt(hspReservation.checkIn, toDate),
            gte(hspReservation.checkOut, fromDate),
            isNull(hspReservationRoom.deletedAt),
          ),
        )

      const bookedIds = new Set(overlapping.map((r) => r.roomLocationId).filter(Boolean))
      const available = rooms.filter((r) => {
        const s = (r.meta as any)?.status ?? 'available'
        return (
          s === 'available' &&
          !bookedIds.has(r.id) &&
          s !== 'out-of-order' &&
          s !== 'blocked' &&
          s !== 'dirty'
        )
      })

      return {
        available: available.length,
        rooms: available.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          roomTypeItemId: (r.meta as any)?.roomTypeItemId,
        })),
        fromDate,
        toDate,
      }
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:read')
      const { id } = (ctx as any).params
      const [reservation] = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            eq(hspReservation.id, id),
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
          ),
        )
        .limit(1)
      if (!reservation) {
        ;(ctx as any).set.status = 404
        return { error: 'Reservation not found' }
      }

      const rooms = await db
        .select()
        .from(hspReservationRoom)
        .where(and(eq(hspReservationRoom.reservationId, id), isNull(hspReservationRoom.deletedAt)))
      return { ...shapeReservation(reservation), rooms }
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const reservationId = generateId()

      const [reservation] = await db
        .insert(hspReservation)
        .values({
          id: reservationId,
          organizationId: actor.orgId,
          reservationNumber: generateReservationNumber(),
          propertyId: body.propertyId,
          personId: body.personId,
          partyId: body.partyId ?? null,
          bookingId: body.bookingId ?? null,
          status: body.status ?? (body.holdExpiresAt ? 'hold' : 'confirmed'),
          holdExpiresAt: body.holdExpiresAt ? new Date(body.holdExpiresAt) : null,
          source: body.source ?? 'direct',
          channelPartnerId: body.channelPartnerId ?? null,
          groupId: body.groupId ?? null,
          groupName: body.groupName ?? null,
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          guestCount: body.guestCount ?? 1,
          adultCount: body.adultCount ?? 1,
          childCount: body.childCount ?? 0,
          confirmedAt: body.status === 'confirmed' ? now : null,
          arrivalTime: body.arrivalTime ?? null,
          departureTime: body.departureTime ?? null,
          specialRequests: body.specialRequests ?? null,
          notes: body.notes ?? null,
          createdByActorId: actor.id,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: body.meta ?? {},
        })
        .returning()

      // Create reservation-room links
      if (body.rooms && Array.isArray(body.rooms)) {
        for (const rr of body.rooms) {
          await db.insert(hspReservationRoom).values({
            id: generateId(),
            organizationId: actor.orgId,
            reservationId,
            roomLocationId: rr.roomLocationId ?? null,
            roomTypeItemId: rr.roomTypeItemId,
            ratePlanId: rr.ratePlanId ?? null,
            roomCount: rr.roomCount ?? 1,
            dailyRate: rr.dailyRate ?? null,
            status: rr.status ?? 'pending',
            assignedRoomId: rr.assignedRoomId ?? null,
            assignedAt: rr.assignedRoomId ? now : null,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
        }
      }

      ;(ctx as any).set.status = 201
      return shapeReservation(reservation!)
    })
    .patch('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            eq(hspReservation.id, id),
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
          ),
        )
        .limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Reservation not found' }
      }

      const upd: Record<string, any> = {}
      const scalarFields = [
        'checkIn',
        'checkOut',
        'guestCount',
        'adultCount',
        'childCount',
        'specialRequests',
        'notes',
        'arrivalTime',
        'departureTime',
        'partyId',
      ]
      for (const f of scalarFields) if (body[f] !== undefined) upd[f] = body[f]
      if (body.status) upd.status = body.status

      const [updated] = await db
        .update(hspReservation)
        .set({ ...upd, updatedAt: new Date() })
        .where(eq(hspReservation.id, id))
        .returning()
      return shapeReservation(updated!)
    })
    .post('/:id/cancel', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:cancel')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const now = new Date()

      const [res] = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            eq(hspReservation.id, id),
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
          ),
        )
        .limit(1)
      if (!res) {
        ;(ctx as any).set.status = 404
        return { error: 'Reservation not found' }
      }

      await db
        .update(hspReservation)
        .set({
          status: 'cancelled',
          cancelledAt: now,
          cancellationReason: body.reason ?? null,
          updatedAt: now,
        })
        .where(eq(hspReservation.id, id))

      return { id, status: 'cancelled', cancelledAt: now }
    })
    .post('/:id/checkin', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:checkin')
      const { id } = (ctx as any).params
      const now = new Date()

      const [res] = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            eq(hspReservation.id, id),
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
          ),
        )
        .limit(1)
      if (!res) {
        ;(ctx as any).set.status = 404
        return { error: 'Reservation not found' }
      }
      if (res.status !== 'confirmed' && res.status !== 'hold') {
        ;(ctx as any).set.status = 400
        return { error: 'Reservation must be confirmed before check-in' }
      }

      await db
        .update(hspReservation)
        .set({ checkedInAt: now, status: 'confirmed', updatedAt: now })
        .where(eq(hspReservation.id, id))

      return { id, status: 'confirmed', checkedInAt: now }
    })
    .post('/:id/checkout', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:checkout')
      const { id } = (ctx as any).params
      const now = new Date()

      const [res] = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            eq(hspReservation.id, id),
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
          ),
        )
        .limit(1)
      if (!res) {
        ;(ctx as any).set.status = 404
        return { error: 'Reservation not found' }
      }

      await db
        .update(hspReservation)
        .set({ checkedOutAt: now, status: 'checked_out', updatedAt: now })
        .where(eq(hspReservation.id, id))

      // Mark rooms dirty
      const rooms = await db
        .select()
        .from(hspReservationRoom)
        .where(and(eq(hspReservationRoom.reservationId, id), isNull(hspReservationRoom.deletedAt)))
      for (const room of rooms) {
        if (room.assignedRoomId) {
          await db
            .update(locations)
            .set({ meta: { ...((locations.meta as any) ?? {}), status: 'dirty' }, updatedAt: now })
            .where(eq(locations.id, room.assignedRoomId))
          await db.insert(hspRoomStatusHistory).values({
            id: generateId(),
            organizationId: actor.orgId,
            roomLocationId: room.assignedRoomId,
            status: 'dirty',
            previousStatus: 'occupied',
            changedByActorId: actor.id,
            reason: `Checkout ${id}`,
            reservationId: id,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
        }
      }

      return { id, status: 'checked_out', checkedOutAt: now }
    })
    .post('/:id/assign-room', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:assign')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const now = new Date()

      const [rr] = await db
        .select()
        .from(hspReservationRoom)
        .where(
          and(
            eq(hspReservationRoom.id, body.reservationRoomId),
            eq(hspReservationRoom.reservationId, id),
            isNull(hspReservationRoom.deletedAt),
          ),
        )
        .limit(1)
      if (!rr) {
        ;(ctx as any).set.status = 404
        return { error: 'Reservation room not found' }
      }

      await db
        .update(hspReservationRoom)
        .set({
          assignedRoomId: body.roomLocationId,
          assignedAt: now,
          status: 'assigned',
          updatedAt: now,
        })
        .where(eq(hspReservationRoom.id, rr.id))

      if (body.roomLocationId) {
        await db
          .update(locations)
          .set({ meta: { ...((locations.meta as any) ?? {}), status: 'reserved' }, updatedAt: now })
          .where(eq(locations.id, body.roomLocationId))
        await db.insert(hspRoomStatusHistory).values({
          id: generateId(),
          organizationId: actor.orgId,
          roomLocationId: body.roomLocationId,
          status: 'reserved',
          previousStatus: 'available',
          changedByActorId: actor.id,
          reason: `Assigned to reservation ${id}`,
          reservationId: id,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
      }

      return { reservationRoomId: rr.id, assignedRoomId: body.roomLocationId, assignedAt: now }
    })
    .get('/:id/rooms', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:read')
      const { id } = (ctx as any).params
      const rooms = await db
        .select()
        .from(hspReservationRoom)
        .where(and(eq(hspReservationRoom.reservationId, id), isNull(hspReservationRoom.deletedAt)))
      return listResponse(rooms, rooms.length, 1, 100)
    })
    .post('/:id/extend', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}

      const [res] = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            eq(hspReservation.id, id),
            eq(hspReservation.organizationId, actor.orgId),
            isNull(hspReservation.deletedAt),
          ),
        )
        .limit(1)
      if (!res) {
        ;(ctx as any).set.status = 404
        return { error: 'Reservation not found' }
      }

      await db
        .update(hspReservation)
        .set({
          extendedToDate: body.newCheckOut,
          checkOut: body.newCheckOut,
          updatedAt: new Date(),
        })
        .where(eq(hspReservation.id, id))
      return { id, extendedToDate: body.newCheckOut }
    })
    .post('/:id/early-departure', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:update')
      const { id } = (ctx as any).params
      const now = new Date()
      await db
        .update(hspReservation)
        .set({ earlyDepartureAt: now, checkOut: now.toISOString().split('T')[0], updatedAt: now })
        .where(eq(hspReservation.id, id))
      return { id, earlyDepartureAt: now }
    })
    .post('/:id/no-show', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'reservation:update')
      const { id } = (ctx as any).params
      const now = new Date()
      await db
        .update(hspReservation)
        .set({ status: 'no_show', noShowAt: now, updatedAt: now })
        .where(eq(hspReservation.id, id))
      return { id, status: 'no_show', noShowAt: now }
    })
}

function shapeReservation(r: any) {
  return {
    id: r.id,
    reservationNumber: r.reservationNumber,
    propertyId: r.propertyId,
    personId: r.personId,
    partyId: r.partyId,
    status: r.status,
    source: r.source,
    channelPartnerId: r.channelPartnerId,
    groupId: r.groupId,
    groupName: r.groupName,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    guestCount: r.guestCount,
    adultCount: r.adultCount,
    childCount: r.childCount,
    holdExpiresAt: r.holdExpiresAt,
    confirmedAt: r.confirmedAt,
    cancelledAt: r.cancelledAt,
    cancellationReason: r.cancellationReason,
    checkedInAt: r.checkedInAt,
    checkedOutAt: r.checkedOutAt,
    noShowAt: r.noShowAt,
    extendedToDate: r.extendedToDate,
    earlyDepartureAt: r.earlyDepartureAt,
    arrivalTime: r.arrivalTime,
    departureTime: r.departureTime,
    specialRequests: r.specialRequests,
    notes: r.notes,
    createdAt: r.createdAt,
  }
}
