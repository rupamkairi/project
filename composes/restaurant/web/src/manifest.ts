import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const restaurantManifest: ComposeManifest = {
  id: "restaurant",
  label: "Restaurant",
  icon: ManifestIcon,
  prefix: "/pos",
  navItems: [
    { label: "POS", path: "/pos/orders", icon: ManifestIcon },
    { label: "KDS", path: "/kds", icon: ManifestIcon },
    { label: "Delivery", path: "/delivery/dispatch", icon: ManifestIcon },
    { label: "Customer", path: "/customer/menu", icon: ManifestIcon },
    { label: "Admin", path: "/restaurant/dashboard", icon: ManifestIcon },
  ],
  description: "Restaurant operations",
};
