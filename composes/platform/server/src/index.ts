// Platform Compose - Server
// This package contains platform-specific database schema, seed data, and routes
// The database setup is part of this compose

// Re-export platform schema
export {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
} from "./db/schema/platform";

// Re-export seed function
export { seedPlatform } from "./db/seed/platform";

// Re-export route modules
export { authRoutes } from "./routes/auth";
export { userRoutes } from "./routes/users";
export { roleRoutes } from "./routes/roles";
export { notificationRoutes } from "./routes/notifications";
export { settingsRoutes } from "./routes/settings";
