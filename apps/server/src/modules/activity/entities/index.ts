import type { EntitySchema } from "@core";

export const ActivitySchema: EntitySchema = {
  name: "Activity",
  namespace: "activity",
  idPrefix: "act_",
  fields: [
    {
      key: "type",
      type: "enum",
      enumValues: ["call", "email", "meeting", "note", "task", "log", "service_request", "visit_note"],
      required: true,
    },
    { key: "subject", type: "string" },
    { key: "body", type: "string" },
    {
      key: "status",
      type: "enum",
      enumValues: ["pending", "done", "cancelled"],
      default: "pending",
    },
    { key: "actorId", type: "ref", refEntity: "Actor" },
    { key: "entityId", type: "string" },
    { key: "entityType", type: "string" },
    { key: "dueAt", type: "date" },
    { key: "completedAt", type: "date" },
  ],
};
