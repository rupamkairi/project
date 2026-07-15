import { db } from '@db/client'
import { hspReservation, hspHousekeeping, hspParking } from '../db/schema/hospitality'
import { eq, and, isNull, lt, gte, sql } from 'drizzle-orm'

export async function autoReleaseExpiredHolds(orgId: string): Promise<{ released: number }> {
  const now = new Date()
  const expired = await db
    .select()
    .from(hspReservation)
    .where(
      and(
        eq(hspReservation.organizationId, orgId),
        eq(hspReservation.status, 'hold'),
        isNull(hspReservation.deletedAt),
        lt(hspReservation.holdExpiresAt, now),
      ),
    )

  for (const r of expired) {
    await db
      .update(hspReservation)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancellationReason: 'Hold expired',
        updatedAt: now,
      })
      .where(eq(hspReservation.id, r.id))
  }

  return { released: expired.length }
}

export async function autoProcessNoShows(orgId: string): Promise<{ processed: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const noShows = await db
    .select()
    .from(hspReservation)
    .where(
      and(
        eq(hspReservation.organizationId, orgId),
        eq(hspReservation.status, 'confirmed'),
        isNull(hspReservation.deletedAt),
        gte(hspReservation.checkIn, today),
        lt(hspReservation.checkIn, tomorrow),
        isNull(hspReservation.checkedInAt),
      ),
    )

  const now = new Date()
  for (const r of noShows) {
    // Process no-show at end of day (checks scheduler runs after midnight)
    await db
      .update(hspReservation)
      .set({ status: 'no_show', noShowAt: now, updatedAt: now })
      .where(eq(hspReservation.id, r.id))
  }

  return { processed: noShows.length }
}

export async function generateDailyHKQueue(orgId: string): Promise<{ queued: number }> {
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find all dirty rooms not yet queued for cleaning today
  const existing = await db
    .select({ roomLocationId: hspHousekeeping.roomLocationId })
    .from(hspHousekeeping)
    .where(
      and(
        eq(hspHousekeeping.organizationId, orgId),
        isNull(hspHousekeeping.deletedAt),
        gte(hspHousekeeping.scheduledDate, today),
        lt(hspHousekeeping.scheduledDate, new Date(today.getTime() + 86400000)),
      ),
    )

  const existingIds = new Set(existing.map((e) => e.roomLocationId))

  // Find dirty rooms from locations (status stored in meta)
  const { locations } = await import('@db/schema/location')
  const dirtyRooms = await db
    .select({ id: locations.id, organizationId: locations.organizationId, meta: locations.meta })
    .from(locations)
    .where(
      and(
        eq(locations.organizationId, orgId),
        eq(locations.type, 'room'),
        isNull(locations.deletedAt),
        sql`meta->>'status' = 'dirty'`,
      ),
    )

  let queued = 0
  for (const room of dirtyRooms) {
    if (existingIds.has(room.id)) continue
    await db.insert(hspHousekeeping).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      propertyId: (locations.meta as any)?.propertyId ?? '',
      roomLocationId: room.id,
      taskType: 'cleaning',
      status: 'queued',
      priority: 'normal',
      scheduledDate: today,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    queued++
  }

  return { queued }
}

export async function checkStaleParking(orgId: string): Promise<{ stale: number }> {
  const now = new Date()
  const active = await db
    .select()
    .from(hspParking)
    .where(
      and(
        eq(hspParking.organizationId, orgId),
        eq(hspParking.status, 'active'),
        isNull(hspParking.deletedAt),
      ),
    )

  // Stale parking: active but linked to checked-out reservation
  let stale = 0
  for (const p of active) {
    if (!p.reservationId) continue
    const [res] = await db
      .select({ status: hspReservation.status })
      .from(hspReservation)
      .where(and(eq(hspReservation.id, p.reservationId), isNull(hspReservation.deletedAt)))
    if (
      res &&
      (res.status === 'checked_out' || res.status === 'cancelled' || res.status === 'no_show')
    ) {
      await db
        .update(hspParking)
        .set({ status: 'completed', checkOut: now, updatedAt: now })
        .where(eq(hspParking.id, p.id))
      stale++
    }
  }

  return { stale }
}

export interface HospitalityJobScheduler {
  define(id: string, cron: string, handler: () => Promise<void>): void
}

export function registerHospitalityJobs(
  scheduler: HospitalityJobScheduler,
  orgIds: string[],
): void {
  scheduler.define('hsp.release-expired-holds', '*/15 * * * *', async () => {
    for (const orgId of orgIds) await autoReleaseExpiredHolds(orgId)
  })

  scheduler.define('hsp.process-no-shows', '0 6 * * *', async () => {
    for (const orgId of orgIds) {
      const { processed } = await autoProcessNoShows(orgId)
      if (processed > 0) console.log(`[hsp.process-no-shows] org=${orgId} processed=${processed}`)
    }
  })

  scheduler.define('hsp.daily-hk-queue', '0 5 * * *', async () => {
    for (const orgId of orgIds) {
      const { queued } = await generateDailyHKQueue(orgId)
      if (queued > 0) console.log(`[hsp.daily-hk-queue] org=${orgId} queued=${queued}`)
    }
  })

  scheduler.define('hsp.check-stale-parking', '0 */2 * * *', async () => {
    for (const orgId of orgIds) {
      const { stale } = await checkStaleParking(orgId)
      if (stale > 0) console.log(`[hsp.check-stale-parking] org=${orgId} stale=${stale}`)
    }
  })
}
