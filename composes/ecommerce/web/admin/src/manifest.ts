import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const ecommerceAdminManifest: ComposeManifest = {
  id: "ecommerce-admin",
  label: "Ecommerce Admin",
  icon: ManifestIcon,
  prefix: "/ecommerce/admin",
  navItems: [
    { label: "Dashboard", path: "/ecommerce/admin", icon: ManifestIcon },
    { label: "Products", path: "/ecommerce/admin/products", icon: ManifestIcon },
    { label: "Categories", path: "/ecommerce/admin/categories", icon: ManifestIcon },
    { label: "Orders", path: "/ecommerce/admin/orders", icon: ManifestIcon },
    { label: "Fulfillment", path: "/ecommerce/admin/fulfillment", icon: ManifestIcon },
    { label: "Returns", path: "/ecommerce/admin/returns", icon: ManifestIcon },
    { label: "Customers", path: "/ecommerce/admin/customers", icon: ManifestIcon },
    { label: "Analytics", path: "/ecommerce/admin/analytics", icon: ManifestIcon },
    { label: "Settings", path: "/ecommerce/admin/settings", icon: ManifestIcon },
  ],
  description: "Store operations",
};
