import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/roles",
  component: RolesPage,
});

function RolesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
      <p className="mt-2 text-sm text-gray-700">
        Configure roles and permissions for the platform.
      </p>
    </div>
  );
}
