import type { QueryHandler } from '@core'
import { db } from '@db/client'
import { invMovements, invStockUnits } from '@db/schema/inventory'
import type { InvMovement, InvStockUnit } from '@db/schema/inventory'
import { eq, and, desc } from 'drizzle-orm'
import { availableQty } from '../reservation'

export const listStockUnitsHandler: QueryHandler<
  { variantId?: string; locationId?: string },
  InvStockUnit[]
> = async (query) => {
  const conditions = [eq(invStockUnits.organizationId, query.orgId)]
  if (query.params.variantId) conditions.push(eq(invStockUnits.variantId, query.params.variantId))
  if (query.params.locationId) conditions.push(eq(invStockUnits.locationId, query.params.locationId))
  return db.select().from(invStockUnits).where(and(...conditions))
}

export const listMovementsHandler: QueryHandler<
  { variantId?: string; locationId?: string; limit?: number; referenceId?: string; reason?: string },
  InvMovement[]
> = async (query) => {
  const conditions = [eq(invMovements.organizationId, query.orgId)]
  if (query.params.variantId) conditions.push(eq(invMovements.variantId, query.params.variantId))
  if (query.params.locationId) {
    conditions.push(eq(invMovements.toLocationId, query.params.locationId))
  }
  if (query.params.referenceId) conditions.push(eq(invMovements.referenceId, query.params.referenceId))
  if (query.params.reason) conditions.push(eq(invMovements.reason, query.params.reason))
  return db
    .select()
    .from(invMovements)
    .where(and(...conditions))
    .orderBy(desc(invMovements.createdAt))
    .limit(query.params.limit ?? 200)
}

export const getAvailabilityHandler: QueryHandler<
  { variantId: string; locationId?: string },
  Array<InvStockUnit & { available: number }>
> = async (query) => {
  const conditions = [
    eq(invStockUnits.organizationId, query.orgId),
    eq(invStockUnits.variantId, query.params.variantId),
  ]
  if (query.params.locationId) conditions.push(eq(invStockUnits.locationId, query.params.locationId))
  const rows = await db.select().from(invStockUnits).where(and(...conditions))
  return rows.map((r) => ({ ...r, available: availableQty({ onHand: r.onHand, reserved: r.reserved }) }))
}
