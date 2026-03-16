import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { Link } from "@tanstack/react-router";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/",
  component: DashboardIndex,
});

function DashboardIndex() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-700">
        Welcome to the Platform Dashboard
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/dashboard/users"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h3 className="text-lg font-semibold text-gray-900">Users</h3>
          <p className="mt-2 text-sm text-gray-500">
            Manage platform users and access
          </p>
        </Link>

        <Link
          to="/dashboard/roles"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h3 className="text-lg font-semibold text-gray-900">Roles</h3>
          <p className="mt-2 text-sm text-gray-500">
            Configure roles and permissions
          </p>
        </Link>

        <Link
          to="/dashboard/notifications"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <p className="mt-2 text-sm text-gray-500">
            Manage templates and triggers
          </p>
        </Link>
      </div>
    </div>
  );
}
