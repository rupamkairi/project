export interface StorageActor {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  type: 'human' | 'system' | 'api_key'
  status: 'pending' | 'active' | 'suspended' | 'deleted'
}

export interface StorageFile {
  id: string
  organizationId: string
  bucket: string
  key: string
  filename: string
  contentType: string
  size: number
  meta: Record<string, unknown>
  uploadedById: string
  uploadedBy?: StorageActor
  status: 'pending' | 'complete' | 'failed'
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  version: number
}

export class StorageApi {
  private readonly requestClient

  constructor(baseUrl: string, token?: string) {
    this.requestClient = createAuthenticatedClient({
      baseUrl,
      getToken: () => token ?? useAuthStore.getState().token,
      refresh: () => useAuthStore.getState().refresh(),
      onSessionExpired: () => useAuthStore.getState().clearAuth(),
    })
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const organizationId =
      typeof window !== 'undefined'
        ? localStorage.getItem('organizationId') || 'default'
        : 'default'

    return this.requestClient.request<T>(endpoint, {
      ...options,
      headers: {
        'x-organization-id': organizationId,
        ...options.headers,
      },
    })
  }

  async getUploadUrl(
    filename: string,
    contentType: string,
    folder?: string,
  ): Promise<{
    uploadUrl: string
    fileId: string
    key: string
    expiresIn: number
  }> {
    return this.request('/platform/plugin-storage/upload/url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType, folder }),
    })
  }

  async completeUpload(
    fileId: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ file: StorageFile }> {
    return this.request('/platform/plugin-storage/upload/complete', {
      method: 'POST',
      body: JSON.stringify({ fileId, metadata }),
    })
  }

  async listFiles(params?: {
    page?: number
    limit?: number
    folder?: string
    contentType?: string
  }): Promise<{
    files: StorageFile[]
    total: number
    page: number
    limit: number
  }> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.folder) searchParams.set('folder', params.folder)
    if (params?.contentType) searchParams.set('contentType', params.contentType)

    const query = searchParams.toString()
    return this.request(`/platform/plugin-storage/files${query ? `?${query}` : ''}`)
  }

  async getFile(fileId: string): Promise<StorageFile> {
    return this.request(`/platform/plugin-storage/files/${fileId}`)
  }

  async deleteFile(fileId: string): Promise<{ success: boolean }> {
    return this.request(`/platform/plugin-storage/files/${fileId}`, {
      method: 'DELETE',
    })
  }

  async getDownloadUrl(fileId: string): Promise<{ url: string }> {
    return this.request(`/platform/plugin-storage/files/${fileId}/download`)
  }
}

export function createStorageApi(baseUrl: string, token?: string): StorageApi {
  return new StorageApi(baseUrl, token)
}
import { createAuthenticatedClient, useAuthStore } from '@projectx/plugin-auth-web'
