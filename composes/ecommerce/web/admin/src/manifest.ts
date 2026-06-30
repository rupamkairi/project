import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const ecommerceAdminManifest: ComposeManifest = {
  id: "ecommerce-admin",
  label: "Ecommerce Admin",
  icon: ManifestIcon,
  prefix: "/admin/ecommerce",
  navItems: [
    { label: "Dashboard", path: "/admin/ecommerce", icon: ManifestIcon },
    { label: "Products", path: "/admin/ecommerce/products", icon: ManifestIcon },
    { label: "Categories", path: "/admin/ecommerce/categories", icon: ManifestIcon },
    { label: "Orders", path: "/admin/ecommerce/orders", icon: ManifestIcon },
    { label: "Fulfillment", path: "/admin/ecommerce/fulfillment", icon: ManifestIcon },
    { label: "Returns", path: "/admin/ecommerce/returns", icon: ManifestIcon },
    { label: "Customers", path: "/admin/ecommerce/customers", icon: ManifestIcon },
    { label: "Analytics", path: "/admin/ecommerce/analytics", icon: ManifestIcon },
    { label: "Settings", path: "/admin/ecommerce/settings", icon: ManifestIcon },
  ],
  description: "Store operations",
};
