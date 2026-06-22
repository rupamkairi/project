import Elysia from "elysia";
import type { Mediator } from "@core";
import type { AuthActor } from "@projectx/plugin-auth-server";

// System overview — aggregates master-entity counts via the mediator.
// Module / table / health metadata is served by the shell root endpoints
// (/modules, /schemas, /health) and read directly by the web layer.
export function createOverviewRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/overview" }).get("/", async (ctx) => {
    const actor = (ctx as any).actor as AuthActor;
    const base = { actorId: actor.id, orgId: actor.orgId } as const;

    const [persons, parties, locations, transactions, pipelines, activities] = await Promise.all([
      mediator.query<number>({ type: "party.countPersons", params: {}, ...base }),
      mediator.query<number>({ type: "party.countParties", params: {}, ...base }),
      mediator.query<number>({ type: "location.count", params: {}, ...base }),
      mediator.query<number>({ type: "commerce.countTransactions", params: {}, ...base }),
      mediator.query<number>({ type: "pipeline.count", params: {}, ...base }),
      mediator.query<number>({ type: "activity.count", params: {}, ...base }),
    ]);

    return {
      counts: { persons, parties, locations, transactions, pipelines, activities },
    };
  });
}
