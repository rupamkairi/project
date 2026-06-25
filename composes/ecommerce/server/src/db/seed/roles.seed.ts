import { db } from "@db/client";
import { organizations, actors, roles, actorRoles } from "@db/schema/identity";
import { ECOMMERCE_PERMISSIONS } from "../../permissions";

const ECOMMERCE_ROLES = [
  {
    name: "eco:admin",
    description: "Ecommerce Store Admin - Full store management",
    permissions: Object.entries(ECOMMERCE_PERMISSIONS.admin).flatMap(([resource, actions]) =>
      Object.entries(actions)
        .filter(([, allowed]) => allowed)
        .map(([action]) => `${resource}:${action}`)
    ),
    isSystem: true,
    isDefault: false,
  },
  {
    name: "eco:manager",
    description: "Ecommerce Store Manager - Orders, products, customers",
    permissions: Object.entries(ECOMMERCE_PERMISSIONS.manager).flatMap(([resource, actions]) =>
      Object.entries(actions)
        .filter(([, allowed]) => allowed)
        .map(([action]) => `${resource}:${action}`)
    ),
    isSystem: true,
    isDefault: false,
  },
  {
    name: "eco:fulfillment",
    description: "Ecommerce Fulfillment Staff - View orders, update fulfillment",
    permissions: Object.entries(ECOMMERCE_PERMISSIONS.fulfillment).flatMap(([resource, actions]) =>
      Object.entries(actions)
        .filter(([, allowed]) => allowed)
        .map(([action]) => `${resource}:${action}`)
    ),
    isSystem: true,
    isDefault: false,
  },
  {
    name: "eco:support",
    description: "Ecommerce Support Agent - View orders, process returns",
    permissions: Object.entries(ECOMMERCE_PERMISSIONS.support).flatMap(([resource, actions]) =>
      Object.entries(actions)
        .filter(([, allowed]) => allowed)
        .map(([action]) => `${resource}:${action}`)
    ),
    isSystem: true,
    isDefault: false,
  },
  {
    name: "eco:customer",
    description: "Ecommerce Customer - Own account, orders, returns",
    permissions: Object.entries(ECOMMERCE_PERMISSIONS.customer).flatMap(([resource, actions]) =>
      Object.entries(actions)
        .filter(([, allowed]) => allowed)
        .map(([action]) => `${resource}:${action}`)
    ),
    isSystem: true,
    isDefault: true,
  },
];

export async function seedEcommerceRoles(orgId: string) {
  console.log("Seeding ecommerce roles...");

  const now = new Date();

  const seededRoles = await db
    .insert(roles)
    .values(
      ECOMMERCE_ROLES.map((r) => ({
        ...r,
        id: `eco_role_${r.name.replace("eco:", "")}`,
        organizationId: orgId,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
        deletedAt: null,
      })),
    )
    .returning();

  console.log(
    "Seeded ecommerce roles:",
    seededRoles.map((r) => r.name),
  );

  return seededRoles;
}
