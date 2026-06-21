# Phase 10 — Backend Logic

---

## 10.1 FSMs

**File:** `composes/erp/server/src/fsm/`

All FSMs use `FSMEngine` from `@core`.

### Vendor FSM
```
pending-approval → active           [on: vendor.approve]    guard: erp:vendor:approve
                 → rejected         [on: vendor.reject]     guard: erp:vendor:approve
active           → blacklisted      [on: vendor.blacklist]  guard: reason required
                 → inactive         [on: vendor.deactivate]
blacklisted      → active           [on: vendor.reinstate]  guard: erp:admin only
```

### PR FSM
```
draft      → submitted   [on: pr.submit]
submitted  → approved    [on: pr.approve]   guard: erp:purchase-req:approve
           → rejected    [on: pr.reject]    guard: reason required
approved   → converted   [on: pr.convert]  entry: create PO
```

### PO FSM
```
draft              → pending-approval    [on: po.submit]
pending-approval   → approved           [on: po.approve]     guard: erp:purchase-order:approve
                   → rejected           [on: po.reject]      guard: reason required
                                        entry: notify procurement officer
approved           → sent               [on: po.send-vendor]
                   entry: emit po.approved, start PO_DELIVERY_TRACKING workflow
sent               → partially-received [on: grn.created]
                 → fully-received       [on: grn.all-received]
                 → cancelled            [on: po.cancel]      guard: no GRN exists yet
partially-received → fully-received     [on: grn.all-received]
fully-received     → closed             [on: po.close]       guard: invoice matched
```

### GRN FSM
```
draft           → confirmed       [on: grn.confirm]
                  entry: post stock receipt, advance PO status
confirmed       → quality-passed  [on: grn.quality-pass]
                → quality-failed  [on: grn.quality-fail]    guard: notes required
quality-failed  → partially-returned [on: grn.return-reject]
```

### Vendor Invoice FSM
```
received      → under-review    [on: invoice.review]
under-review  → 3way-matched    [on: invoice.match]    entry: emit invoice.3way-matched
              → disputed        [on: invoice.dispute]
3way-matched  → approved        [on: invoice.approve]  guard: erp:invoice:approve
approved      → partially-paid  [on: payment.partial]
              → paid            [on: payment.full]
              entry: post AP journal, notify vendor
disputed      → under-review    [on: invoice.reopen]
```

### Sales Order FSM
```
draft              → confirmed          [on: so.confirm]   guard: credit limit check
confirmed          → partially-delivered [on: dn.created]
                   → fully-delivered    [on: dn.all-delivered]
                   → cancelled          [on: so.cancel]   guard: no DN exists
partially-delivered → fully-delivered   [on: dn.all-delivered]
```

### Sales Invoice FSM
```
draft       → submitted      [on: si.submit]  entry: post AR journal, compute GST
submitted   → partially-paid [on: payment.partial]
            → paid           [on: payment.full]
            → overdue        [on: si.overdue]  trigger: scheduled job
overdue     → paid           [on: payment.full]
            → cancelled      [on: si.cancel]  guard: erp:invoice:approve
```

### Work Order FSM
```
draft      → submitted    [on: wo.submit]
submitted  → in-process   [on: wo.start]    entry: issue raw materials
in-process → completed    [on: wo.complete] entry: receive finished goods, post journal
           → cancelled    [on: wo.cancel]   guard: no materials issued yet
```

### Leave Application FSM
```
draft     → submitted   [on: leave.submit]  guard: balance sufficient
submitted → approved    [on: leave.approve] guard: erp:hr:manage
          → rejected    [on: leave.reject]  guard: reason required
```

### Salary Slip FSM
```
draft     → submitted   [on: slip.submit]   (part of payroll entry)
submitted → paid        [on: payroll.paid]  entry: post salary journal
```

---

## 10.2 Hooks

**File:** `composes/erp/server/src/hooks/erp.hooks.ts`

```typescript
export function registerErpHooks(bus: EventBus, mediator: Mediator) {

  // PO Approved → ledger commitment + notify vendor + start workflow
  bus.on("po.approved", async (event) => {
    const { poId, vendorId, total } = event.payload;
    // 1. Post commitment journal: Dr Purchase Commitment, Cr AP
    await mediator.dispatch({ type: "ledger.postTransaction", ... });
    // 2. Notify vendor
    await mediator.dispatch({ type: "notification.send", ... });
    // 3. Start PO_DELIVERY_TRACKING workflow
    await mediator.dispatch({ type: "workflow.startProcess", templateId: "PO_DELIVERY_TRACKING", ... });
  });

  // GRN Confirmed → receive inventory + reverse commitment + update PO
  bus.on("grn.confirmed", async (event) => {
    const { grnId } = event.payload;
    const grn = await getGrn(grnId);
    for (const item of grn.items.filter(i => i.acceptedQty > 0)) {
      await mediator.dispatch({ type: "inventory.receive", variantId: item.itemId, qty: item.acceptedQty, ... });
    }
    // Reverse commitment, post actual AP: Dr AP-Commitment, Cr Inventory Asset
    await mediator.dispatch({ type: "ledger.postTransaction", ... });
    // Advance PO status
    const allReceived = await checkPOFullyReceived(grn.poId);
    await advancePO(grn.poId, allReceived ? "grn.all-received" : "grn.created");
  });

  // 3-Way Match → start payment approval workflow
  bus.on("invoice.3way-matched", async (event) => {
    const { invoiceId } = event.payload;
    await mediator.dispatch({ type: "workflow.startProcess", templateId: "INVOICE_PAYMENT_APPROVAL", entityId: invoiceId, ... });
    await mediator.dispatch({ type: "notification.send", to: { role: "erp:finance-controller" }, ... });
  });

  // Invoice Paid → post AP payment journal + notify vendor
  bus.on("invoice.paid", async (event) => {
    const { invoiceId, amount, vendorId } = event.payload;
    await mediator.dispatch({ type: "ledger.postTransaction",
      lines: [
        { accountId: "ACC-AP", debit: amount },       // Dr: AP
        { accountId: "ACC-BANK", credit: amount },    // Cr: Bank
      ], ... });
    await mediator.dispatch({ type: "notification.send", ... });
  });

  // Delivery Submitted → deduct stock, update SO delivered qty
  bus.on("delivery.submitted", async (event) => { ... });

  // Sales Invoice Submitted → post AR journal + update customer outstanding
  bus.on("sales-invoice.submitted", async (event) => {
    const { siId, customerId, total } = event.payload;
    await mediator.dispatch({ type: "ledger.postTransaction",
      lines: [
        { accountId: "ACC-AR", debit: total, partyType: "customer", partyId: customerId },
        { accountId: "ACC-REVENUE", credit: subtotal },
        { accountId: "ACC-CGST-PAYABLE", credit: cgst },
        { accountId: "ACC-SGST-PAYABLE", credit: sgst },
        { accountId: "ACC-IGST-PAYABLE", credit: igst },
      ], ... });
  });

  // Work Order Completed → post manufacturing journal
  bus.on("work-order.completed", async (event) => { ... });

  // Payroll Submitted → post salary journal (bulk)
  bus.on("payroll.submitted", async (event) => { ... });
}
```

---

## 10.3 Scheduled Jobs

**File:** `composes/erp/server/src/jobs/erp.jobs.ts`

```typescript
export function registerErpJobs(scheduler: Scheduler, mediator: Mediator) {

  // Daily: POs with delivery due in 3 days — no GRN yet
  scheduler.schedule("erp.check-po-delivery-due", "0 9 * * *", async () => {
    const overduePOs = await findPOsDueSoon(3);
    for (const po of overduePOs) {
      await mediator.dispatch({ type: "notification.send", to: po.requestedBy, ... });
    }
  });

  // Daily: Approved invoices past due date, unpaid
  scheduler.schedule("erp.check-invoice-due", "0 9 * * *", async () => {
    const overdueInvoices = await findOverdueVendorInvoices();
    for (const inv of overdueInvoices) {
      await mediator.dispatch({ type: "notification.send", to: { role: "erp:finance-controller" }, ... });
    }
    const overdueARInvoices = await findOverdueSalesInvoices();
    for (const inv of overdueARInvoices) {
      await advanceSalesInvoiceFSM(inv.id, "si.overdue");
    }
  });

  // Monthly 1st: depreciation run for all active fixed assets
  scheduler.schedule("erp.depreciation-run", "0 2 1 * *", async () => {
    const assets = await findActiveAssets();
    for (const asset of assets) {
      const depreciation = computeDepreciation(asset);
      await postDepreciationJournal(asset, depreciation);
      await updateAssetBookValue(asset.id, depreciation);
    }
  });

  // Every 6h: reorder check
  scheduler.schedule("erp.reorder-check", "0 */6 * * *", async () => {
    const lowStockItems = await findItemsBelowReorder();
    for (const item of lowStockItems) {
      const existingPR = await findOpenPRForItem(item.id);
      if (!existingPR) {
        await mediator.dispatch({ type: "notification.send", to: { role: "erp:procurement-officer" }, ... });
      }
    }
  });

  // Every 6h: FX rate sync
  scheduler.schedule("erp.fx-rate-sync", "0 */6 * * *", async () => {
    if (process.env.FX_RATES_API_KEY) {
      const rates = await fetchFxRates(process.env.FX_RATES_API_KEY);
      await cacheExchangeRates(rates);
    }
  });

  // Monthly 25th: period close reminder
  scheduler.schedule("erp.period-reminder", "0 9 25 * *", async () => {
    await mediator.dispatch({ type: "notification.send", to: { role: "erp:finance-controller" },
      message: "Month-end approaching — please review and close the accounting period.", ... });
  });

  // Weekly: vendor performance snapshot
  scheduler.schedule("erp.vendor-performance", "0 2 * * 0", async () => {
    const vendors = await findActiveVendors();
    for (const vendor of vendors) {
      const onTimeRate = await computeOnTimeDeliveryRate(vendor.id);
      const rejectionRate = await computeQualityRejectionRate(vendor.id);
      const rating = computeVendorRating(onTimeRate, rejectionRate);
      await updateVendorRating(vendor.id, rating);
    }
  });

  // Nightly: analytics snapshot
  scheduler.schedule("erp.analytics-snapshot", "0 1 * * *", async () => {
    await mediator.dispatch({ type: "analytics.track", event: "erp.daily-snapshot", ... });
  });
}
```

---

## 10.4 Business Rules

**File:** `composes/erp/server/src/rules/erp.rules.ts`

```typescript
export const ERP_RULES = [
  // PRs above ₹50,000 require operations-manager approval
  {
    id: "pr-approval-threshold",
    description: "PRs above INR 50,000 require operations-manager approval",
    // Enforced in PR FSM approve transition — check total > threshold
  },

  // POs above ₹2,00,000 require finance-controller approval
  {
    id: "po-approval-threshold",
    description: "POs above INR 2,00,000 require finance-controller approval",
  },

  // Vendor must be active before PO can be created
  {
    id: "po-active-vendor-only",
    description: "PO vendor.status must be 'active'",
  },

  // Cannot receive more than ordered quantity
  {
    id: "no-over-receipt",
    description: "GRN received qty must not exceed PO remaining qty",
  },

  // Invoice total must not exceed PO total by more than 5%
  {
    id: "invoice-po-tolerance",
    description: "Invoice total ≤ PO total × 1.05",
  },

  // Period cannot close with draft journal entries
  {
    id: "period-close-no-drafts",
    description: "All JEs must be posted before period close",
  },

  // Stock cannot go negative (configurable)
  {
    id: "no-negative-stock",
    description: "Stock balance must stay ≥ 0",
  },

  // Credit limit enforcement on SO
  {
    id: "so-credit-limit",
    description: "SO total + outstanding balance ≤ customer credit limit",
  },
];
```

---

## 10.5 Workflow Templates

Register these with the `workflow` module:

```typescript
export const ERP_WORKFLOW_TEMPLATES = [
  {
    id: "PO_DELIVERY_TRACKING",
    name: "Purchase Order Delivery Tracking",
    steps: [
      { id: "vendor-acknowledged", label: "Vendor Acknowledged PO" },
      { id: "goods-in-transit", label: "Goods In Transit" },
      { id: "grn-created", label: "GRN Created" },
      { id: "quality-inspected", label: "Quality Inspected" },
      { id: "invoice-matched", label: "Invoice 3-Way Matched" },
      { id: "payment-processed", label: "Payment Processed" },
    ],
  },
  {
    id: "INVOICE_PAYMENT_APPROVAL",
    name: "Vendor Invoice Payment Approval",
    steps: [
      { id: "finance-review", label: "Finance Review" },
      { id: "controller-approval", label: "Finance Controller Approval" },
      { id: "payment-processing", label: "Payment Processing" },
    ],
  },
  {
    id: "VENDOR_ONBOARDING",
    name: "Vendor Onboarding",
    steps: [
      { id: "application", label: "Vendor Application" },
      { id: "document-collection", label: "Document Collection" },
      { id: "credit-check", label: "Credit Check" },
      { id: "approval", label: "Finance Approval" },
    ],
  },
];
```
