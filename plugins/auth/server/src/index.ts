import { Elysia } from 'elysia'
import { createLocalJwtProvider } from './providers/local-jwt'
import { createAuthMiddleware } from './middleware'
import { createAuthRoutes } from './routes/auth'
import type { AuthConfig } from './types'

export function createAuthPlugin(config: AuthConfig) {
  const provider = createLocalJwtProvider(config.jwt)
  const middleware = createAuthMiddleware(config, provider)
  const routes = createAuthRoutes(config, provider)

  const plugin = new Elysia({ name: '@projectx/plugin-auth' }).use(middleware).use(routes)

  return {
    plugin,
    middleware,
    config,
    issueToken: (payload: { actorId: string; orgId: string; sessionId: string }) =>
      provider.issueToken(payload),
    verifyToken: (token: string) => provider.verifyToken(token),
  }
}

export type {
  AuthConfig,
  AuthPlugin,
  AuthSession,
  AuthActor,
  AuthProfile,
  RegisterPayload,
  JwtConfig,
  AuthProvider,
  PublicRouteRule,
} from './types'

export { createAuthMiddleware } from './middleware'
export { createLocalJwtProvider } from './providers/local-jwt'
