const SERVER_ROOT = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_BASE = SERVER_ROOT + "/erp";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ErpApiClient {
  private baseUrl: string;
  private get token() {
    return localStorage.getItem("platform_token");
  }

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Request failed" };
      return { data };
    } catch (e) {
      return { error: String(e) };
    }
  }

  // ── Procurement ──────────────────────────────────────────────────────────────
  vendors = {
    list: () => this.request("/vendors"),
    get: (id: string) => this.request(`/vendors/${id}`),
    create: (body: any) => this.request("/vendors", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) => this.request(`/vendors/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    approve: (id: string) => this.request(`/vendors/${id}/approve`, { method: "POST" }),
    blacklist: (id: string, body: any) => this.request(`/vendors/${id}/blacklist`, { method: "POST", body: JSON.stringify(body) }),
  };

  purchaseRequisitions = {
    list: () => this.request("/purchase-requisitions"),
    get: (id: string) => this.request(`/purchase-requisitions/${id}`),
    create: (body: any) => this.request("/purchase-requisitions", { method: "POST", body: JSON.stringify(body) }),
    submit: (id: string) => this.request(`/purchase-requisitions/${id}/submit`, { method: "POST" }),
    approve: (id: string) => this.request(`/purchase-requisitions/${id}/approve`, { method: "POST" }),
    reject: (id: string, body: any) => this.request(`/purchase-requisitions/${id}/reject`, { method: "POST", body: JSON.stringify(body) }),
    convertToPo: (id: string) => this.request(`/purchase-requisitions/${id}/convert-to-po`, { method: "POST" }),
  };

  purchaseOrders = {
    list: () => this.request("/purchase-orders"),
    get: (id: string) => this.request(`/purchase-orders/${id}`),
    create: (body: any) => this.request("/purchase-orders", { method: "POST", body: JSON.stringify(body) }),
    approve: (id: string) => this.request(`/purchase-orders/${id}/approve`, { method: "POST" }),
    cancel: (id: string) => this.request(`/purchase-orders/${id}/cancel`, { method: "POST" }),
  };

  goodsReceipts = {
    list: () => this.request("/goods-receipts"),
    get: (id: string) => this.request(`/goods-receipts/${id}`),
    create: (body: any) => this.request("/goods-receipts", { method: "POST", body: JSON.stringify(body) }),
    confirm: (id: string) => this.request(`/goods-receipts/${id}/confirm`, { method: "POST" }),
  };

  vendorInvoices = {
    list: () => this.request("/vendor-invoices"),
    get: (id: string) => this.request(`/vendor-invoices/${id}`),
    create: (body: any) => this.request("/vendor-invoices", { method: "POST", body: JSON.stringify(body) }),
    submit: (id: string) => this.request(`/vendor-invoices/${id}/submit`, { method: "POST" }),
    approve: (id: string) => this.request(`/vendor-invoices/${id}/approve`, { method: "POST" }),
    match: (id: string) => this.request(`/vendor-invoices/${id}/match`, { method: "POST" }),
  };

  payments = {
    list: () => this.request("/payments"),
    create: (body: any) => this.request("/payments", { method: "POST", body: JSON.stringify(body) }),
  };

  // ── Sales ────────────────────────────────────────────────────────────────────
  customers = {
    list: () => this.request("/customers"),
    get: (id: string) => this.request(`/customers/${id}`),
    create: (body: any) => this.request("/customers", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) => this.request(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  };

  quotations = {
    list: () => this.request("/quotations"),
    create: (body: any) => this.request("/quotations", { method: "POST", body: JSON.stringify(body) }),
    convertToSo: (id: string) => this.request(`/quotations/${id}/convert-to-so`, { method: "POST" }),
  };

  salesOrders = {
    list: () => this.request("/sales-orders"),
    get: (id: string) => this.request(`/sales-orders/${id}`),
    create: (body: any) => this.request("/sales-orders", { method: "POST", body: JSON.stringify(body) }),
    confirm: (id: string) => this.request(`/sales-orders/${id}/confirm`, { method: "POST" }),
    cancel: (id: string) => this.request(`/sales-orders/${id}/cancel`, { method: "POST" }),
  };

  deliveryNotes = {
    list: () => this.request("/delivery-notes"),
    create: (body: any) => this.request("/delivery-notes", { method: "POST", body: JSON.stringify(body) }),
    ship: (id: string) => this.request(`/delivery-notes/${id}/ship`, { method: "POST" }),
  };

  salesInvoices = {
    list: () => this.request("/sales-invoices"),
    get: (id: string) => this.request(`/sales-invoices/${id}`),
    create: (body: any) => this.request("/sales-invoices", { method: "POST", body: JSON.stringify(body) }),
    submit: (id: string) => this.request(`/sales-invoices/${id}/submit`, { method: "POST" }),
  };

  // ── Inventory ────────────────────────────────────────────────────────────────
  items = {
    list: () => this.request("/items"),
    get: (id: string) => this.request(`/items/${id}`),
    reorderAlerts: () => this.request("/items/reorder-alerts"),
    stock: (id: string, warehouseId?: string) =>
      this.request(`/items/${id}/stock${warehouseId ? `?warehouseId=${warehouseId}` : ""}`),
  };

  warehouses = {
    list: () => this.request("/warehouses"),
    get: (id: string) => this.request(`/warehouses/${id}`),
    create: (body: any) => this.request("/warehouses", { method: "POST", body: JSON.stringify(body) }),
    stock: (id: string) => this.request(`/warehouses/${id}/stock`),
  };

  stock = {
    list: () => this.request("/stock"),
    create: (body: any) => this.request("/stock", { method: "POST", body: JSON.stringify(body) }),
    summary: (itemId?: string, warehouseId?: string) => {
      const q = new URLSearchParams();
      if (itemId) q.set("itemId", itemId);
      if (warehouseId) q.set("warehouseId", warehouseId);
      return this.request(`/stock/summary?${q}`);
    },
    movements: (itemId?: string) => this.request(`/stock/movements${itemId ? `?itemId=${itemId}` : ""}`),
  };

  // ── Finance ──────────────────────────────────────────────────────────────────
  accounts = {
    list: () => this.request("/accounts"),
    coa: () => this.request("/accounts/coa"),
    create: (body: any) => this.request("/accounts", { method: "POST", body: JSON.stringify(body) }),
    journalEntries: () => this.request("/journal-entries"),
    createJe: (body: any) => this.request("/journal-entries", { method: "POST", body: JSON.stringify(body) }),
    postJe: (id: string) => this.request(`/journal-entries/${id}/post`, { method: "POST" }),
  };

  reports = {
    trialBalance: (fyId: string) => this.request(`/reports/trial-balance?fiscalYearId=${fyId}`),
    pnl: (fyId: string) => this.request(`/reports/pnl?fiscalYearId=${fyId}`),
    balanceSheet: (fyId: string) => this.request(`/reports/balance-sheet?fiscalYearId=${fyId}`),
    apAging: () => this.request("/reports/ap-aging"),
    arAging: () => this.request("/reports/ar-aging"),
    fiscalYears: () => this.request("/fiscal-years"),
    createFy: (body: any) => this.request("/fiscal-years", { method: "POST", body: JSON.stringify(body) }),
    closePeriod: (id: string) => this.request(`/fiscal-years/${id}/close`, { method: "POST" }),
  };

  // ── Manufacturing ────────────────────────────────────────────────────────────
  boms = {
    list: () => this.request("/boms"),
    get: (id: string) => this.request(`/boms/${id}`),
    create: (body: any) => this.request("/boms", { method: "POST", body: JSON.stringify(body) }),
    explode: (id: string) => this.request(`/boms/${id}/explode`),
    activate: (id: string) => this.request(`/boms/${id}/activate`, { method: "POST" }),
  };

  workOrders = {
    list: () => this.request("/work-orders"),
    get: (id: string) => this.request(`/work-orders/${id}`),
    create: (body: any) => this.request("/work-orders", { method: "POST", body: JSON.stringify(body) }),
    start: (id: string) => this.request(`/work-orders/${id}/start`, { method: "POST" }),
    complete: (id: string) => this.request(`/work-orders/${id}/complete`, { method: "POST" }),
    cancel: (id: string) => this.request(`/work-orders/${id}/cancel`, { method: "POST" }),
  };

  manufacturing = {
    dashboard: () => this.request("/manufacturing/dashboard"),
  };

  // ── HR ───────────────────────────────────────────────────────────────────────
  departments = {
    list: () => this.request("/departments"),
    create: (body: any) => this.request("/departments", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) => this.request(`/departments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  };

  employees = {
    list: () => this.request("/employees"),
    get: (id: string) => this.request(`/employees/${id}`),
    create: (body: any) => this.request("/employees", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) => this.request(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    leaveBalance: (id: string) => this.request(`/employees/${id}/leave-balance`),
    attendance: (id: string) => this.request(`/employees/${id}/attendance`),
    salarySlips: (id: string) => this.request(`/employees/${id}/salary-slips`),
  };

  leave = {
    types: () => this.request("/leave-types"),
    createType: (body: any) => this.request("/leave-types", { method: "POST", body: JSON.stringify(body) }),
    allocations: () => this.request("/leave-allocations"),
    createAllocation: (body: any) => this.request("/leave-allocations", { method: "POST", body: JSON.stringify(body) }),
    applications: () => this.request("/leave-applications"),
    createApplication: (body: any) => this.request("/leave-applications", { method: "POST", body: JSON.stringify(body) }),
    submitApplication: (id: string) => this.request(`/leave-applications/${id}/submit`, { method: "POST" }),
    approveApplication: (id: string) => this.request(`/leave-applications/${id}/approve`, { method: "POST" }),
    rejectApplication: (id: string, body: any) => this.request(`/leave-applications/${id}/reject`, { method: "POST", body: JSON.stringify(body) }),
  };

  attendance = {
    list: () => this.request("/attendance"),
    bulkImport: (records: any[]) => this.request("/attendance", { method: "POST", body: JSON.stringify(records) }),
    mark: (body: any) => this.request("/attendance/mark", { method: "POST", body: JSON.stringify(body) }),
    monthly: (month: number, year: number) => this.request(`/attendance/monthly?month=${month}&year=${year}`),
  };

  // ── Payroll ──────────────────────────────────────────────────────────────────
  salaryStructures = {
    list: () => this.request("/salary-structures"),
    get: (id: string) => this.request(`/salary-structures/${id}`),
    create: (body: any) => this.request("/salary-structures", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) => this.request(`/salary-structures/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  };

  payrollEntries = {
    list: () => this.request("/payroll-entries"),
    get: (id: string) => this.request(`/payroll-entries/${id}`),
    create: (body: any) => this.request("/payroll-entries", { method: "POST", body: JSON.stringify(body) }),
    generateSlips: (id: string, body?: any) => this.request(`/payroll-entries/${id}/generate-slips`, { method: "POST", body: JSON.stringify(body ?? {}) }),
    submit: (id: string) => this.request(`/payroll-entries/${id}/submit`, { method: "POST" }),
  };

  salarySlips = {
    list: () => this.request("/salary-slips"),
    get: (id: string) => this.request(`/salary-slips/${id}`),
    submit: (id: string) => this.request(`/salary-slips/${id}/submit`, { method: "POST" }),
  };

  // ── Tax/GST ──────────────────────────────────────────────────────────────────
  gst = {
    templates: () => this.request("/gst-templates"),
    createTemplate: (body: any) => this.request("/gst-templates", { method: "POST", body: JSON.stringify(body) }),
    gstr1Preview: (period: string) => this.request(`/gst-returns/gstr1/preview?period=${period}`),
    generateGstr1: (body: any) => this.request("/gst-returns/gstr1", { method: "POST", body: JSON.stringify(body) }),
    gstr3bPreview: (period: string) => this.request(`/gst-returns/gstr3b/preview?period=${period}`),
    generateGstr3b: (body: any) => this.request("/gst-returns/gstr3b", { method: "POST", body: JSON.stringify(body) }),
    validateGstin: (gstin: string) => this.request(`/gstin/validate?gstin=${gstin}`),
  };
}

export const erpApi = new ErpApiClient(API_BASE);
