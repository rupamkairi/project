# Phase 15 — Admin: Orders, Fulfillment & Returns

---

## Orders List — `routes/orders/index.tsx`

```
┌─ PageHeader "Orders" ──────────────────────────── [Export CSV] ─┐
├─ Filters: Status (All|Pending|Processing|Fulfilled|Cancelled)    ┤
├─ Search: order ID or customer email ──────────────────────────── ┤
├─ Table ────────────────────────────────────────────────────────── ┤
│  Order # | Customer | Status | Total | Payment | Date | Actions  │
│  ──────────────────────────────────────────────────────────────  │
│  #001    John D.   Pending  $49.99  Paid      5m ago  [View]     │
└──────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceAdminApi.getOrders({ status, q, page })`

Status badge colors:
- `pending` → `bg-yellow-100 text-yellow-700`
- `processing` → `bg-blue-100 text-blue-700`
- `fulfilled` → `bg-green-100 text-green-700`
- `cancelled` → `bg-red-100 text-red-600`
- `refunded` → `bg-zinc-100 text-zinc-600`

Payment status shown separately as text: `Paid | Pending | Refunded`.

Row click → navigate to order detail. No inline edit.

---

## Order Detail — `routes/orders/detail.tsx`

```
┌─ [← Orders]  Order #001  [Processing badge]  [Cancel Order] ─┐
│  Customer: John Doe (john@email.com) | Placed: 5m ago          │
│  Total: $49.99 | Payment: Stripe · Paid                        │
├─ Tabs: Items | Addresses | Fulfillment | Activity ─────────────┤
│                                                                  │
│  Items tab:                                                      │
│    Table: Product | Variant | Qty | Unit Price | Line Total     │
│    ─────────────────────────────────────────────────────────── │
│    Subtotal: $44.99 | Shipping: $5.00 | Tax: — | Total: $49.99 │
│                                                                  │
│  Addresses tab:                                                  │
│    Shipping address block | Billing address block (if different) │
│                                                                  │
│  Fulfillment tab:                                                │
│    Fulfillment status (pending/processing/shipped/delivered)     │
│    [Create Fulfillment] button (if no fulfillment yet)          │
│    Tracking number + carrier (once fulfillment created)         │
│                                                                  │
│  Activity tab:                                                   │
│    Timeline: order placed → payment captured → shipped → etc.   │
└──────────────────────────────────────────────────────────────────┘
```

Cancel order: `ecommerceAdminApi.updateOrderStatus(id, "cancelled")` — confirm dialog. Only allowed for `pending | processing` orders.

---

## Create Fulfillment Dialog

Triggered from Fulfillment tab on order detail.

```
carrier*        text (e.g. "DHL", "FedEx", "India Post")
trackingNumber  text
shippedAt       date (defaults to now)
items*          checkboxes — which order items are included (default: all)
```

On submit: `ecommerceAdminApi.createFulfillment(orderId, body)`

After create: fulfillment status shows as `processing`. Once carrier delivers → update to `delivered` manually or via webhook (P1).

---

## Fulfillment Queue — `routes/fulfillment/index.tsx`

```
┌─ PageHeader "Fulfillment" ─────────────────────────────────────┐
├─ Tabs: Pending | Processing | Shipped | Delivered ─────────────┤
├─ Table ────────────────────────────────────────────────────────┤
│  Order # | Customer | Items | Carrier | Tracking | Status       │
│  ─────────────────────────────────────────────────────────────│
│  #001    John D.    2 items   DHL     1234567   Processing [→] │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceAdminApi.getFulfillments({ status, page })`

"Mark Shipped" button (for `processing` fulfillments) → opens dialog:
```
trackingNumber*     text
carrier*            text
shippedAt           date
```
Calls `ecommerceAdminApi.updateFulfillment(id, { status: "shipped", trackingNumber, carrier, shippedAt })`

"Mark Delivered" button (for `shipped`) → one-click, no dialog.

Row click → navigate to parent order detail.

---

## Returns List — `routes/returns/index.tsx`

```
┌─ PageHeader "Returns" ─────────────────────────────────────────┐
├─ Tabs: Requested | Approved | Processing | Completed ──────────┤
├─ Table ────────────────────────────────────────────────────────┤
│  Return # | Order # | Customer | Items | Refund Amt | Status   │
│  ─────────────────────────────────────────────────────────────│
│  #R001   #001      John D.    2 items  $44.99   Requested      │
│  [View] [Approve] [Reject]                                     │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceAdminApi.getReturns({ status, page })`

---

## Return Detail — `routes/returns/detail.tsx`

```
┌─ [← Returns]  Return #R001  [Requested badge]  ──────────────────┐
│  Order: #001 | Customer: John Doe | Requested: 2h ago              │
│  Reason: "Item damaged on arrival"                                 │
│                                                                    │
│  Items requested for return:                                       │
│    Table: Product | Variant | Qty | Unit Price | Subtotal          │
│                                                                    │
│  Suggested refund: $44.99 (subtotal of return items)              │
│                                                                    │
│  ── Actions ──                                                     │
│  [Approve Return]  [Reject Return]                                 │
│                                                                    │
│  (After approved, shows:)                                         │
│  Refund amount input: [$44.99]  [Process Refund]                  │
└────────────────────────────────────────────────────────────────────┘
```

### Approve flow
1. Click "Approve Return" → confirm dialog
2. `ecommerceAdminApi.approveReturn(id)` → status moves to `approved`
3. "Process Refund" input appears — pre-filled with return subtotal, editable
4. Click "Process Refund" → `ecommerceAdminApi.processRefund(id, amount)`

### Reject flow
1. Click "Reject Return" → dialog: `reason*` text input
2. `ecommerceAdminApi.rejectReturn(id, reason)`

Return status FSM:
```
requested → approved → received → processed → refunded
requested → rejected  (terminal)
```

---

## Store: `stores/fulfillment.ts`

```typescript
interface FulfillmentStore {
  fulfillments: EcoFulfillment[];
  activeTab: "pending" | "processing" | "shipped" | "delivered";
  loading: boolean;
  fetchFulfillments: (status?: string) => Promise<void>;
  setTab: (tab: FulfillmentStore["activeTab"]) => void;
}
```

---

## Checks

- Orders list shows status badges in correct colors
- Order detail Fulfillment tab shows "Create Fulfillment" when no fulfillment exists
- After creating fulfillment, tracking details appear on Fulfillment tab
- Returns list shows Approve/Reject actions only for `requested` status
- After approve + process refund, status shows `refunded`
