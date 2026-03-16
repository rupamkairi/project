// Platform compose re-export
// This file re-exports platform functionality from @projectx/platform-server
// The actual implementation lives in composes/platform/server

export {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
  seedPlatform,
  authRoutes,
  userRoutes,
  roleRoutes,
  notificationRoutes,
  settingsRoutes,
} from "@projectx/platform-server";
