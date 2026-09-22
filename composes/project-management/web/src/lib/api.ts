import { createAuthenticatedClient, useAuthStore } from '@projectx/plugin-auth-web'

const SERVER_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:10050'
const API_BASE = SERVER_ROOT + '/projects'

const transport = createAuthenticatedClient({
  baseUrl: API_BASE,
  getToken: () => useAuthStore.getState().token,
  refresh: () => useAuthStore.getState().refresh(),
  onSessionExpired: () => useAuthStore.getState().clearAuth(),
})

interface ApiResponse<T> {
  data?: T
  error?: string
}

interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

class ProjectManagementApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      return { data: await transport.request<T>(endpoint, options) }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Request failed' }
    }
  }

  // Portfolios
  async getPortfolios(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<ListResponse<any>>(`/portfolios${q}`)
  }
  async getPortfolio(id: string) {
    return this.request<any>(`/portfolios/${id}`)
  }
  async createPortfolio(data: any) {
    return this.request<any>('/portfolios', { method: 'POST', body: JSON.stringify(data) })
  }
  async updatePortfolio(id: string, data: any) {
    return this.request<any>(`/portfolios/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  // Projects
  async getProjects(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<ListResponse<any>>(`/projects${q}`)
  }
  async getProject(id: string) {
    return this.request<any>(`/projects/${id}`)
  }
  async createProject(data: any) {
    return this.request<any>('/projects', { method: 'POST', body: JSON.stringify(data) })
  }
  async updateProject(id: string, data: any) {
    return this.request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }
  async getProjectMembers(id: string) {
    return this.request<any>(`/projects/${id}/members`)
  }

  // Work Items
  async getWorkItems(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<ListResponse<any>>(`/work-items${q}`)
  }
  async getWorkItem(id: string) {
    return this.request<any>(`/work-items/${id}`)
  }
  async createWorkItem(data: any) {
    return this.request<any>('/work-items', { method: 'POST', body: JSON.stringify(data) })
  }
  async updateWorkItem(id: string, data: any) {
    return this.request<any>(`/work-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  // Sprints
  async getSprints(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<ListResponse<any>>(`/sprints${q}`)
  }
  async getSprint(id: string) {
    return this.request<any>(`/sprints/${id}`)
  }
  async createSprint(data: any) {
    return this.request<any>('/sprints', { method: 'POST', body: JSON.stringify(data) })
  }
  async startSprint(id: string) {
    return this.request<any>(`/sprints/${id}/start`, { method: 'POST' })
  }
  async completeSprint(id: string) {
    return this.request<any>(`/sprints/${id}/complete`, { method: 'POST' })
  }

  // Boards
  async getBoards(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<any>(`/boards${q}`)
  }
  async getBoard(id: string) {
    return this.request<any>(`/boards/${id}`)
  }
  async createBoard(data: any) {
    return this.request<any>('/boards', { method: 'POST', body: JSON.stringify(data) })
  }
  async deleteBoard(id: string) {
    return this.request<any>(`/boards/${id}`, { method: 'DELETE' })
  }

  // Comments
  async getComments(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<any>(`/comments${q}`)
  }
  async createComment(data: any) {
    return this.request<any>('/comments', { method: 'POST', body: JSON.stringify(data) })
  }

  // Worklogs
  async getWorklogs(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<any>(`/worklogs${q}`)
  }
  async createWorklog(data: any) {
    return this.request<any>('/worklogs', { method: 'POST', body: JSON.stringify(data) })
  }

  // PSA
  async getRetainers(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<any>(`/psa/retainers${q}`)
  }
  async getBillingDrafts(params?: Record<string, any>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<any>(`/psa/billing-drafts${q}`)
  }

  // Reports
  async getProjectHealth(projectId: string) {
    return this.request<any>(`/reports/project-health?projectId=${projectId}`)
  }
  async getSprintBurndown(sprintId: string) {
    return this.request<any>(`/reports/sprint-burndown?sprintId=${sprintId}`)
  }
  async getWorkload(projectId?: string) {
    const q = projectId ? `?projectId=${projectId}` : ''
    return this.request<any>(`/reports/workload${q}`)
  }
  async getTimeReport(projectId?: string) {
    const q = projectId ? `?projectId=${projectId}` : ''
    return this.request<any>(`/reports/time${q}`)
  }
  async getFinancialReport(projectId?: string) {
    const q = projectId ? `?projectId=${projectId}` : ''
    return this.request<any>(`/reports/financial${q}`)
  }
  async getClientSummary(projectId: string) {
    return this.request<any>(`/reports/client-summary?projectId=${projectId}`)
  }

  // My Work
  async getMyWork() {
    return this.request<any>('/my-work')
  }
}

export const projectManagementApi = new ProjectManagementApiClient()
