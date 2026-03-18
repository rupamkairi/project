// Platform Compose - Web Routes
// This file exports the platform routes as an array for integration with the host app

import { Route as loginRoute } from "./auth/login";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { Route as dashboardIndexRoute } from "./dashboard.index";
import { Route as dashboardUsersRoute } from "./dashboard.users";
import { Route as dashboardRolesRoute } from "./dashboard.roles";
import { Route as dashboardNotificationsRoute } from "./dashboard.notifications";

// Platform routes array - these can be added to the host app's route tree
// Note: The dashboard routes form a nested route tree (layout -> index, users, roles, notifications)
export const platformRoutes = [
  loginRoute,
  dashboardLayoutRoute.addChildren([
    dashboardIndexRoute,
    dashboardUsersRoute,
    dashboardRolesRoute,
    dashboardNotificationsRoute,
  ]),
];

// Also export individual routes for flexibility
export {
  loginRoute,
  dashboardLayoutRoute,
  dashboardIndexRoute,
  dashboardUsersRoute,
  dashboardRolesRoute,
  dashboardNotificationsRoute,
};
