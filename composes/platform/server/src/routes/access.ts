import Elysia from 'elysia'
import type { Mediator } from '@core'
import type { AuthActor } from '@projectx/plugin-auth-server'
import { hospitalityAccessManifest } from '@projectx/hospitality-server'
import { crmAccessManifest } from '@projectx/crm-server'
import { projectManagementAccessManifest } from '@projectx/project-management-server'
import { erpAccessManifest } from '@projectx/erp-server'
import { workplaceAccessManifest } from '@projectx/workplace-server'
import { lmsAccessManifest } from '@projectx/lms-server'
import { ecommerceAccessManifest } from '@projectx/ecommerce-server'
import { restaurantAccessManifest } from '@projectx/restaurant-server'
import { platformAccessManifest } from '../access/manifest'
import { requirePlatformPermission } from '../permissions'

const CATALOG = [
  platformAccessManifest,
  hospitalityAccessManifest,
  crmAccessManifest,
  projectManagementAccessManifest,
  erpAccessManifest,
  workplaceAccessManifest,
  lmsAccessManifest,
  ecommerceAccessManifest,
  restaurantAccessManifest,
]

export function createAccessRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/access' })
    .get('/catalog', (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      requirePlatformPermission(actor, 'access:catalog')
      return { composes: CATALOG }
    })
    .get('/effective', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      requirePlatformPermission(actor, 'access:catalog')
      const q = (ctx as any).query ?? {}
      const actorId = (q.actorId as string) || actor.id
      const access = await mediator.query<{
        roleKeys: string[]
        permissions: string[]
        roles: { id: string; name: string; description: string | null }[]
      }>({
        type: 'identity.getActorAccess',
        params: { actorId },
        actorId: actor.id,
        orgId: actor.orgId,
      })
      return access
    })
}

export type AccessRoutes = ReturnType<typeof createAccessRoutes>
