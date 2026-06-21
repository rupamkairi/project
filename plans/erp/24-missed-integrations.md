# Phase 24 — Missed Integrations & Pitfalls

---

## 24.1 Critical Pitfalls

### 1. Double-Entry Must Be Enforced at Insertion, Not UI

Every call to `postTransaction` / insert into `erpJournalLines` must call `validateJournal()` first.
Do not rely on the UI computing balanced amounts — always re-validate server-side.

```typescript
// CORRECT — always validate before insert
validateJournal(lines);  // throws on imbalance
await db.insert(erpJournalLines).values(lines);
```

### 2. GST Intra/Inter-State Detection Uses GSTIN State Codes, Not Address

Do not use `vendor.state` or `customer.state` fields for GST type. Parse GSTIN:
```typescript
const orgState = orgGstin.substring(0, 2);
const partyState = partyGstin?.substring(0, 2);
const isIntra = partyState ? orgState === partyState : false;
```
If party has no GSTIN (B2C / unregistered), treat as intra-state (CGST + SGST).

### 3. Period Close Is Irreversible — Guard With Double Confirm

`POST /erp/finance/period-close` sets `erpFiscalYear.isClosed = true`.
After close: any JE with date in that year must return `403 Period Closed`.
The guard must check fiscal year closed status on every JE post.

```typescript
const fy = await getFiscalYearForDate(je.date);
if (fy?.isClosed) throw new Error("Period Closed");
```

### 4. Stock Ledger Running Balance Must Be Atomic

`postStockLedger()` computes running balance from last ledger row. This must run inside a DB transaction to avoid race conditions:

```typescript
await db.transaction(async (tx) => {
  const lastEntry = await getLastLedgerEntry(itemId, warehouseId, tx);
  const newBalance = lastEntry.balance + qty;
  if (newBalance < 0) throw new Error("Negative stock not allowed");
  await tx.insert(erpStockLedger).values({ ...entry, balance: newBalance });
});
```

### 5. GRN Cannot Over-Receive — Check Remaining Qty

```typescript
const remaining = po.totalQty - po.receivedQty;
if (grnItem.acceptedQty > remaining) throw new ValidationError("Cannot receive more than ordered");
```
Check per item line, not just total.

### 6. 3-Way Match Tolerance Is 5% by Default

Invoice total can exceed PO total by up to 5%:
```typescript
if (invoiceTotal > poTotal * 1.05) throw new ValidationError("Invoice exceeds PO tolerance");
```
This is configurable — store in org settings, default 5.

### 7. Salary Formula Evaluator Must Be Sandboxed

The formula engine for salary structures evaluates user-defined expressions like `ctc * 0.5`.
Never use `eval()`. Use a safe evaluator:

```typescript
import { evaluate } from "mathjs";
const amount = evaluate(component.formula, { ctc, basic, hra, ... });
```
Or use a restricted expression parser. Never expose `process`, `require`, or any Node globals.

### 8. IRN Generation Is Rate-Limited

GST IRP sandbox + production has rate limits (~10 req/min).
Cache the auth token (valid 6h). Do not generate IRN in bulk loops without debouncing.
On rate limit response (429): return `{ retry: true, retryAfter: 60 }` to frontend.

### 9. Leave Balance Check Must Use DB Balance, Not Frontend-Computed

```typescript
// CORRECT
const allocation = await getLeaveAllocation(employeeId, leaveTypeId);
if (application.days > allocation.balance) throw new ValidationError("Insufficient leave balance");
```
Never trust balance computed on frontend.

### 10. Payroll Generate-Slips Is Idempotent — Delete Drafts Before Re-Generate

If HR clicks "Generate Slips" twice, delete existing `draft` slips first:
```typescript
await db.delete(erpSalarySlips).where(
  and(eq(erpSalarySlips.payrollEntryId, entryId), eq(erpSalarySlips.status, "draft"))
);
```
Then regenerate. Never accumulate duplicate slips.

### 11. Work Order Start Checks Availability — Not Just BOM Qty

BOM says "50 Kg Steel Tube". But the warehouse check must verify:
- Actual stock in the source warehouse (not just any warehouse)
- Account for other reserved/in-process work orders

```typescript
const available = await getStockByWarehouse(itemId, sourceWarehouseId);
if (available < required) throw new ValidationError("Insufficient stock in source warehouse");
```

### 12. CoA Seed Order: Groups Before Leaves

All `isGroup: true` accounts must be inserted before their children. Seed function must insert in topological order (parents first).

### 13. ERP Uses Platform Token — But ERP Permissions Are Separate

ERP uses `platform_token` (not a separate token). But ERP permissions (`erp:*`) are an additional permission scope on the platform actor.

Do NOT reuse generic permissions like `admin` for ERP access.
Every ERP route guard must check specific `erp:*` permission, not generic auth.

---

## 24.2 Integration Checklist (22 items)

- [ ] `validateJournal()` called before every JE insert
- [ ] GSTIN-based state code logic (not address fields) for GST type
- [ ] `isClosed` check on every JE post endpoint
- [ ] Stock ledger inside DB transaction with negative stock guard
- [ ] GRN per-item remaining qty check (no over-receipt)
- [ ] 3-way match tolerance configurable (default 5%)
- [ ] Salary formula uses sandboxed evaluator (mathjs or equivalent)
- [ ] IRN auth token cached (6h), rate limit handled gracefully
- [ ] Leave balance check at server, not frontend
- [ ] Generate-slips deletes existing drafts before re-running
- [ ] Work order start checks stock in correct source warehouse
- [ ] CoA seed inserts parents before children
- [ ] ERP permissions are `erp:*` scope, not generic platform perms
- [ ] Period close route has double-confirm in UI
- [ ] Payroll submit validates all slips are `submitted` status first
- [ ] `erpCustomer.outstandingBalance` updated on every SI + payment
- [ ] Credit limit check on SO confirm (not just on creation)
- [ ] Vendor status must be `active` before PO creation
- [ ] BOM explosion max depth = 5 (prevent infinite recursion)
- [ ] `GST_IRP_URL` uses sandbox URL in dev, prod URL in production
- [ ] All money amounts use integer paise internally (avoid float rounding)
- [ ] Depreciation job is idempotent — check if already run for the month before posting

---

## 24.3 Money Representation

Recommended: store all amounts as integers (paise) in DB.

```typescript
// Store: 2450000 = ₹ 24,500.00
// Display: amount / 100
// Compute: keep as integers, divide only for display
```

Or use `numeric(15,2)` in Drizzle (exact decimal). Never use `float` or `double` for money.

---

## 24.4 Dev Verification Path

After seeding:

1. Login as `erp-admin@dev.local`
2. Navigate to `/erp` → KPI dashboard loads with zeroed cards
3. Create vendor → GSTIN validates
4. Create PR → submit → approve
5. Convert PR to PO → approve PO
6. Create GRN against PO → confirm → stock appears in `/erp/inventory/stock`
7. Create vendor invoice → 3-way match → approve → create payment
8. Journal entry posted → check `/erp/finance/journals`
9. Run trial balance → balanced
10. Create employee → submit leave → approve
11. Generate payroll → submit → salary journal posted
12. Check GSTR-1 preview for current month
