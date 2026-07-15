import { db } from '@db/client'
import { persons } from '@db/schema/party'
import { locations } from '@db/schema/location'
import { hspReservation, hspRoomStatusHistory, hspReservationRoom } from '../db/schema/hospitality'
import { eq, and, isNull } from 'drizzle-orm'
import type { Mediator } from '@core'

export interface EventBus {
  on(event: string, handler: (payload: any) => Promise<void>): void
  emit?(event: string, payload: any): void
}

export function registerHospitalityHooks(bus: EventBus, mediator: Mediator): void {
  bus.on('hsp.reservation.confirmed', async (event) => {
    const { reservationId, propertyId, orgId } = event.payload ?? {}
    if (!reservationId) return
    const now = new Date()
    await db
      .update(hspReservation)
      .set({ status: 'confirmed', confirmedAt: now, updatedAt: now })
      .where(
        and(eq(hspReservation.id, reservationId), eq(hspReservation.organizationId, orgId ?? '')),
      )
  })

  bus.on('hsp.reservation.cancelled', async (event) => {
    const { reservationId, reason, orgId } = event.payload ?? {}
    if (!reservationId) return
    const now = new Date()
    await db
      .update(hspReservation)
      .set({ status: 'cancelled', cancelledAt: now, cancellationReason: reason, updatedAt: now })
      .where(
        and(eq(hspReservation.id, reservationId), eq(hspReservation.organizationId, orgId ?? '')),
      )
    // Release room assignments
    const rooms = await db
      .select()
      .from(hspReservationRoom)
      .where(
        and(
          eq(hspReservationRoom.reservationId, reservationId),
          isNull(hspReservationRoom.deletedAt),
        ),
      )
    for (const room of rooms) {
      if (room.assignedRoomId) {
        await db
          .update(locations)
          .set({
            meta: { ...((locations.meta as any) ?? {}), status: 'available' },
            updatedAt: now,
          })
          .where(eq(locations.id, room.assignedRoomId))
        await db.insert(hspRoomStatusHistory).values({
          id: crypto.randomUUID(),
          organizationId: orgId ?? '',
          roomLocationId: room.assignedRoomId,
          status: 'available',
          previousStatus: 'reserved',
          reason: `Reservation ${reservationId} cancelled`,
          reservationId,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
      }
    }
  })

  bus.on('hsp.reservation.checkedIn', async (event) => {
    const { reservationId, orgId } = event.payload ?? {}
    if (!reservationId) return
    const now = new Date()
    await db
      .update(hspReservation)
      .set({ status: 'confirmed', checkedInAt: now, updatedAt: now })
      .where(
        and(eq(hspReservation.id, reservationId), eq(hspReservation.organizationId, orgId ?? '')),
      )
  })

  bus.on('hsp.reservation.checkedOut', async (event) => {
    const { reservationId, orgId } = event.payload ?? {}
    if (!reservationId) return
    const now = new Date()
    await db
      .update(hspReservation)
      .set({ status: 'checked_out', checkedOutAt: now, updatedAt: now })
      .where(
        and(eq(hspReservation.id, reservationId), eq(hspReservation.organizationId, orgId ?? '')),
      )
    // Mark assigned rooms as dirty
    const rooms = await db
      .select()
      .from(hspReservationRoom)
      .where(
        and(
          eq(hspReservationRoom.reservationId, reservationId),
          isNull(hspReservationRoom.deletedAt),
        ),
      )
    for (const room of rooms) {
      if (room.assignedRoomId) {
        await db
          .update(locations)
          .set({ meta: { ...((locations.meta as any) ?? {}), status: 'dirty' }, updatedAt: now })
          .where(eq(locations.id, room.assignedRoomId))
        await db.insert(hspRoomStatusHistory).values({
          id: crypto.randomUUID(),
          organizationId: orgId ?? '',
          roomLocationId: room.assignedRoomId,
          status: 'dirty',
          previousStatus: 'occupied',
          reason: `Checkout reservation ${reservationId}`,
          reservationId,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
      }
    }
  })

  bus.on('hsp.room.statusChanged', async (event) => {
    const {
      roomLocationId,
      status,
      previousStatus,
      changedByActorId,
      reason,
      reservationId,
      orgId,
    } = event.payload ?? {}
    if (!roomLocationId || !status) return
    const now = new Date()
    await db.insert(hspRoomStatusHistory).values({
      id: crypto.randomUUID(),
      organizationId: orgId ?? '',
      roomLocationId,
      status,
      previousStatus,
      changedByActorId,
      reason,
      reservationId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    await db
      .update(locations)
      .set({ meta: { ...((locations.meta as any) ?? {}), status }, updatedAt: now })
      .where(eq(locations.id, roomLocationId))
  })

  bus.on('hsp.service.requested', async (event) => {
    const { serviceRequestId, orgId } = event.payload ?? {}
    if (!serviceRequestId) return
    try {
      await mediator.dispatch({
        type: 'analytics.captureEvent',
        name: 'hsp.service.requested',
        props: { serviceRequestId, orgId },
      } as any)
    } catch {
      /* analytics optional */
    }
  })

  bus.on('hsp.venue.reserved', async (event) => {
    const { venueReservationId, orgId } = event.payload ?? {}
    if (!venueReservationId) return
    // Publish optional hand-off event for future Event Management Compose
    bus.emit?.('event.venue.handoff', {
      venueReservationId,
      orgId,
      timestamp: new Date().toISOString(),
    })
  })
}
