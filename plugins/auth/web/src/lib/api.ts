import { AuthHttpError, type AuthErrorKind } from './errors'

export interface AuthApiConfig {
  /** API origin, for example http://localhost:10050. */
  baseUrl: string
  /** Auth is mounted by Platform rather than at the API root. */
  authPath?: string
  getToken: () => string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken?: string | null
  actorId: string
}

export interface MeResponse {
  actorId: string
  orgId: string
  roles: string[]
  sessionId: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
}

export interface RegisterRequest {
  email: string
  password: string
  firstName?: string
  lastName?: string
  organizationId: string
}

export interface RegisterResponse {
  actorId: string
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

async function errorMessage(response: Response): Promise<string> {
  const fallback = response.statusText || 'Request failed'
  const body: unknown = await response.json().catch(() => undefined)
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return fallback
}

function errorKind(status: number): AuthErrorKind {
  if (status === 401) return 'auth'
  if (status === 400 || status === 422) return 'validation'
  if (status >= 500) return 'server'
  return 'unknown'
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new AuthHttpError(
      await errorMessage(response),
      errorKind(response.status),
      response.status,
    )
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function requestHeaders(init: RequestInit, token: string | null): Headers {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body !== undefined)
    headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export function createAuthClient(config: AuthApiConfig) {
  const authBase = joinUrl(config.baseUrl, config.authPath ?? '/platform/auth')
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    try {
      const response = await fetch(joinUrl(authBase, path), {
        ...init,
        headers: requestHeaders(init, config.getToken()),
      })
      return await readJson<T>(response)
    } catch (error) {
      if (error instanceof AuthHttpError) throw error
      if (error instanceof TypeError) throw new AuthHttpError('Network error', 'network')
      throw error
    }
  }

  return {
    login: (data: LoginRequest) =>
      request<LoginResponse>('/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request<{ success: boolean }>('/logout', { method: 'POST' }),
    me: () => request<MeResponse>('/me'),
    refresh: (refreshToken: string) =>
      request<{ token: string; refreshToken?: string | null }>('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    register: (data: RegisterRequest) =>
      request<RegisterResponse>('/register', { method: 'POST', body: JSON.stringify(data) }),
    forgotPassword: (email: string, orgId: string) =>
      request<{ success: boolean }>('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, orgId }),
      }),
    resetPassword: (token: string, newPassword: string) =>
      request<{ success: boolean }>('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      }),
  }
}

export type AuthClient = ReturnType<typeof createAuthClient>

export interface AuthenticatedClientConfig {
  baseUrl: string
  getToken: () => string | null
  /** The store owns refresh single-flight state for the active session. */
  refresh: () => Promise<string | null>
  onSessionExpired: () => void
}

export function createAuthenticatedClient(config: AuthenticatedClientConfig) {
  const rawRequest = (path: string, init: RequestInit, token: string | null) =>
    fetch(joinUrl(config.baseUrl, path), { ...init, headers: requestHeaders(init, token) })

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    try {
      const first = await rawRequest(path, init, config.getToken())
      if (first.status !== 401) return await readJson<T>(first)

      const freshToken = await config.refresh()
      if (!freshToken) {
        config.onSessionExpired()
        throw new AuthHttpError('Session expired', 'auth', 401)
      }

      const retry = await rawRequest(path, init, freshToken)
      if (retry.status === 401) {
        config.onSessionExpired()
        throw new AuthHttpError('Session expired', 'auth', 401)
      }
      return await readJson<T>(retry)
    } catch (error) {
      if (error instanceof AuthHttpError) throw error
      if (error instanceof TypeError) throw new AuthHttpError('Network error', 'network')
      throw error
    }
  }

  return { request }
}

export type AuthenticatedClient = ReturnType<typeof createAuthenticatedClient>
