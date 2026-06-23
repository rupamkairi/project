# ERP Compose — Implementation Plan Index

Agent: claude
Status: planned
Reference platform: [ERPNext India](https://frappe.io/erpnext/india)
Gap analysis: [docs/composes/erp.md](../../docs/composes/erp.md)

---

## Goal

Implement a full-stack ERP compose modeled on ERPNext India — covering Procure-to-Pay (P2P),
Order-to-Cash (O2C), multi-warehouse inventory, double-entry finance, manufacturing, HR/payroll,
fixed assets, and India GST/TDS/GSTR compliance — fully respecting the ProjectX architecture.

> **Master Table Architecture (MTA):** ERP reads vendors, customers, employees, items, and warehouses from foundation master tables (`parties`, `persons`, `cat_items`, `locations`) filtered by `type` + `organizationId`. ERP owns only its detail tables (prefixed `erp_`). Transactions (POs, SOs, invoices, payments, quotes) use the `transactions` + `transaction_lines` master tables. Approval flows use `pipelines` + `pipeline_stages`. See `AGENT-START.md` for the full mapping.

---

## Plan Files

### Backend (Phases 1–11)

| File | Scope |
|------|-------|
| [01-foundation.md](./01-foundation.md) | Package scaffolding, compose skeleton, permissions matrix, roles seed |
| [02-entities.md](./02-entities.md) | All erp_ detail tables (MTA) — master tables are read-only from foundation modules |
| [03-procurement.md](./03-procurement.md) | P2P flow: Vendor master, PR, PO, GRN, Vendor Invoice, Payment Voucher |
| [04-sales.md](./04-sales.md) | O2C flow: Customer master, Quotation, Sales Order, Delivery Note, Sales Invoice |
| [05-inventory.md](./05-inventory.md) | Item master, Warehouse, Stock Entry, Stock Ledger, valuation |
| [06-finance.md](./06-finance.md) | Chart of Accounts, Journal Entry, AP/AR, Bank Reconciliation, Period Close |
| [07-manufacturing.md](./07-manufacturing.md) | BOM, Work Order, Production Plan, stock consumption |
| [08-hr-payroll.md](./08-hr-payroll.md) | Employee, Department, Leave, Attendance, Salary Structure, Salary Slip |
| [09-tax-compliance.md](./09-tax-compliance.md) | GST templates, TDS, e-Invoice IRN, GSTR-1/3B report generation |
| [10-backend-logic.md](./10-backend-logic.md) | FSMs (10 entities), hooks (9 automations), scheduled jobs (8), business rules |
| [11-shell-integration.md](./11-shell-integration.md) | Server tsconfig + index.ts + schema; web tsconfig + router; DB migration; seed |

### Web UI Implementation Detail (Phases 12–21)

| File | Scope |
|------|-------|
| [12-web-overview.md](./12-web-overview.md) | Pain points, role-based nav rules, design rules, full file change manifest |
| [13-web-foundation.md](./13-web-foundation.md) | Role-aware NavBar + AuthGuard, `ErpApiClient`, Zustand stores, globals.css |
| [14-web-procurement.md](./14-web-procurement.md) | Vendors, PRs, POs (approval workflow UI), GRNs, Vendor Invoices, Payments |
| [15-web-sales.md](./15-web-sales.md) | Customers, Quotations, Sales Orders, Delivery Notes, Sales Invoices |
| [16-web-inventory.md](./16-web-inventory.md) | Items, Warehouses, Stock Summary, Stock Entry, Movements ledger |
| [17-web-finance.md](./17-web-finance.md) | Chart of Accounts, Journal Entries, AP/AR aging, Bank Reconciliation, Period Close |
| [18-web-manufacturing.md](./18-web-manufacturing.md) | BOM builder, Work Orders, Production dashboard |
| [19-web-hr.md](./19-web-hr.md) | Employee list/detail, Leave management, Attendance register |
| [20-web-payroll.md](./20-web-payroll.md) | Salary structure, payslip generation, payroll entry |
| [21-web-reports.md](./21-web-reports.md) | P&L, Balance Sheet, Cash Flow, GSTR-1/3B, KPI dashboard |

### Operations & Integration Reference (Phases 22–24)

| File | Scope |
|------|-------|
| [22-data-seeding.md](./22-data-seeding.md) | Fiscal year, chart of accounts, warehouses, GST templates, sample vendors/customers |
| [23-compose-credentials-integration.md](./23-compose-credentials-integration.md) | Ports, env vars, GST IRP API keys, bank integration, SMTP, Vite aliases, shell wiring |
| [24-missed-integrations.md](./24-missed-integrations.md) | All pitfalls + quick checklist (3-way match, double-entry, GST intra/inter, period close) |

---

## Phase Overview

```
Phase  1 — Foundation          Packages, skeleton compose, roles, permissions
Phase  2 — Entities            erp_ detail tables only (MTA — master tables read from foundation)
Phase  3 — Procurement         Vendor → PR → PO → GRN → Vendor Invoice → Payment (P2P)
Phase  4 — Sales               Customer → Quotation → SO → Delivery → Sales Invoice (O2C)
Phase  5 — Inventory           Item master, warehouses, stock entries, stock ledger, valuation
Phase  6 — Finance             CoA, journal entries, AP/AR, bank reconciliation, period close
Phase  7 — Manufacturing       BOM, work orders, production consumption
Phase  8 — HR & Payroll        Employees, leave, attendance, salary structures, payslips
Phase  9 — Tax & Compliance    GST templates, TDS, e-Invoice IRN, GSTR-1/3B generation
Phase 10 — Backend Logic       FSMs, hooks, scheduled jobs, business rules, workflow templates
Phase 11 — Shell Wiring        Server + web shell registration; DB migration; seed
Phase 12 — Web Overview        Pain points, role-nav rules, design rules, file manifest
Phase 13 — Web Foundation      Role-aware nav, ErpApiClient class, Zustand stores
Phase 14 — Web Procurement     Vendor, PR, PO, GRN, Vendor Invoice, Payment pages
Phase 15 — Web Sales           Customer, Quotation, SO, Delivery, Sales Invoice pages
Phase 16 — Web Inventory       Items, Warehouses, Stock Summary, Movements
Phase 17 — Web Finance         CoA tree, Journal Entries, AP/AR aging, Bank Recon
Phase 18 — Web Manufacturing   BOM builder, Work Orders, Production dashboard
Phase 19 — Web HR              Employees, Leave management, Attendance register
Phase 20 — Web Payroll         Salary structure, payslip run, payroll entry
Phase 21 — Web Reports         P&L, Balance Sheet, Cash Flow, GSTR reports, Dashboard
Phase 22 — Data Seeding        Fiscal year, CoA, warehouses, GST templates, dev users, sample data
Phase 23 — Credentials Config  Ports, env vars, GST API, bank config, Vite aliases, shell reg
Phase 24 — Missed Integrations All pitfalls + quick checklist
```

---

## Architecture Position

```
apps/server (Shell)
  └── .use(erpCompose)

composes/erp/
  server/
    src/
      index.ts               ← erpCompose (Elysia) + ErpApp export
      routes/
        procurement/         ← Phase 3
        sales/               ← Phase 4
        inventory/           ← Phase 5
        finance/             ← Phase 6
        manufacturing/       ← Phase 7
        hr/                  ← Phase 8
        payroll/             ← Phase 8
        tax/                 ← Phase 9
        analytics/           ← Phase 10
      hooks/                 ← Phase 10
      jobs/                  ← Phase 10
      fsm/                   ← Phase 10
      rules/                 ← Phase 10
      permissions/           ← Phase 1
      db/
        schema/              ← Phase 2
        seed/                ← Phase 1 + Phase 22
  web/
    src/
      routes/                ← Phases 14-21
      components/            ← shared ERP components
      hooks/                 ← TanStack Query hooks
      stores/                ← Zustand stores
      lib/api.ts             ← ErpApiClient

apps/web (Shell)
  └── ...erpRoutes           ← Phase 13
```

---

## Module Dependencies

| Module | Used for |
|--------|---------|
| `identity` | Actor lookup, org context, role checks, vendor portal auth |
| `catalog` | Item master sync (read-only from compose) |
| `inventory` | Stock receipt, transfer, reservation, deduction |
| `ledger` | All financial postings (PO commitment, GRN, invoice, payment) |
| `workflow` | PO approval, invoice approval, vendor onboarding |
| `document` | PO PDFs, GRN attachments, invoice documents |
| `geo` | GSTIN state code detection (intra vs inter-state GST), address validation |
| `notification` | PO approval requests, delivery due alerts, invoice payment reminders |
| `analytics` | Procurement KPIs, inventory turns, AP aging, vendor performance |

---

## Risks

1. Double-entry integrity: every financial event must produce balanced journal entry. Test with trial balance after each posting.
2. 3-way match (PO + GRN + Invoice) must be enforced before payment. Missing any leg → payment blocked.
3. GST computation: intra vs inter-state detection requires GSTIN parsing + `geo.getState`. Incorrect state → wrong tax split → compliance risk.
4. Period close: no transactions can be posted to a closed period. All routes must validate `fiscalYear.isClosed` before posting.
5. Manufacturing: BOM explosion (sub-assemblies) adds recursion — limit depth to 5 levels.
6. HR payroll: salary computation involves multiple components (basic, HRA, DA, PF, ESI, TDS) — formula engine needed per structure.
7. E-Invoice IRN: external GST IRP API call — may fail or rate-limit. Retry + fallback needed.
