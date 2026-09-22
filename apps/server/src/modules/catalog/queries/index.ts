import type { QueryHandler } from '@core'
import { db } from '@db/client'
import { catBomHeaders, catBomLines } from '@db/schema/catalog'
import type { CatBomHeader, CatBomLine } from '@db/schema/catalog'
import { eq, and, isNull } from 'drizzle-orm'

export const listBomsHandler: QueryHandler<{ parentItemId?: string }, CatBomHeader[]> = async (
  query,
) => {
  const conditions = [eq(catBomHeaders.organizationId, query.orgId), isNull(catBomHeaders.deletedAt)]
  if (query.params.parentItemId)
    conditions.push(eq(catBomHeaders.parentItemId, query.params.parentItemId))
  return db.select().from(catBomHeaders).where(and(...conditions))
}

export const getBomHandler: QueryHandler<
  { id: string },
  (CatBomHeader & { lines: CatBomLine[] }) | null
> = async (query) => {
  const [row] = await db
    .select()
    .from(catBomHeaders)
    .where(
      and(
        eq(catBomHeaders.id, query.params.id),
        eq(catBomHeaders.organizationId, query.orgId),
        isNull(catBomHeaders.deletedAt),
      ),
    )
    .limit(1)
  if (!row) return null
  const lines = await db
    .select()
    .from(catBomLines)
    .where(and(eq(catBomLines.bomId, row.id), isNull(catBomLines.deletedAt)))
  return { ...row, lines }
}
