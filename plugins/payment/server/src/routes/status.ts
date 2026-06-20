import { Elysia, t } from "elysia";
import type { PaymentAdapter } from "@core";

export function createStatusRoutes(adapter: PaymentAdapter) {
  return new Elysia().get(
    "/session/:id",
    async ({ params, set }) => {
      try {
        return await adapter.getTransaction(params.id);
      } catch {
        set.status = 404;
        return { error: "Transaction not found" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
}
