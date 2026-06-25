export const ERP_ROLES = {
  ADMIN: "erp:admin",
  PROCUREMENT: "erp:procurement-officer",
  WAREHOUSE: "erp:warehouse-manager",
  FINANCE: "erp:finance-controller",
  OPERATIONS: "erp:operations-manager",
  VENDOR: "erp:vendor",
  AUDITOR: "erp:auditor",
  HR: "erp:hr-manager",
  EMPLOYEE: "erp:employee",
} as const;

export type ErpRole = (typeof ERP_ROLES)[keyof typeof ERP_ROLES];

export function hasPermission(actor: { roles: string[]; permissions: string[] }, permission: string): boolean {
  const { roles, permissions } = actor;
  if (roles.includes(ERP_ROLES.ADMIN)) return true;
  if (permissions.includes("erp:*")) return true;
  return permissions.includes(permission);
}

export function requirePermission(actor: { roles: string[]; permissions: string[] }, permission: string): void {
  if (!hasPermission(actor, permission)) {
    throw new Error(`Insufficient permission: ${permission}`);
  }
}

// Permission map — which roles hold which permissions
export const PERMISSION_MAP: Record<string, ErpRole[]> = {
  "erp:vendor:read": ["erp:admin", "erp:procurement-officer", "erp:warehouse-manager", "erp:finance-controller", "erp:operations-manager", "erp:auditor"],
  "erp:vendor:create": ["erp:admin", "erp:procurement-officer"],
  "erp:vendor:approve": ["erp:admin", "erp:finance-controller"],
  "erp:purchase-req:create": ["erp:admin", "erp:procurement-officer", "erp:operations-manager"],
  "erp:purchase-req:approve": ["erp:admin", "erp:finance-controller", "erp:operations-manager"],
  "erp:purchase-order:create": ["erp:admin", "erp:procurement-officer"],
  "erp:purchase-order:approve": ["erp:admin", "erp:finance-controller"],
  "erp:goods-receipt:create": ["erp:admin", "erp:warehouse-manager"],
  "erp:goods-receipt:approve": ["erp:admin", "erp:procurement-officer", "erp:warehouse-manager"],
  "erp:invoice:create": ["erp:admin", "erp:procurement-officer", "erp:finance-controller", "erp:vendor"],
  "erp:invoice:approve": ["erp:admin", "erp:finance-controller"],
  "erp:invoice:pay": ["erp:admin", "erp:finance-controller"],
  "erp:inventory:read": ["erp:admin", "erp:procurement-officer", "erp:warehouse-manager", "erp:finance-controller", "erp:operations-manager", "erp:auditor"],
  "erp:inventory:transfer": ["erp:admin", "erp:warehouse-manager"],
  "erp:ledger:read": ["erp:admin", "erp:finance-controller", "erp:auditor"],
  "erp:ledger:post": ["erp:admin", "erp:finance-controller"],
  "erp:ledger:close-period": ["erp:admin", "erp:finance-controller"],
  "erp:sales-order:create": ["erp:admin", "erp:operations-manager"],
  "erp:sales-order:approve": ["erp:admin", "erp:finance-controller"],
  "erp:hr:read": ["erp:admin", "erp:hr-manager"],
  "erp:hr:manage": ["erp:admin", "erp:hr-manager"],
  "erp:payroll:run": ["erp:admin", "erp:finance-controller", "erp:hr-manager"],
  "erp:employee:self": ["erp:employee"],
};
