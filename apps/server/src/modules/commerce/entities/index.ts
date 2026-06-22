import type { EntitySchema } from "@core";

export const TransactionSchema: EntitySchema = {
  name: "Transaction",
  namespace: "commerce",
  idPrefix: "txn_",
  fields: [
    {
      key: "type",
      type: "enum",
      enumValues: ["order", "invoice", "purchase_order", "sales_order", "bill", "folio", "quote", "receipt"],
      required: true,
    },
    { key: "referenceNo", type: "string" },
    { key: "personId", type: "ref", refEntity: "Person" },
    { key: "partyId", type: "ref", refEntity: "Party" },
    { key: "stageId", type: "ref", refEntity: "PipelineStage" },
    { key: "totalAmount", type: "number" },
    { key: "totalCurrency", type: "string" },
    { key: "taxAmount", type: "number" },
    { key: "taxCurrency", type: "string" },
  ],
};

export const TransactionLineSchema: EntitySchema = {
  name: "TransactionLine",
  namespace: "commerce",
  idPrefix: "txl_",
  fields: [
    { key: "transactionId", type: "ref", refEntity: "Transaction", required: true },
    { key: "itemId", type: "ref", refEntity: "Item" },
    { key: "description", type: "string" },
    { key: "qty", type: "number", default: 1 },
    { key: "unitPriceAmount", type: "number" },
    { key: "unitPriceCurrency", type: "string" },
    { key: "taxRate", type: "number", default: 0 },
    { key: "lineTotalAmount", type: "number" },
    { key: "lineTotalCurrency", type: "string" },
  ],
};
