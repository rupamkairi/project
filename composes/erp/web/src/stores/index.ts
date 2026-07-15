import { create } from 'zustand'
import { erpApi } from '../lib/api/index'

interface ErpState {
  vendors: any[]
  purchaseOrders: any[]
  purchaseRequisitions: any[]
  vendorInvoices: any[]

  customers: any[]
  salesOrders: any[]
  quotations: any[]

  items: any[]
  warehouses: any[]

  accounts: any[]
  fiscalYears: any[]

  loading: boolean
  error: string | null

  fetchVendors: () => Promise<void>
  fetchPurchaseOrders: () => Promise<void>
  fetchSalesOrders: () => Promise<void>
  fetchCustomers: () => Promise<void>
  fetchItems: () => Promise<void>
  fetchWarehouses: () => Promise<void>
  fetchAccounts: () => Promise<void>
  fetchFiscalYears: () => Promise<void>
}

export const useErpStore = create<ErpState>((set) => ({
  vendors: [],
  purchaseOrders: [],
  purchaseRequisitions: [],
  vendorInvoices: [],
  customers: [],
  salesOrders: [],
  quotations: [],
  items: [],
  warehouses: [],
  accounts: [],
  fiscalYears: [],
  loading: false,
  error: null,

  fetchVendors: async () => {
    set({ loading: true, error: null })
    const res = (await erpApi.vendors.list()) as any
    set({ vendors: res.data?.vendors ?? [], loading: false, error: res.error ?? null })
  },

  fetchPurchaseOrders: async () => {
    set({ loading: true, error: null })
    const res = (await erpApi.purchaseOrders.list()) as any
    set({
      purchaseOrders: res.data?.purchaseOrders ?? [],
      loading: false,
      error: res.error ?? null,
    })
  },

  fetchSalesOrders: async () => {
    set({ loading: true, error: null })
    const res = (await erpApi.salesOrders.list()) as any
    set({ salesOrders: res.data?.salesOrders ?? [], loading: false, error: res.error ?? null })
  },

  fetchCustomers: async () => {
    set({ loading: true, error: null })
    const res = (await erpApi.customers.list()) as any
    set({ customers: res.data?.customers ?? [], loading: false, error: res.error ?? null })
  },

  fetchItems: async () => {
    set({ loading: true, error: null })
    const res = (await erpApi.items.list()) as any
    set({ items: res.data?.items ?? [], loading: false, error: res.error ?? null })
  },

  fetchWarehouses: async () => {
    set({ loading: true, error: null })
    const res = (await erpApi.warehouses.list()) as any
    set({ warehouses: res.data?.warehouses ?? [], loading: false, error: res.error ?? null })
  },

  fetchAccounts: async () => {
    set({ loading: true, error: null })
    const res = (await erpApi.accounts.list()) as any
    set({ accounts: res.data?.accounts ?? [], loading: false, error: res.error ?? null })
  },

  fetchFiscalYears: async () => {
    set({ loading: true, error: null })
    const res = (await erpApi.reports.fiscalYears()) as any
    set({ fiscalYears: res.data?.fiscalYears ?? [], loading: false, error: res.error ?? null })
  },
}))
