// Platform Compose - Main export file

// Platform compose entry point
// Note: Using explicit /index subpath to avoid circular reference with platform.ts
export { PlatformCompose } from "./platform/index";
export type {
  PlatformComposeType,
  ComposeManifest,
  PlatformConfig,
} from "./platform/index";

// Auth routes
export { authRoutes } from "./platform/routes/auth";
export type { AuthRoutes } from "./platform/routes/auth";

// User routes
export { userRoutes } from "./platform/routes/users";
export type { UserRoutes } from "./platform/routes/users";

// Role routes
export { roleRoutes } from "./platform/routes/roles";
export type { RoleRoutes } from "./platform/routes/roles";

// Settings helpers
export {
  getSetting,
  getAllSettings,
  setSetting,
  initializeDefaultSettings,
} from "./platform/lib/settings";
export type { PlatformSettings } from "./platform/lib/settings";

// Notification routes
export { notificationRoutes } from "./platform/routes/notifications";
export type { NotificationRoutes } from "./platform/routes/notifications";

// Settings routes
export { settingsRoutes } from "./platform/routes/settings";
export type { SettingsRoutes } from "./platform/routes/settings";
