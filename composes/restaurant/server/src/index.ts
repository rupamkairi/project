import { Elysia } from "elysia";
import type { Mediator, EventBus } from "@core";
import { outletRoutes } from "./routes/outlets";
import { menuRoutes, categoryRoutes, modifierRoutes } from "./routes/menu";
import { orderRoutes } from "./routes/orders";
import { kotRoutes } from "./routes/kots";
import { deliveryRoutes, riderRoutes } from "./routes/delivery";
import { billingRoutes, shiftRoutes } from "./routes/billing";
import { aggregatorRoutes, aggregatorAdminRoutes } from "./routes/aggregator";
import { inventoryRoutes, recipeRoutes, menuRecipeRoutes } from "./routes/inventory";
import { analyticsRoutes } from "./routes/analytics";
import { wsRoutes } from "./routes/ws";
import { registerRestaurantHooks } from "./hooks";
import { registerRestaurantJobs } from "./jobs";

type Scheduler = {
  register: (job: { name: string; cron: string; fn: () => Promise<void> }) => void;
};

export function createRestaurantCompose(
  mediator: Mediator,
  bus: EventBus,
  scheduler: Scheduler,
) {
  registerRestaurantHooks(bus, mediator);
  registerRestaurantJobs(scheduler, mediator, bus);

  return new Elysia({ prefix: "/restaurant" })
    .use(outletRoutes(mediator, bus))
    .use(menuRoutes(mediator, bus))
    .use(categoryRoutes(mediator))
    .use(modifierRoutes(mediator))
    .use(orderRoutes(mediator, bus))
    .use(kotRoutes(mediator, bus))
    .use(deliveryRoutes(mediator, bus))
    .use(riderRoutes(mediator, bus))
    .use(billingRoutes(mediator, bus))
    .use(shiftRoutes(mediator, bus))
    .use(aggregatorRoutes(mediator, bus))
    .use(aggregatorAdminRoutes(mediator))
    .use(inventoryRoutes(mediator))
    .use(recipeRoutes(mediator))
    .use(menuRecipeRoutes(mediator))
    .use(analyticsRoutes(mediator))
    .use(wsRoutes(bus));
}

export type RestaurantApp = ReturnType<typeof createRestaurantCompose>;

// Re-export schema
export {
  rstCategories,
  rstModifiers,
  rstModifierGroups,
  rstKot,
  rstKotItems,
  rstDeliveries,
  rstShifts,
  rstShiftAssignments,
  rstRecipes,
  rstRecipeIngredients,
  rstReservations,
  rstAggregatorOrders,
  type RstCategory,
  type RstModifier,
  type RstModifierGroup,
  type RstKot,
  type RstKotItem,
  type RstDelivery,
  type RstShift,
  type RstShiftAssignment,
  type RstRecipe,
  type RstRecipeIngredient,
  type RstReservation,
  type RstAggregatorOrder,
} from "./db/schema/restaurant";

// Re-export seed
export { seedRestaurant } from "./db/seed/restaurant";
