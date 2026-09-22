import type { QueryHandler } from '@core'
import { db } from '@db/client'
import { invMovements, invStockUnits } from '@db/schema/inventory'
import type { InvMovement, InvStockUnit } from '@db/schema/inventory'
import { eq, and, desc } from 'drizzle-orm'

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
  { variantId?: string; locationId?: string; limit?: number },
  InvMovement[]
> = async (query) => {
  const conditions = [eq(invMovements.organizationId, query.orgId)]
  if (query.params.variantId) conditions.push(eq(invMovements.variantId, query.params.variantId))
  if (query.params.locationId) {
    conditions.push(eq(invMovements.toLocationId, query.params.locationId))
  }
  return db
    .select()
    .from(invMovements)
    .where(and(...conditions))
    .orderBy(desc(invMovements.createdAt))
    .limit(query.params.limit ?? 200)
}
