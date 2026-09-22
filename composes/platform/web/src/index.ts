// Platform Compose - Web exports
// Re-export all client-side functionality

import '@projectx/ui/index.css'

// API Client
export { platformApi, type PlatformActor } from './lib/api/platform'

// Auth — owned by the shared auth package (single source of truth)
export {
  useAuthStore,
  useAuth,
  AuthGuard,
  requireAuth,
  redirectIfAuthenticated,
  ensureAuthInitialized,
  AuthProvider,
} from '@projectx/plugin-auth-web'
export type { AuthUser, AuthStatus } from '@projectx/plugin-auth-web'

// Routes for host app integration
export { platformRoutes } from './routes/index'
export { platformManifest } from './manifest'
