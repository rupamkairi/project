# Phase 21 — Web: Reports

> **MTA:** Report queries filter master tables by type. Vendor aging uses `parties where type='vendor'`. Customer AR aging uses `parties where type='customer'`. GSTR reports use `transactions where type in ('invoice','receipt')` filtered by organizationId.

---

## 21.1 KpiDashboardPage (default /erp route)

**File:** `pages/reports/KpiDashboardPage.tsx`

KPI cards row (2×4 grid):
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Revenue MTD    │  COGS MTD       │  Gross Margin   │  Net Profit MTD │
│  ₹ 18,50,000   │  ₹ 11,20,000   │     39.5%       │  ₹  4,30,000   │
│  +12% vs LM    │  +8% vs LM     │  -2pp vs LM     │  +18% vs LM    │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│  Open POs       │  Overdue AR     │  Inventory Value│  Open Work Ord  │
│  ₹ 8,20,000    │  ₹ 2,15,000    │  ₹ 42,50,000   │      12         │
│  15 orders     │  5 invoices    │  320 items      │  3 overdue      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

Below: two charts side by side.

Left: Monthly Revenue vs COGS (recharts ComposedChart, last 6 months).
Right: Cash Flow Trend (recharts AreaChart — operating + investing + financing).

Bottom row: three alert lists.
- Reorder Alerts: items below reorder level
- Overdue Invoices (AR): top 5 by amount
- Pending Approvals: PRs + POs awaiting user's approval

---

## 21.2 PnlPage

**File:** `pages/reports/PnlPage.tsx`

Controls: From date / To date / Fiscal Year selector. "Refresh" button.

```
PROFIT & LOSS STATEMENT
Period: 01 Apr 2024 to 30 Jun 2024

INCOME                                        ₹
────────────────────────────────────────────────
Sales Revenue              4100     18,50,000
Other Income               4200        25,000
                                    ──────────
Total Income                         18,75,000

COST OF GOODS SOLD
────────────────────────────────────────────────
Cost of Goods Sold         5100     11,20,000
                                    ──────────
Gross Profit                          7,55,000   (40.3%)

OPERATING EXPENSES
────────────────────────────────────────────────
Salaries                   5200      2,50,000
Rent                       5300        80,000
Utilities                  5400        45,000
Depreciation               5500        30,000
Bank Charges               5600         8,000
                                    ──────────
Total Expenses                        3,13,000

NET PROFIT                            4,42,000   (23.6%)
```

Export button: PDF download via `window.print()`.

---

## 21.3 BalanceSheetPage

As of date selector.

```
BALANCE SHEET
As of: 30 Jun 2024

ASSETS                                        ₹
────────────────────────────────────────────────
Current Assets
  Cash and Bank                        12,50,000
  Accounts Receivable                  14,80,000
  Inventory                            42,50,000
  Advance Paid                          1,20,000
                                       ──────────
  Total Current Assets                 71,00,000

Fixed Assets
  Plant & Machinery         18,00,000
  Less: Depreciation        (2,40,000)
                                       ──────────
  Net Fixed Assets                     15,60,000

TOTAL ASSETS                           86,60,000

LIABILITIES & EQUITY                          ₹
────────────────────────────────────────────────
Current Liabilities
  Accounts Payable                      8,50,000
  GST Payable                           2,20,000
  TDS Payable                             45,000
                                       ──────────
  Total Current Liabilities            11,15,000

Equity
  Share Capital                        50,00,000
  Retained Earnings                    21,03,000
  Current Period Profit                 4,42,000
                                       ──────────
  Total Equity                         75,45,000

TOTAL LIABILITIES & EQUITY            86,60,000
```

Checks: Total Assets = Total Liabilities + Equity. If mismatch → red warning banner.

---

## 21.4 Gstr1Page

**File:** `pages/reports/Gstr1Page.tsx`

Controls: Period selector (month + year). "Preview" button. "Lock & File" button.

Three tabs: B2B | B2C | HSN Summary.

**B2B tab:** one row per customer GSTIN with expandable invoice list.
```
Customer GSTIN  | Invoices | Taxable Value | CGST    | SGST    | IGST    | Total
27AAAAA0000A1Z5 |    5     | 4,50,000     | 40,500  | 40,500  |    0    | 5,31,000
```

**HSN Summary tab:**
```
HSN   | Description        | UoM | Qty   | Value     | Rate | CGST   | SGST   | IGST
7317  | Nails, tacks (steel)| Kg  | 500   | 2,50,000  | 18%  | 22,500 | 22,500 |   0
```

Export: JSON (GST portal upload format) + CSV.

---

## 21.5 Gstr3bPage

**File:** `pages/reports/Gstr3bPage.tsx`

Period selector. Preview + Lock & File.

Sections (collapsible cards):
1. Outward Taxable Supplies (3.1) — total, IGST, CGST, SGST
2. ITC Available (4A) — from purchase invoices
3. ITC Reversed (4B) — if any
4. Net ITC (4C) = 4A - 4B
5. Tax Payable (6.1) = 3.1 tax - Net ITC
6. Tax Paid (6.1): from bank (input amounts for actual payment)

Computed tax liability summary:
```
IGST Payable: ₹ 45,000
CGST Payable: ₹ 32,500
SGST Payable: ₹ 32,500
Cess Payable: ₹     0
──────────────────────
Total:        ₹ 1,10,000
```

---

## 21.6 TrialBalancePage

As of date selector.

Table: Account Code | Account Name | Type | Debit | Credit | Balance.

Footer: Total Debit | Total Credit (must match).
Difference row at bottom: `₹ 0.00 Balanced` (green) or amount (red).

Export CSV.

---

## 21.7 CashFlowPage

Period selector.

Three sections: Operating | Investing | Financing.

```
Cash Flow Statement
Period: Q1 FY 2024-25

OPERATING ACTIVITIES                              ₹
────────────────────────────────────────────────────
Net Profit                                  4,42,000
Adjustments:
  Depreciation                                30,000
  Increase in AR                            (3,20,000)
  Increase in Inventory                     (1,80,000)
  Increase in AP                             1,50,000
                                            ──────────
Net Cash from Operations                    1,22,000

INVESTING ACTIVITIES
────────────────────────────────────────────────────
Purchase of Fixed Assets                   (5,00,000)
                                            ──────────
Net Cash from Investing                    (5,00,000)

FINANCING ACTIVITIES
────────────────────────────────────────────────────
Bank Loan Proceeds                          8,00,000
                                            ──────────
Net Cash from Financing                     8,00,000

NET CHANGE IN CASH                          4,22,000
Opening Cash Balance                        8,28,000
CLOSING CASH BALANCE                       12,50,000
```
