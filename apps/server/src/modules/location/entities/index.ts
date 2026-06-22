import type { EntitySchema } from "@core";

export const LocationSchema: EntitySchema = {
  name: "Location",
  namespace: "location",
  idPrefix: "loc_",
  fields: [
    {
      key: "type",
      type: "enum",
      enumValues: ["outlet", "table", "room", "warehouse", "ward", "bed", "virtual", "building", "floor"],
      required: true,
    },
    { key: "name", type: "string", required: true },
    { key: "code", type: "string" },
    { key: "capacity", type: "number" },
    { key: "parentId", type: "ref", refEntity: "Location" },
    { key: "addressId", type: "ref", refEntity: "Address" },
    { key: "status", type: "string", default: "active" },
  ],
};
