# ERP Compose — Agent Start

**Read first:** `plans/AGENT-START.md` (universal bootstrap: path aliases, layer rules, existing modules, compose pattern).

Then return here for ERP-specific context.

---

## Goal

Implement ERP compose modeled on ERPNext (India edition).
Reference: https://frappe.io/erpnext/india
Full plan: `plans/erp/00-index.md` (read for phase ordering).

Core flows covered:
- **P2P (Procure to Pay):** Vendor → PR → PO → GRN → Vendor Invoice → Payment
- **O2C (Order to Cash):** Customer → Quotation → Sales Order → Delivery → Sales Invoice → Payment
- **Inventory:** Item master, multi-warehouse, stock entries, stock ledger
- **Finance:** Chart of Accounts, journal entries, AP/AR, bank reconciliation, period close
- **Manufacturing:** BOM, work orders, production planning
- **HR & Payroll:** Employees, leave, attendance, salary slips
- **Fixed Assets:** Asset tracking, depreciation
- **Tax (India):** GST (CGST/SGST/IGST), TDS, GSTR-1/3B compliance

---

## Phase Execution Order

### Backend + Shell

1. `01-foundation.md` — packages, skeleton compose, roles/permissions. **Must complete first.**
2. `02-entities.md` — all erp_ detail tables (MTA). Complete before any routes.
3. `03-procurement.md` — P2P flow: vendor, PR, PO, GRN, vendor invoice, payment.
4. `04-sales.md` — O2C flow: customer, quotation, SO, delivery, AR invoice.
5. `05-inventory.md` — item master, warehouse, stock entry, stock ledger.
6. `06-finance.md` — chart of accounts, journal entries, AP/AR, bank reconciliation.
7. `07-manufacturing.md` — BOM, work orders, production plan.
8. `08-hr-payroll.md` — employees, departments, leave, attendance, salary slips.
9. `09-tax-compliance.md` — GST templates, TDS, GSTR-1/3B generation.
10. `10-backend-logic.md` — FSMs, hooks, jobs, rules, workflow templates.
11. `11-shell-integration.md` — **integration gate.** Wire into server + web shells. Run migration. Seed. Verify.

Do not skip phases. Complete Phase N before Phase N+1.
**Phase 11 is the integration gate — nothing is live until this phase completes.**

### Web UI Detail (read after Phase 11)

12. `12-web-overview.md` — pain points, design rules, full file change manifest.
13. `13-web-foundation.md` — role-based nav, `ErpApiClient`, layout shell, Zustand stores.
14. `14-web-procurement.md` — Vendors, PRs, POs, GRNs, Vendor Invoices, Payments.
15. `15-web-sales.md` — Customers, Quotations, Sales Orders, Delivery Notes, AR Invoices.
16. `16-web-inventory.md` — Items, Warehouses, Stock Summary, Stock Entry, Movements.
17. `17-web-finance.md` — CoA, Journal Entries, AP/AR aging, Bank Reconciliation, Period Close.
18. `18-web-manufacturing.md` — BOM, Work Orders, Production Dashboard.
19. `19-web-hr.md` — Employees, Departments, Leave Management, Attendance.
20. `20-web-payroll.md` — Salary Structures, Payslips, Payroll Entry.
21. `21-web-reports.md` — P&L, Balance Sheet, Cash Flow, GSTR reports, KPI Dashboard.

### Operations Reference (read before starting)

**Read `24-missed-integrations.md` before Phase 1.**

22. `22-data-seeding.md` — fiscal year, chart of accounts, warehouses, GST templates, sample vendors/customers.
23. `23-compose-credentials-integration.md` — ports, env vars, GST API keys, bank integration config, Vite aliases.
24. `24-missed-integrations.md` — all pitfalls + quick checklist (3-way match, period close, GST computation, double-entry invariants).

---

## Compose Identity

| Property | Value |
|----------|-------|
| Compose name | `erp` |
| Server package | `@projectx/erp-server` |
| Web package | `@projectx/erp-web` |
| Server path | `composes/erp/server/` |
| Web path | `composes/erp/web/` |
| Elysia prefix | `/erp` |
| Export fn | `createErpCompose(mediator, bus, scheduler)` |
| Export type | `ErpApp` |
| DB table prefix | `erp_` |
| Drizzle object prefix | `erp` (e.g. `erpVendor`, `erpPurchaseOrder`) |

---

## Master Table Architecture (MTA)

ERP compose follows the Master Table Architecture. Foundation modules own shared generic tables; ERP reads/filters them by `type` + `organizationId`. ERP only creates its own `erp_`-prefixed detail tables.

### Master Tables (read/filter only — owned by foundation modules)

| Foundation table | ERP filter | What it replaces |
|-----------------|------------|-----------------|
| `parties` | `type = "vendor"` | `erp_vendors` |
| `parties` | `type = "customer"` | `erp_customers` |
| `persons` | `type = "employee"` | `erp_employees` |
| `persons` | `type = "vendor_contact"` | `erp_vendor_contacts` |
| `cat_items` | `type in ("product","stock_item","asset")` | `erp_items` |
| `locations` | `type = "warehouse"` | `erp_warehouses` |
| `transactions` + `transaction_lines` | `type = "purchase_order"` | `erp_purchase_orders` + `erp_po_items` |
| `transactions` + `transaction_lines` | `type = "sales_order"` | `erp_sales_orders` + `erp_so_items` |
| `transactions` + `transaction_lines` | `type = "quote"` | `erp_quotations` + items |
| `transactions` + `transaction_lines` | `type = "invoice"` | `erp_vendor_invoices` / `erp_sales_invoices` |
| `transactions` + `transaction_lines` | `type = "receipt"` / `"payment"` | `erp_payment_vouchers` |
| `pipelines` + `pipeline_stages` | `entityType = "erp.po"` | PO approval pipeline |
| `pipelines` + `pipeline_stages` | `entityType = "erp.so"` | SO approval pipeline |
| `pipelines` + `pipeline_stages` | `entityType = "erp.pr"` | PR approval pipeline |
| `activities` | linked to vendor/PO/employee | interaction logs |

Seed pipelines before any approval flows: call `seedPipeline(orgId, "erp.pr", [...])`, `seedPipeline(orgId, "erp.po", [...])`, `seedPipeline(orgId, "erp.so", [...])`.

### Detail Tables (erp-owned, create in Phase 2)

| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `erpPurchaseRequisition` | `erp_purchase_requisitions` | id, orgId, requestedById (persons.id), departmentId, urgency, justification, stageId (pipeline_stages.id for erp.pr) |
| `erpPrItem` | `erp_pr_items` | id, requisitionId, itemId (cat_items.id), qty, estimatedUnitCost, preferredVendorId (parties.id) |
| `erpGoodsReceipt` | `erp_grns` | id, orgId, transactionId (transactions.id — the PO), locationId (locations.id), receivedById (persons.id), receivedAt |
| `erpGrItem` | `erp_grn_items` | id, grnId, itemId (cat_items.id), qtyOrdered, qtyReceived, condition |
| `erpDeliveryNote` | `erp_delivery_notes` | id, orgId, dnNumber, transactionId (SO transaction), locationId, date, status, shippingAddress |
| `erpDnItem` | `erp_dn_items` | id, dnId, transactionLineId, itemId (cat_items.id), qty, uom, batchNo |
| `erpStockEntry` | `erp_stock_entries` | id, orgId, type (receipt/issue/transfer/manufacture/adjustment), date, reference, referenceType, totalValue |
| `erpStockEntryItem` | `erp_stock_entry_items` | id, entryId, itemId (cat_items.id), locationFrom (locations.id), locationTo (locations.id), qty, valuationRate, batchNo |
| `erpStockLedger` | `erp_stock_ledger` | id, itemId (cat_items.id), locationId (locations.id), date, qty, valuationRate, stockValue, balance, entryId |
| `erpBom` | `erp_bom` | id, orgId, itemId (cat_items.id — finished product), version, isActive |
| `erpBomItem` | `erp_bom_items` | id, bomId, componentItemId (cat_items.id), qty, unit, scrapPercent |
| `erpWorkOrder` | `erp_work_orders` | id, orgId, bomId, qty, scheduledStart, scheduledEnd, status, stageId (pipeline_stages.id) |
| `erpDepartment` | `erp_departments` | id, orgId, name, code, parentId (self-ref), managerId (persons.id) |
| `erpDesignation` | `erp_designations` | id, orgId, name, level, departmentId |
| `erpLeaveType` | `erp_leave_types` | id, orgId, name, maxDays, isPaid, isCarryForward |
| `erpLeaveAllocation` | `erp_leave_allocations` | id, personId (persons.id), leaveTypeId, year, allocated, used, balance |
| `erpLeaveApplication` | `erp_leave_applications` | id, personId (persons.id), leaveTypeId, fromDate, toDate, days, status, reason, approvedBy |
| `erpAttendance` | `erp_attendance` | id, personId (persons.id), date, status, checkIn, checkOut, workHours |
| `erpGlAccount` | `erp_gl_accounts` | id, orgId, code, name, type (asset/liability/equity/revenue/expense), parentId |
| `erpJournalEntry` | `erp_journal_entries` | id, orgId, transactionId (optional), description, postedAt, totalDebit, totalCredit, fiscalYearId |
| `erpJournalLine` | `erp_journal_lines` | id, journalId, glAccountId, debit, credit, partyId (parties.id), personId (persons.id), costCenter |
| `erpFiscalYear` | `erp_fiscal_years` | id, orgId, name, startDate, endDate, isClosed |
| `erpBankAccount` | `erp_bank_accounts` | id, orgId, accountName, accountNo, bankName, ifsc, currency, glAccountId |
| `erpBankTransaction` | `erp_bank_transactions` | id, bankAccountId, date, description, debit, credit, balance, status (unmatched/matched), matchedTransactionId (transactions.id) |
| `erpSalaryStructure` | `erp_salary_structures` | id, orgId, name, components (jsonb) |
| `erpSalarySlip` | `erp_salary_slips` | id, payrollRunId, personId (persons.id), gross, deductions, net, status |
| `erpPayrollRun` | `erp_payroll_runs` | id, orgId, period (YYYY-MM), status, processedAt, totalGross, totalNet |
| `erpAsset` | `erp_assets` | id, orgId, code, name, category, status, purchaseDate, purchaseCost, usefulLifeYears, depreciationMethod, accumulatedDepreciation, bookValue, locationId (locations.id), assignedToId (persons.id) |
| `erpAssetDepreciation` | `erp_asset_depreciation` | id, assetId, period, depreciationAmount, bookValueAfter, postedAt |
| `erpGstTemplate` | `erp_gst_templates` | id, orgId, name, type (sales/purchase), cgstRate, sgstRate, igstRate, cessRate |
| `erpGstReturn` | `erp_gst_returns` | id, orgId, type (GSTR1/GSTR3B), period, status (draft/filed), data (jsonb), filedAt |

---

## Modules to Use via Mediator

| Need | Module | Type prefix |
|------|--------|-------------|
| User/actor/org | identity | `identity.getActor`, `identity.getPermissions` |
| Item catalog | catalog | `catalog.getItem`, `catalog.getVariant` (read-only) |
| Stock control | inventory | `inventory.reserve`, `inventory.receive`, `inventory.transfer`, `inventory.deduct` |
| Financial records | ledger | `ledger.postTransaction`, `ledger.getBalance`, `ledger.createJournal` |
| Approval workflows | workflow | `workflow.startProcess`, `workflow.completeTask` |
| File attachments | document | `document.create`, `document.list` |
| Address/geo | geo | `geo.validate`, `geo.getState` (for GST intra/inter-state) |
| Alerts | notification | `notification.send` |
| Metrics | analytics | `analytics.track` |

---

## Plugins Needed

| Plugin | When | Notes |
|--------|------|-------|
| `@projectx/plugin-notification-server` | Phase 10 | PO approval, invoice due alerts |
| `@projectx/plugin-storage-server` | Phase 10 | PO PDFs, GRN docs, invoice attachments |
| `@projectx/plugin-payment-server` | Phase 3/4 | Vendor payment + customer payment collection |

---

## Key FSMs (Phase 10)

1. **Vendor FSM:** `pending-approval → active | rejected` → `active → blacklisted | inactive`
2. **PR FSM:** `draft → submitted → approved | rejected → converted`
3. **PO FSM:** `draft → pending-approval → approved → sent → partially-received → fully-received → closed | cancelled`
4. **GRN FSM:** `draft → confirmed → quality-passed | quality-failed → partially-returned`
5. **Vendor Invoice FSM:** `received → under-review → 3way-matched → approved → partially-paid → paid | disputed`
6. **Sales Order FSM:** `draft → confirmed → partially-delivered → fully-delivered | cancelled`
7. **Sales Invoice FSM:** `draft → submitted → partially-paid → paid | cancelled | overdue`
8. **Work Order FSM:** `draft → submitted → in-process → completed | cancelled`
9. **Leave Application FSM:** `draft → submitted → approved | rejected`
10. **Salary Slip FSM:** `draft → submitted → paid`

---

## India-Specific: GST Rules

- **Intra-state supply** (supplier and buyer in same state): CGST + SGST (equal split of total GST rate)
- **Inter-state supply** (different states): IGST only (full GST rate)
- **State code detection:** Use `geo.getState(gstin)` — first 2 digits of GSTIN = state code
- **HSN code required** on all invoice items for GST filing
- **GSTIN format:** 15 chars — `{2-state}{10-pan}{1-entity}{1-Z}{1-check}`
- **E-Invoice (IRN):** Required for B2B invoices above ₹5 Cr turnover threshold. Call GST IRP API → get `irn` + `signedQRCode`
- **TDS:** Deduct at source on vendor payments. Rate varies by section (194C, 194J, etc.)

---

## Shell Registration (after implementation)

**`apps/server/src/index.ts`:**
```typescript
const { createErpCompose } = await import("@projectx/erp-server");
const erpCompose = createErpCompose(mediator, bus, bootRegistry.scheduler);
app = app.use(erpCompose);
```

**`apps/server/tsconfig.json`:**
```json
"@projectx/erp-server": ["../../composes/erp/server/src/index.ts"],
"@projectx/erp-server/*": ["../../composes/erp/server/src/*"]
```

**`apps/server/src/infra/db/schema/index.ts`:**
```typescript
export * from "./erp";
```
