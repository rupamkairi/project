// Ecommerce Routes Index
// Exports all ecommerce API routes

export { adminRoutes } from "./admin";
export { storefrontRoutes } from "./storefront";

// Re-export for convenience
import { adminRoutes } from "./admin";
import { storefrontRoutes } from "./storefront";

export const ecommerceRoutes = [adminRoutes, storefrontRoutes];

export default ecommerceRoutes;
