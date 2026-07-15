import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceAnnouncement,
  workplaceVisitor,
  workplaceRoom,
  workplaceRoomBooking,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createAnnouncementRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/announcements' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:announcements:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceAnnouncement)
        .where(eq(workplaceAnnouncement.organizationId, actor.orgId))
        .orderBy(desc(workplaceAnnouncement.createdAt))
        .limit(50)
      return { announcements: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:announcements:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [ann] = await db
        .insert(workplaceAnnouncement)
        .values({
          organizationId: actor.orgId,
          title: body.title,
          content: body.content,
          category: body.category ?? 'general',
          priority: body.priority ?? 'normal',
          postedById: actor.actorId,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { announcement: ann }
    })
}

export function createVisitorRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/visitors' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:visitors:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceVisitor)
        .where(eq(workplaceVisitor.organizationId, actor.orgId))
        .orderBy(desc(workplaceVisitor.createdAt))
        .limit(50)
      return { visitors: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:visitors:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [visitor] = await db
        .insert(workplaceVisitor)
        .values({
          organizationId: actor.orgId,
          name: body.name,
          phone: body.phone,
          email: body.email,
          company: body.company,
          hostEmployeeId: body.hostEmployeeId,
          purpose: body.purpose,
          status: 'expected',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { visitor }
    })
    .post('/:id/check-in', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:visitors:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceVisitor)
        .set({
          status: 'checked-in',
          checkIn: new Date(),
          badgeNumber: body.badgeNumber,
        })
        .where(eq(workplaceVisitor.id, id))
      return { success: true }
    })
    .post('/:id/check-out', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:visitors:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceVisitor)
        .set({
          status: 'checked-out',
          checkOut: new Date(),
        })
        .where(eq(workplaceVisitor.id, id))
      return { success: true }
    })
}

export function createRoomRoutes(mediator: Mediator) {
  return (
    new Elysia({ prefix: '/rooms' })
      .get('/', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor || !hasPermission(actor, 'workplace:rooms:read')) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const rows = await db
          .select()
          .from(workplaceRoom)
          .where(
            and(eq(workplaceRoom.organizationId, actor.orgId), eq(workplaceRoom.isActive, true)),
          )
        return { rooms: rows }
      })
      .post('/', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor || !hasPermission(actor, 'workplace:rooms:manage')) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const body = (ctx as any).body as any
        const [room] = await db
          .insert(workplaceRoom)
          .values({
            organizationId: actor.orgId,
            name: body.name,
            floor: body.floor,
            capacity: body.capacity ?? 1,
            locationId: body.locationId,
            amenities: body.amenities ?? [],
          })
          .returning()
        ;(ctx as any).set.status = 201
        return { room }
      })

      // Bookings
      .get('/bookings', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor || !hasPermission(actor, 'workplace:rooms:read')) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const { roomId, date } = (ctx as any).query ?? {}
        const rows = await db
          .select()
          .from(workplaceRoomBooking)
          .where(
            and(
              eq(workplaceRoomBooking.organizationId, actor.orgId),
              roomId ? eq(workplaceRoomBooking.roomId, roomId) : undefined,
            ),
          )
          .orderBy(desc(workplaceRoomBooking.fromTime))
          .limit(100)
        return { bookings: rows }
      })
      .post('/bookings', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor || !hasPermission(actor, 'workplace:rooms:book')) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const body = (ctx as any).body as any
        const [booking] = await db
          .insert(workplaceRoomBooking)
          .values({
            organizationId: actor.orgId,
            roomId: body.roomId,
            employeeId: body.employeeId,
            title: body.title,
            fromTime: new Date(body.fromTime),
            toTime: new Date(body.toTime),
            attendees: body.attendees ?? [],
          })
          .returning()
        ;(ctx as any).set.status = 201
        return { booking }
      })
      .post('/bookings/:id/cancel', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const { id } = (ctx as any).params
        await db
          .update(workplaceRoomBooking)
          .set({ status: 'cancelled' })
          .where(eq(workplaceRoomBooking.id, id))
        return { success: true }
      })
  )
}
