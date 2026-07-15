import { posRoutes } from '../apps/pos/routes'
import { kdsRoutes } from '../apps/kds/routes'
import { adminRoutes } from '../apps/admin/routes'
import { customerRoutes } from '../apps/customer/routes'
import { restaurantsIndexRoute } from './restaurants-index'

export const restaurantRoutes = [
  restaurantsIndexRoute,
  ...posRoutes,
  ...kdsRoutes,
  ...adminRoutes,
  ...customerRoutes,
]
