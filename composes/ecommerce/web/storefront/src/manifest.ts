import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const ecommerceStorefrontManifest: ComposeManifest = {
  id: "ecommerce-storefront",
  label: "Ecommerce Storefront",
  icon: ManifestIcon,
  prefix: "/ecommerce/store",
  navItems: [
    { label: "Home", path: "/ecommerce/store", icon: ManifestIcon },
    { label: "Products", path: "/ecommerce/store/products", icon: ManifestIcon },
    { label: "Categories", path: "/ecommerce/store/categories", icon: ManifestIcon },
    { label: "Search", path: "/ecommerce/store/search", icon: ManifestIcon },
    { label: "Cart", path: "/ecommerce/store/cart", icon: ManifestIcon },
    { label: "Account", path: "/ecommerce/store/account", icon: ManifestIcon },
  ],
  description: "Customer storefront",
};
