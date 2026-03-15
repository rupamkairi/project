// Platform Compose - Server exports
// Re-export all server-side functionality from the original location

// Platform Compose Module
export { PlatformCompose } from "../../../apps/server/src/compose/platform";
export type {
  PlatformComposeType,
  ComposeManifest,
  PlatformConfig,
} from "../../../apps/server/src/compose/platform";

// Auth routes
export { authRoutes } from "../../../apps/server/src/compose/platform/routes/auth";
export type { AuthRoutes } from "../../../apps/server/src/compose/platform/routes/auth";

// User routes
export { userRoutes } from "../../../apps/server/src/compose/platform/routes/users";
export type { UserRoutes } from "../../../apps/server/src/compose/platform/routes/users";

// Role routes
export { roleRoutes } from "../../../apps/server/src/compose/platform/routes/roles";
export type { RoleRoutes } from "../../../apps/server/src/compose/platform/routes/roles";

// Settings helpers
export {
  getSetting,
  getAllSettings,
  setSetting,
  initializeDefaultSettings,
} from "../../../apps/server/src/compose/platform/lib/settings";
export type { PlatformSettings } from "../../../apps/server/src/compose/platform/lib/settings";

// Notification routes
export { notificationRoutes } from "../../../apps/server/src/compose/platform/routes/notifications";
export type { NotificationRoutes } from "../../../apps/server/src/compose/platform/routes/notifications";

// Settings routes
export { settingsRoutes } from "../../../apps/server/src/compose/platform/routes/settings";
export type { SettingsRoutes } from "../../../apps/server/src/compose/platform/routes/settings";
