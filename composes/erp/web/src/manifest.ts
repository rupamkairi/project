import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const erpManifest: ComposeManifest = {
  id: "erp",
  label: "ERP",
  icon: ManifestIcon,
  prefix: "/erp",
  navItems: [
    { label: "Dashboard", path: "/erp", icon: ManifestIcon },
    { label: "Procurement", path: "/erp/procurement", icon: ManifestIcon },
    { label: "Sales", path: "/erp/sales", icon: ManifestIcon },
    { label: "Inventory", path: "/erp/inventory", icon: ManifestIcon },
    { label: "Finance", path: "/erp/finance", icon: ManifestIcon },
    { label: "Manufacturing", path: "/erp/manufacturing", icon: ManifestIcon },
    { label: "HR", path: "/erp/hr", icon: ManifestIcon },
    { label: "Payroll", path: "/erp/payroll", icon: ManifestIcon },
    { label: "Tax / GST", path: "/erp/tax", icon: ManifestIcon },
  ],
  description: "ERP operations",
};
