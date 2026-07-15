import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceAsset,
  workplaceAssetAssignment,
  workplacePolicy,
  workplacePolicyAcknowledgement,
  workplaceAnnouncement,
  workplaceVisitor,
  workplaceRoom,
  workplaceRoomBooking,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createAssetRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/assets' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:assets:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceAsset)
        .where(eq(workplaceAsset.organizationId, actor.orgId))
      return { assets: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:assets:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [asset] = await db
        .insert(workplaceAsset)
        .values({
          organizationId: actor.orgId,
          code: body.code,
          name: body.name,
          category: body.category,
          status: body.status ?? 'available',
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
          purchaseCost: body.purchaseCost,
          serialNumber: body.serialNumber,
          model: body.model,
          locationId: body.locationId,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { asset }
    })
    .post('/assign', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:assets:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [assignment] = await db
        .insert(workplaceAssetAssignment)
        .values({
          organizationId: actor.orgId,
          assetId: body.assetId,
          employeeId: body.employeeId,
          expectedReturnAt: body.expectedReturnAt ? new Date(body.expectedReturnAt) : undefined,
          condition: body.condition,
          notes: body.notes,
        })
        .returning()

      await db
        .update(workplaceAsset)
        .set({ status: 'assigned' })
        .where(eq(workplaceAsset.id, body.assetId))
      ;(ctx as any).set.status = 201
      return { assignment }
    })
    .post('/return/:assignmentId', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:assets:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { assignmentId } = (ctx as any).params
      const body = (ctx as any).body as any
      const [assignment] = await db
        .select()
        .from(workplaceAssetAssignment)
        .where(eq(workplaceAssetAssignment.id, assignmentId))
      if (!assignment) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      await db
        .update(workplaceAssetAssignment)
        .set({
          returnedAt: new Date(),
          condition: body.condition ?? assignment.condition,
        })
        .where(eq(workplaceAssetAssignment.id, assignmentId))
      await db
        .update(workplaceAsset)
        .set({ status: 'available' })
        .where(eq(workplaceAsset.id, assignment.assetId))
      return { success: true }
    })
}
