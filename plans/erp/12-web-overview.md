# Phase 12 — Web Overview

---

## 12.1 Pain Points to Avoid

| # | Problem | Rule |
|---|---------|------|
| 1 | Multiple roles → wrong nav | Role-aware NavBar: show only permitted sections |
| 2 | Finance data visible to HR user | All pages guard with `useErpPermission(perm)` |
| 3 | Platform token used on ERP routes | ERP routes use `platform_token` (same platform, different permissions) |
| 4 | Stale form state after submit | Reset form on success via `form.reset()` |
| 5 | Double-submit on slow API | Disable submit button while `isPending` |
| 6 | Table pagination ignored | All list pages default to 20 rows, support page param |
| 7 | Missing error toasts | All mutations have `onError` showing toast |
| 8 | No loading skeleton | All data pages show skeleton while fetching |
| 9 | Financial amounts not formatted | Use `formatINR(amount)` helper for all money fields |
| 10 | Print/export buttons missing | Invoices + reports need PDF export button |

---

## 12.2 Role → Section Access

| Role | Sections Visible |
|------|-----------------|
| `erp:admin` | All sections |
| `erp:procurement-officer` | Vendors, PRs, POs, GRNs, Vendor Invoices |
| `erp:finance-controller` | Finance, AP/AR, Bank Reconciliation, Reports |
| `erp:sales-officer` | Customers, Quotations, SOs, Deliveries, AR Invoices |
| `erp:inventory-manager` | Items, Warehouses, Stock Entries, BOMs, Work Orders |
| `erp:hr-manager` | Employees, Leave, Attendance, Departments |
| `erp:payroll-operator` | Salary Structures, Payroll Entries |
| `erp:operations-manager` | Manufacturing, Work Orders, PR approvals |
| `erp:employee` | Own leave, own attendance, own salary slips |

---

> **MTA Note:** Vendors, customers, employees, items, and warehouses are master table entities. ERP API routes remain the same (`/erp/vendors`, `/erp/employees`, etc.) but the server reads from foundation master tables (`parties`, `persons`, `cat_items`, `locations`) filtered by `type` and `organizationId`.

---

## 12.3 Design Rules

- Shadcn zinc palette, compact density
- All tables: sortable columns, row count badge, search input
- All detail pages: breadcrumb + status badge + action buttons top-right
- Status badges: `draft` gray, `submitted/pending` yellow, `approved/confirmed` blue, `completed/paid` green, `rejected/cancelled` red
- Money fields: always right-aligned, `₹ 1,23,456.00` Indian format
- Dates: `DD MMM YYYY` (e.g. `15 Jun 2024`)
- All actions that change state: require confirmation dialog
- All list pages: filterable by status + date range at minimum

---

## 12.4 File Change Manifest

**New package:** `packages/erp-web/`

```
packages/erp-web/src/
  index.ts
  routes.tsx
  api/
    erp-client.ts
  stores/
    erp-auth.store.ts
  components/
    layout/
      ErpLayout.tsx
      ErpNavBar.tsx
      ErpSidebar.tsx
    shared/
      StatusBadge.tsx
      AmountDisplay.tsx
      ConfirmDialog.tsx
      DateDisplay.tsx
      ExportButton.tsx
  pages/
    procurement/
      VendorsPage.tsx
      VendorDetailPage.tsx
      PurchaseRequisitionsPage.tsx
      PurchaseOrdersPage.tsx
      PurchaseOrderDetailPage.tsx
      GRNsPage.tsx
      VendorInvoicesPage.tsx
      PaymentsPage.tsx
    sales/
      ErpCustomersPage.tsx
      QuotationsPage.tsx
      SalesOrdersPage.tsx
      DeliveryNotesPage.tsx
      SalesInvoicesPage.tsx
    inventory/
      ItemsPage.tsx
      ItemDetailPage.tsx
      WarehousesPage.tsx
      StockSummaryPage.tsx
      StockEntryPage.tsx
      StockMovementsPage.tsx
    finance/
      ChartOfAccountsPage.tsx
      JournalEntriesPage.tsx
      JournalEntryDetailPage.tsx
      BankAccountsPage.tsx
      BankReconciliationPage.tsx
      PeriodClosePage.tsx
    manufacturing/
      BomsPage.tsx
      BomDetailPage.tsx
      WorkOrdersPage.tsx
      WorkOrderDetailPage.tsx
      ProductionDashboardPage.tsx
    hr/
      EmployeesPage.tsx
      EmployeeDetailPage.tsx
      LeavePage.tsx
      AttendancePage.tsx
    payroll/
      SalaryStructuresPage.tsx
      PayrollEntriesPage.tsx
      PayrollEntryDetailPage.tsx
      SalarySlipPage.tsx
    reports/
      PnlPage.tsx
      BalanceSheetPage.tsx
      CashFlowPage.tsx
      TrialBalancePage.tsx
      Gstr1Page.tsx
      Gstr3bPage.tsx
      KpiDashboardPage.tsx
```

**Updated files:**

```
apps/web/src/router/index.tsx      ← add /erp routes
apps/web/tsconfig.json             ← add @projectx/erp-web alias
apps/web/vite.config.ts            ← add resolver alias
apps/web/src/styles/globals.css    ← add @source for erp-web
apps/server/src/index.ts           ← mount ErpCompose
apps/server/tsconfig.json          ← add @projectx/erp-compose alias
apps/server/src/db/schema.ts       ← re-export erp schemas
```

---

## 12.5 Route Namespace

All ERP routes under `/erp/*`. Never conflicts with:
- `/admin/*` — platform admin
- `/store/*` — ecommerce storefront
- `/admin/ecommerce/*` — ecommerce admin

**ERP route tree:**
```
/erp                           → redirect to /erp/dashboard
/erp/dashboard                 → KPI dashboard
/erp/procurement/*
/erp/sales/*
/erp/inventory/*
/erp/finance/*
/erp/manufacturing/*
/erp/hr/*
/erp/payroll/*
/erp/reports/*
/erp/settings/*
```

---

## 12.6 API Client

Single `ErpApiClient` — uses `platform_token` from localStorage key `platform_token`.

Base URL: `${VITE_API_URL}/erp`

All requests: `Authorization: Bearer ${token}`.

On 401: redirect to platform login page.
