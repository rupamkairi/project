import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { catBomHeaders, catBomLines } from '@db/schema/catalog'
import type { CatBomHeader, CatBomLine } from '@db/schema/catalog'
import { eq, and, isNull } from 'drizzle-orm'

export interface CreateBomPayload {
  parentItemId: string
  name?: string
  yieldQty?: number
  uom?: string
  isActive?: boolean
  meta?: Record<string, unknown>
  lines?: Array<{ componentItemId: string; qty: number; uom?: string; scrapPercent?: number }>
}

export const createBomHandler: CommandHandler<CreateBomPayload, CatBomHeader> = async (command) => {
  const p = command.payload
  const now = new Date()
  const existing = await db
    .select()
    .from(catBomHeaders)
    .where(
      and(
        eq(catBomHeaders.organizationId, command.orgId),
        eq(catBomHeaders.parentItemId, p.parentItemId),
        isNull(catBomHeaders.deletedAt),
      ),
    )
  const [row] = await db
    .insert(catBomHeaders)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      parentItemId: p.parentItemId,
      name: p.name ?? null,
      yieldQty: Math.round(Number(p.yieldQty ?? 1)),
      uom: p.uom ?? 'ea',
      isActive: p.isActive ?? false,
      createdAt: now,
      updatedAt: now,
      version: existing.length + 1,
      meta: p.meta ?? {},
    })
    .returning()

  if (p.lines?.length) {
    await db.insert(catBomLines).values(
      p.lines.map((line) => ({
        id: generateId(),
        organizationId: command.orgId,
        bomId: row!.id,
        componentItemId: line.componentItemId,
        qty: Math.round(Number(line.qty)),
        uom: line.uom ?? 'ea',
        scrapPercent: Math.round(Number(line.scrapPercent ?? 0)),
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })),
    )
  }
  return row!
}

export const activateBomHandler: CommandHandler<{ id: string }, CatBomHeader> = async (command) => {
  const [bom] = await db
    .select()
    .from(catBomHeaders)
    .where(and(eq(catBomHeaders.id, command.payload.id), eq(catBomHeaders.organizationId, command.orgId)))
  if (!bom) throw new Error('BOM not found')
  await db
    .update(catBomHeaders)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(catBomHeaders.parentItemId, bom.parentItemId),
        eq(catBomHeaders.organizationId, command.orgId),
      ),
    )
  const [row] = await db
    .update(catBomHeaders)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(catBomHeaders.id, bom.id))
    .returning()
  return row!
}

export type { CatBomHeader, CatBomLine }
