import { createRouter, redirect } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { Route as indexRoute } from "./routes/index";
import { Route as dashboardRoute } from "./routes/dashboard";
import { platformRoutes } from "@projectx/platform-web";

// Create the route tree
// Add platform root with its children to avoid duplicate __root__ IDs
const routeTree = sharedRootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  // Add platform root with its children - this replaces the parent
  ...platformRoutes,
]);

export const router = createRouter({
  routeTree,
  // Handle authentication errors - redirect to login when auth check fails
  context: {
    // This will be populated by the auth store
  },
  defaultErrorComponent: ({ error }) => {
    // Check if it's an authentication error
    if (error?.message === "UNAUTHENTICATED") {
      // Use window.location for redirect to avoid router issues
      window.location.href = "/login";
      return null;
    }
    // Re-throw other errors
    throw error;
  },
  // Handle not-found errors
  defaultNotFoundComponent: () => {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p className="text-gray-600 mt-2">The page you're looking for doesn't exist.</p>
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
