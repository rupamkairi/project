// Commerce Module — foundation master tables: transactions, transaction_lines.
// Generic financial documents (orders, invoices, POs, bills, folios, quotes, receipts).

import type { AppModule, BootRegistry } from "@core";
import { TransactionSchema, TransactionLineSchema } from "./entities";
import {
  createTransactionHandler,
  updateTransactionHandler,
  deleteTransactionHandler,
  moveStageHandler,
  addLineHandler,
  removeLineHandler,
} from "./commands";
import {
  getTransactionHandler,
  listTransactionsHandler,
  countTransactionsHandler,
} from "./queries";

export const CommerceModule: AppModule = {
  manifest: {
    id: "commerce",
    version: "0.1.0",
    dependsOn: [],
    entities: [TransactionSchema, TransactionLineSchema],
    idPrefixes: { Transaction: "txn_", TransactionLine: "txl_" },
    events: [
      "transaction.created",
      "transaction.updated",
      "transaction.deleted",
      "transaction.stage-changed",
    ],
    commands: [
      "commerce.createTransaction",
      "commerce.updateTransaction",
      "commerce.deleteTransaction",
      "commerce.moveStage",
      "commerce.addLine",
      "commerce.removeLine",
    ],
    queries: ["commerce.getTransaction", "commerce.listTransactions", "commerce.countTransactions"],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator, schemas } = registry;

    schemas.register(TransactionSchema);
    schemas.register(TransactionLineSchema);

    mediator.registerCommand("commerce.createTransaction", createTransactionHandler);
    mediator.registerCommand("commerce.updateTransaction", updateTransactionHandler);
    mediator.registerCommand("commerce.deleteTransaction", deleteTransactionHandler);
    mediator.registerCommand("commerce.moveStage", moveStageHandler);
    mediator.registerCommand("commerce.addLine", addLineHandler);
    mediator.registerCommand("commerce.removeLine", removeLineHandler);

    mediator.registerQuery("commerce.getTransaction", getTransactionHandler);
    mediator.registerQuery("commerce.listTransactions", listTransactionsHandler);
    mediator.registerQuery("commerce.countTransactions", countTransactionsHandler);
  },

  async shutdown(): Promise<void> {},
};
