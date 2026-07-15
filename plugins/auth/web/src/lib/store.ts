import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createAuthClient, type MeResponse } from './api'
import { AuthHttpError } from './errors'

export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous' | 'unavailable'

export interface AuthUser {
  id: string
  orgId: string
  sessionId: string
  roles: string[]
  email: string
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
}

export interface AuthState {
  user: AuthUser | null
  actor: AuthUser | null
  token: string | null
  refreshToken: string | null
  status: AuthStatus
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  apiBase: string
  configure: (apiBase: string) => void
  initialize: (apiBase?: string) => Promise<void>
  setSession: (user: AuthUser, token: string, refreshToken?: string | null) => void
  setStatus: (status: AuthStatus) => void
  clearAuth: () => void
  getToken: () => string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  restore: () => Promise<void>
  checkAuth: () => Promise<void>
  refresh: () => Promise<string | null>
  clearError: () => void
}

const LEGACY_TOKEN_KEY = 'platform_token'

function defaultApiBase(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  return env?.VITE_API_URL || 'http://localhost:10050'
}

function toUser(me: MeResponse): AuthUser {
  return {
    id: me.actorId,
    orgId: me.orgId,
    sessionId: me.sessionId,
    roles: me.roles,
    email: me.email ?? '',
    firstName: me.firstName ?? null,
    lastName: me.lastName ?? null,
    avatarUrl: me.avatarUrl ?? null,
  }
}

function mirrorLegacyToken(token: string | null): void {
  try {
    if (token) localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

let initializePromise: Promise<void> | null = null
let refreshPromise: Promise<string | null> | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const client = () => createAuthClient({ baseUrl: get().apiBase, getToken: () => get().token })
      const applySession = (user: AuthUser, token: string, refreshToken: string | null) => {
        mirrorLegacyToken(token)
        set({
          user,
          actor: user,
          token,
          refreshToken,
          status: 'authenticated',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      }
      const applyClear = () => {
        mirrorLegacyToken(null)
        set({
          user: null,
          actor: null,
          token: null,
          refreshToken: null,
          status: 'anonymous',
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      }
      const markUnavailable = (error: unknown) => {
        set({
          status: 'unavailable',
          isLoading: false,
          error: error instanceof Error ? error.message : 'Authentication service is unavailable',
        })
      }

      return {
        user: null,
        actor: null,
        token: null,
        refreshToken: null,
        status: 'initializing',
        isAuthenticated: false,
        isLoading: true,
        error: null,
        apiBase: defaultApiBase(),
        configure: (apiBase) => set({ apiBase }),
        initialize: async (apiBase) => {
          if (initializePromise) return initializePromise
          if (apiBase) set({ apiBase })
          initializePromise = (async () => {
            try {
              await useAuthStore.persist.rehydrate()
              const legacy =
                typeof window === 'undefined' ? null : window.localStorage.getItem(LEGACY_TOKEN_KEY)
              if (legacy && !get().token) set({ token: legacy })
              await get().restore()
              if (legacy && get().token) mirrorLegacyToken(get().token)
            } finally {
              initializePromise = null
            }
          })()
          return initializePromise
        },
        setSession: (user, token, refreshToken = null) => applySession(user, token, refreshToken),
        setStatus: (status) =>
          set({
            status,
            isLoading: status === 'initializing',
            isAuthenticated: status === 'authenticated',
          }),
        clearAuth: applyClear,
        getToken: () => get().token,
        login: async (email, password) => {
          set({ status: 'initializing', isLoading: true, error: null })
          try {
            const { token, refreshToken } = await client().login({ email, password })
            // `/me` is authenticated: commit the new credentials before calling it.
            set({ token, refreshToken: refreshToken ?? null })
            const me = await client().me()
            applySession(toUser(me), token, refreshToken ?? null)
            return true
          } catch (error) {
            if (error instanceof AuthHttpError && error.kind === 'network') markUnavailable(error)
            else applyClear()
            set({ error: error instanceof Error ? error.message : 'Login failed' })
            return false
          }
        },
        logout: async () => {
          try {
            await client().logout()
          } catch {
            // Local logout must succeed even if the server cannot be reached.
          }
          applyClear()
        },
        restore: async () => {
          const token = get().token
          if (!token) {
            applyClear()
            return
          }
          set({ status: 'initializing', isLoading: true, error: null })
          try {
            const me = await client().me()
            applySession(toUser(me), token, get().refreshToken)
          } catch (error) {
            if (error instanceof AuthHttpError && error.kind === 'auth') {
              const freshToken = await get().refresh()
              if (!freshToken) return
              try {
                const me = await client().me()
                applySession(toUser(me), freshToken, get().refreshToken)
              } catch (retryError) {
                if (retryError instanceof AuthHttpError && retryError.kind === 'network')
                  markUnavailable(retryError)
                else applyClear()
              }
              return
            }
            markUnavailable(error)
          }
        },
        checkAuth: async () => get().restore(),
        refresh: async () => {
          if (refreshPromise) return refreshPromise
          const refreshToken = get().refreshToken
          if (!refreshToken) {
            applyClear()
            return null
          }
          refreshPromise = (async () => {
            try {
              const refreshed = await client().refresh(refreshToken)
              set({
                token: refreshed.token,
                refreshToken: refreshed.refreshToken ?? refreshToken,
                status: 'authenticated',
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })
              mirrorLegacyToken(refreshed.token)
              return refreshed.token
            } catch (error) {
              if (error instanceof AuthHttpError && error.kind === 'network') markUnavailable(error)
              else applyClear()
              return null
            } finally {
              refreshPromise = null
            }
          })()
          return refreshPromise
        },
        clearError: () => set({ error: null }),
      }
    },
    {
      name: 'auth',
      partialize: (state) => ({
        user: state.user,
        actor: state.actor,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
      skipHydration: true,
    },
  ),
)
