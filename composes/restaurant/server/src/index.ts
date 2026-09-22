import Elysia from 'elysia'
import type { Mediator, EventBus, Scheduler } from '@core'
import { registerRestaurantHooks } from './hooks/index.js'
import { registerRestaurantJobs } from './jobs/index.js'
import { createMenuRoutes } from './routes/menu.js'
import { createOutletRoutes } from './routes/outlets.js'
import { createOrderRoutes } from './routes/orders.js'
import { createKotsRoutes } from './routes/kots.js'
import { createBillingRoutes } from './routes/billing.js'
import { createInventoryRoutes } from './routes/inventory.js'
import { createAggregatorRoutes } from './routes/aggregator.js'
import { createAnalyticsRoutes } from './routes/analytics.js'
import { createWsRoutes } from './routes/ws.js'
import { createPartnerRoutes } from './routes/partners.js'
import { createStaffRoutes } from './routes/staff.js'
import { createReservationRoutes } from './routes/reservations.js'
import { createEquipmentRoutes } from './routes/equipment.js'

export function createRestaurantCompose(mediator: Mediator, bus: EventBus, scheduler?: Scheduler) {
  registerRestaurantHooks(bus, mediator)
  if (scheduler) registerRestaurantJobs(scheduler, mediator, bus)

  return new Elysia({ prefix: '/restaurants' })
    .use(createMenuRoutes(mediator, bus))
    .use(createOutletRoutes(mediator, bus))
    .use(createOrderRoutes(mediator, bus))
    .use(createKotsRoutes(mediator, bus))
    .use(createBillingRoutes(mediator, bus))
    .use(createInventoryRoutes(mediator, bus))
    .use(createAggregatorRoutes(mediator, bus))
    .use(createAnalyticsRoutes(mediator, bus))
    .use(createPartnerRoutes(mediator, bus))
    .use(createStaffRoutes(mediator, bus))
    .use(createReservationRoutes(mediator, bus))
    .use(createEquipmentRoutes(mediator, bus))
    .use(createWsRoutes())
}

export type RestaurantApp = ReturnType<typeof createRestaurantCompose>

export {
  rstKot,
  rstKotItems,
  rstShifts,
  rstShiftAssignments,
  rstRecipes,
  rstRecipeIngredients,
  rstReservations,
  rstModifiers,
  rstModifierGroups,
  rstAggregatorMappings,
  rstMenuPeriods,
  rstStockMovements,
  rstEquipmentLogs,
  rstPartners,
  rstStaff,
  rstOutletAssignments,
  rstBillPayments,
  rstBillSplits,
  rstDiscounts,
} from './db/schema/restaurant.js'

export { seedRestaurant } from './db/seed/restaurant.js'
