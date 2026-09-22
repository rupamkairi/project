import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import type { AdapterRegistry } from '@core'
import { createAdminRoutes } from './routes/admin'
import { createStoreRoutes } from './routes/store'
import { registerEcommerceJobs } from './jobs'
import { canAccess, COMPOSE_ADMIN_ROLES } from '@projectx/access'

function ecommerceAdminPermission(path: string, method: string): string {
  const verb =
    method === 'GET'
      ? 'read'
      : method === 'DELETE'
        ? 'delete'
        : method === 'POST'
          ? 'create'
          : 'update'
  if (path.includes('/products') || path.includes('/categories'))
    return `products:${verb === 'read' ? 'read' : verb}`
  if (path.includes('/orders') || path.includes('/fulfillments'))
    return `orders:${verb === 'read' ? 'read' : 'update'}`
  if (path.includes('/customers')) return `customers:${verb === 'read' ? 'read' : 'update'}`
  if (path.includes('/returns')) return `returns:${verb === 'read' ? 'read' : 'update'}`
  if (path.includes('/analytics')) return 'analytics:read'
  if (path.includes('/regions')) return `regions:${verb === 'read' ? 'read' : 'update'}`
  if (path.includes('/shipping')) return `shippingOptions:${verb === 'read' ? 'read' : 'update'}`
  if (path.includes('/tax')) return `taxRegions:${verb === 'read' ? 'read' : 'update'}`
  return `products:${verb}`
}

export function createEcommerceCompose(mediator: Mediator, adapters: AdapterRegistry) {
  registerEcommerceJobs(mediator)

  const adminRoutes = createAdminRoutes(mediator, adapters)
  const storeRoutes = createStoreRoutes(mediator, adapters)

  return new Elysia({ prefix: '/ecommerce' })
    .onError({ as: 'scoped' }, ({ error, set }) => {
      const msg = error instanceof Error ? error.message : String(error)
      set.status = 500
      return { error: msg }
    })
    .group('/admin', (app) => {
      app.onBeforeHandle({ as: 'scoped' }, (ctx) => {
        const actor = (ctx as any).actor
        if (!actor) {
          ctx.set.status = 401
          return { error: 'Unauthorized' }
        }
        const path = new URL(ctx.request.url).pathname
        const permission = ecommerceAdminPermission(path, ctx.request.method)
        if (!canAccess(actor, permission, { composeAdminRoles: COMPOSE_ADMIN_ROLES.ecommerce })) {
          ctx.set.status = 403
          return { error: `Missing permission: ${permission}` }
        }
      })
      for (const route of adminRoutes) {
        app.use(route)
      }
      return app
    })
    .group('/store', (app) => {
      for (const route of storeRoutes) {
        app.use(route)
      }
      return app
    })
}

export type EcommerceApp = ReturnType<typeof createEcommerceCompose>

export * from './db/schema/index'

// Re-export seed functions
export { seedEcommerce } from './db/seed/ecommerce'
export { seedEcommerceRoles } from './db/seed/roles.seed'
export { seedEcommerceData } from './db/seed/regions.seed'
export { ecommerceAccessManifest } from './access/manifest'
