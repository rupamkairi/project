import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link
                to="/"
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-blue-600 font-medium transition-colors"
                activeProps={{
                  className: "text-blue-600 border-b-2 border-blue-600",
                }}
              >
                Home
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-blue-600 font-medium transition-colors"
                activeProps={{
                  className: "text-blue-600 border-b-2 border-blue-600",
                }}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-blue-600 font-medium transition-colors"
                activeProps={{
                  className: "text-blue-600 border-b-2 border-blue-600",
                }}
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  ),
});
