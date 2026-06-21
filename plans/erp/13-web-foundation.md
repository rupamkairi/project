# Phase 13 — Web Foundation

---

## 13.1 ErpApiClient

**File:** `packages/erp-web/src/api/erp-client.ts`

```typescript
export class ErpApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_API_URL}/erp`;
  }

  private getHeaders() {
    const token = localStorage.getItem("platform_token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.getHeaders(), ...init?.headers },
    });
    if (res.status === 401) {
      localStorage.removeItem("platform_token");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  }
  delete<T>(path: string) { return this.request<T>(path, { method: "DELETE" }); }
}

export const erpApi = new ErpApiClient();
```

---

## 13.2 Auth Store

**File:** `packages/erp-web/src/stores/erp-auth.store.ts`

```typescript
import { create } from "zustand";

interface ErpAuthState {
  permissions: string[];
  setPermissions: (perms: string[]) => void;
  hasPermission: (perm: string) => boolean;
}

export const useErpAuthStore = create<ErpAuthState>((set, get) => ({
  permissions: [],
  setPermissions: (permissions) => set({ permissions }),
  hasPermission: (perm) => {
    const { permissions } = get();
    return permissions.includes("erp:admin") || permissions.includes(perm);
  },
}));
```

Load permissions from platform actor token on mount:

```typescript
// In ErpLayout.tsx useEffect:
const actor = parseJwt(localStorage.getItem("platform_token") ?? "");
useErpAuthStore.getState().setPermissions(actor?.permissions ?? []);
```

---

## 13.3 Permission Guard Hook

**File:** `packages/erp-web/src/hooks/use-erp-permission.ts`

```typescript
import { useErpAuthStore } from "../stores/erp-auth.store";

export function useErpPermission(perm: string): boolean {
  return useErpAuthStore((s) => s.hasPermission(perm));
}
```

Usage in any page:
```typescript
const canPost = useErpPermission("erp:ledger:post");
if (!canPost) return <AccessDenied />;
```

---

## 13.4 ErpLayout

**File:** `packages/erp-web/src/components/layout/ErpLayout.tsx`

```typescript
export function ErpLayout() {
  return (
    <div className="flex h-screen">
      <ErpSidebar />
      <main className="flex-1 overflow-auto bg-zinc-50">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

---

## 13.5 ErpSidebar

**File:** `packages/erp-web/src/components/layout/ErpSidebar.tsx`

```typescript
const NAV_SECTIONS = [
  {
    label: "Procurement",
    permission: "erp:purchase-req:read",
    icon: ShoppingCart,
    items: [
      { label: "Vendors", path: "/erp/procurement/vendors" },
      { label: "Purchase Requests", path: "/erp/procurement/prs" },
      { label: "Purchase Orders", path: "/erp/procurement/pos" },
      { label: "GRNs", path: "/erp/procurement/grns" },
      { label: "Vendor Invoices", path: "/erp/procurement/invoices" },
      { label: "Payments", path: "/erp/procurement/payments" },
    ],
  },
  {
    label: "Sales",
    permission: "erp:sales:read",
    icon: TrendingUp,
    items: [
      { label: "Customers", path: "/erp/sales/customers" },
      { label: "Quotations", path: "/erp/sales/quotations" },
      { label: "Sales Orders", path: "/erp/sales/orders" },
      { label: "Delivery Notes", path: "/erp/sales/delivery" },
      { label: "Sales Invoices", path: "/erp/sales/invoices" },
    ],
  },
  {
    label: "Inventory",
    permission: "erp:inventory:read",
    icon: Package,
    items: [
      { label: "Items", path: "/erp/inventory/items" },
      { label: "Warehouses", path: "/erp/inventory/warehouses" },
      { label: "Stock Summary", path: "/erp/inventory/stock" },
      { label: "Stock Entry", path: "/erp/inventory/stock-entry" },
    ],
  },
  {
    label: "Finance",
    permission: "erp:ledger:read",
    icon: BarChart3,
    items: [
      { label: "Chart of Accounts", path: "/erp/finance/accounts" },
      { label: "Journal Entries", path: "/erp/finance/journals" },
      { label: "Bank Accounts", path: "/erp/finance/bank" },
      { label: "Reconciliation", path: "/erp/finance/reconciliation" },
      { label: "Period Close", path: "/erp/finance/period-close" },
    ],
  },
  {
    label: "Manufacturing",
    permission: "erp:inventory:read",
    icon: Factory,
    items: [
      { label: "BOMs", path: "/erp/manufacturing/boms" },
      { label: "Work Orders", path: "/erp/manufacturing/work-orders" },
      { label: "Dashboard", path: "/erp/manufacturing/dashboard" },
    ],
  },
  {
    label: "HR",
    permission: "erp:hr:read",
    icon: Users,
    items: [
      { label: "Employees", path: "/erp/hr/employees" },
      { label: "Leave", path: "/erp/hr/leave" },
      { label: "Attendance", path: "/erp/hr/attendance" },
    ],
  },
  {
    label: "Payroll",
    permission: "erp:payroll:run",
    icon: CreditCard,
    items: [
      { label: "Salary Structures", path: "/erp/payroll/structures" },
      { label: "Payroll Entries", path: "/erp/payroll/entries" },
    ],
  },
  {
    label: "Reports",
    permission: "erp:ledger:read",
    icon: FileText,
    items: [
      { label: "P&L", path: "/erp/reports/pnl" },
      { label: "Balance Sheet", path: "/erp/reports/balance-sheet" },
      { label: "GSTR-1", path: "/erp/reports/gstr1" },
      { label: "GSTR-3B", path: "/erp/reports/gstr3b" },
    ],
  },
];

export function ErpSidebar() {
  const { hasPermission } = useErpAuthStore();
  return (
    <aside className="w-56 border-r bg-white flex flex-col">
      <div className="h-14 flex items-center px-4 border-b font-semibold text-sm">
        ForestCloud ERP
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS
          .filter((s) => hasPermission(s.permission))
          .map((section) => (
            <SidebarSection key={section.label} section={section} />
          ))}
      </nav>
    </aside>
  );
}
```

---

## 13.6 Shared Components

**StatusBadge** (`components/shared/StatusBadge.tsx`):

```typescript
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  submitted: "bg-yellow-100 text-yellow-700",
  "pending-approval": "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  active: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  overdue: "bg-orange-100 text-orange-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-500"}`}>
      {status.replace(/-/g, " ")}
    </span>
  );
}
```

**AmountDisplay** (`components/shared/AmountDisplay.tsx`):

```typescript
export function AmountDisplay({ amount, currency = "INR" }: { amount: number; currency?: string }) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
  return <span className="tabular-nums font-mono text-right">{formatted}</span>;
}
```

**ConfirmDialog** (`components/shared/ConfirmDialog.tsx`):

```typescript
export function ConfirmDialog({
  open, onConfirm, onCancel, title, description
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## 13.7 Routes File

**File:** `packages/erp-web/src/routes.tsx`

```typescript
export const ErpRoutes = [
  { index: true, element: <Navigate to="dashboard" /> },
  { path: "dashboard", element: <KpiDashboardPage /> },
  { path: "procurement/vendors", element: <VendorsPage /> },
  { path: "procurement/vendors/:id", element: <VendorDetailPage /> },
  { path: "procurement/prs", element: <PurchaseRequisitionsPage /> },
  { path: "procurement/pos", element: <PurchaseOrdersPage /> },
  { path: "procurement/pos/:id", element: <PurchaseOrderDetailPage /> },
  { path: "procurement/grns", element: <GRNsPage /> },
  { path: "procurement/invoices", element: <VendorInvoicesPage /> },
  { path: "procurement/payments", element: <PaymentsPage /> },
  { path: "sales/customers", element: <ErpCustomersPage /> },
  { path: "sales/quotations", element: <QuotationsPage /> },
  { path: "sales/orders", element: <SalesOrdersPage /> },
  { path: "sales/delivery", element: <DeliveryNotesPage /> },
  { path: "sales/invoices", element: <SalesInvoicesPage /> },
  { path: "inventory/items", element: <ItemsPage /> },
  { path: "inventory/items/:id", element: <ItemDetailPage /> },
  { path: "inventory/warehouses", element: <WarehousesPage /> },
  { path: "inventory/stock", element: <StockSummaryPage /> },
  { path: "inventory/stock-entry", element: <StockEntryPage /> },
  { path: "finance/accounts", element: <ChartOfAccountsPage /> },
  { path: "finance/journals", element: <JournalEntriesPage /> },
  { path: "finance/journals/:id", element: <JournalEntryDetailPage /> },
  { path: "finance/bank", element: <BankAccountsPage /> },
  { path: "finance/reconciliation", element: <BankReconciliationPage /> },
  { path: "finance/period-close", element: <PeriodClosePage /> },
  { path: "manufacturing/boms", element: <BomsPage /> },
  { path: "manufacturing/boms/:id", element: <BomDetailPage /> },
  { path: "manufacturing/work-orders", element: <WorkOrdersPage /> },
  { path: "manufacturing/work-orders/:id", element: <WorkOrderDetailPage /> },
  { path: "manufacturing/dashboard", element: <ProductionDashboardPage /> },
  { path: "hr/employees", element: <EmployeesPage /> },
  { path: "hr/employees/:id", element: <EmployeeDetailPage /> },
  { path: "hr/leave", element: <LeavePage /> },
  { path: "hr/attendance", element: <AttendancePage /> },
  { path: "payroll/structures", element: <SalaryStructuresPage /> },
  { path: "payroll/entries", element: <PayrollEntriesPage /> },
  { path: "payroll/entries/:id", element: <PayrollEntryDetailPage /> },
  { path: "reports/pnl", element: <PnlPage /> },
  { path: "reports/balance-sheet", element: <BalanceSheetPage /> },
  { path: "reports/gstr1", element: <Gstr1Page /> },
  { path: "reports/gstr3b", element: <Gstr3bPage /> },
];
```
