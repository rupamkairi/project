// Platform API client using Eden Treaty patterns
// This connects to the server's platform compose routes

import { createAuthenticatedClient, isAuthError, useAuthStore } from '@projectx/plugin-auth-web'

const SERVER_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:10050'
const API_BASE = SERVER_ROOT + '/platform'

interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PlatformActor {
  id: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const client = createAuthenticatedClient({
        baseUrl: SERVER_ROOT,
        getToken: () => useAuthStore.getState().token,
        refresh: () => useAuthStore.getState().refresh(),
        onSessionExpired: () => useAuthStore.getState().clearAuth(),
      })
      return {
        data: await client.request<T>(
          `${this.baseUrl.replace(SERVER_ROOT, '')}${endpoint}`,
          options,
        ),
      }
    } catch (error) {
      return { error: isAuthError(error) ? error.message : 'Network error' }
    }
  }

  // Auth
  login(email: string, password: string) {
    void email
    void password
    return { error: 'Use the shared authentication store to log in.' }
  }

  async logout() {
    await useAuthStore.getState().logout()
    return { data: { success: true } }
  }

  getMe() {
    const actor = useAuthStore.getState().actor
    return actor ? { data: actor } : { error: 'Not authenticated' }
  }

  // Users
  async getUsers(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    if (params?.status) query.set('status', params.status)

    return this.request<{ data: any[]; pagination: any }>(`/users?${query}`)
  }

  async getUser(id: string) {
    return this.request<any>(`/users/${id}`)
  }

  async createUser(data: {
    email: string
    firstName?: string
    lastName?: string
    password?: string
  }) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(
    id: string,
    data: { firstName?: string; lastName?: string; avatarUrl?: string },
  ) {
    return this.request<any>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async suspendUser(id: string) {
    return this.request<any>(`/users/${id}/suspend`, { method: 'POST' })
  }

  async activateUser(id: string) {
    return this.request<any>(`/users/${id}/activate`, { method: 'POST' })
  }

  async deleteUser(id: string) {
    return this.request<any>(`/users/${id}`, { method: 'DELETE' })
  }

  async getUserSessions(id: string) {
    return this.request<any[]>(`/users/${id}/sessions`)
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.request<any>(`/users/${userId}/sessions/${sessionId}`, {
      method: 'DELETE',
    })
  }

  // Roles
  async getRoles(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))

    return this.request<{ data: any[]; pagination: any }>(`/roles?${query}`)
  }

  async getRole(id: string) {
    return this.request<any>(`/roles/${id}`)
  }

  async createRole(data: { name: string; description?: string; permissions: string[] }) {
    return this.request<any>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.request<any>(`/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteRole(id: string) {
    return this.request<any>(`/roles/${id}`, { method: 'DELETE' })
  }

  async assignRole(roleId: string, actorIds: string[]) {
    return this.request<any>(`/roles/${roleId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ actorIds }),
    })
  }

  async revokeRole(roleId: string, actorIds: string[]) {
    return this.request<any>(`/roles/${roleId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ actorIds }),
    })
  }

  // Access catalog (cross-compose permission tree)
  async getAccessCatalog() {
    return this.request<{
      composes: {
        id: string
        label: string
        adminRoles: readonly string[]
        permissions: {
          id: string
          label: string
          description?: string
          children?: { id: string; label: string; description?: string }[]
        }[]
      }[]
    }>('/access/catalog')
  }

  async getAccessEffective(actorId?: string) {
    const query = actorId ? `?actorId=${encodeURIComponent(actorId)}` : ''
    return this.request<{
      roleKeys: string[]
      permissions: string[]
      roles: { id: string; name: string; description: string | null }[]
    }>(`/access/effective${query}`)
  }

  // Notifications
  async getTemplates(params?: {
    page?: number
    limit?: number
    search?: string
    channel?: string
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    if (params?.channel) query.set('channel', params.channel)

    return this.request<{ data: any[]; pagination: any }>(`/notifications/templates?${query}`)
  }

  async getTemplate(id: string) {
    return this.request<any>(`/notifications/templates/${id}`)
  }

  async createTemplate(data: {
    key: string
    channel: string
    subject?: string
    body: string
    locale?: string
  }) {
    return this.request<any>('/notifications/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTemplate(id: string, data: { subject?: string; body?: string }) {
    return this.request<any>(`/notifications/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTemplate(id: string) {
    return this.request<any>(`/notifications/templates/${id}`, {
      method: 'DELETE',
    })
  }

  async getTriggers(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))

    return this.request<{ data: any[]; pagination: any }>(`/notifications/triggers?${query}`)
  }

  async createTrigger(data: {
    eventPattern: string
    templateKey: string
    channel: string
    recipientExpr?: object
  }) {
    return this.request<any>('/notifications/triggers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteTrigger(id: string) {
    return this.request<any>(`/notifications/triggers/${id}`, {
      method: 'DELETE',
    })
  }

  async getLogs(params?: { page?: number; limit?: number; status?: string; templateKey?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.status) query.set('status', params.status)
    if (params?.templateKey) query.set('templateKey', params.templateKey)

    return this.request<{ data: any[]; pagination: any }>(`/notifications/logs?${query}`)
  }

  // Settings
  async getSettings() {
    return this.request<any>('/settings')
  }

  async updateSetting(key: string, value: unknown) {
    return this.request<any>(`/settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    })
  }

  // Invites
  async getInvites(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    if (params?.status) query.set('status', params.status)

    return this.request<{ data: any[]; pagination: any }>(`/invites?${query}`)
  }

  async getInvite(id: string) {
    return this.request<any>(`/invites/${id}`)
  }

  async createInvite(data: { email: string; roleIds?: string[] }) {
    return this.request<any>('/invites', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async resendInvite(id: string) {
    return this.request<any>(`/invites/${id}/resend`, {
      method: 'POST',
    })
  }

  async deleteInvite(id: string) {
    return this.request<any>(`/invites/${id}`, {
      method: 'DELETE',
    })
  }

  // Storage
  async getUploadUrl(filename: string, contentType: string, folder?: string) {
    return this.request<{
      uploadUrl: string
      fileId: string
      key: string
      expiresIn: number
    }>('/plugin-storage/upload/url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType, folder }),
    })
  }

  async completeUpload(fileId: string, metadata?: Record<string, unknown>) {
    return this.request<{ file: any }>('/plugin-storage/upload/complete', {
      method: 'POST',
      body: JSON.stringify({ fileId, metadata }),
    })
  }

  async listFiles(params?: {
    page?: number
    limit?: number
    folder?: string
    contentType?: string
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.folder) query.set('folder', params.folder)
    if (params?.contentType) query.set('contentType', params.contentType)

    return this.request<{
      files: any[]
      total: number
      page: number
      limit: number
    }>(`/plugin-storage/files?${query}`)
  }

  async getFile(fileId: string) {
    return this.request<any>(`/plugin-storage/files/${fileId}`)
  }

  async deleteFile(fileId: string) {
    return this.request<{ success: boolean }>(`/plugin-storage/files/${fileId}`, {
      method: 'DELETE',
    })
  }

  async getDownloadUrl(fileId: string) {
    return this.request<{ url: string }>(`/plugin-storage/files/${fileId}/download`)
  }

  // --- System overview ------------------------------------------------------

  private async rootRequest<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const client = createAuthenticatedClient({
        baseUrl: SERVER_ROOT,
        getToken: () => useAuthStore.getState().token,
        refresh: () => useAuthStore.getState().refresh(),
        onSessionExpired: () => useAuthStore.getState().clearAuth(),
      })
      return { data: await client.request<T>(endpoint) }
    } catch (error) {
      return { error: isAuthError(error) ? error.message : 'Network error' }
    }
  }

  async getOverview() {
    return this.request<{
      counts: {
        persons: number
        parties: number
        locations: number
        transactions: number
        pipelines: number
        activities: number
      }
    }>('/overview')
  }

  // Shell-root introspection endpoints (not under /platform)
  async getModules() {
    return this.rootRequest<{ modules: any[] }>('/modules')
  }

  async getSchemas() {
    return this.rootRequest<{ schemas: any[] }>('/schemas')
  }

  async getHealth() {
    return this.rootRequest<{ status: string; [k: string]: any }>('/health')
  }

  // --- Master table lists ---------------------------------------------------

  private async getMaster(
    resource: string,
    params?: { page?: number; limit?: number; type?: string; status?: string },
  ) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.type) query.set('type', params.type)
    if (params?.status) query.set('status', params.status)
    return this.request<{ data: any[]; pagination: any }>(`/${resource}?${query}`)
  }

  getPersons(params?: { page?: number; limit?: number; type?: string }) {
    return this.getMaster('persons', params)
  }
  getPerson(id: string) {
    return this.request<any>(`/persons/${id}`)
  }
  createPerson(data: Record<string, unknown>) {
    return this.request<any>('/persons', { method: 'POST', body: JSON.stringify(data) })
  }
  updatePerson(id: string, data: Record<string, unknown>) {
    return this.request<any>(`/persons/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }
  deletePerson(id: string) {
    return this.request<any>(`/persons/${id}`, { method: 'DELETE' })
  }

  getParties(params?: { page?: number; limit?: number; type?: string }) {
    return this.getMaster('parties', params)
  }
  getParty(id: string) {
    return this.request<any>(`/parties/${id}`)
  }
  createParty(data: Record<string, unknown>) {
    return this.request<any>('/parties', { method: 'POST', body: JSON.stringify(data) })
  }
  updateParty(id: string, data: Record<string, unknown>) {
    return this.request<any>(`/parties/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }
  deleteParty(id: string) {
    return this.request<any>(`/parties/${id}`, { method: 'DELETE' })
  }

  getLocations(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    return this.getMaster('locations', params)
  }
  getLocation(id: string) {
    return this.request<any>(`/locations/${id}`)
  }
  createLocation(data: Record<string, unknown>) {
    return this.request<any>('/locations', { method: 'POST', body: JSON.stringify(data) })
  }
  updateLocation(id: string, data: Record<string, unknown>) {
    return this.request<any>(`/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }
  deleteLocation(id: string) {
    return this.request<any>(`/locations/${id}`, { method: 'DELETE' })
  }

  getTransactions(params?: { page?: number; limit?: number; type?: string }) {
    return this.getMaster('transactions', params)
  }
  getTransaction(id: string) {
    return this.request<any>(`/transactions/${id}`)
  }
  createTransaction(data: Record<string, unknown>) {
    return this.request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) })
  }
  updateTransaction(id: string, data: Record<string, unknown>) {
    return this.request<any>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }
  deleteTransaction(id: string) {
    return this.request<any>(`/transactions/${id}`, { method: 'DELETE' })
  }
  addTransactionLine(id: string, data: Record<string, unknown>) {
    return this.request<any>(`/transactions/${id}/lines`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  removeTransactionLine(id: string, lineId: string) {
    return this.request<any>(`/transactions/${id}/lines/${lineId}`, { method: 'DELETE' })
  }

  getPipelines(params?: { page?: number; limit?: number; type?: string }) {
    return this.getMaster('pipelines', params)
  }
  getPipeline(id: string) {
    return this.request<any>(`/pipelines/${id}`)
  }
  createPipeline(data: Record<string, unknown>) {
    return this.request<any>('/pipelines', { method: 'POST', body: JSON.stringify(data) })
  }
  updatePipeline(id: string, data: Record<string, unknown>) {
    return this.request<any>(`/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }
  deletePipeline(id: string) {
    return this.request<any>(`/pipelines/${id}`, { method: 'DELETE' })
  }
  addPipelineStage(id: string, data: Record<string, unknown>) {
    return this.request<any>(`/pipelines/${id}/stages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  updatePipelineStage(id: string, stageId: string, data: Record<string, unknown>) {
    return this.request<any>(`/pipelines/${id}/stages/${stageId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }
  removePipelineStage(id: string, stageId: string) {
    return this.request<any>(`/pipelines/${id}/stages/${stageId}`, { method: 'DELETE' })
  }
  reorderPipelineStages(id: string, order: string[]) {
    return this.request<any>(`/pipelines/${id}/stages/reorder`, {
      method: 'POST',
      body: JSON.stringify({ order }),
    })
  }

  getActivities(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    return this.getMaster('activities', params)
  }
  getActivity(id: string) {
    return this.request<any>(`/activities/${id}`)
  }
  createActivity(data: Record<string, unknown>) {
    return this.request<any>('/activities', { method: 'POST', body: JSON.stringify(data) })
  }
  updateActivity(id: string, data: Record<string, unknown>) {
    return this.request<any>(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }
  deleteActivity(id: string) {
    return this.request<any>(`/activities/${id}`, { method: 'DELETE' })
  }
  completeActivity(id: string) {
    return this.request<any>(`/activities/${id}/complete`, { method: 'POST' })
  }
  cancelActivity(id: string) {
    return this.request<any>(`/activities/${id}/cancel`, { method: 'POST' })
  }
}

export const platformApi = new ApiClient(API_BASE)
