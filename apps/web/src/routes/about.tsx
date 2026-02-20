import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About Us</h1>
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <p className="text-gray-600 text-lg">
            ProjectX is a modern web application designed to showcase the power
            of cutting-edge web technologies.
          </p>
          <h2 className="text-2xl font-semibold text-gray-800 mt-6">
            Our Mission
          </h2>
          <p className="text-gray-600">
            We aim to build fast, accessible, and user-friendly applications
            that deliver exceptional experiences to our users.
          </p>
          <h2 className="text-2xl font-semibold text-gray-800 mt-6">
            Technology Stack
          </h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Vite - Next generation frontend tooling</li>
            <li>React - A JavaScript library for building user interfaces</li>
            <li>TypeScript - JavaScript with syntax for types</li>
            <li>TanStack Router - Fully type-safe routing solution</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
