import Elysia, { t } from 'elysia'
import { getAllSettings, setSetting } from '../lib/settings'
import type { AuthActor } from '@projectx/plugin-auth-server'
import { requirePlatformPermission } from '../permissions'

export function createSettingsRoutes() {
  return new Elysia({ prefix: '/settings' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor as AuthActor
      requirePlatformPermission(actor, 'settings:read')
      return getAllSettings()
    })
    .patch(
      '/:key',
      async ({ params, body, set, actor }: any) => {
        requirePlatformPermission(actor as AuthActor, 'settings:write')
        const { key } = params
        const { value } = body as { value: unknown }

        if (!key.includes('.')) {
          set.status = 400
          return { error: 'Key must be in format: category.settingName' }
        }

        await setSetting(key as any, value as any)
        return { success: true, key, value }
      },
      {
        body: t.Object({
          value: t.Unknown(),
        }),
      },
    )
}

export type SettingsRoutes = ReturnType<typeof createSettingsRoutes>
