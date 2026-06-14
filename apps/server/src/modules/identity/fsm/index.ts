import type { StateMachine } from "@core";

type ActorState = "pending" | "active" | "suspended" | "deleted";
type ActorEvent = "activate" | "suspend" | "reactivate" | "delete";

export const ActorFSM: StateMachine<ActorState, ActorEvent> = {
  id: "actor:lifecycle",
  entityType: "Actor",
  initial: "pending",
  states: {
    pending: {
      label: "Pending",
      on: {
        activate: { target: "active" },
      },
    },
    active: {
      label: "Active",
      on: {
        suspend: { target: "suspended" },
      },
    },
    suspended: {
      label: "Suspended",
      on: {
        reactivate: { target: "active" },
        delete: { target: "deleted" },
      },
    },
    deleted: {
      label: "Deleted",
      terminal: true,
    },
  },
  meta: {
    description: "Actor lifecycle: pending → active ↔ suspended → deleted",
  },
};
