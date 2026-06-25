import { Elysia } from "elysia";
import type { Mediator } from "@core";
import type { AdapterRegistry } from "@core";
import { createAdminRoutes } from "./routes/admin";
import { createStoreRoutes } from "./routes/store";
import { registerEcommerceJobs } from "./jobs";

export function createEcommerceCompose(mediator: Mediator, adapters: AdapterRegistry) {
  registerEcommerceJobs(mediator);

  const adminRoutes = createAdminRoutes(mediator, adapters);
  const storeRoutes = createStoreRoutes(mediator, adapters);

  return new Elysia({ prefix: "/ecommerce" })
    .onError({ as: "scoped" }, ({ error, set }) => {
      const msg = error instanceof Error ? error.message : String(error);
      set.status = 500;
      return { error: msg };
    })
    .group("/admin", (app) => {
      for (const route of adminRoutes) {
        app.use(route);
      }
      return app;
    })
    .group("/store", (app) => {
      for (const route of storeRoutes) {
        app.use(route);
      }
      return app;
    });
}

export type EcommerceApp = ReturnType<typeof createEcommerceCompose>;

// Re-export seed functions
export { seedEcommerceRoles } from "./db/seed/roles.seed";
export { seedEcommerceData } from "./db/seed/regions.seed";
