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
2. `02-entities.md` — all 38 DB tables. Complete before any routes.
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

## DB Tables (38 total — Phase 2)

### Procurement (10 tables)
| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `erpVendor` | `erp_vendors` | id, orgId, name, code, type, status, gstin, pan, currency, paymentTerms, rating, bankDetails |
| `erpPurchaseRequisition` | `erp_purchase_requisitions` | id, orgId, refNo, requestedBy, department, status, justification, requiredBy, approvedBy |
| `erpPrItem` | `erp_pr_items` | id, prId, itemId, qty, uom, estimatedUnitPrice |
| `erpPurchaseOrder` | `erp_purchase_orders` | id, orgId, poNumber, vendorId, prId, status, expectedDeliveryDate, paymentTerms, subtotal, tax, total, currency |
| `erpPoItem` | `erp_po_items` | id, poId, itemId, qty, receivedQty, uom, unitPrice, lineTotal, hsn, gstRate |
| `erpGoodsReceipt` | `erp_goods_receipts` | id, orgId, grnNumber, poId, vendorId, warehouseId, receivedBy, status, qualityNotes |
| `erpGrItem` | `erp_gr_items` | id, grnId, poItemId, itemId, orderedQty, receivedQty, acceptedQty, rejectedQty, batchNo, expiryDate |
| `erpVendorInvoice` | `erp_vendor_invoices` | id, orgId, invoiceNumber, vendorId, poId, grnId, status, invoiceDate, dueDate, subtotal, cgst, sgst, igst, tds, total |
| `erpVendorInvoiceItem` | `erp_vendor_invoice_items` | id, invoiceId, itemId, qty, unitPrice, lineTotal, hsn, gstRate |
| `erpPaymentVoucher` | `erp_payment_vouchers` | id, orgId, type (pay/receive), partyType, partyId, amount, currency, date, mode, reference, status, bankAccountId |

### Sales (9 tables)
| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `erpCustomer` | `erp_customers` | id, orgId, name, code, gstin, pan, currency, paymentTerms, creditLimit, outstandingBalance |
| `erpQuotation` | `erp_quotations` | id, orgId, customerId, date, validUntil, status, subtotal, tax, total, currency, terms |
| `erpQuotationItem` | `erp_quotation_items` | id, quotationId, itemId, qty, uom, unitPrice, discount, lineTotal, hsn, gstRate |
| `erpSalesOrder` | `erp_sales_orders` | id, orgId, soNumber, customerId, quotationId, date, deliveryDate, status, subtotal, tax, total, invoicedAmount, deliveredQty |
| `erpSoItem` | `erp_so_items` | id, soId, itemId, qty, deliveredQty, invoicedQty, uom, unitPrice, lineTotal, hsn, gstRate |
| `erpDeliveryNote` | `erp_delivery_notes` | id, orgId, dnNumber, soId, customerId, warehouseId, date, status, shippingAddress |
| `erpDnItem` | `erp_dn_items` | id, dnId, soItemId, itemId, qty, uom, batchNo |
| `erpSalesInvoice` | `erp_sales_invoices` | id, orgId, siNumber, customerId, soId, dnId, date, dueDate, status, subtotal, cgst, sgst, igst, total, paidAmount, currency, irn, eWayBillNo |
| `erpSiItem` | `erp_si_items` | id, siId, itemId, qty, uom, unitPrice, lineTotal, hsn, gstRate |

### Inventory (5 tables)
| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `erpItem` | `erp_items` | id, orgId, code, name, description, type (stock/service/asset), uom, valuationMethod, hsn, gstRate, reorderQty, leadTimeDays |
| `erpWarehouse` | `erp_warehouses` | id, orgId, name, code, type (store/transit/virtual), parentId, address, isActive |
| `erpStockEntry` | `erp_stock_entries` | id, orgId, type (receipt/issue/transfer/manufacture/adjustment), date, reference, referenceType, totalValue |
| `erpStockEntryItem` | `erp_stock_entry_items` | id, entryId, itemId, warehouseFrom, warehouseTo, qty, valuationRate, batchNo |
| `erpStockLedger` | `erp_stock_ledger` | id, itemId, warehouseId, date, qty, valuationRate, stockValue, balance, entryId |

### Finance (6 tables)
| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `erpAccount` | `erp_accounts` | id, orgId, code, name, type (asset/liability/equity/income/expense), parentId, currency, isGroup, isFrozen |
| `erpFiscalYear` | `erp_fiscal_years` | id, orgId, name, startDate, endDate, isClosed |
| `erpJournalEntry` | `erp_journal_entries` | id, orgId, date, reference, narration, status, totalDebit, totalCredit, fiscalYearId |
| `erpJournalLine` | `erp_journal_lines` | id, journalId, accountId, debit, credit, partyType, partyId, costCenter, description |
| `erpBankAccount` | `erp_bank_accounts` | id, orgId, accountName, accountNo, bankName, ifsc, currency, glAccountId |
| `erpBankTransaction` | `erp_bank_transactions` | id, bankAccountId, date, description, debit, credit, balance, status (unmatched/matched), matchedVoucherId |

### Manufacturing (3 tables)
| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `erpBom` | `erp_boms` | id, orgId, itemId, version, isDefault, quantity, uom, operatingCost |
| `erpBomItem` | `erp_bom_items` | id, bomId, itemId, qty, uom, warehouseId, scrapPct |
| `erpWorkOrder` | `erp_work_orders` | id, orgId, bomId, itemId, quantity, warehouseId, status, plannedStart, actualStart, actualEnd, producedQty |

### HR (6 tables)
| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `erpEmployee` | `erp_employees` | id, orgId, empNo, name, email, phone, departmentId, designation, employmentType, joinDate, pan, aadhaar, bankAccount, pfNo, esiNo |
| `erpDepartment` | `erp_departments` | id, orgId, name, parentId, headId |
| `erpLeaveType` | `erp_leave_types` | id, orgId, name, maxDays, isPaid, isCarryForward |
| `erpLeaveAllocation` | `erp_leave_allocations` | id, employeeId, leaveTypeId, year, allocated, used, balance |
| `erpLeaveApplication` | `erp_leave_applications` | id, employeeId, leaveTypeId, fromDate, toDate, days, status, reason, approvedBy |
| `erpAttendance` | `erp_attendance` | id, employeeId, date, status (present/absent/half-day/leave), checkIn, checkOut, workHours |

### Payroll + Assets + Tax (6 tables)
| Drizzle | SQL | Key fields |
|---------|-----|------------|
| `erpSalaryStructure` | `erp_salary_structures` | id, orgId, name, components (jsonb — earnings/deductions formula) |
| `erpSalarySlip` | `erp_salary_slips` | id, employeeId, month, year, structureId, workingDays, presentDays, earnings (jsonb), deductions (jsonb), grossPay, netPay, status |
| `erpPayrollEntry` | `erp_payroll_entries` | id, orgId, month, year, status, employeeCount, totalGross, totalNet |
| `erpAsset` | `erp_assets` | id, orgId, code, name, category, status, purchaseDate, purchaseCost, usefulLifeYears, depreciationMethod, accumulatedDepreciation, bookValue, warehouseId, assignedToId |
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
