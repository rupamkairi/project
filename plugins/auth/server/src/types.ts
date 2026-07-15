// Auth Plugin Types

export interface AuthSession {
  sessionId: string
  actorId: string
  orgId: string
  roles: string[]
  expiresAt: Date
  revokedAt?: Date | null
}

export interface AuthActor {
  id: string
  orgId: string
  roles: string[]
  sessionId: string
}

export interface AuthProfile {
  email: string
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
}

export interface RegisterPayload {
  email: string
  password: string
  firstName?: string
  lastName?: string
  organizationId: string
}

export interface JwtConfig {
  secret: string
  expiresIn: string
  refreshExpiresIn?: string
}

export interface PublicRouteRule {
  path: string
  match: 'exact' | 'prefix'
  methods?: readonly string[]
}

export type AuthProvider = 'local-jwt' | 'auth0' | 'clerk'

export interface AuthConfig {
  provider: AuthProvider
  jwt: JwtConfig
  /** Public routes are explicit so protected compose routes cannot be opened by a broad prefix. */
  publicRoutes?: readonly PublicRouteRule[]
  /** The route prefix is owned by the server shell (normally /platform/auth). */
  routePrefix?: string

  // Callbacks — injected by compose to bridge to identity module.
  // identity.login verifies credentials, creates session, returns sessionId.
  // JWT is issued by auth plugin using sessionId from this callback.
  onLogin?: (
    email: string,
    password: string,
    ip: string,
    userAgent: string,
    expiresAt?: Date,
  ) => Promise<{ actorId: string; orgId: string; sessionId: string }>

  onLogout?: (sessionId: string) => Promise<void>

  // Validates session is active, not expired, not revoked
  onResolveSession?: (sessionId: string) => Promise<AuthSession | null>

  // Resolves the actor's display profile for the /me contract.
  // Optional; when provided, /me returns email, firstName, lastName, avatarUrl.
  onResolveProfile?: (actorId: string, orgId: string) => Promise<AuthProfile | null>

  onRegister?: (data: RegisterPayload) => Promise<{ actorId: string }>

  onForgotPassword?: (email: string, orgId: string) => Promise<void>

  onResetPassword?: (token: string, newPassword: string) => Promise<void>

  // Refresh: look up session by sessionId, extend expiry
  onRefresh?: (sessionId: string, newExpiresAt: Date) => Promise<{ actorId: string; orgId: string }>

  /** Persist a newly issued refresh token for a just-created session. */
  onStoreRefreshToken?: (
    sessionId: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ) => Promise<void>

  /** Atomically consume the supplied refresh token and store its replacement. */
  onRotateRefreshToken?: (
    sessionId: string,
    presentedRefreshToken: string,
    nextRefreshToken: string,
    accessExpiresAt: Date,
    refreshExpiresAt: Date,
  ) => Promise<{ actorId: string; orgId: string }>

  onGetRoles?: (actorId: string) => Promise<string[]>
}

export interface AuthPlugin {
  plugin: unknown
  middleware: unknown
  config: AuthConfig
  issueToken: (payload: { actorId: string; orgId: string; sessionId: string }) => Promise<string>
  verifyToken: (
    token: string,
  ) => Promise<{ actorId: string; orgId: string; sessionId: string } | null>
}
