# Compose — ERP

## Enterprise Resource Planning

---

## 1. Compose Overview

```
Compose ID:   erp
Version:      1.0.0
Purpose:      Unify procurement, inventory, manufacturing, finance, and
              distribution into a single system of record for the enterprise.
Apps Served:  ProcurementApp  → purchase orders, vendor management
              WarehouseApp    → goods receipt, stock management, transfers
              FinanceApp      → journal entries, AP/AR, reporting
              OperationsApp   → BOMs, production orders, asset management
              AuditApp        → read-only compliance view
```

---

## 2. Module Selection & Configuration

```typescript
const ERPCompose: ComposeDefinition = {
  id: "erp",
  name: "Enterprise Resource Planning",
  modules: [
    "identity",
    "catalog", // Item master — raw materials, finished goods, services
    "inventory", // Multi-location stock control
    "ledger", // Full double-entry accounting
    "workflow", // Approval chains for PO, GR, invoices
    "document", // Contracts, GRN docs, invoices, certificates
    "geo", // Warehouse locations, vendor territories, shipping routes
    "notification", // Approval requests, stock alerts, payment reminders
    "analytics", // Procurement analytics, inventory turns, cash flow
  ],

  moduleConfig: {
    catalog: {
      itemLabel: "Material / Item",
      enableVariants: true,
      enablePriceLists: true,
      attributes: ["uom", "hsn_code", "lead_time_days", "reorder_qty"],
    },
    inventory: {
      trackingMode: "variant",
      allowNegativeStock: false,
      enableBatchTracking: true,
    },
    ledger: {
      baseCurrency: "USD",
      fiscalYearStartMonth: 4, // April (Indian FY) — configurable
      enableCostCenters: true,
      enableProfitCenters: true,
    },
  },
};
```

---

## 3. Actor Roles & Permission Matrix

| Role                  | Who                                                   |
| --------------------- | ----------------------------------------------------- |
| `erp-admin`           | System administrator — full access                    |
| `procurement-officer` | Creates PRs, POs, manages vendors                     |
| `warehouse-manager`   | Receives goods, manages stock, transfers              |
| `finance-controller`  | Posts journal entries, approves payments              |
| `operations-manager`  | Production orders, BOM management                     |
| `vendor`              | External — views POs issued to them, submits invoices |
| `auditor`             | Read-only — all financial and inventory data          |

```
                          erp-admin  procurement  warehouse  finance  operations  vendor  auditor
────────────────────────────────────────────────────────────────────────────────────────────────
vendor:read                   ✓           ✓           —         —         —         ◑       ✓
vendor:create                 ✓           ✓           —         —         —         —       —
vendor:approve                ✓           —           —         ✓         —         —       —

purchase-req:create           ✓           ✓           —         —         ✓         —       —
purchase-req:approve          ✓           —           —         ✓         ✓         —       —
purchase-order:create         ✓           ✓           —         —         —         —       —
purchase-order:approve        ✓           —           —         ✓         —         —       —
purchase-order:read           ✓           ✓           ✓         ✓         ✓         ◑       ✓

goods-receipt:create          ✓           —           ✓         —         —         —       —
goods-receipt:approve         ✓           ✓           ✓         —         —         —       —

invoice:create                ✓           ✓           —         ✓         —         ✓       —
invoice:approve               ✓           —           —         ✓         —         —       —
invoice:pay                   ✓           —           —         ✓         —         —       —

inventory:read                ✓           ✓           ✓         ✓         ✓         —       ✓
inventory:transfer            ✓           —           ✓         —         —         —       —
inventory:adjust              ✓           —           ✓         —         —         —       —

ledger:read                   ✓           —           —         ✓         —         —       ✓
ledger:post                   ✓           —           —         ✓         —         —       —
ledger:close-period           ✓           —           —         ✓         —         —       —

asset:read                    ✓           ✓           ✓         ✓         ✓         —       ✓
asset:create                  ✓           ✓           —         —         ✓         —       —
asset:depreciate              ✓           —           —         ✓         —         —       —

analytics:read                ✓           ✓           ✓         ✓         ✓         —       ✓
```

---

## 4. ERP Entity Extensions

### Vendor

```typescript
interface Vendor extends Entity {
  name: string;
  code: string; // 'VND-001'
  type: "supplier" | "contractor" | "service-provider";
  status: VendorStatus;
  contactEmail: string;
  paymentTerms: string; // 'NET30', 'NET60', 'IMMEDIATE'
  currency: string;
  taxId: string;
  bankDetails: BankDetails;
  rating: number; // 1–5, updated from GR quality checks
  addressId: ID;
  approvedBy?: ID; // actor who approved this vendor
}

type VendorStatus = "pending-approval" | "active" | "blacklisted" | "inactive";
```

**Vendor FSM:**

```
pending-approval → active      [on: vendor.approve]   guard: actor.role = 'finance-controller'
                 → rejected    [on: vendor.reject]
active → blacklisted           [on: vendor.blacklist]  guard: reason provided
       → inactive              [on: vendor.deactivate]
blacklisted → active           [on: vendor.reinstate]  guard: crm-admin only
```

### Purchase Requisition (PR)

```typescript
interface PurchaseRequisition extends Entity {
  referenceNo: string; // 'PR-2024-001'
  requestedBy: ID;
  department: string;
  status: PRStatus;
  items: PRItem[];
  justification: string;
  requiredBy: Timestamp;
  approvedBy?: ID;
  rejectedReason?: string;
}

interface PRItem {
  itemId: ID;
  variantId?: ID;
  qty: number;
  uom: string;
  estimatedUnitPrice: Money;
}

type PRStatus = "draft" | "submitted" | "approved" | "rejected" | "converted";
```

### Purchase Order (PO)

```typescript
interface PurchaseOrder extends Entity {
  poNumber: string; // 'PO-2024-001'
  vendorId: ID;
  prId?: ID; // source PR if converted
  status: POStatus;
  items: POItem[];
  deliveryLocationId: ID;
  expectedDeliveryDate: Timestamp;
  paymentTerms: string;
  subtotal: Money;
  tax: Money;
  total: Money;
  approvedBy?: ID;
  approvedAt?: Timestamp;
  ledgerTransactionId?: ID;
}

type POStatus =
  | "draft"
  | "pending-approval"
  | "approved"
  | "sent"
  | "partially-received"
  | "fully-received"
  | "cancelled"
  | "closed";
```

**PO FSM:**

```
draft → pending-approval    [on: po.submit]
pending-approval → approved [on: po.approve]   guard: role=finance-controller
                           entry: [emit 'po.approved']
                 → rejected [on: po.reject]    guard: reason required
approved → sent             [on: po.send-to-vendor]
sent → partially-received   [on: goods.partially-received]
     → fully-received       [on: goods.fully-received]
     → cancelled            [on: po.cancel]    guard: no GR created yet
partially-received → fully-received [on: goods.fully-received]
fully-received → closed     [on: po.close]     guard: invoice matched
```

### Goods Receipt (GR)

```typescript
interface GoodsReceipt extends Entity {
  grnNumber: string; // 'GRN-2024-001'
  poId: ID;
  vendorId: ID;
  receivedBy: ID;
  locationId: ID;
  status:
    | "draft"
    | "confirmed"
    | "quality-passed"
    | "quality-failed"
    | "partially-returned";
  items: GRItem[];
  qualityNotes?: string;
}

interface GRItem {
  poItemId: string;
  itemId: ID;
  variantId?: ID;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  batchNumber?: string;
  expiryDate?: Timestamp;
}
```

### Vendor Invoice

```typescript
interface VendorInvoice extends Entity {
  invoiceNumber: string;
  vendorId: ID;
  poId: ID;
  grnId: ID;
  status: InvoiceStatus;
  items: InvoiceItem[];
  invoiceDate: Timestamp;
  dueDate: Timestamp;
  subtotal: Money;
  tax: Money;
  total: Money;
  paidAmount: Money;
  ledgerTransactionId?: ID;
}

type InvoiceStatus =
  | "received"
  | "under-review"
  | "3way-matched"
  | "approved"
  | "partially-paid"
  | "paid"
  | "disputed"
  | "cancelled";
```

**3-Way Match:** Invoice matches PO (price/terms) + GR (qty received). All three must align before payment approval.

### Fixed Asset

```typescript
interface FixedAsset extends Entity {
  assetCode: string;
  name: string;
  category: string; // 'machinery', 'vehicle', 'furniture', 'IT-equipment'
  status: "active" | "under-maintenance" | "disposed";
  purchaseDate: Timestamp;
  purchaseCost: Money;
  usefulLifeYears: number;
  depreciationMethod: "straight-line" | "declining-balance";
  accumulatedDepreciation: Money;
  bookValue: Money; // computed: purchaseCost - accumulatedDepreciation
  locationId: ID;
  assignedToId?: ID;
}
```

---

## 5. ERP Hooks

### Hook: PO Approved

```typescript
compose.hook({
  on: "po.approved",
  handler: async (event, ctx) => {
    const { poId, vendorId } = event.payload;
    const po = await ctx.query("erp.getPO", { id: poId });

    // 1. Post commitment entry to ledger (budget reservation)
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-PURCHASE-COMMITMENT",
      credit: "ACC-ACCOUNTS-PAYABLE",
      amount: po.total,
      currency: po.total.currency,
      reference: poId,
      referenceType: "PurchaseOrder",
      description: `Commitment: ${po.poNumber}`,
    });

    // 2. Notify vendor (if vendor portal is active)
    await ctx.dispatch("notification.send", {
      templateKey: "po.approved",
      to: vendorId,
      variables: {
        poNumber: po.poNumber,
        deliveryDate: po.expectedDeliveryDate,
      },
      channels: ["email"],
    });

    // 3. Start delivery tracking workflow
    await ctx.dispatch("workflow.startProcess", {
      templateId: "PO_DELIVERY_TRACKING",
      entityId: poId,
      entityType: "PurchaseOrder",
    });
  },
});
```

### Hook: Goods Receipt Confirmed

```typescript
compose.hook({
  on: "grn.confirmed",
  handler: async (event, ctx) => {
    const grn = await ctx.query("erp.getGRN", { id: event.payload.grnId });

    // 1. Receive accepted items into inventory
    for (const item of grn.items.filter((i) => i.acceptedQty > 0)) {
      await ctx.dispatch("inventory.receive", {
        variantId: item.variantId,
        locationId: grn.locationId,
        qty: item.acceptedQty,
        reference: grn.id,
        referenceType: "GoodsReceipt",
      });
    }

    // 2. Reverse commitment → post actual payable
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-ACCOUNTS-PAYABLE",
      credit: "ACC-INVENTORY-ASSET",
      amount: grn.acceptedValue,
      reference: grn.id,
      referenceType: "GoodsReceipt",
    });

    // 3. Update PO status
    const allReceived = await ctx.query("erp.checkPOFullyReceived", {
      poId: grn.poId,
    });
    await ctx.dispatch("erp.advancePO", {
      poId: grn.poId,
      event: allReceived ? "goods.fully-received" : "goods.partially-received",
    });
  },
});
```

### Hook: 3-Way Match Complete → Payment Approval

```typescript
compose.hook({
  on: "invoice.3way-matched",
  handler: async (event, ctx) => {
    const { invoiceId } = event.payload;

    // Start payment approval workflow
    await ctx.dispatch("workflow.startProcess", {
      templateId: "INVOICE_PAYMENT_APPROVAL",
      entityId: invoiceId,
      entityType: "VendorInvoice",
    });

    await ctx.dispatch("notification.send", {
      templateKey: "invoice.ready-for-approval",
      to: { role: "finance-controller" },
      variables: { invoiceId },
    });
  },
});
```

### Hook: Invoice Paid

```typescript
compose.hook({
  on: "invoice.paid",
  handler: async (event, ctx) => {
    const { invoiceId, amount, vendorId } = event.payload;

    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-ACCOUNTS-PAYABLE",
      credit: "ACC-BANK",
      amount,
      reference: invoiceId,
      referenceType: "VendorInvoice",
      description: `Payment to vendor ${vendorId}`,
    });

    await ctx.dispatch("notification.send", {
      templateKey: "invoice.payment-sent",
      to: vendorId,
      variables: { invoiceId, amount },
      channels: ["email"],
    });
  },
});
```

---

## 6. Business Rules

```typescript
compose.rules([
  // PRs above threshold require manager approval
  {
    id: "pr-approval-threshold",
    scope: "purchase-req:approve",
    condition: {
      field: "pr.total.amount",
      op: "gte",
      value: { ref: "config.prApprovalThreshold" },
    },
    action: "require-approval",
    approverRole: "operations-manager",
  },

  // POs above threshold require finance controller approval
  {
    id: "po-approval-threshold",
    scope: "purchase-order:approve",
    condition: {
      field: "po.total.amount",
      op: "gte",
      value: { ref: "config.poApprovalThreshold" },
    },
    action: "require-approval",
    approverRole: "finance-controller",
  },

  // Vendor must be active before PO can be issued
  {
    id: "po-requires-active-vendor",
    scope: "purchase-order:create",
    guard: { field: "vendor.status", op: "eq", value: "active" },
  },

  // Cannot receive more than ordered qty (no over-receipt without approval)
  {
    id: "no-over-receipt",
    scope: "goods-receipt:create",
    guard: {
      field: "grn.item.receivedQty",
      op: "lte",
      value: { ref: "grn.item.orderedQty" },
    },
  },

  // Invoice amount must not exceed PO total by more than tolerance %
  {
    id: "invoice-po-tolerance",
    scope: "invoice:approve",
    guard: {
      field: "invoice.total.amount",
      op: "lte",
      value: { ref: "po.total.amount * (1 + config.invoiceTolerancePct)" },
    },
  },

  // Period cannot be closed with unposted transactions
  {
    id: "period-close-no-pending-tx",
    scope: "ledger:close-period",
    guard: { field: "pendingTransactionsCount", op: "eq", value: 0 },
  },
]);
```

---

## 7. Key Workflow Templates

```
PO_DELIVERY_TRACKING
  1. sent-to-vendor     → confirm vendor receipt of PO
  2. delivery-due       → auto-enters when expectedDeliveryDate - 3 days
  3. goods-receipt      → warehouse creates GRN
  4. quality-check      → QC team inspects goods
  5. invoice-matching   → finance matches invoice to PO + GRN
  6. payment            → finance approves and processes payment

INVOICE_PAYMENT_APPROVAL
  1. review             → finance reviews 3-way match
  2. approval           → finance controller approves
  3. payment-processing → treasury processes bank transfer

VENDOR_ONBOARDING
  1. application        → vendor submits details
  2. document-collection → collect tax cert, bank details, compliance docs
  3. credit-check       → finance reviews vendor creditworthiness
  4. approval           → finance controller approves vendor
```

---

## 8. API Surface

```
── Vendors ───────────────────────────────────────────────────
GET    /erp/vendors                       vendor:read
POST   /erp/vendors                       vendor:create
PATCH  /erp/vendors/:id                   vendor:create
POST   /erp/vendors/:id/approve           vendor:approve
POST   /erp/vendors/:id/blacklist         vendor:approve
GET    /erp/vendors/:id/pos               purchase-order:read
GET    /erp/vendors/:id/invoices          invoice:read

── Purchase Requisitions ─────────────────────────────────────
GET    /erp/purchase-requisitions         purchase-req:read
POST   /erp/purchase-requisitions         purchase-req:create
GET    /erp/purchase-requisitions/:id     purchase-req:read
POST   /erp/purchase-requisitions/:id/submit   purchase-req:create
POST   /erp/purchase-requisitions/:id/approve  purchase-req:approve
POST   /erp/purchase-requisitions/:id/reject   purchase-req:approve
POST   /erp/purchase-requisitions/:id/convert  purchase-req:approve  ← convert to PO

── Purchase Orders ───────────────────────────────────────────
GET    /erp/purchase-orders               purchase-order:read
POST   /erp/purchase-orders               purchase-order:create
GET    /erp/purchase-orders/:id           purchase-order:read
POST   /erp/purchase-orders/:id/approve   purchase-order:approve
POST   /erp/purchase-orders/:id/send      purchase-order:approve
POST   /erp/purchase-orders/:id/cancel    purchase-order:approve
GET    /erp/purchase-orders/:id/grns      goods-receipt:read

── Goods Receipts ────────────────────────────────────────────
GET    /erp/goods-receipts                goods-receipt:read
POST   /erp/goods-receipts                goods-receipt:create
GET    /erp/goods-receipts/:id            goods-receipt:read
POST   /erp/goods-receipts/:id/confirm    goods-receipt:approve
POST   /erp/goods-receipts/:id/quality    goods-receipt:approve

── Invoices ──────────────────────────────────────────────────
GET    /erp/invoices                      invoice:read
POST   /erp/invoices                      invoice:create
GET    /erp/invoices/:id                  invoice:read
POST   /erp/invoices/:id/approve          invoice:approve
POST   /erp/invoices/:id/pay              invoice:pay
POST   /erp/invoices/:id/dispute          invoice:approve

── Inventory ─────────────────────────────────────────────────
GET    /erp/inventory                     inventory:read
GET    /erp/inventory/stock-summary       inventory:read
POST   /erp/inventory/transfer            inventory:transfer
POST   /erp/inventory/adjust              inventory:adjust
GET    /erp/inventory/movements           inventory:read

── Ledger ────────────────────────────────────────────────────
GET    /erp/ledger/accounts               ledger:read
GET    /erp/ledger/trial-balance          ledger:read
GET    /erp/ledger/pnl                    ledger:read
GET    /erp/ledger/cashflow               ledger:read
POST   /erp/ledger/period-close           ledger:close-period

── Fixed Assets ──────────────────────────────────────────────
GET    /erp/assets                        asset:read
POST   /erp/assets                        asset:create
PATCH  /erp/assets/:id                    asset:create
POST   /erp/assets/:id/depreciate         asset:depreciate
POST   /erp/assets/:id/dispose            asset:depreciate

── Analytics ─────────────────────────────────────────────────
GET    /erp/analytics/procurement         analytics:read
GET    /erp/analytics/inventory-turns     analytics:read
GET    /erp/analytics/ap-aging            analytics:read
GET    /erp/analytics/vendor-performance  analytics:read
```

**Vendor Portal (`/erp/vendor/*`):**

```
GET    /erp/vendor/pos                    vendor:own    ← POs issued to them
POST   /erp/vendor/invoices               invoice:create ← submit invoice
GET    /erp/vendor/invoices               invoice:own
GET    /erp/vendor/payments               invoice:own
```

---

## 9. Real-Time Channels

| Channel                     | Subscribers       | Events                          |
| --------------------------- | ----------------- | ------------------------------- |
| `org:{orgId}:erp:approvals` | Finance, managers | `po.*`, `invoice.*`, `vendor.*` |
| `org:{orgId}:erp:warehouse` | Warehouse staff   | `grn.*`, `stock.*`              |
| `org:{orgId}:erp:finance`   | Finance team      | `transaction.*`, `invoice.*`    |

---

## 10. Scheduled Jobs

```
erp.check-po-delivery-due         daily
  → Find POs with expectedDeliveryDate within 3 days, no GRN yet
  → Notify procurement officer

erp.check-invoice-due             daily
  → Find approved invoices past due date, unpaid
  → Notify finance controller

erp.depreciation-run              monthly (1st of month)
  → Calculate and post depreciation for all active fixed assets
  → Update bookValue on each asset

erp.reorder-check                 every 6h
  → Check stock units against reorder rules
  → Auto-create PRs if enabled in config

erp.fx-rate-sync                  every 6h
  → Fetch latest exchange rates for active currencies

erp.period-reminder               monthly (25th)
  → Remind finance controller to close the period

erp.vendor-performance-snapshot   weekly
  → Calculate on-time delivery %, quality rejection % per vendor
  → Update vendor.rating

erp.analytics-snapshot            nightly
```

---

## 11. Integrations

```typescript
ERPCompose.integrations = {
  payment:     [BankTransferAdapter, RazorpayAdapter],
  storage:     [S3Adapter],
  email:       [ResendAdapter],
  fxRates:     [OpenExchangeRatesAdapter],
  tax:         [TaxJarAdapter],              // tax calculation
  edi:         [EDIAdapter],                 // electronic data interchange with vendors
  banking:     [PlaidAdapter],               // bank statement reconciliation
}

// Inbound Webhooks
POST /webhooks/banking      → bank transaction feed → ledger reconciliation
POST /webhooks/vendor-portal → vendor invoice submission
```
