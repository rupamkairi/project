export { useAuthStore } from './lib/store'
export type { AuthUser, AuthState, AuthStatus } from './lib/store'

export { createAuthClient, createAuthenticatedClient } from './lib/api'
export type {
  AuthApiConfig,
  AuthClient,
  LoginRequest,
  LoginResponse,
  MeResponse,
  RegisterRequest,
  AuthenticatedClientConfig,
  AuthenticatedClient,
} from './lib/api'

export { AuthHttpError, isAuthError } from './lib/errors'
export type { AuthErrorKind } from './lib/errors'

export { useAuth } from './hooks/use-auth'

export { AuthGuard } from './components/auth-guard'

export { AuthProvider } from './providers/auth-provider'

export { requireAuth } from './lib/redirect'
