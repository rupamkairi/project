import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const restaurantManifest: ComposeManifest = {
  id: "restaurant",
  label: "Restaurant",
  icon: ManifestIcon,
  prefix: "/restaurants",
  navItems: [
    { label: "POS", path: "/restaurants/pos/orders", icon: ManifestIcon },
    { label: "KDS", path: "/restaurants/kds", icon: ManifestIcon },
    { label: "Delivery", path: "/restaurants/delivery/dispatch", icon: ManifestIcon },
    { label: "Customer", path: "/restaurants/customer/menu", icon: ManifestIcon },
    { label: "Admin", path: "/restaurants/admin/dashboard", icon: ManifestIcon },
  ],
  description: "Restaurant operations",
};
