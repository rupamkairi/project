import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/notifications",
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
      <p className="mt-2 text-sm text-gray-700">
        Manage notification templates and triggers.
      </p>
    </div>
  );
}
