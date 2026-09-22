import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { invMovements, invStockUnits } from '@db/schema/inventory'
import type { InvMovement, InvStockUnit } from '@db/schema/inventory'
import { eq, and } from 'drizzle-orm'
import { InventoryEvents } from '../events'

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
