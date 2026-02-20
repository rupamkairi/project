import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
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
          <p className="text-gray-600">
            This is the home page of your application. Navigate using the menu
            above to explore different sections of the site.
          </p>
        </div>
      </div>
    </div>
  );
}
