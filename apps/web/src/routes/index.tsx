import { createRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  return (
    <div className="px-4 py-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ProjectX
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          A modern web application built with Vite, React, TypeScript, and
          TanStack Router.
        </p>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Getting Started
          </h2>
          <p className="text-gray-600 mb-4">
            This is the home page of your application. Navigate using the menu
            above to explore different sections of the site.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
