# Phase 22 — Data Seeding

---

## 22.1 Why db:push Not db:migrate

Same reason as ecommerce: Neon uses WebSocket. Drizzle Kit's migration runner requires TCP. Use `db:push` for dev.

```bash
bun run db:push     # pushes schema diff, no migration files
```

For production: generate SQL migration files from schema diff + apply via Neon console or CI.

---

## 22.2 Seed Script Entry

```bash
bun run db:seed:erp
```

**File:** `scripts/seed-erp.ts`

```typescript
import { db } from "../apps/server/src/db";
import { seedFiscalYear } from "./seeds/erp/fiscal-year";
import { seedChartOfAccounts } from "./seeds/erp/chart-of-accounts";
import { seedGstTemplates } from "./seeds/erp/gst-templates";
import { seedWarehouses } from "./seeds/erp/warehouses";
import { seedDevUsers } from "./seeds/erp/dev-users";
import { seedSampleData } from "./seeds/erp/sample-data";

async function main() {
  console.log("Seeding ERP...");
  await seedFiscalYear(db);
  await seedChartOfAccounts(db);
  await seedGstTemplates(db);
  await seedWarehouses(db);
  await seedDevUsers(db);
  if (process.env.NODE_ENV === "development") {
    await seedSampleData(db);
  }
  console.log("ERP seed complete.");
}

main().catch(console.error);
```

---

## 22.3 Fiscal Year

```typescript
export async function seedFiscalYear(db: DB) {
  await db.insert(erpFiscalYears).values({
    id: "fy-2024-25",
    name: "FY 2024-25",
    startDate: "2024-04-01",
    endDate: "2025-03-31",
    isClosed: false,
  }).onConflictDoNothing();
}
```

---

## 22.4 Chart of Accounts

Full Indian CoA from Phase 6.2 seeded as structured inserts.

Key: seed group accounts first (isGroup: true), then leaf accounts with parentId.

```typescript
const COA_SEED = [
  // Assets group
  { id: "acc-1000", code: "1000", name: "Assets", type: "asset", isGroup: true },
  { id: "acc-1100", code: "1100", name: "Current Assets", type: "asset", isGroup: true, parentId: "acc-1000" },
  { id: "acc-1110", code: "1110", name: "Cash and Bank", type: "asset", isGroup: true, parentId: "acc-1100" },
  { id: "acc-1111", code: "1111", name: "Cash in Hand", type: "asset", parentId: "acc-1110" },
  { id: "acc-1112", code: "1112", name: "Bank Account", type: "asset", parentId: "acc-1110" },
  { id: "acc-1120", code: "1120", name: "Accounts Receivable", type: "asset", parentId: "acc-1100" },
  { id: "acc-1130", code: "1130", name: "Inventory Asset", type: "asset", parentId: "acc-1100" },
  { id: "acc-1140", code: "1140", name: "Advance Paid", type: "asset", parentId: "acc-1100" },
  // Fixed Assets
  { id: "acc-1200", code: "1200", name: "Fixed Assets", type: "asset", isGroup: true, parentId: "acc-1000" },
  { id: "acc-1210", code: "1210", name: "Plant & Machinery", type: "asset", parentId: "acc-1200" },
  { id: "acc-1230", code: "1230", name: "Accumulated Depreciation", type: "asset", parentId: "acc-1200" },
  // Liabilities
  { id: "acc-2000", code: "2000", name: "Liabilities", type: "liability", isGroup: true },
  { id: "acc-2100", code: "2100", name: "Current Liabilities", type: "liability", isGroup: true, parentId: "acc-2000" },
  { id: "acc-2110", code: "2110", name: "Accounts Payable", type: "liability", parentId: "acc-2100" },
  { id: "acc-2120", code: "2120", name: "GST Payable (CGST)", type: "liability", parentId: "acc-2100" },
  { id: "acc-2121", code: "2121", name: "GST Payable (SGST)", type: "liability", parentId: "acc-2100" },
  { id: "acc-2122", code: "2122", name: "GST Payable (IGST)", type: "liability", parentId: "acc-2100" },
  { id: "acc-2130", code: "2130", name: "TDS Payable", type: "liability", parentId: "acc-2100" },
  { id: "acc-2140", code: "2140", name: "Employee PF Payable", type: "liability", parentId: "acc-2100" },
  // Equity
  { id: "acc-3000", code: "3000", name: "Equity", type: "equity", isGroup: true },
  { id: "acc-3100", code: "3100", name: "Share Capital", type: "equity", parentId: "acc-3000" },
  { id: "acc-3200", code: "3200", name: "Retained Earnings", type: "equity", parentId: "acc-3000" },
  // Income
  { id: "acc-4000", code: "4000", name: "Income", type: "income", isGroup: true },
  { id: "acc-4100", code: "4100", name: "Sales Revenue", type: "income", parentId: "acc-4000" },
  { id: "acc-4200", code: "4200", name: "Other Income", type: "income", parentId: "acc-4000" },
  // Expenses
  { id: "acc-5000", code: "5000", name: "Expenses", type: "expense", isGroup: true },
  { id: "acc-5100", code: "5100", name: "Cost of Goods Sold", type: "expense", parentId: "acc-5000" },
  { id: "acc-5200", code: "5200", name: "Salaries", type: "expense", parentId: "acc-5000" },
  { id: "acc-5300", code: "5300", name: "Rent", type: "expense", parentId: "acc-5000" },
  { id: "acc-5400", code: "5400", name: "Utilities", type: "expense", parentId: "acc-5000" },
  { id: "acc-5500", code: "5500", name: "Depreciation", type: "expense", parentId: "acc-5000" },
  { id: "acc-5600", code: "5600", name: "Bank Charges", type: "expense", parentId: "acc-5000" },
];
```

---

## 22.5 GST Templates

```typescript
const GST_TEMPLATES = [
  { id: "gst-28", name: "GST 28%", type: "sales", cgstRate: 14, sgstRate: 14, igstRate: 28 },
  { id: "gst-18", name: "GST 18%", type: "sales", cgstRate: 9, sgstRate: 9, igstRate: 18 },
  { id: "gst-12", name: "GST 12%", type: "sales", cgstRate: 6, sgstRate: 6, igstRate: 12 },
  { id: "gst-5",  name: "GST 5%",  type: "sales", cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 },
  { id: "gst-0",  name: "GST 0%",  type: "sales", cgstRate: 0, sgstRate: 0, igstRate: 0 },
  { id: "gst-exempt", name: "Exempt", type: "sales", cgstRate: 0, sgstRate: 0, igstRate: 0 },
  // Purchase variants
  { id: "gst-18-pur", name: "GST 18% (Purchase)", type: "purchase", cgstRate: 9, sgstRate: 9, igstRate: 18 },
  { id: "gst-5-pur",  name: "GST 5% (Purchase)",  type: "purchase", cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 },
];
```

---

## 22.6 Warehouses

```typescript
// Warehouses are locations with type="warehouse"
const WAREHOUSES = [
  { type: "warehouse", name: "Main Warehouse", meta: { code: "WH-MAIN", locationType: "store" } },
  { type: "warehouse", name: "Quality Control", meta: { code: "WH-QC", locationType: "transit" } },
  { type: "warehouse", name: "Finished Goods Store", meta: { code: "WH-FG", locationType: "store" } },
  { type: "warehouse", name: "Scrap / Rejected Goods", meta: { code: "WH-SCRAP", locationType: "virtual" } },
];

for (const wh of WAREHOUSES) {
  await db.insert(locations).values({
    id: generateId(),
    organizationId: orgId,
    ...wh,
    version: 1,
  }).onConflictDoNothing();
}
```

---

## 22.7 Dev Users

ERP roles attached to platform actors created in seed.

```typescript
const ERP_DEV_USERS = [
  { email: "erp-admin@dev.local",      permissions: ["erp:admin"] },
  { email: "procurement@dev.local",    permissions: ["erp:purchase-req:read", "erp:purchase-req:create", "erp:purchase-order:read", "erp:purchase-order:create"] },
  { email: "finance@dev.local",        permissions: ["erp:ledger:read", "erp:ledger:post", "erp:invoice:approve"] },
  { email: "sales@dev.local",          permissions: ["erp:sales:read", "erp:sales:create"] },
  { email: "inventory@dev.local",      permissions: ["erp:inventory:read", "erp:inventory:adjust"] },
  { email: "hr@dev.local",             permissions: ["erp:hr:read", "erp:hr:manage"] },
  { email: "payroll@dev.local",        permissions: ["erp:hr:read", "erp:payroll:run"] },
  { email: "employee@dev.local",       permissions: ["erp:employee"] },
];
```

Add ERP permissions to existing platform actors (use `mediator.dispatch({ type: "actor.addPermissions" })`).

---

## 22.8 Pipeline Seeding (required before any approval flows)

Pipelines must be seeded before any PR/PO/SO approval workflows work.

```typescript
import { seedPipeline } from "apps/server/src/infra/db/seed"

// PR approval pipeline
await seedPipeline(orgId, "erp.pr", [
  { name: "Draft" },
  { name: "Submitted" },
  { name: "Approved" },
  { name: "Rejected" },
])

// PO approval pipeline
await seedPipeline(orgId, "erp.po", [
  { name: "Draft" },
  { name: "Submitted" },
  { name: "Approved" },
  { name: "Issued" },
  { name: "Received" },
  { name: "Cancelled" },
])

// SO approval pipeline
await seedPipeline(orgId, "erp.so", [
  { name: "Draft" },
  { name: "Confirmed" },
  { name: "Fulfilling" },
  { name: "Invoiced" },
  { name: "Paid" },
  { name: "Cancelled" },
])
```

## 22.9 Sample Data (dev only, MTA-aware)

```typescript
// Seed vendor (as a party)
await db.insert(parties).values({
  id: generateId(),
  organizationId: orgId,
  type: "vendor",
  name: "Demo Supplier Pvt Ltd",
  meta: { gstin: "27AABCU9603R1ZX", pan: "AABCU9603R", currency: "INR", paymentTerms: "NET30" },
  version: 1,
})

// Seed customer (as a party)
await db.insert(parties).values({
  id: generateId(),
  organizationId: orgId,
  type: "customer",
  name: "Demo Customer Ltd",
  meta: { gstin: "07AAACR5055K1Z5", creditLimit: 500000 },
  version: 1,
})

// Seed employee (as a person)
await db.insert(persons).values({
  id: generateId(),
  organizationId: orgId,
  type: "employee",
  firstName: "Rahul",
  lastName: "Sharma",
  email: "rahul.sharma@company.com",
  meta: { empNo: "EMP-001", designation: "Procurement Officer", pfNo: "MH/12345" },
})

// Seed item (as a cat_item)
await db.insert(catItems).values({
  id: generateId(),
  organizationId: orgId,
  type: "stock_item",
  name: "Raw Material A",
  sku: "RM-001",
  unit: "Kg",
  meta: { hsn: "720210", gstRate: 18, reorderQty: 100, valuationMethod: "FIFO" },
  version: 1,
})

// Seed warehouse (as a location)
await db.insert(locations).values({
  id: generateId(),
  organizationId: orgId,
  type: "warehouse",
  name: "Main Warehouse",
  meta: { code: "WH-MAIN", capacity: 10000 },
})

// Seed purchase order (as a transaction)
await db.insert(transactions).values({
  id: generateId(),
  organizationId: orgId,
  type: "purchase_order",
  refNo: "PO-2024-001",
  partyId: vendorPartyId,
  stageId: poApprovedStageId,
  status: "approved",
  subtotal: 50000,
  taxAmount: 9000,
  total: 59000,
  currency: "INR",
  meta: { expectedDeliveryDate: "2024-07-01", paymentTerms: "NET30" },
})
```
