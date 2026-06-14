// Auth Plugin Types

export interface AuthSession {
  sessionId: string;
  actorId: string;
  orgId: string;
  roles: string[];
  expiresAt: Date;
  revokedAt?: Date | null;
}

export interface AuthActor {
  id: string;
  orgId: string;
  roles: string[];
  sessionId: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn?: string;
}

export type AuthProvider = "local-jwt" | "auth0" | "clerk";

export interface AuthConfig {
  provider: AuthProvider;
  jwt: JwtConfig;
  publicPaths?: string[];

  // Callbacks — injected by compose to bridge to identity module.
  // identity.login verifies credentials, creates session, returns sessionId.
  // JWT is issued by auth plugin using sessionId from this callback.
  onLogin?: (
    email: string,
    password: string,
    ip: string,
    userAgent: string,
    expiresAt?: Date,
  ) => Promise<{ actorId: string; orgId: string; sessionId: string }>;

  onLogout?: (sessionId: string) => Promise<void>;

  // Validates session is active, not expired, not revoked
  onResolveSession?: (sessionId: string) => Promise<AuthSession | null>;

  onRegister?: (data: RegisterPayload) => Promise<{ actorId: string }>;

  onForgotPassword?: (email: string, orgId: string) => Promise<void>;

  onResetPassword?: (token: string, newPassword: string) => Promise<void>;

  // Refresh: look up session by sessionId, extend expiry
  onRefresh?: (sessionId: string, newExpiresAt: Date) => Promise<{ actorId: string; orgId: string }>;

  onGetRoles?: (actorId: string) => Promise<string[]>;
}

export interface AuthPlugin {
  plugin: unknown;
  middleware: unknown;
  config: AuthConfig;
  issueToken: (payload: { actorId: string; orgId: string; sessionId: string }) => Promise<string>;
  verifyToken: (token: string) => Promise<{ actorId: string; orgId: string; sessionId: string } | null>;
}
