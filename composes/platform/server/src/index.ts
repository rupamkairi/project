import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { createUserRoutes } from './routes/users.js'
import { createRoleRoutes } from './routes/roles.js'
import { createNotificationRoutes } from './routes/notifications.js'
import { createSettingsRoutes } from './routes/settings.js'
import { createInviteRoutes } from './routes/invites.js'
import { createOverviewRoutes } from './routes/overview.js'
import { createMastersRoutes } from './routes/masters.js'
import { createNotificationPlugin } from '@projectx/plugin-notification-server'
import { createStoragePlugin } from '@projectx/plugin-storage-server'

export function createPlatformCompose(mediator: Mediator) {
  const notificationPlugin = createNotificationPlugin({
    email: {
      fromAddress: process.env.MAILER_USER ?? 'noreply@platform.projectx.dev',
      fromName: 'Platform',
      ...(process.env.MAILER_USER
        ? {
            smtp: {
              host: process.env.MAILER_HOST ?? 'smtp.gmail.com',
              port: parseInt(process.env.MAILER_PORT ?? '587'),
              user: process.env.MAILER_USER,
              pass: process.env.MAILER_PASSWORD ?? '',
            },
          }
        : {}),
    },
  })

  const storagePlugin = createStoragePlugin({
    s3: {
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      ...(process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID } : {}),
      ...(process.env.S3_SECRET_ACCESS_KEY
        ? { secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : {}),
      ...(process.env.S3_BUCKET ? { bucket: process.env.S3_BUCKET } : {}),
      ...(process.env.S3_REGION ? { region: process.env.S3_REGION } : {}),
    },
  })

  return new Elysia({ prefix: '/platform' })
    .use(createUserRoutes(mediator))
    .use(createRoleRoutes(mediator))
    .use(createInviteRoutes())
    .use(createOverviewRoutes(mediator))
    .use(createMastersRoutes(mediator))
    .use(createNotificationRoutes())
    .use(createSettingsRoutes())
    .use(storagePlugin.plugin as any)
    .use(notificationPlugin.plugin as any)
}

export type PlatformApp = ReturnType<typeof createPlatformCompose>

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
} from './db/schema/platform'

// Re-export seed function
export { seedPlatform } from './db/seed/platform'
