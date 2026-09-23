import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { invMovements, invStockUnits } from '@db/schema/inventory'
import type { InvMovement, InvStockUnit } from '@db/schema/inventory'
import { eq, and } from 'drizzle-orm'
import { InventoryEvents } from '../events'
import { applyReserve, applyRelease, applyDeduct } from '../reservation'

export interface ReservationPayload {
  variantId: string
  locationId: string
  quantity: number
  referenceId: string
  referenceType?: string
}

export const INVENTORY_REASONS = [
  'receipt',
  'sale',
  'reserve',
  'release',
  'adjust',
  'correction',
  'transfer',
] as const

export type InventoryReason = (typeof INVENTORY_REASONS)[number]

function assertReason(reason: string): asserts reason is InventoryReason {
  if (!(INVENTORY_REASONS as readonly string[]).includes(reason))
    throw new Error(`unknown movement reason: ${reason}`)
}

function assertReference(p: { referenceId?: string }, what: string): void {
  if (!p.referenceId) throw new Error(`${what} requires referenceId`)
}

async function withUnit(
  orgId: string,
  variantId: string,
  locationId: string,
  fn: (unit: InvStockUnit) => Promise<InvStockUnit>,
): Promise<InvStockUnit> {
  const unit = await loadUnit(orgId, variantId, locationId)
  if (!unit) throw new Error(`insufficient stock: no holdings for ${variantId}`)
  return fn(unit)
}

async function loadUnit(orgId: string, variantId: string, locationId: string) {
  const [row] = await db
    .select()
    .from(invStockUnits)
    .where(
      and(
        eq(invStockUnits.organizationId, orgId),
        eq(invStockUnits.variantId, variantId),
        eq(invStockUnits.locationId, locationId),
      ),
    )
    .limit(1)
  return row ?? null
}

async function logReservation(
  orgId: string,
  actorId: string | undefined,
  p: ReservationPayload,
  reason: string,
) {
  const now = new Date()
  const [row] = await db
    .insert(invMovements)
    .values({
      id: generateId(),
      organizationId: orgId,
      variantId: p.variantId,
      fromLocationId: null,
      toLocationId: p.locationId,
      quantity: Math.round(p.quantity),
      reason,
      referenceId: p.referenceId ?? null,
      referenceType: p.referenceType ?? null,
      actorId: actorId ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()
  return row!
}

export const reserveHandler: CommandHandler<ReservationPayload, InvStockUnit> = async (
  command,
  context,
) => {
  const p = command.payload
  const reason = 'reserve'
  assertReason(reason)
  assertReference(p, 'inventory.reserve')
  const unit = await loadUnit(command.orgId, p.variantId, p.locationId)
  if (!unit) throw new Error(`insufficient stock: no holdings for ${p.variantId}`)
  const next = applyReserve({ onHand: unit.onHand, reserved: unit.reserved }, p.quantity)
  const [row] = await db
    .update(invStockUnits)
    .set({ reserved: next.reserved, updatedAt: new Date() })
    .where(eq(invStockUnits.id, unit.id))
    .returning()
  const movement = await logReservation(command.orgId, command.actorId, p, reason)
  await context.publish(InventoryEvents.reserved(movement.id, p.variantId))
  return row!
}

export const releaseHandler: CommandHandler<ReservationPayload, InvStockUnit> = async (
  command,
  context,
) => {
  const p = command.payload
  const reason = 'release'
  assertReason(reason)
  assertReference(p, 'inventory.release')
  const unit = await loadUnit(command.orgId, p.variantId, p.locationId)
  if (!unit) throw new Error(`insufficient reserved stock: no holdings for ${p.variantId}`)
  const next = applyRelease({ onHand: unit.onHand, reserved: unit.reserved }, p.quantity)
  const [row] = await db
    .update(invStockUnits)
    .set({ reserved: next.reserved, updatedAt: new Date() })
    .where(eq(invStockUnits.id, unit.id))
    .returning()
  const movement = await logReservation(command.orgId, command.actorId, p, reason)
  await context.publish(InventoryEvents.released(movement.id, p.variantId))
  return row!
}

export const deductHandler: CommandHandler<ReservationPayload, InvStockUnit> = async (
  command,
  context,
) => {
  const p = command.payload
  const reason = 'sale'
  assertReason(reason)
  assertReference(p, 'inventory.deduct')
  const unit = await loadUnit(command.orgId, p.variantId, p.locationId)
  if (!unit) throw new Error(`insufficient stock: no holdings for ${p.variantId}`)
  const next = applyDeduct({ onHand: unit.onHand, reserved: unit.reserved }, p.quantity)
  const [row] = await db
    .update(invStockUnits)
    .set({ onHand: next.onHand, reserved: next.reserved, updatedAt: new Date() })
    .where(eq(invStockUnits.id, unit.id))
    .returning()
  const movement = await logReservation(command.orgId, command.actorId, p, reason)
  await context.publish(InventoryEvents.deducted(movement.id, p.variantId))
  return row!
}

export interface RecordMovementPayload {
  variantId: string
  fromLocationId?: string | null
  toLocationId?: string | null
  quantity: number
  reason: string
  referenceId?: string
  referenceType?: string
}

async function bumpStock(
  orgId: string,
  variantId: string,
  locationId: string,
  delta: number,
): Promise<InvStockUnit> {
  const [existing] = await db
    .select()
    .from(invStockUnits)
    .where(
      and(
        eq(invStockUnits.organizationId, orgId),
        eq(invStockUnits.variantId, variantId),
        eq(invStockUnits.locationId, locationId),
      ),
    )
    .limit(1)

  const qty = Math.round(delta)
  if (existing) {
    const next = existing.onHand + qty
    if (next < 0) throw new Error(`Insufficient stock for ${variantId} at ${locationId}`)
    const [row] = await db
      .update(invStockUnits)
      .set({ onHand: next, updatedAt: new Date() })
      .where(eq(invStockUnits.id, existing.id))
      .returning()
    return row!
  }
  if (qty < 0) throw new Error(`Insufficient stock for ${variantId} at ${locationId}`)
  const now = new Date()
  const [row] = await db
    .insert(invStockUnits)
    .values({
      id: generateId(),
      organizationId: orgId,
      variantId,
      locationId,
      onHand: qty,
      reserved: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()
  return row!
}

export const recordMovementHandler: CommandHandler<RecordMovementPayload, InvMovement> = async (
  command,
  context,
) => {
  const p = command.payload
  assertReason(p.reason)
  const qty = Math.round(Math.abs(Number(p.quantity)))
  if (!qty) throw new Error('quantity must be non-zero')
  if (p.fromLocationId) await bumpStock(command.orgId, p.variantId, p.fromLocationId, -qty)
  if (p.toLocationId) await bumpStock(command.orgId, p.variantId, p.toLocationId, qty)

  const now = new Date()
  const [row] = await db
    .insert(invMovements)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      variantId: p.variantId,
      fromLocationId: p.fromLocationId ?? null,
      toLocationId: p.toLocationId ?? null,
      quantity: qty,
      reason: p.reason,
      referenceId: p.referenceId ?? null,
      referenceType: p.referenceType ?? null,
      actorId: command.actorId ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()
  await context.publish(InventoryEvents.moved(row!.id, p.reason))
  return row!
}
