import { Route as indexRoute } from "@/routes/index";
import { platformRoutes } from "@projectx/platform-web";
import { ecommerceAdminRoutes } from "@projectx/ecommerce-admin";
import { ecommerceStorefrontRoutes } from "@projectx/ecommerce-storefront";
import { sharedRootRoute } from "@projectx/shared-router";
import { createRouter } from "@tanstack/react-router";

const routeTree = sharedRootRoute.addChildren([
  indexRoute,
  ...platformRoutes,
  ...ecommerceAdminRoutes,
  ...ecommerceStorefrontRoutes,
]);

export const router = createRouter({
  routeTree,
  context: {},
  defaultErrorComponent: ({ error }) => {
    if (error?.message === "UNAUTHENTICATED") {
      window.location.href = "/login";
      return null;
    }
    throw error;
  },
  defaultNotFoundComponent: () => {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
