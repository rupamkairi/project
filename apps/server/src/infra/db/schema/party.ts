import { pgTable, text, integer, index, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

// Master table: external people a tenant manages.
// Leads, contacts, customers, students, patients, guests, riders, vendor contacts, instructors.
export const personTypeEnum = pgEnum("person_type", [
  "lead",
  "contact",
  "customer",
  "student",
  "patient",
  "guest",
  "rider",
  "vendor_contact",
  "instructor",
]);

export const persons = pgTable(
  "persons",
  {
    ...baseColumns,
    type: personTypeEnum("type").notNull().default("contact"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    source: text("source"),
    partyId: text("party_id"), // → parties (their organization, nullable)
    actorId: text("actor_id"), // → actors (login bridge, nullable)
  },
  (table) => [
    index("persons_org_type_idx").on(table.organizationId, table.type),
    index("persons_org_email_idx").on(table.organizationId, table.email),
    index("persons_org_party_idx").on(table.organizationId, table.partyId),
    index("persons_org_actor_idx").on(table.organizationId, table.actorId),
  ],
);

// Master table: external organizations a tenant manages.
// CRM accounts, ERP vendors, insurers, schools, clinics, corporate clients, NGOs.
export const partyTypeEnum = pgEnum("party_type", [
  "company",
  "vendor",
  "insurer",
  "school",
  "clinic",
  "corporate",
  "ngo",
]);

export const parties = pgTable(
  "parties",
  {
    ...baseColumns,
    type: partyTypeEnum("type").notNull().default("company"),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    employeeCount: integer("employee_count"),
  },
  (table) => [
    index("parties_org_type_idx").on(table.organizationId, table.type),
    index("parties_org_domain_idx").on(table.organizationId, table.domain),
  ],
);

export type Person = typeof persons.$inferSelect;
export type Party = typeof parties.$inferSelect;
