import type { EntitySchema } from "@core";

export const PersonSchema: EntitySchema = {
  name: "Person",
  namespace: "party",
  idPrefix: "per_",
  fields: [
    {
      key: "type",
      type: "enum",
      enumValues: [
        "lead",
        "contact",
        "customer",
        "student",
        "patient",
        "guest",
        "rider",
        "vendor_contact",
        "instructor",
      ],
      default: "contact",
    },
    { key: "firstName", type: "string" },
    { key: "lastName", type: "string" },
    { key: "email", type: "string" },
    { key: "phone", type: "string" },
    { key: "source", type: "string" },
    { key: "partyId", type: "ref", refEntity: "Party" },
    { key: "actorId", type: "ref", refEntity: "Actor" },
  ],
};

export const PartySchema: EntitySchema = {
  name: "Party",
  namespace: "party",
  idPrefix: "pty_",
  fields: [
    {
      key: "type",
      type: "enum",
      enumValues: ["company", "vendor", "insurer", "school", "clinic", "corporate", "ngo"],
      default: "company",
    },
    { key: "name", type: "string", required: true },
    { key: "domain", type: "string" },
    { key: "industry", type: "string" },
    { key: "employeeCount", type: "number" },
  ],
};
