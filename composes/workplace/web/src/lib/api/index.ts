import { createAuthenticatedClient, useAuthStore } from '@projectx/plugin-auth-web'

const SERVER_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:10050'
const API_BASE = SERVER_ROOT + '/workplace'

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

class WorkplaceApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      return { data: await transport.request<T>(endpoint, options) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }

  // People
  departments = {
    list: () => this.request('/departments'),
    create: (body: any) =>
      this.request('/departments', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      this.request(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  }

  positions = {
    list: () => this.request('/positions'),
    create: (body: any) =>
      this.request('/positions', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      this.request(`/positions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  }

  employees = {
    list: () => this.request('/employees'),
    get: (id: string) => this.request(`/employees/${id}`),
    create: (body: any) =>
      this.request('/employees', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      this.request(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    terminate: (id: string, body: any) =>
      this.request(`/employees/${id}/terminate`, { method: 'POST', body: JSON.stringify(body) }),
    history: (id: string) => this.request(`/employees/${id}/history`),
  }

  contracts = {
    list: (employeeId?: string) =>
      this.request(`/contracts${employeeId ? `?employeeId=${employeeId}` : ''}`),
    create: (body: any) =>
      this.request('/contracts', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      this.request(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  }

  // Recruitment
  jobOpenings = {
    list: () => this.request('/job-openings'),
    create: (body: any) =>
      this.request('/job-openings', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      this.request(`/job-openings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    open: (id: string) => this.request(`/job-openings/${id}/open`, { method: 'POST' }),
    close: (id: string) => this.request(`/job-openings/${id}/close`, { method: 'POST' }),
    applications: (id: string) => this.request(`/job-openings/${id}/applications`),
  }

  applications = {
    list: (jobOpeningId?: string) =>
      this.request(`/applications${jobOpeningId ? `?jobOpeningId=${jobOpeningId}` : ''}`),
    create: (body: any) =>
      this.request('/applications', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      this.request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    shortlist: (id: string) => this.request(`/applications/${id}/shortlist`, { method: 'POST' }),
    reject: (id: string) => this.request(`/applications/${id}/reject`, { method: 'POST' }),
    hire: (id: string, body: any) =>
      this.request(`/applications/${id}/hire`, { method: 'POST', body: JSON.stringify(body) }),
    interviews: (id: string) => this.request(`/applications/${id}/interviews`),
    scheduleInterview: (id: string, body: any) =>
      this.request(`/applications/${id}/interviews`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    createOffer: (id: string, body: any) =>
      this.request(`/applications/${id}/offer`, { method: 'POST', body: JSON.stringify(body) }),
  }

  // Leave
  leaveTypes = {
    list: () => this.request('/leave-types'),
    create: (body: any) =>
      this.request('/leave-types', { method: 'POST', body: JSON.stringify(body) }),
  }

  leaveAllocations = {
    list: (employeeId?: string, year?: number) => {
      const q = new URLSearchParams()
      if (employeeId) q.set('employeeId', employeeId)
      if (year) q.set('year', String(year))
      return this.request(`/leave-allocations?${q}`)
    },
    create: (body: any) =>
      this.request('/leave-allocations', { method: 'POST', body: JSON.stringify(body) }),
  }

  leaveRequests = {
    list: () => this.request('/leave-requests'),
    create: (body: any) =>
      this.request('/leave-requests', { method: 'POST', body: JSON.stringify(body) }),
    submit: (id: string) => this.request(`/leave-requests/${id}/submit`, { method: 'POST' }),
    approve: (id: string) => this.request(`/leave-requests/${id}/approve`, { method: 'POST' }),
    reject: (id: string, body: any) =>
      this.request(`/leave-requests/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),
  }

  // Attendance
  attendance = {
    list: () => this.request('/attendance'),
    bulkImport: (records: any[]) =>
      this.request('/attendance', { method: 'POST', body: JSON.stringify(records) }),
    mark: (body: any) =>
      this.request('/attendance/mark', { method: 'POST', body: JSON.stringify(body) }),
    monthly: (month: number, year: number, employeeId?: string) => {
      const q = new URLSearchParams()
      q.set('month', String(month))
      q.set('year', String(year))
      if (employeeId) q.set('employeeId', employeeId)
      return this.request(`/attendance/monthly?${q}`)
    },
  }

  // Timesheets
  timesheets = {
    list: () => this.request('/timesheets'),
    get: (id: string) => this.request(`/timesheets/${id}`),
    create: (body: any) =>
      this.request('/timesheets', { method: 'POST', body: JSON.stringify(body) }),
    addEntry: (id: string, body: any) =>
      this.request(`/timesheets/${id}/entries`, { method: 'POST', body: JSON.stringify(body) }),
    submit: (id: string) => this.request(`/timesheets/${id}/submit`, { method: 'POST' }),
    approve: (id: string) => this.request(`/timesheets/${id}/approve`, { method: 'POST' }),
  }

  // Shifts
  shifts = {
    list: () => this.request('/shifts'),
    create: (body: any) => this.request('/shifts', { method: 'POST', body: JSON.stringify(body) }),
    assignments: (employeeId?: string) =>
      this.request(`/shifts/assignments${employeeId ? `?employeeId=${employeeId}` : ''}`),
    assign: (body: any) =>
      this.request('/shifts/assignments', { method: 'POST', body: JSON.stringify(body) }),
  }

  // Performance
  goals = {
    list: (employeeId?: string) =>
      this.request(`/goals${employeeId ? `?employeeId=${employeeId}` : ''}`),
    create: (body: any) => this.request('/goals', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      this.request(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  }

  reviewCycles = {
    list: () => this.request('/review-cycles'),
    create: (body: any) =>
      this.request('/review-cycles', { method: 'POST', body: JSON.stringify(body) }),
  }

  reviews = {
    list: (cycleId?: string, employeeId?: string) => {
      const q = new URLSearchParams()
      if (cycleId) q.set('cycleId', cycleId)
      if (employeeId) q.set('employeeId', employeeId)
      return this.request(`/reviews?${q}`)
    },
    create: (body: any) => this.request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      this.request(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    acknowledge: (id: string) => this.request(`/reviews/${id}/acknowledge`, { method: 'POST' }),
  }

  feedback = {
    list: (toEmployeeId?: string) =>
      this.request(`/feedback${toEmployeeId ? `?toEmployeeId=${toEmployeeId}` : ''}`),
    create: (body: any) =>
      this.request('/feedback', { method: 'POST', body: JSON.stringify(body) }),
  }

  // Payroll
  payComponents = {
    list: () => this.request('/pay-components'),
  }

  salaryStructures = {
    list: () => this.request('/salary-structures'),
    create: (body: any) =>
      this.request('/salary-structures', { method: 'POST', body: JSON.stringify(body) }),
  }

  compensations = {
    list: (employeeId?: string) =>
      this.request(`/compensations${employeeId ? `?employeeId=${employeeId}` : ''}`),
    create: (body: any) =>
      this.request('/compensations', { method: 'POST', body: JSON.stringify(body) }),
  }

  payrollRuns = {
    list: () => this.request('/payroll-runs'),
    get: (id: string) => this.request(`/payroll-runs/${id}`),
    create: (body: any) =>
      this.request('/payroll-runs', { method: 'POST', body: JSON.stringify(body) }),
    generate: (id: string, body?: any) =>
      this.request(`/payroll-runs/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
    submit: (id: string) => this.request(`/payroll-runs/${id}/submit`, { method: 'POST' }),
    approve: (id: string) => this.request(`/payroll-runs/${id}/approve`, { method: 'POST' }),
    exportPayment: (id: string) =>
      this.request(`/payroll-runs/${id}/export-payment`, { method: 'POST' }),
  }

  payslips = {
    list: () => this.request('/payslips'),
    get: (id: string) => this.request(`/payslips/${id}`),
  }

  // Office
  expenses = {
    list: () => this.request('/expenses'),
    get: (id: string) => this.request(`/expenses/${id}`),
    create: (body: any) =>
      this.request('/expenses', { method: 'POST', body: JSON.stringify(body) }),
    submit: (id: string) => this.request(`/expenses/${id}/submit`, { method: 'POST' }),
    approve: (id: string) => this.request(`/expenses/${id}/approve`, { method: 'POST' }),
    reject: (id: string, body: any) =>
      this.request(`/expenses/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),
  }

  assets = {
    list: () => this.request('/assets'),
    create: (body: any) => this.request('/assets', { method: 'POST', body: JSON.stringify(body) }),
    assign: (body: any) =>
      this.request('/assets/assign', { method: 'POST', body: JSON.stringify(body) }),
    return: (assignmentId: string, body: any) =>
      this.request(`/assets/return/${assignmentId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  }

  policies = {
    list: () => this.request('/policies'),
    create: (body: any) =>
      this.request('/policies', { method: 'POST', body: JSON.stringify(body) }),
    acknowledge: (id: string, body: any) =>
      this.request(`/policies/${id}/acknowledge`, { method: 'POST', body: JSON.stringify(body) }),
  }

  announcements = {
    list: () => this.request('/announcements'),
    create: (body: any) =>
      this.request('/announcements', { method: 'POST', body: JSON.stringify(body) }),
  }

  visitors = {
    list: () => this.request('/visitors'),
    create: (body: any) =>
      this.request('/visitors', { method: 'POST', body: JSON.stringify(body) }),
    checkIn: (id: string, body: any) =>
      this.request(`/visitors/${id}/check-in`, { method: 'POST', body: JSON.stringify(body) }),
    checkOut: (id: string) => this.request(`/visitors/${id}/check-out`, { method: 'POST' }),
  }

  rooms = {
    list: () => this.request('/rooms'),
    create: (body: any) => this.request('/rooms', { method: 'POST', body: JSON.stringify(body) }),
    bookings: (roomId?: string) =>
      this.request(`/rooms/bookings${roomId ? `?roomId=${roomId}` : ''}`),
    book: (body: any) =>
      this.request('/rooms/bookings', { method: 'POST', body: JSON.stringify(body) }),
    cancelBooking: (id: string) => this.request(`/rooms/bookings/${id}/cancel`, { method: 'POST' }),
  }

  // My Workplace (self-service)
  my = {
    profile: () => this.request('/my/profile'),
    leaveBalance: () => this.request('/my/leave-balance'),
    leaveRequests: () => this.request('/my/leave-requests'),
    attendance: () => this.request('/my/attendance'),
    timesheets: () => this.request('/my/timesheets'),
    payslips: () => this.request('/my/payslips'),
    expenses: () => this.request('/my/expenses'),
    goals: () => this.request('/my/goals'),
    reviews: () => this.request('/my/reviews'),
    announcements: () => this.request('/my/announcements'),
    policies: () => this.request('/my/policies'),
    approvals: () => this.request('/my/approvals'),
  }

  // Reports
  reports = {
    headcount: () => this.request('/reports/headcount'),
    attendanceSummary: (month?: number, year?: number) => {
      const q = new URLSearchParams()
      if (month) q.set('month', String(month))
      if (year) q.set('year', String(year))
      return this.request(`/reports/attendance-summary?${q}`)
    },
    payrollSummary: () => this.request('/reports/payroll-summary'),
    leaveUtilization: () => this.request('/reports/leave-utilization'),
    expenseSummary: () => this.request('/reports/expense-summary'),
  }

  // Integration
  integration = {
    directory: () => this.request('/integration/directory'),
    capacity: () => this.request('/integration/capacity'),
    approvedTimesheets: (from?: string, to?: string) => {
      const q = new URLSearchParams()
      if (from) q.set('from', from)
      if (to) q.set('to', to)
      return this.request(`/integration/approved-timesheets?${q}`)
    },
    payrollJournal: (period?: string) =>
      this.request(`/integration/payroll-journal${period ? `?period=${period}` : ''}`),
  }

  // Settings
  settings = {
    get: () => this.request('/settings'),
    organization: () => this.request('/settings/organization'),
    leavePolicy: () => this.request('/settings/leave-policy'),
    shifts: () => this.request('/settings/shifts'),
    payrollConfig: () => this.request('/settings/payroll-config'),
    bootstrap: (body: any) =>
      this.request('/setup/bootstrap', { method: 'POST', body: JSON.stringify(body) }),
  }

  // Onboarding
  onboarding = {
    list: () => this.request('/onboarding'),
    workflow: (employeeId: string) => this.request(`/onboarding/${employeeId}/workflow`),
    completeTask: (employeeId: string, body: any) =>
      this.request(`/onboarding/${employeeId}/complete-task`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    offboarding: () => this.request('/onboarding/offboarding'),
  }
}

export const workplaceApi = new WorkplaceApiClient()
