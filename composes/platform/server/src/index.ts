import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { createAuthPlugin } from "@projectx/plugin-auth-server";
import type { AuthSession } from "@projectx/plugin-auth-server";
import { createUserRoutes } from "./routes/users.js";
import { createRoleRoutes } from "./routes/roles.js";
import { notificationRoutes } from "./routes/notifications.js";
import { settingsRoutes } from "./routes/settings.js";
import { createInviteRoutes } from "./routes/invites.js";
import { createOverviewRoutes } from "./routes/overview.js";
import { createMastersRoutes } from "./routes/masters.js";
import { createNotificationPlugin } from "@projectx/plugin-notification-server";
import { createStoragePlugin } from "@projectx/plugin-storage-server";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production-at-least-32-chars!!";
const PLATFORM_ORG_ID = process.env.PLATFORM_ORG_ID ?? "org_platform_default";

export function createPlatformCompose(mediator: Mediator) {
  const auth = createAuthPlugin({
    provider: "local-jwt",
    jwt: {
      secret: JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
      refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "30d",
    },
    publicPaths: [
      "/platform/auth/login",
      "/platform/auth/register",
      "/platform/auth/forgot-password",
      "/platform/auth/reset-password",
    ],

    onLogin: (email, password, ip, userAgent, expiresAt) =>
      mediator.dispatch({
        type: "identity.login",
        payload: { email, password, ip, userAgent, expiresAt },
        actorId: "anonymous",
        orgId: PLATFORM_ORG_ID,
        correlationId: generateId(),
      }),

    onLogout: (sessionId) =>
      mediator.dispatch({
        type: "identity.logout",
        payload: { sessionId },
        actorId: "system",
        orgId: PLATFORM_ORG_ID,
        correlationId: generateId(),
      }),

    onResolveSession: async (sessionId): Promise<AuthSession | null> => {
      const session = await mediator.query<any>({
        type: "identity.resolveSession",
        params: { sessionId },
        actorId: "system",
        orgId: PLATFORM_ORG_ID,
      });

      if (!session) return null;

      const roles = await mediator.query<string[]>({
        type: "identity.getPermissions",
        params: { actorId: session.actorId },
        actorId: session.actorId,
        orgId: session.organizationId,
      });

      return {
        sessionId: session.id,
        actorId: session.actorId,
        orgId: session.organizationId,
        roles,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
      };
    },

    onRegister: (data) =>
      mediator.dispatch({
        type: "identity.register",
        payload: data,
        actorId: "anonymous",
        orgId: data.organizationId ?? PLATFORM_ORG_ID,
        correlationId: generateId(),
      }),

    onForgotPassword: (email, orgId) =>
      mediator.dispatch({
        type: "identity.requestPasswordReset",
        payload: { email, orgId },
        actorId: "anonymous",
        orgId: orgId ?? PLATFORM_ORG_ID,
        correlationId: generateId(),
      }),

    onResetPassword: (token, newPassword) =>
      mediator.dispatch({
        type: "identity.resetPassword",
        payload: { token, newPassword },
        actorId: "anonymous",
        orgId: PLATFORM_ORG_ID,
        correlationId: generateId(),
      }),

    onRefresh: async (sessionId, newExpiresAt) => {
      const session = await mediator.query<any>({
        type: "identity.resolveSession",
        params: { sessionId },
        actorId: "system",
        orgId: PLATFORM_ORG_ID,
      });
      if (!session) throw new Error("Session not found");
      return { actorId: session.actorId, orgId: session.organizationId };
    },
  });

  const notificationPlugin = createNotificationPlugin({
    email: {
      fromAddress: process.env.MAILER_USER ?? "noreply@platform.projectx.dev",
      fromName: "Platform",
      smtp: process.env.MAILER_USER
        ? {
            host: process.env.MAILER_HOST ?? "smtp.gmail.com",
            port: parseInt(process.env.MAILER_PORT ?? "587"),
            user: process.env.MAILER_USER,
            pass: process.env.MAILER_PASSWORD ?? "",
          }
        : undefined,
    },
  });

  const storagePlugin = createStoragePlugin({
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
    },
  });

  return new Elysia({ prefix: "/platform" })
    .use(auth.plugin as any)
    .use(createUserRoutes(mediator))
    .use(createRoleRoutes(mediator))
    .use(createInviteRoutes())
    .use(createOverviewRoutes(mediator))
    .use(createMastersRoutes(mediator))
    .use(notificationRoutes)
    .use(settingsRoutes)
    .use(storagePlugin.plugin as any)
    .use(notificationPlugin.plugin as any);
}

export type PlatformApp = ReturnType<typeof createPlatformCompose>;

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
