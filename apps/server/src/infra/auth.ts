import { createHash } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Mediator } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { sessions } from '@db/schema/identity'
import type { AuthConfig, AuthProfile, AuthSession } from '@projectx/plugin-auth-server'

const PLATFORM_ORG_ID = process.env.PLATFORM_ORG_ID ?? 'org_platform_default'

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createPlatformAuthConfig(mediator: Mediator): AuthConfig {
  return {
    provider: 'local-jwt',
    routePrefix: '/platform/auth',
    jwt: {
      secret: process.env.JWT_SECRET ?? 'change-me-in-production-at-least-32-chars!!',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
      refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d',
    },
    publicRoutes: [
      { path: '/platform/auth', match: 'prefix' },
      { path: '/health', match: 'exact' },
      { path: '/swagger', match: 'prefix' },
      { path: '/ecommerce/store', match: 'prefix' },
      { path: '/lms/verify', match: 'prefix' },
      { path: '/lms/stripe/webhook', match: 'exact', methods: ['POST'] },
    ],
    onLogin: (email, password, ip, userAgent, expiresAt) =>
      mediator.dispatch({
        type: 'identity.login',
        payload: { email, password, ip, userAgent, expiresAt },
        actorId: 'anonymous',
        orgId: PLATFORM_ORG_ID,
        correlationId: generateId(),
      }),
    onLogout: (sessionId) =>
      mediator.dispatch({
        type: 'identity.logout',
        payload: { sessionId },
        actorId: 'system',
        orgId: PLATFORM_ORG_ID,
        correlationId: generateId(),
      }),
    onResolveSession: async (sessionId): Promise<AuthSession | null> => {
      const session = await mediator.query<{
        id: string
        actorId: string
        organizationId: string
        expiresAt: Date
        revokedAt: Date | null
      } | null>({
        type: 'identity.resolveSession',
        params: { sessionId },
        actorId: 'system',
        orgId: PLATFORM_ORG_ID,
      })
      if (!session) return null

      const roles = await mediator.query<string[]>({
        type: 'identity.getPermissions',
        params: { actorId: session.actorId },
        actorId: session.actorId,
        orgId: session.organizationId,
      })
      return {
        sessionId: session.id,
        actorId: session.actorId,
        orgId: session.organizationId,
        roles,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
      }
    },
    onResolveProfile: async (actorId, orgId): Promise<AuthProfile | null> => {
      const actor = await mediator.query<{
        email: string
        firstName: string | null
        lastName: string | null
        avatarUrl: string | null
      } | null>({
        type: 'identity.getActor',
        params: { actorId },
        actorId: 'system',
        orgId,
      })
      if (!actor) return null
      return actor
    },
    onRegister: (data) =>
      mediator.dispatch({
        type: 'identity.register',
        payload: data,
        actorId: 'anonymous',
        orgId: data.organizationId,
        correlationId: generateId(),
      }),
    onForgotPassword: (email, orgId) =>
      mediator.dispatch({
        type: 'identity.requestPasswordReset',
        payload: { email, orgId },
        actorId: 'anonymous',
        orgId,
        correlationId: generateId(),
      }),
    onResetPassword: (token, newPassword) =>
      mediator.dispatch({
        type: 'identity.resetPassword',
        payload: { token, newPassword },
        actorId: 'anonymous',
        orgId: PLATFORM_ORG_ID,
        correlationId: generateId(),
      }),
    onStoreRefreshToken: async (sessionId, refreshToken, refreshExpiresAt) => {
      await db
        .update(sessions)
        .set({
          refreshTokenHash: hashRefreshToken(refreshToken),
          refreshExpiresAt,
          updatedAt: new Date(),
        })
        .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
    },
    onRotateRefreshToken: async (
      sessionId,
      presentedRefreshToken,
      nextRefreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    ) => {
      const now = new Date()
      const [session] = await db
        .update(sessions)
        .set({
          refreshTokenHash: hashRefreshToken(nextRefreshToken),
          refreshExpiresAt,
          expiresAt: accessExpiresAt,
          updatedAt: now,
        })
        .where(
          and(
            eq(sessions.id, sessionId),
            eq(sessions.refreshTokenHash, hashRefreshToken(presentedRefreshToken)),
            isNull(sessions.revokedAt),
            gt(sessions.refreshExpiresAt, now),
          ),
        )
        .returning({ actorId: sessions.actorId, orgId: sessions.organizationId })
      if (!session) throw new Error('Refresh token is invalid, expired, or already used')
      return session
    },
  }
}
