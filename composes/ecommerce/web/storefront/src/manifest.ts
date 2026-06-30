import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const ecommerceStorefrontManifest: ComposeManifest = {
  id: "ecommerce-storefront",
  label: "Ecommerce Storefront",
  icon: ManifestIcon,
  prefix: "/store",
  navItems: [
    { label: "Home", path: "/store", icon: ManifestIcon },
    { label: "Products", path: "/store/products", icon: ManifestIcon },
    { label: "Categories", path: "/store/categories", icon: ManifestIcon },
    { label: "Search", path: "/store/search", icon: ManifestIcon },
    { label: "Cart", path: "/store/cart", icon: ManifestIcon },
    { label: "Account", path: "/store/account", icon: ManifestIcon },
  ],
  description: "Customer storefront",
};
