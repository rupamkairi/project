import { create } from "zustand";
import { erpApi } from "../lib/api/erp";

interface ErpState {
  // Procurement
  vendors: any[];
  purchaseOrders: any[];
  purchaseRequisitions: any[];
  vendorInvoices: any[];

  // Sales
  customers: any[];
  salesOrders: any[];
  quotations: any[];

  // Inventory
  items: any[];
  warehouses: any[];

  // Finance
  accounts: any[];
  fiscalYears: any[];

  // HR
  employees: any[];
  departments: any[];

  // Payroll
  payrollEntries: any[];

  // Loading
  loading: boolean;
  error: string | null;

  // Actions
  fetchVendors: () => Promise<void>;
  fetchPurchaseOrders: () => Promise<void>;
  fetchSalesOrders: () => Promise<void>;
  fetchCustomers: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchWarehouses: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchFiscalYears: () => Promise<void>;
  fetchEmployees: () => Promise<void>;
  fetchDepartments: () => Promise<void>;
  fetchPayrollEntries: () => Promise<void>;
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
  employees: [],
  departments: [],
  payrollEntries: [],
  loading: false,
  error: null,

  fetchVendors: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.vendors.list() as any;
    set({ vendors: res.data?.vendors ?? [], loading: false, error: res.error ?? null });
  },

  fetchPurchaseOrders: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.purchaseOrders.list() as any;
    set({ purchaseOrders: res.data?.purchaseOrders ?? [], loading: false, error: res.error ?? null });
  },

  fetchSalesOrders: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.salesOrders.list() as any;
    set({ salesOrders: res.data?.salesOrders ?? [], loading: false, error: res.error ?? null });
  },

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.customers.list() as any;
    set({ customers: res.data?.customers ?? [], loading: false, error: res.error ?? null });
  },

  fetchItems: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.items.list() as any;
    set({ items: res.data?.items ?? [], loading: false, error: res.error ?? null });
  },

  fetchWarehouses: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.warehouses.list() as any;
    set({ warehouses: res.data?.warehouses ?? [], loading: false, error: res.error ?? null });
  },

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.accounts.list() as any;
    set({ accounts: res.data?.accounts ?? [], loading: false, error: res.error ?? null });
  },

  fetchFiscalYears: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.reports.fiscalYears() as any;
    set({ fiscalYears: res.data?.fiscalYears ?? [], loading: false, error: res.error ?? null });
  },

  fetchEmployees: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.employees.list() as any;
    set({ employees: res.data?.employees ?? [], loading: false, error: res.error ?? null });
  },

  fetchDepartments: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.departments.list() as any;
    set({ departments: res.data?.departments ?? [], loading: false, error: res.error ?? null });
  },

  fetchPayrollEntries: async () => {
    set({ loading: true, error: null });
    const res = await erpApi.payrollEntries.list() as any;
    set({ payrollEntries: res.data?.payrollEntries ?? [], loading: false, error: res.error ?? null });
  },
}));
