// CRM Compose — server shell.
//
// Entry point consumed by apps/server/src/index.ts during boot. Exports a single
// `createCrmCompose(mediator)` function that returns an Elysia instance with the
// `/crm` prefix applied. Each sub-route group is a separate file in ./routes/.
//
// Also exports `registerCrmHooks` and `registerCrmJobs` for the server shell
// to wire up at boot (Phase 4 intelligence layer).

import Elysia from "elysia";
import type { Mediator } from "@core";
import { createContactsRoutes } from "./routes/contacts";
import { createAccountsRoutes } from "./routes/accounts";
import { createLeadsRoutes } from "./routes/leads";
import { createDealsRoutes } from "./routes/deals";
import { createActivitiesRoutes } from "./routes/activities";
import { createPipelinesRoutes } from "./routes/pipelines";
import { createSegmentsRoutes } from "./routes/segments";
import { createCampaignsRoutes } from "./routes/campaigns";
import { createAnalyticsRoutes } from "./routes/analytics";
import { createSearchRoutes } from "./routes/search";
import { createTicketsRoutes } from "./routes/tickets";
import { createImportExportRoutes } from "./routes/import-export";

export function createCrmCompose(mediator: Mediator) {
  return new Elysia({ prefix: "/crm" })
    .use(createContactsRoutes(mediator))
    .use(createAccountsRoutes(mediator))
    .use(createLeadsRoutes(mediator))
    .use(createDealsRoutes(mediator))
    .use(createActivitiesRoutes(mediator))
    .use(createPipelinesRoutes(mediator))
    .use(createSegmentsRoutes(mediator))
    .use(createCampaignsRoutes(mediator))
    .use(createAnalyticsRoutes(mediator))
    .use(createSearchRoutes(mediator))
    .use(createTicketsRoutes(mediator))
    .use(createImportExportRoutes(mediator));
}

export { seedCrm } from "./db/seed/crm";
export * from "./db/schema/crm";
export { registerCrmHooks } from "./hooks/index";
export { registerCrmJobs } from "./jobs/index";
export type { CrmJobScheduler } from "./jobs/index";
export type { EventBus } from "./hooks/index";
