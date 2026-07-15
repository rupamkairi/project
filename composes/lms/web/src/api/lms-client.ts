import { createAuthenticatedClient, useAuthStore } from '@projectx/plugin-auth-web'

// LMS API Client

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10050'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const transport = createAuthenticatedClient({
  baseUrl: `${API_BASE}/lms`,
  getToken: () => useAuthStore.getState().token,
  refresh: () => useAuthStore.getState().refresh(),
  onSessionExpired: () => useAuthStore.getState().clearAuth(),
})

export class LmsApiClient {
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const request: RequestInit = { method }
    if (body !== undefined) request.body = JSON.stringify(body)
    try {
      return await transport.request<T>(path, request)
    } catch (error) {
      if (error instanceof Error) throw new ApiError(0, error.message)
      throw new ApiError(0, 'Request failed')
    }
  }

  get = <T>(path: string) => this.request<T>('GET', path)
  post = <T>(path: string, body?: unknown) => this.request<T>('POST', path, body)
  patch = <T>(path: string, body?: unknown) => this.request<T>('PATCH', path, body)
  delete = <T>(path: string) => this.request<T>('DELETE', path)
}

export const lmsApi = new LmsApiClient()
