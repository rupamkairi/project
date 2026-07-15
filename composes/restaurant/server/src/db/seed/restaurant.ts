import type { Mediator } from '@core'
import { generateId } from '@core'

export async function seedRestaurant(mediator: Mediator, orgId: string) {
  try {
    await mediator.dispatch({
      type: 'pipeline.seed',
      payload: {
        entityType: 'rst.order',
        stages: [
          'Placed',
          'Accepted',
          'Preparing',
          'Ready',
          'Ready for Hand-off',
          'Served',
          'Collected',
          'Handed-off',
          'Cancelled',
          'Rejected',
          'Refunded',
        ],
      },
      actorId: 'system',
      orgId,
      correlationId: generateId(),
    })
  } catch {
    /* pipeline may already exist */
  }

  try {
    await mediator.dispatch({
      type: 'identity.seedRoles',
      payload: {
        domain: 'restaurant',
        roles: [
          { name: 'Restaurant Admin', permissions: ['restaurant:*'] },
          {
            name: 'Owner',
            permissions: [
              'restaurant:read:*',
              'restaurant:manage:outlet',
              'restaurant:manage:staff',
              'restaurant:manage:menu',
              'restaurant:manage:billing',
            ],
          },
          {
            name: 'Outlet Manager',
            permissions: [
              'restaurant:read:*',
              'restaurant:manage:outlet:*',
              'restaurant:manage:staff:*',
              'restaurant:manage:billing:*',
            ],
          },
          {
            name: 'Cashier',
            permissions: [
              'restaurant:read:orders',
              'restaurant:manage:billing',
              'restaurant:manage:shifts',
            ],
          },
          {
            name: 'Waiter',
            permissions: [
              'restaurant:read:orders',
              'restaurant:create:orders',
              'restaurant:manage:tables',
            ],
          },
          {
            name: 'Kitchen Manager',
            permissions: [
              'restaurant:read:kds',
              'restaurant:manage:kds',
              'restaurant:manage:inventory',
            ],
          },
          { name: 'Kitchen Staff', permissions: ['restaurant:read:kds', 'restaurant:manage:kds'] },
          {
            name: 'Inventory Manager',
            permissions: [
              'restaurant:read:inventory',
              'restaurant:manage:inventory',
              'restaurant:manage:recipes',
            ],
          },
          { name: 'Viewer', permissions: ['restaurant:read:*'] },
        ],
      },
      actorId: 'system',
      orgId,
      correlationId: generateId(),
    })
  } catch {
    /* roles may already exist */
  }
}
