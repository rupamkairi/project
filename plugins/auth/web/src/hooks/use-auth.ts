import { useAuthStore } from '../lib/store'
import type { AuthUser } from '../lib/store'

export function useAuth() {
  const {
    user,
    actor,
    token,
    status,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    restore,
    refresh,
    clearError,
    setSession,
  } = useAuthStore()

  return {
    user: user ?? actor,
    actor: user ?? actor,
    token,
    status,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    restore,
    refresh,
    checkAuth: restore,
    clearError,
    setSession,
    setAuth: setSession,
  }
}

export type UseAuthReturn = ReturnType<typeof useAuth> & { user: AuthUser | null }

export { useAuthStore } from '../lib/store'
