import type { Mediator } from '@core'
import { generateId } from '@core'
import { seedRestaurantRoles } from './roles'

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

  await seedRestaurantRoles(orgId)
}
