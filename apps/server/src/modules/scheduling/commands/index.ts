import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { schCalendars, schSlots, schBookings } from '@db/schema/scheduling'
import type { SchBooking } from '@db/schema/scheduling'
import { eq, and } from 'drizzle-orm'

export interface BookWindowPayload {
  ownerId: string
  ownerType?: string
  resourceId: string
  resourceType?: string
  startAt: Date | string
  endAt: Date | string
  notes?: string
  actorId?: string
}

export const bookWindowHandler: CommandHandler<BookWindowPayload, SchBooking> = async (command) => {
  const p = command.payload
  const now = new Date()
  const ownerType = p.ownerType ?? 'location'
  const [existingCal] = await db
    .select()
    .from(schCalendars)
    .where(
      and(
        eq(schCalendars.organizationId, command.orgId),
        eq(schCalendars.ownerId, p.ownerId),
        eq(schCalendars.ownerType, ownerType),
      ),
    )
    .limit(1)

  let calendarId = existingCal?.id
  if (!calendarId) {
    const [cal] = await db
      .insert(schCalendars)
      .values({
        id: generateId(),
        organizationId: command.orgId,
        ownerId: p.ownerId,
        ownerType,
        timezone: 'UTC',
        workingHours: {},
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })
      .returning()
    calendarId = cal!.id
  }

  const startAt = new Date(p.startAt)
  const endAt = new Date(p.endAt)
  const [slot] = await db
    .insert(schSlots)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      calendarId,
      resourceId: p.resourceId,
      resourceType: p.resourceType ?? 'resource',
      startAt,
      endAt,
      capacity: 1,
      bookedCount: 1,
      status: 'fully_booked',
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()

  const [booking] = await db
    .insert(schBookings)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      slotId: slot!.id,
      actorId: p.actorId ?? command.actorId ?? 'system',
      status: 'confirmed',
      notes: p.notes ?? null,
      confirmedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()
  return booking!
}
