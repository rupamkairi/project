export const ECOMMERCE_PERMISSIONS = {
  admin: {
    products: { create: true, read: true, update: true, delete: true },
    orders: { create: true, read: true, update: true, delete: true },
    customers: { create: true, read: true, update: true, delete: true },
    returns: { create: true, read: true, update: true, delete: true },
    analytics: { read: true },
    settings: { create: true, read: true, update: true, delete: true },
    regions: { create: true, read: true, update: true, delete: true },
    shippingOptions: { create: true, read: true, update: true, delete: true },
    taxRegions: { create: true, read: true, update: true, delete: true },
  },
  manager: {
    products: { create: true, read: true, update: true, delete: true },
    orders: { create: true, read: true, update: true, delete: true },
    customers: { create: true, read: true, update: true, delete: true },
    returns: { create: true, read: true, update: true, delete: true },
    analytics: { read: true },
    settings: { read: false },
    regions: { read: true },
    shippingOptions: { create: true, read: true, update: true, delete: true },
    taxRegions: { read: true },
  },
  fulfillment: {
    products: { read: true },
    orders: { read: true, update: true },
    customers: {},
    returns: { read: true, update: true },
    analytics: {},
    settings: {},
    regions: {},
    shippingOptions: { read: true },
    taxRegions: {},
  },
  support: {
    products: { read: true },
    orders: { read: true, update: true },
    customers: { read: true },
    returns: { create: true, read: true, update: true },
    analytics: {},
    settings: {},
    regions: {},
    shippingOptions: { read: true },
    taxRegions: {},
  },
  customer: {
    orders: { read: true },
    returns: { create: true, read: true },
    account: { read: true, update: true },
    addresses: { create: true, read: true, update: true, delete: true },
  },
} as const;

export type EcommerceRole = keyof typeof ECOMMERCE_PERMISSIONS;
export type EcommerceResource = string;
export type EcommerceAction = "create" | "read" | "update" | "delete";

export function hasPermission(
  role: EcommerceRole,
  resource: EcommerceResource,
  action: EcommerceAction
): boolean {
  const rolePermissions = ECOMMERCE_PERMISSIONS[role];
  if (!rolePermissions) return false;

  const resourcePermissions = (rolePermissions as Record<string, Record<string, boolean>>)[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions[action] === true;
}
