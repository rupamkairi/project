# Phase 17 — Web: Finance

---

## 17.1 ChartOfAccountsPage

Tree view — not a flat table.

```
Assets (1xxx)                                        ₹ 45,23,450
  Current Assets (1100)                              ₹ 32,18,200
    Cash and Bank (1110)          ₹ 12,50,000
      Cash in Hand     1111       ₹  1,50,000
      Bank Account     1112       ₹ 11,00,000
    Accounts Receivable  1120     ₹ 14,80,000
    Inventory Asset      1130     ₹  4,88,200
  Fixed Assets (1200)                                ₹ 13,05,250
    ...
```

Expand/collapse nodes. Each leaf shows current balance.

Actions: "Add Account" (opens dialog). Accounts used in JEs cannot be deleted.

**CreateAccountDialog:**
- Code (must be unique)
- Name
- Account type: asset | liability | equity | income | expense
- Sub-type (optional)
- Parent account (tree selector)
- Is group (toggle — group accounts cannot receive postings)

---

## 17.2 JournalEntriesPage

Columns: JE No | Date | Narration | Total Debit | Status | Reference | Actions

Filter: status (draft/posted/cancelled), date range.

**JournalEntryDetailPage:**

Header:
```
JE-2024-001234                                      [Post] [Cancel]
Narration: Vendor payment — Acme Supplies        Status: draft
Date: 15 Jun 2024
```

Lines table:
```
Account          | Party         | Debit        | Credit
Accounts Payable | Acme Supplies | ₹ 2,45,000   | —
Bank Account     | —             | —            | ₹ 2,45,000
                 |               | ₹ 2,45,000   | ₹ 2,45,000 ← totals row
```

Status badge shows balance: `Balanced` (green) / `Out of Balance` (red).

**CreateJournalDialog:**
- Date
- Narration (required)
- Reference, reference type
- Lines: dynamic rows
  - Account selector (searchable)
  - Party type + party (optional)
  - Debit input (auto-clears credit if entered)
  - Credit input (auto-clears debit if entered)
  - Description
  - `+Add Line` button
- Running debit/credit totals shown at bottom
- Difference indicator: shows `₹ 0.00 Balanced` or `₹ X.XX Out of Balance`
- Submit disabled if not balanced

---

## 17.3 BankAccountsPage

Columns: Bank Name | Account No | IFSC | Balance | Last Imported | Actions

**BankReconciliationPage:**

Left panel: unmatched bank transactions (imported from statement).
Right panel: unmatched payment vouchers (posted in ERP).

Each row in left panel: Date | Description | Amount | Credit/Debit.
Each row in right panel: Date | Vendor/Customer | Voucher No | Amount.

Match action: click bank transaction → click payment voucher → "Match" button appears.

Filter: show matched / unmatched / all.

Running balance reconciliation summary at top:
```
Bank Statement Balance:    ₹ 11,45,000.00
Outstanding Deposits:     +₹  2,00,000.00
Outstanding Payments:     −₹    50,000.00
Book Balance:              ₹ 12,95,000.00
```

---

## 17.4 PeriodClosePage

Step-by-step checklist UI:

```
Period Close: April 2024

Step 1: Validate                             [Run Checks]
  ✅ No draft journal entries
  ✅ No unposted invoices
  ✅ No unmatched bank transactions
  ✅ Trial balance zeroes out

Step 2: Review Summary
  Total Income:    ₹ 18,50,000
  Total Expenses:  ₹ 14,20,000
  Net Profit:      ₹  4,30,000

Step 3: Close Period                         [Close Period]
  ⚠ This action is irreversible. Ensure all entries are verified.
```

"Close Period" button: only enabled when all checks pass.
Shows ConfirmDialog: "Close April 2024? This cannot be undone."

After close: banner shows "Period Closed on DD MMM YYYY by [User]".

---

## 17.5 AP/AR Aging

Accessible from Finance sidebar under Reports:

`/erp/reports/ap-aging` and `/erp/reports/ar-aging`

Table:
```
Vendor/Customer | Current | 1-30 Days | 31-60 Days | 61-90 Days | 90+ Days | Total
Acme Supplies   |    —    |  45,000   |   12,000   |    8,000   |    —     | 65,000
```

Date picker for "as of" date. Export to CSV.
