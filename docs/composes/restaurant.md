# Compose — Restaurant & Food Delivery Management

## Dine-In, Takeaway, Kitchen Operations & Last-Mile Delivery

---

## 1. Compose Overview

```
Compose ID:   restaurant
Version:      1.0.0
Purpose:      Manage dine-in table service, kitchen order flow, delivery
              operations, and aggregator integrations for single or
              multi-outlet restaurant brands.
Apps Served:  POSApp          → table ordering, billing, shift management
              KDSApp          → Kitchen Display System (real-time order flow)
              DeliveryApp     → rider assignment, live tracking (mobile)
              CustomerApp     → ordering, tracking, loyalty
              AggregatorBridge → Swiggy / Zomato / UberEats webhook ingestion
              AdminApp        → menu, outlets, analytics, promotions
```

---

## 2. Module Selection & Configuration

```typescript
const RestaurantCompose: ComposeDefinition = {
  id: "restaurant",
  name: "Restaurant & Food Delivery",
  modules: [
    "identity",
    "catalog", // Menu items, modifiers, combos, beverages
    "inventory", // Raw ingredients, packaging, consumables
    "ledger", // Daily sales, cash settlement, aggregator reconciliation
    "workflow", // Order lifecycle, kitchen flow, delivery workflow
    "scheduling", // Table reservations, rider shift scheduling
    "geo", // Delivery zones, rider live tracking, outlet mapping
    "notification", // Order confirmation, rider assignment, delivery updates
    "analytics", // Sales, item performance, kitchen TAT, delivery metrics
  ],

  moduleConfig: {
    catalog: {
      itemLabel: "Menu Item",
      enableVariants: true, // size: small/medium/large
      enablePriceLists: true, // dine-in vs delivery pricing
      enableModifiers: true, // add-ons, customizations per item
    },
    inventory: {
      trackingMode: "ingredient",
      enableRecipes: true, // item → ingredient consumption mapping
    },
    geo: {
      enableDeliveryZones: true,
      enableLiveTracking: true,
    },
  },
};
```

---

## 3. Actor Roles & Permission Matrix

| Role               | Who                                              |
| ------------------ | ------------------------------------------------ |
| `restaurant-admin` | Owner / manager — full access                    |
| `outlet-manager`   | Manages a single outlet                          |
| `cashier`          | Billing, cash settlement, daily close            |
| `waiter`           | Takes table orders, updates order status         |
| `kitchen-staff`    | Kitchen Display — accepts/rejects/completes KOTs |
| `rider`            | Delivery — picks up and delivers orders          |
| `dispatcher`       | Assigns riders, monitors delivery dashboard      |
| `customer`         | Orders via app — own orders only                 |

```
                        restaurant-admin  outlet-mgr  cashier  waiter  kitchen  rider  dispatcher  customer
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
menu:read                       ✓             ✓          ✓        ✓        ✓       —        —          ✓
menu:manage                     ✓             ✓          —        —        —       —        —          —

table:read                      ✓             ✓          ✓        ✓        —       —        —          —
table:assign                    ✓             ✓          ✓        ✓        —       —        —          —
table:update-status             ✓             ✓          ✓        ✓        —       —        —          —

order:create                    ✓             ✓          ✓        ✓        —       —        —          ✓
order:read                      ✓             ✓          ✓        ✓        ✓       ◑(own)   ✓          ◑(own)
order:modify                    ✓             ✓          ✓        ✓        —       —        —          ◑(own, pending)
order:cancel                    ✓             ✓          ✓        —        —       —        —          ◑(own, pending)
order:close                     ✓             ✓          ✓        —        —       —        —          —

kot:read                        ✓             ✓          —        ✓        ✓       —        —          —
kot:accept                      ✓             —          —        —        ✓       —        —          —
kot:complete                    ✓             —          —        —        ✓       —        —          —

delivery:assign-rider           ✓             ✓          —        —        —       —        ✓          —
delivery:read                   ✓             ✓          ✓        —        —       ◑(own)   ✓          ◑(own)
delivery:update-status          ✓             —          —        —        —       ✓        ✓          —

billing:create                  ✓             ✓          ✓        —        —       —        —          —
billing:settle                  ✓             ✓          ✓        —        —       —        —          ✓(online)
billing:void                    ✓             ✓          —        —        —       —        —          —

coupon:apply                    ✓             ✓          ✓        ✓        —       —        —          ✓
inventory:read                  ✓             ✓          —        —        ✓       —        —          —
analytics:read                  ✓             ✓          —        —        —       —        ✓          —
```

---

## 4. Restaurant Entity Extensions

### Outlet

```typescript
interface Outlet extends Entity {
  name: string;
  code: string; // 'BLR-01', 'MUM-02'
  type: "dine-in" | "cloud-kitchen" | "qsr" | "cafe" | "kiosk";
  status: "open" | "closed" | "temporarily-closed" | "paused-orders";
  address: string;
  location: { lat: number; lng: number };
  operatingHours: OperatingHours;
  acceptsDelivery: boolean;
  acceptsDineIn: boolean;
  acceptsTakeaway: boolean;
  deliveryRadius: number; // km
  preparationTimeMinutes: number;
  aggregatorIds: Record<string, string>; // { swiggy: 'SW123', zomato: 'ZM456' }
}
```

### Table

```typescript
interface Table extends Entity {
  outletId: ID;
  tableNumber: string; // 'T1', 'T12', 'BAR-3'
  section: string; // 'indoor', 'outdoor', 'bar', 'private'
  capacity: number;
  status: TableStatus;
  currentOrderId?: ID;
  qrCode: string; // QR for self-ordering
  mergedWithIds?: ID[]; // table merging for large groups
}

type TableStatus = "available" | "occupied" | "reserved" | "dirty" | "blocked";
```

### Order

```typescript
interface Order extends Entity {
  orderNumber: string; // 'ORD-BLR01-2024-001'
  outletId: ID;
  type: OrderType;
  status: OrderStatus;
  source: OrderSource;

  // Dine-in specific
  tableId?: ID;
  tableNumber?: string;
  coverCount?: number; // number of diners
  waiterId?: ID;

  // Delivery specific
  customerId?: ID;
  deliveryAddress?: DeliveryAddress;
  riderId?: ID;
  estimatedDeliveryAt?: Timestamp;
  deliveredAt?: Timestamp;

  items: OrderItem[];
  kots: KOT[]; // kitchen order tickets
  subtotal: Money;
  discount: Money;
  tax: Money;
  deliveryFee: Money;
  total: Money;
  paymentStatus: "pending" | "paid" | "refunded";
  paymentMethod?: string;
  couponCode?: string;
  specialInstructions?: string;
  aggregatorOrderId?: string; // Swiggy/Zomato reference
  ledgerTransactionId?: ID;
}

type OrderType = "dine-in" | "takeaway" | "delivery";
type OrderSource =
  | "pos"
  | "qr-self-order"
  | "customer-app"
  | "swiggy"
  | "zomato"
  | "ubereats"
  | "phone";

type OrderStatus =
  | "draft" // building order (waiter/customer)
  | "placed" // submitted — KOT sent to kitchen
  | "accepted" // kitchen accepted
  | "preparing"
  | "ready" // ready for pickup / serving
  | "out-for-delivery"
  | "served" // dine-in: food served at table
  | "completed" // dine-in: bill settled; delivery: delivered
  | "cancelled"
  | "rejected"; // kitchen rejected (unavailable item)
```

**Order FSM:**

```
draft → placed            [on: order.place]     entry: [emit 'kot.created', post to KDS]
placed → accepted         [on: kot.accept]      entry: [notify customer ETA]
       → rejected         [on: kot.reject]      entry: [notify customer, trigger refund]
accepted → preparing      [on: kot.start-prep]
preparing → ready         [on: kot.complete]
            entry: [emit 'order.ready']
            → (dine-in: notify waiter to serve)
            → (delivery: notify dispatcher to assign rider)
ready → served            [on: order.served]    guard: type = 'dine-in'
      → out-for-delivery  [on: delivery.pickup] guard: type = 'delivery'
served → completed        [on: order.bill-settled]
out-for-delivery → completed [on: delivery.delivered]
completed → (terminal)
cancelled → (terminal)
rejected  → (terminal)
```

### KOT (Kitchen Order Ticket)

```typescript
interface KOT extends Entity {
  orderId: ID;
  outletId: ID;
  kotNumber: string; // 'KOT-001' — sequential per shift
  status: "sent" | "accepted" | "preparing" | "ready" | "cancelled";
  items: KOTItem[];
  station: string; // 'grill', 'cold', 'beverages', 'tandoor'
  priority: "normal" | "rush";
  sentAt: Timestamp;
  acceptedAt?: Timestamp;
  prepStartAt?: Timestamp;
  readyAt?: Timestamp;
  preparationTimeMinutes?: number;
}

interface KOTItem {
  menuItemId: ID;
  name: string;
  qty: number;
  modifiers: string[]; // 'extra spicy', 'no onions'
  note?: string;
  status: "pending" | "preparing" | "done" | "voided";
}
```

### Delivery

```typescript
interface Delivery extends Entity {
  orderId: ID;
  outletId: ID;
  riderId?: ID;
  status: DeliveryStatus;
  pickupAddress: string;
  dropAddress: DeliveryAddress;
  distance: number; // km
  estimatedPickupAt?: Timestamp;
  pickedUpAt?: Timestamp;
  estimatedDeliveryAt?: Timestamp;
  deliveredAt?: Timestamp;
  riderLocation?: { lat: number; lng: number; updatedAt: Timestamp };
  proofOfDelivery?: ID; // document attachment
  failureReason?: string;
}

type DeliveryStatus =
  | "pending-assignment"
  | "assigned"
  | "rider-heading-to-outlet"
  | "reached-outlet"
  | "picked-up"
  | "out-for-delivery"
  | "delivered"
  | "failed"
  | "returned";

interface DeliveryAddress {
  label?: string;
  line1: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  instructions?: string;
}
```

### Menu Modifier

```typescript
interface MenuModifier extends Entity {
  name: string; // 'Spice Level', 'Add-ons', 'Size'
  type: "single" | "multi";
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

interface ModifierOption {
  id: string;
  name: string; // 'Extra Cheese', 'Large'
  additionalPrice: Money;
  isDefault: boolean;
  isAvailable: boolean;
}
```

### Bill / Check

```typescript
interface Bill extends Entity {
  orderId: ID;
  outletId: ID;
  billNumber: string; // 'BILL-BLR01-2024-001'
  status: "open" | "printed" | "settled" | "voided";
  subtotal: Money;
  discount: Money;
  tax: Money;
  serviceCharge?: Money;
  total: Money;
  splitWith?: ID[]; // other bill ids if split
  payments: BillPayment[];
  settledAt?: Timestamp;
  ledgerTransactionId?: ID;
}

interface BillPayment {
  method: "cash" | "card" | "upi" | "wallet" | "aggregator";
  amount: Money;
  reference?: string;
  receivedAt: Timestamp;
}
```

---

## 5. Restaurant Hooks

### Hook: Order Placed

```typescript
compose.hook({
  on: "order.placed",
  handler: async (event, ctx) => {
    const { orderId, outletId, type, items } = event.payload;

    // 1. Deduct ingredients from inventory (recipe-based)
    for (const item of items) {
      await ctx.dispatch("restaurant.deductIngredients", {
        menuItemId: item.menuItemId,
        qty: item.qty,
        outletId,
      });
    }

    // 2. Send KOT to kitchen display (real-time)
    await ctx.publish({
      type: "kot.created",
      aggregateId: orderId,
      aggregateType: "Order",
      payload: { orderId, outletId, items, station: event.payload.station },
      source: "restaurant",
    });

    // 3. Confirm to customer
    if (type === "delivery") {
      await ctx.dispatch("notification.send", {
        templateKey: "order.confirmed",
        to: event.payload.customerId,
        variables: {
          orderNumber: event.payload.orderNumber,
          eta: event.payload.estimatedDeliveryAt,
        },
        channels: ["sms", "push"],
      });
    }
  },
});
```

### Hook: Order Ready (Delivery)

```typescript
compose.hook({
  on: "order.ready",
  filter: { orderType: "delivery" },
  handler: async (event, ctx) => {
    const { orderId, outletId } = event.payload;

    // 1. Find nearest available rider in delivery zone
    const rider = await ctx.query("restaurant.findNearestRider", {
      outletId,
      maxDistanceKm: 3,
    });

    if (rider) {
      // 2. Assign rider
      await ctx.dispatch("restaurant.assignRider", {
        orderId,
        riderId: rider.id,
      });

      // 3. Notify rider
      await ctx.dispatch("notification.send", {
        templateKey: "delivery.assigned",
        to: rider.actorId,
        variables: { orderId, outletAddress: event.payload.outletAddress },
        channels: ["push"],
      });
    } else {
      // 4. Alert dispatcher — no rider available
      await ctx.dispatch("notification.send", {
        templateKey: "delivery.no-rider",
        to: { role: "dispatcher" },
        variables: { orderId, outletId },
        channels: ["in_app"],
      });
    }
  },
});
```

### Hook: Rider Location Update

```typescript
compose.hook({
  on: "delivery.location-updated",
  handler: async (event, ctx) => {
    const { deliveryId, location, orderId, customerId } = event.payload;

    // Update geo entity with rider's current location
    await ctx.dispatch("geo.updateLocation", {
      entityId: deliveryId,
      entityType: "Delivery",
      coordinates: location,
    });

    // Forward live location to customer via real-time channel
    await ctx.realtime.publish(
      `org:${ctx.org.id}:delivery:${orderId}:tracking`,
      { location, updatedAt: Date.now() },
    );
  },
});
```

### Hook: Aggregator Order Received (Swiggy/Zomato)

```typescript
compose.hook({
  on: "aggregator.order-received",
  handler: async (event, ctx) => {
    const { source, rawOrder, outletId } = event.payload;

    // Normalize aggregator order format to internal Order schema
    const order = await ctx.dispatch("restaurant.normalizeAggregatorOrder", {
      source,
      rawOrder,
      outletId,
    });

    // Accept or auto-reject based on outlet status and item availability
    const outlet = await ctx.query("restaurant.getOutlet", { id: outletId });
    if (outlet.status !== "open") {
      await ctx.dispatch("restaurant.rejectAggregatorOrder", {
        source,
        aggregatorOrderId: rawOrder.id,
        reason: "Outlet currently closed",
      });
      return;
    }

    // Place as internal order — triggers normal order flow
    await ctx.dispatch("restaurant.placeOrder", order);

    // Acknowledge to aggregator within SLA (usually 2 min)
    await ctx.dispatch("restaurant.acknowledgeAggregatorOrder", {
      source,
      aggregatorOrderId: rawOrder.id,
      internalOrderId: order.id,
    });
  },
});
```

### Hook: Bill Settled

```typescript
compose.hook({
  on: "bill.settled",
  handler: async (event, ctx) => {
    const { billId, orderId, outletId, total, paymentMethod } = event.payload;

    // 1. Post sales ledger entry
    await ctx.dispatch("ledger.postTransaction", {
      debit: "ACC-CASH-OR-GATEWAY",
      credit: "ACC-FOOD-REVENUE",
      amount: total,
      reference: billId,
      referenceType: "Bill",
      description: `Sale: ${event.payload.billNumber}`,
    });

    // 2. Update table status → dirty (dine-in)
    if (event.payload.orderType === "dine-in") {
      await ctx.dispatch("restaurant.updateTableStatus", {
        tableId: event.payload.tableId,
        status: "dirty",
        currentOrderId: null,
      });
    }

    // 3. Add loyalty points if customer is registered
    if (event.payload.customerId) {
      await ctx.dispatch("loyalty.earnPoints", {
        customerId: event.payload.customerId,
        amount: total,
        reference: billId,
      });
    }
  },
});
```

---

## 6. Business Rules

```typescript
compose.rules([
  // Orders cannot be placed to a closed outlet
  {
    id: "outlet-must-be-open",
    scope: "order:create",
    guard: { field: "outlet.status", op: "eq", value: "open" },
  },

  // Delivery orders must be within the outlet's delivery zone
  {
    id: "delivery-within-zone",
    scope: "order:create",
    condition: { field: "order.type", op: "eq", value: "delivery" },
    guard: { field: "deliveryAddress.withinZone", op: "eq", value: true },
  },

  // KOT cannot be cancelled after kitchen starts preparation
  {
    id: "no-cancel-after-prep-start",
    scope: "order:cancel",
    guard: { field: "order.status", op: "in", value: ["draft", "placed"] },
  },

  // Order modification only allowed before kitchen accepts KOT
  {
    id: "modify-before-acceptance",
    scope: "order:modify",
    guard: { field: "order.status", op: "in", value: ["draft", "placed"] },
  },

  // Bill void requires outlet manager or above
  {
    id: "void-requires-manager",
    scope: "billing:void",
    guard: {
      field: "actor.roles",
      op: "contains",
      value: { or: ["outlet-manager", "restaurant-admin"] },
    },
  },

  // Rider must be within pickup range to confirm pickup
  {
    id: "rider-must-be-at-outlet",
    scope: "delivery:update-status",
    condition: { field: "delivery.status", op: "eq", value: "picked-up" },
    guard: { field: "rider.distanceFromOutlet", op: "lte", value: 0.3 }, // 300m
  },
]);
```

---

## 7. Key Workflow Templates

```
ORDER_FULFILLMENT_DELIVERY
  1. order-received     → kitchen display shows new order
  2. preparing          → kitchen accepts and starts prep
  3. ready-for-pickup   → KOT marked complete, rider assigned
  4. rider-dispatched   → rider confirms pickup, tracking starts
  5. delivered          → rider marks delivered with POD

ORDER_FULFILLMENT_DINE_IN
  1. order-taken        → waiter submits KOT
  2. preparing          → kitchen accepts
  3. served             → waiter marks food served
  4. billing            → cashier generates bill
  5. settled            → payment collected, table freed

SHIFT_CLOSE
  1. kot-reconciliation → all KOTs accounted for
  2. cash-count         → cashier counts cash drawer
  3. settlement         → compare POS total vs cash + card + aggregator
  4. variance-approval  → manager approves if variance exists
  5. ledger-close       → post daily totals to ledger
```

---

## 8. API Surface

```
── Menu ──────────────────────────────────────────────────────
GET    /restaurant/menu                       menu:read   (public for customer app)
POST   /restaurant/menu/items                 menu:manage
PATCH  /restaurant/menu/items/:id             menu:manage
POST   /restaurant/menu/items/:id/toggle      menu:manage  ← 86 item (make unavailable)
GET    /restaurant/menu/modifiers             menu:read
POST   /restaurant/menu/modifiers             menu:manage

── Outlets ───────────────────────────────────────────────────
GET    /restaurant/outlets                    restaurant-admin
POST   /restaurant/outlets                    restaurant-admin
PATCH  /restaurant/outlets/:id                outlet-manager
POST   /restaurant/outlets/:id/open           outlet-manager
POST   /restaurant/outlets/:id/close          outlet-manager
POST   /restaurant/outlets/:id/pause          outlet-manager  ← pause new orders

── Tables ────────────────────────────────────────────────────
GET    /restaurant/tables                     table:read
PATCH  /restaurant/tables/:id/status          table:update-status
POST   /restaurant/tables/:id/assign          table:assign

── Orders ────────────────────────────────────────────────────
GET    /restaurant/orders                     order:read
POST   /restaurant/orders                     order:create
GET    /restaurant/orders/:id                 order:read
PATCH  /restaurant/orders/:id                 order:modify
POST   /restaurant/orders/:id/place           order:create
POST   /restaurant/orders/:id/cancel          order:cancel
POST   /restaurant/orders/:id/serve           order:close  (waiter)

── KDS (Kitchen Display) ─────────────────────────────────────
GET    /restaurant/kds/queue                  kot:read  ← live KOT queue by station
POST   /restaurant/kds/kots/:id/accept        kot:accept
POST   /restaurant/kds/kots/:id/start         kot:accept
POST   /restaurant/kds/kots/:id/complete      kot:complete
POST   /restaurant/kds/kots/:id/items/:itemId/done  kot:complete

── Billing ───────────────────────────────────────────────────
POST   /restaurant/orders/:id/bill            billing:create
GET    /restaurant/bills/:id                  billing:create
POST   /restaurant/bills/:id/settle           billing:settle
POST   /restaurant/bills/:id/split            billing:settle
POST   /restaurant/bills/:id/void             billing:void

── Delivery ──────────────────────────────────────────────────
GET    /restaurant/deliveries                 delivery:read
GET    /restaurant/deliveries/:id             delivery:read
POST   /restaurant/deliveries/:id/assign      delivery:assign-rider
PATCH  /restaurant/deliveries/:id/status      delivery:update-status  (rider)
POST   /restaurant/deliveries/:id/location    delivery:update-status  (rider — live ping)

── Analytics ─────────────────────────────────────────────────
GET    /restaurant/analytics/sales            analytics:read
GET    /restaurant/analytics/items            analytics:read  ← bestsellers, slow movers
GET    /restaurant/analytics/kitchen-tat      analytics:read  ← preparation time metrics
GET    /restaurant/analytics/delivery         analytics:read
GET    /restaurant/analytics/aggregator-split analytics:read
```

**Webhooks (Aggregator Inbound):**

```
POST   /webhooks/swiggy       → normalize → order.placed flow
POST   /webhooks/zomato       → normalize → order.placed flow
POST   /webhooks/ubereats     → normalize → order.placed flow
POST   /webhooks/payment      → payment confirmation
```

---

## 9. Real-Time Channels

| Channel                                    | Subscribers         | Events                      |
| ------------------------------------------ | ------------------- | --------------------------- |
| `org:{orgId}:restaurant:{outletId}:kds`    | Kitchen staff       | `kot.*`                     |
| `org:{orgId}:restaurant:{outletId}:tables` | Waiters, cashier    | `table.*`, `order.*`        |
| `org:{orgId}:restaurant:delivery`          | Dispatcher          | `delivery.*`, `order.ready` |
| `org:{orgId}:delivery:{orderId}:tracking`  | Customer (live map) | `delivery.location-updated` |
| `org:{orgId}:actor:{riderId}:inbox`        | Rider               | `delivery.assigned`         |

---

## 10. Scheduled Jobs

```
restaurant.auto-close-shift          daily (configured closing time)
  → Check all open orders are settled, trigger shift close workflow

restaurant.ingredient-low-stock      every 30min
  → Check ingredients below par level → notify outlet manager

restaurant.aggregator-reconciliation  daily (midnight)
  → Pull aggregator payout reports
  → Match against internal order records
  → Flag discrepancies for manual review

restaurant.menu-sync-aggregators      on demand + every 1h
  → Push menu + pricing changes to Swiggy/Zomato APIs

restaurant.delivery-sla-check        every 5min
  → Flag deliveries past estimated delivery time
  → Alert dispatcher

restaurant.analytics-snapshot        nightly
  → Snapshot covers, revenue, avg order value, kitchen TAT
```

---

## 11. Integrations

```typescript
RestaurantCompose.integrations = {
  payment: [RazorpayAdapter, StripeAdapter, CashAdapter],
  storage: [S3Adapter], // menu images, POD photos
  sms: [MSG91Adapter],
  push: [FCMAdapter],
  maps: [GoogleMapsAdapter], // delivery routing, zone checks
  aggregators: {
    swiggy: SwiggyPartnerAdapter,
    zomato: ZomatoPartegratorAdapter,
    ubereats: UberEatsAdapter,
  },
  pos: [RazorpayPOSAdapter], // card terminal integration
  printers: [EscPosAdapter], // thermal KOT + bill printing
};
```
