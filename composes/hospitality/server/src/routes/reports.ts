import Elysia from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { hspReservation, hspHousekeeping, hspReservationRoom } from '../db/schema/hospitality'
import { eq, and, isNull, gte, lte, sql, count } from 'drizzle-orm'
import { requirePermission } from '../permissions'
import { getActor } from './helpers'

export function createReportsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/reports' })
    .get('/occupancy', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'report:read')
      const q = (ctx as any).query ?? {}
      const fromDate = String(q.fromDate ?? '')
      const toDate = String(q.toDate ?? '')
      const propertyId = String(q.propertyId ?? '')

      const conds = [
        eq(hspReservation.organizationId, actor.orgId),
        isNull(hspReservation.deletedAt),
      ]
      if (propertyId) conds.push(eq(hspReservation.propertyId, propertyId))
      if (fromDate && toDate)
        conds.push(gte(hspReservation.checkIn, fromDate), lte(hspReservation.checkOut, toDate))

      const rooms = await db
        .select({
          roomLocationId: hspReservationRoom.assignedRoomId,
          status: hspReservation.status,
          checkIn: hspReservation.checkIn,
          checkOut: hspReservation.checkOut,
        })
        .from(hspReservationRoom)
        .innerJoin(hspReservation, eq(hspReservation.id, hspReservationRoom.reservationId))
        .where(
          and(
            ...conds.filter((c) => c !== undefined),
            isNull(hspReservationRoom.deletedAt),
            sql`${hspReservation.status} IN ('confirmed', 'checked_in', 'checked_out')`,
          ),
        )

      const occupiedRooms = rooms.filter((r) => r.roomLocationId).length
      return {
        totalRoomsBooked: rooms.length - rooms.filter((r) => !r.roomLocationId).length,
        occupiedRooms,
        period: { fromDate, toDate },
      }
    })

    .get('/revenue', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'report:read')
      const q = (ctx as any).query ?? {}
      const fromDate = String(q.fromDate ?? '')
      const toDate = String(q.toDate ?? '')
      const propertyId = String(q.propertyId ?? '')

      // Room revenue from reservation rooms daily rates
      const conds = [
        eq(hspReservation.organizationId, actor.orgId),
        isNull(hspReservation.deletedAt),
      ]
      if (propertyId) conds.push(eq(hspReservation.propertyId, propertyId))
      if (fromDate && toDate)
        conds.push(gte(hspReservation.checkIn, fromDate), lte(hspReservation.checkOut, toDate))

      const roomLines = await db
        .select({ dailyRate: hspReservationRoom.dailyRate, status: hspReservation.status })
        .from(hspReservationRoom)
        .innerJoin(hspReservation, eq(hspReservation.id, hspReservationRoom.reservationId))
        .where(
          and(
            ...conds,
            isNull(hspReservationRoom.deletedAt),
            sql`${hspReservation.status} IN ('confirmed', 'checked_in', 'checked_out')`,
          ),
        )

      let totalRoomRevenue = 0
      for (const r of roomLines) {
        if (r.dailyRate) {
          const rate = typeof r.dailyRate === 'object' ? ((r.dailyRate as any).amount ?? 0) : 0
          totalRoomRevenue += rate
        }
      }

      return {
        roomRevenue: totalRoomRevenue,
        period: { fromDate, toDate },
        bookingCount: roomLines.length,
      }
    })

    .get('/cancellations', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'report:read')
      const q = (ctx as any).query ?? {}
      const fromDate = String(q.fromDate ?? '')
      const toDate = String(q.toDate ?? '')
      const propertyId = String(q.propertyId ?? '')

      const conds = [
        eq(hspReservation.organizationId, actor.orgId),
        eq(hspReservation.status, 'cancelled'),
        isNull(hspReservation.deletedAt),
      ]
      if (propertyId) conds.push(eq(hspReservation.propertyId, propertyId))
      if (fromDate && toDate)
        conds.push(
          gte(hspReservation.cancelledAt, fromDate),
          lte(hspReservation.cancelledAt, toDate),
        )

      const items = await db
        .select()
        .from(hspReservation)
        .where(and(...conds))
      return { count: items.length, items, period: { fromDate, toDate } }
    })

    .get('/arrivals-departures', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'report:read')
      const q = (ctx as any).query ?? {}
      const date = String(q.date ?? new Date().toISOString().split('T')[0])
      const propertyId = String(q.propertyId ?? '')

      const conds = [
        eq(hspReservation.organizationId, actor.orgId),
        isNull(hspReservation.deletedAt),
      ]
      if (propertyId) conds.push(eq(hspReservation.propertyId, propertyId))

      const arrivals = await db
        .select()
        .from(hspReservation)
        .where(
          and(
            ...conds,
            eq(hspReservation.checkIn, date),
            sql`${hspReservation.status} IN ('confirmed', 'hold')`,
          ),
        )

      const departures = await db
        .select()
        .from(hspReservation)
        .where(
          and(...conds, eq(hspReservation.checkOut, date), eq(hspReservation.status, 'confirmed')),
        )

      return {
        date,
        arrivals: arrivals.length,
        departures: departures.length,
        arrivalList: arrivals,
        departureList: departures,
      }
    })

    .get('/outstanding-folios', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'report:read')
      // Outstanding folios are open transactions with type "folio"
      return {
        message:
          'Query commerce.transactions with type=folio and status=open for outstanding folios',
        period: {},
      }
    })

    .get('/housekeeping-turnaround', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'report:read')
      const completed = await db
        .select()
        .from(hspHousekeeping)
        .where(
          and(
            eq(hspHousekeeping.organizationId, actor.orgId),
            isNull(hspHousekeeping.deletedAt),
            sql`${hspHousekeeping.completedAt} IS NOT NULL`,
          ),
        )

      const avgMinutes =
        completed.reduce((acc: number, t: any) => {
          if (t.startedAt && t.completedAt)
            return (
              acc + (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 60000
            )
          return acc
        }, 0) / Math.max(1, completed.length)

      return { completedCount: completed.length, avgTurnaroundMinutes: Math.round(avgMinutes) }
    })

    .get('/channel-performance', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'report:read')
      const reservations = await db
        .select({
          source: hspReservation.source,
          channelPartnerId: hspReservation.channelPartnerId,
        })
        .from(hspReservation)
        .where(
          and(eq(hspReservation.organizationId, actor.orgId), isNull(hspReservation.deletedAt)),
        )

      const bySource: Record<string, number> = {}
      for (const r of reservations) {
        const key = r.source || 'direct'
        bySource[key] = (bySource[key] ?? 0) + 1
      }
      return { bySource, total: reservations.length }
    })
}
