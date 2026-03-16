// Platform Compose - Server
// This package contains platform-specific database schema, seed data, and routes
// The database setup is part of this compose

import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { roleRoutes } from "./routes/roles.js";
import { notificationRoutes } from "./routes/notifications.js";
import { settingsRoutes } from "./routes/settings.js";

// Platform Compose - Elysia plugin with prefix
export const platformCompose = new Elysia({ prefix: "/platform" })
  .use(authRoutes)
  .use(userRoutes)
  .use(roleRoutes)
  .use(notificationRoutes)
  .use(settingsRoutes);

export type PlatformApp = typeof platformCompose;

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
