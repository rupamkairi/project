// Platform Compose - Server
// This package contains platform-specific database schema, seed data, and routes
// The database setup is part of this compose

import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { roleRoutes } from "./routes/roles.js";
import { notificationRoutes } from "./routes/notifications.js";
import { settingsRoutes } from "./routes/settings.js";
import { inviteRoutes } from "./routes/invites.js";
import { createNotificationPlugin } from "@projectx/plugin-notification-server";

// Get mailer config from environment
const mailerConfig = {
  host: process.env.MAILER_HOST || "smtp.gmail.com",
  port: parseInt(process.env.MAILER_PORT || "587"),
  user: process.env.MAILER_USER || "",
  pass: process.env.MAILER_PASSWORD || "",
};

// Create notification plugin with SMTP config
const notificationPlugin = createNotificationPlugin({
  email: {
    fromAddress: process.env.MAILER_USER || "noreply@platform.projectx.dev",
    fromName: "Platform",
    smtp: mailerConfig.user ? mailerConfig : undefined,
  },
});

// Platform Compose - Elysia plugin with prefix
export const platformCompose = new Elysia({ prefix: "/platform" })
  .use(authRoutes)
  .use(userRoutes)
  .use(roleRoutes)
  .use(notificationRoutes)
  .use(settingsRoutes)
  .use(inviteRoutes)
  // Use notification plugin routes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .use(notificationPlugin.plugin as any);

export type PlatformApp = typeof platformCompose;

// Re-export notification plugin functions for use in other platform routes
export const { sendEmail, sendFromTemplate } = notificationPlugin;

// Re-export platform schema
export {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  pltInvites,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
  type PltInvite,
} from "./db/schema/platform";

// Re-export seed function
export { seedPlatform } from "./db/seed/platform";
