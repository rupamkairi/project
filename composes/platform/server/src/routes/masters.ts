import Elysia from "elysia";
import type { Mediator } from "@core";
import type { AuthActor } from "@projectx/plugin-auth-server";

// Read-only list endpoints over the foundation master tables.
// Every list goes through the mediator queries the foundation modules register.
const RESOURCES: { path: string; query: string }[] = [
  { path: "/persons", query: "party.listPersons" },
  { path: "/parties", query: "party.listParties" },
  { path: "/locations", query: "location.list" },
  { path: "/transactions", query: "commerce.listTransactions" },
  { path: "/pipelines", query: "pipeline.list" },
  { path: "/activities", query: "activity.list" },
];

export function createMastersRoutes(mediator: Mediator) {
  let app = new Elysia();

  for (const { path, query } of RESOURCES) {
    app = app.get(path, async (ctx) => {
      const actor = (ctx as any).actor as AuthActor;
      const q = (ctx as any).query ?? {};
      const page = parseInt(q.page as string) || 1;
      const limit = parseInt(q.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await mediator.query<{ items: any[]; total: number }>({
        type: query,
        params: { limit, offset, type: (q.type as string) || undefined },
        actorId: actor.id,
        orgId: actor.orgId,
      });

      return {
        data: result.items,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      };
    });
  }

  return app;
}
