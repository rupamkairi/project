import Elysia from "elysia";
import type { Mediator, EventBus, Scheduler } from "@core";
import { registerRestaurantHooks } from "./hooks/index.js";
import { registerRestaurantJobs } from "./jobs/index.js";
import { menuRoutes } from "./routes/menu.js";
import { outletRoutes } from "./routes/outlets.js";
import { orderRoutes } from "./routes/orders.js";
import { kdsRoutes } from "./routes/kots.js";
import { billingRoutes } from "./routes/billing.js";
import { deliveryRoutes } from "./routes/delivery.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { aggregatorRoutes } from "./routes/aggregator.js";
import { analyticsRoutes } from "./routes/analytics.js";

export function createRestaurantCompose(
  mediator: Mediator,
  bus: EventBus,
  scheduler?: Scheduler,
) {
  registerRestaurantHooks(bus, mediator);
  if (scheduler) registerRestaurantJobs(scheduler, mediator, bus);

  return new Elysia({ prefix: "/restaurant" })
    .use(menuRoutes(mediator, bus))
    .use(outletRoutes(mediator, bus))
    .use(orderRoutes(mediator, bus))
    .use(kdsRoutes(mediator, bus))
    .use(billingRoutes(mediator, bus))
    .use(deliveryRoutes(mediator, bus))
    .use(inventoryRoutes(mediator, bus))
    .use(aggregatorRoutes(mediator, bus))
    .use(analyticsRoutes(mediator, bus));
}

export type RestaurantApp = ReturnType<typeof createRestaurantCompose>;

// Re-export schema for migration merging
export {
  rstCategories,
  rstKot,
  rstKotItems,
  rstDeliveries,
  rstShifts,
  rstShiftAssignments,
  rstRecipes,
  rstRecipeIngredients,
  rstReservations,
  rstModifiers,
  rstModifierGroups,
  rstAggregatorMappings,
} from "./db/schema/restaurant.js";

export { seedRestaurant } from "./db/seed/restaurant.js";
