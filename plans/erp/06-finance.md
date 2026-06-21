# Phase 6 — Finance

---

## 6.1 Chart of Accounts Routes

```
GET    /erp/accounts                erp:ledger:read
POST   /erp/accounts                erp:ledger:post
GET    /erp/accounts/:id            erp:ledger:read
PATCH  /erp/accounts/:id            erp:ledger:post
GET    /erp/accounts/tree           erp:ledger:read   ← hierarchical tree
```

**Create account body:**
```typescript
{
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  subType?: string;
  parentId?: string;
  currency?: string;
  isGroup?: boolean;
}
```

Rule: leaf accounts (not groups) can receive postings. Group accounts cannot.

---

## 6.2 Default Chart of Accounts

Seeded on first boot (see Phase 22). Standard Indian CoA:

```
Assets (1xxx)
  Current Assets (1100)
    Cash and Bank (1110)
      Cash in Hand     1111
      Bank Account     1112
    Accounts Receivable  1120
    Inventory Asset      1130
    Advance Paid         1140
  Fixed Assets (1200)
    Plant & Machinery    1210
    Vehicles             1220
    Accumulated Depreciation  1230 (credit balance account)

Liabilities (2xxx)
  Current Liabilities (2100)
    Accounts Payable     2110
    GST Payable (CGST)   2120
    GST Payable (SGST)   2121
    GST Payable (IGST)   2122
    TDS Payable          2130
    Employee PF Payable  2140
  Long-term Liabilities (2200)
    Bank Loans           2210

Equity (3xxx)
  Share Capital          3100
  Retained Earnings      3200

Income (4xxx)
  Sales Revenue          4100
  Other Income           4200

Expenses (5xxx)
  Cost of Goods Sold     5100
  Salaries               5200
  Rent                   5300
  Utilities              5400
  Depreciation           5500
  Bank Charges           5600
```

---

## 6.3 Journal Entry Routes

```
GET    /erp/journal-entries          erp:ledger:read
POST   /erp/journal-entries          erp:ledger:post
GET    /erp/journal-entries/:id      erp:ledger:read
POST   /erp/journal-entries/:id/post erp:ledger:post   ← change draft → posted
POST   /erp/journal-entries/:id/cancel  erp:ledger:post
```

**Create journal body:**
```typescript
{
  date: string;
  reference?: string;
  referenceType?: string;
  narration: string;
  lines: Array<{
    accountId: string;
    debit?: number;
    credit?: number;
    partyType?: string;
    partyId?: string;
    costCenter?: string;
    description?: string;
  }>;
}
```

**Double-entry invariant validation (always enforce):**
```typescript
function validateJournal(lines: JournalLine[]): void {
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new ValidationError(`Journal out of balance: Dr ${totalDebit} ≠ Cr ${totalCredit}`);
  }
  if (lines.some(l => !l.accountId)) throw new ValidationError("All lines must have accountId");
  if (lines.some(l => (l.debit ?? 0) < 0 || (l.credit ?? 0) < 0)) throw new ValidationError("Amounts must be non-negative");
}
```

On post: update `erpAccount.balance` for each line (Dr increases asset/expense, Cr increases liability/equity/income). Cannot post to closed fiscal year.

---

## 6.4 Financial Reports

```
GET    /erp/finance/trial-balance    erp:ledger:read
  query: ?asOf=&fiscalYearId=
  returns: [{ accountCode, accountName, debit, credit, balance }]

GET    /erp/finance/pnl              erp:ledger:read
  query: ?from=&to=&fiscalYearId=
  returns: { income: [...], expenses: [...], grossProfit, netProfit }

GET    /erp/finance/balance-sheet    erp:ledger:read
  query: ?asOf=
  returns: { assets: [...], liabilities: [...], equity: [...] }

GET    /erp/finance/cash-flow        erp:ledger:read
  query: ?from=&to=
  returns: { operating: [...], investing: [...], financing: [...], netCashFlow }

GET    /erp/finance/ap-aging         erp:ledger:read
  query: ?asOf=
  returns: [{ vendor, current, days30, days60, days90, over90, total }]

GET    /erp/finance/ar-aging         erp:ledger:read
  query: ?asOf=
  returns: [{ customer, current, days30, days60, days90, over90, total }]
```

---

## 6.5 Bank Account Routes

```
GET    /erp/bank-accounts            erp:ledger:read
POST   /erp/bank-accounts            erp:ledger:post
GET    /erp/bank-accounts/:id        erp:ledger:read
GET    /erp/bank-accounts/:id/transactions  erp:ledger:read
POST   /erp/bank-accounts/:id/import  erp:ledger:post  ← import bank statement (CSV)
```

---

## 6.6 Bank Reconciliation

```
GET    /erp/bank-reconciliation/:bankAccountId    erp:ledger:read
POST   /erp/bank-reconciliation/:bankAccountId/match  erp:ledger:post
```

Match: link an unmatched `erpBankTransaction` to an `erpPaymentVoucher`. Updates `bankTransaction.status` → `matched` and sets `matchedVoucherId`.

Unmatched bank transactions: `erpBankTransaction` rows with `status = "unmatched"` represent timing differences or missing vouchers.

---

## 6.7 Period Close

```
POST   /erp/finance/period-close     erp:ledger:close-period
```

**Body:** `{ fiscalYearId: string }`

Checks before close:
1. No draft journal entries in this fiscal year
2. No unposted invoices (AP or AR) with date in this period
3. No unmatched bank transactions
4. Trial balance must zero (totalDebit === totalCredit across all accounts)

On close:
1. Set `erpFiscalYear.isClosed = true`
2. Create closing entries: transfer net income to retained earnings
3. Emit `period.closed` event
4. Notify finance controller

After close: any attempt to post a JE with date in closed year → `403 Period Closed`.
