import { create } from 'zustand'
import { workplaceApi } from '../lib/api/index'

interface WorkplaceState {
  employees: any[]
  departments: any[]
  positions: any[]
  jobOpenings: any[]
  applications: any[]
  leaveRequests: any[]
  leaveTypes: any[]
  attendance: any[]
  payrollRuns: any[]
  expenseClaims: any[]
  assets: any[]
  announcements: any[]
  loading: boolean
  error: string | null

  fetchEmployees: () => Promise<void>
  fetchDepartments: () => Promise<void>
  fetchPositions: () => Promise<void>
  fetchJobOpenings: () => Promise<void>
  fetchApplications: (jobOpeningId?: string) => Promise<void>
  fetchLeaveRequests: () => Promise<void>
  fetchLeaveTypes: () => Promise<void>
  fetchPayrollRuns: () => Promise<void>
  fetchExpenseClaims: () => Promise<void>
  fetchAssets: () => Promise<void>
  fetchAnnouncements: () => Promise<void>
}

export const useWorkplaceStore = create<WorkplaceState>((set) => ({
  employees: [],
  departments: [],
  positions: [],
  jobOpenings: [],
  applications: [],
  leaveRequests: [],
  leaveTypes: [],
  attendance: [],
  payrollRuns: [],
  expenseClaims: [],
  assets: [],
  announcements: [],
  loading: false,
  error: null,

  fetchEmployees: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.employees.list()) as any
    set({ employees: res.data?.employees ?? [], loading: false, error: res.error ?? null })
  },

  fetchDepartments: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.departments.list()) as any
    set({ departments: res.data?.departments ?? [], loading: false, error: res.error ?? null })
  },

  fetchPositions: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.positions.list()) as any
    set({ positions: res.data?.positions ?? [], loading: false, error: res.error ?? null })
  },

  fetchJobOpenings: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.jobOpenings.list()) as any
    set({ jobOpenings: res.data?.jobOpenings ?? [], loading: false, error: res.error ?? null })
  },

  fetchApplications: async (jobOpeningId?: string) => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.applications.list(jobOpeningId)) as any
    set({ applications: res.data?.applications ?? [], loading: false, error: res.error ?? null })
  },

  fetchLeaveRequests: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.leaveRequests.list()) as any
    set({ leaveRequests: res.data?.leaveRequests ?? [], loading: false, error: res.error ?? null })
  },

  fetchLeaveTypes: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.leaveTypes.list()) as any
    set({ leaveTypes: res.data?.leaveTypes ?? [], loading: false, error: res.error ?? null })
  },

  fetchPayrollRuns: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.payrollRuns.list()) as any
    set({ payrollRuns: res.data?.payrollRuns ?? [], loading: false, error: res.error ?? null })
  },

  fetchExpenseClaims: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.expenses.list()) as any
    set({ expenseClaims: res.data?.expenseClaims ?? [], loading: false, error: res.error ?? null })
  },

  fetchAssets: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.assets.list()) as any
    set({ assets: res.data?.assets ?? [], loading: false, error: res.error ?? null })
  },

  fetchAnnouncements: async () => {
    set({ loading: true, error: null })
    const res = (await workplaceApi.announcements.list()) as any
    set({ announcements: res.data?.announcements ?? [], loading: false, error: res.error ?? null })
  },
}))
