# Phase 12 — Web Overview

---

## 12.1 Five Web Apps

| App | Path prefix | Users |
|-----|-------------|-------|
| POSApp | `/pos` | Cashiers, waitstaff |
| KDSApp | `/kds` | Kitchen staff, chefs |
| DeliveryApp | `/delivery` | Dispatchers, riders |
| CustomerApp | `/order` | End customers (dine-in QR, delivery) |
| AdminApp | `/restaurant-admin` | Managers, admins |

---

## 12.2 Pain Points This UI Solves

| Pain | Solution |
|------|---------|
| KOT arrives late → food priority unclear | KDS with elapsed timer, color escalation |
| Aggregator item not on internal menu → silent failure | Aggregator item mapping UI in admin |
| Cashier wrong change | Bill settle shows change-due for cash payments |
| 86-item still shows on POS | Real-time EventBus push → badge on unavailable items |
| Split bill rounding dispute | Server-computed split, visual confirmation before print |
| Rider location stale | Last update timestamp shown on dispatcher map |

---

## 12.3 Role → App Access

| Role | App | Notes |
|------|-----|-------|
| `rst:cashier` | POSApp | Own shift orders |
| `rst:waiter` | POSApp (orders only) | Create/view orders, no billing |
| `rst:kitchen` | KDSApp | KOT management |
| `rst:dispatcher` | DeliveryApp | Assignment view |
| `rst:rider` | DeliveryApp (rider view) | Own deliveries only |
| `rst:manager` | All apps | Full access |
| `rst:admin` | AdminApp | Config, analytics |
| guest | CustomerApp | Own order only |

---

## 12.4 Design Rules

- Shadcn zinc, compact
- **KDS**: dark mode default (kitchen environment, high-contrast). Light toggle available.
- Status color codes:

| Status | Color |
|--------|-------|
| `sent` (KOT) | blue |
| `accepted` / `preparing` | amber |
| `ready` | green |
| `completed` / `settled` | zinc |
| `rejected` / `voided` / `cancelled` | red |
| `out-for-delivery` | purple |

- KOT elapsed time: `< 10min` green, `10-20min` amber, `> 20min` red
- Order numbers: monospace font, large, easy to read across kitchen
- Currency: configurable per outlet, `Intl.NumberFormat`

---

## 12.5 File Tree

```
packages/restaurant-web/src/
  index.ts
  api/
    restaurant-client.ts
  stores/
    auth-store.ts
    outlet-store.ts
    cart-store.ts       (CustomerApp)
  components/shared/
    StatusBadge.tsx
    OrderCard.tsx
    KotCard.tsx
    AmountDisplay.tsx
    ConfirmDialog.tsx
    RestaurantLayout.tsx
  apps/
    pos/
      index.ts
      routes.tsx
      pages/
        orders/
        new-order/
        tables/
        billing/
    kds/
      index.ts
      routes.tsx
      pages/
        board/
        station/
    delivery/
      index.ts
      routes.tsx
      pages/
        dispatcher/
        rider/
    customer/
      index.ts
      routes.tsx
      pages/
        menu/
        cart/
        order-status/
    admin/
      index.ts
      routes.tsx
      pages/
        outlets/
        menu/
        modifiers/
        aggregators/
        inventory/
        shifts/
        analytics/
```

---

## 12.6 Real-Time Architecture

KDS and DeliveryApp require WebSocket for sub-second updates.

```typescript
// Shared WebSocket hook
export function useRestaurantSocket(outletId: string) {
  const ws = useRef<WebSocket | null>(null);
  const handlers = useRef<Map<string, (data: unknown) => void>>(new Map());

  useEffect(() => {
    ws.current = new WebSocket(`/restaurant/ws/kds/${outletId}?token=${getAuthToken()}`);
    ws.current.onmessage = (e) => {
      const { type, ...data } = JSON.parse(e.data);
      handlers.current.get(type)?.(data);
    };
    ws.current.onclose = () => setTimeout(() => reconnect(), 2000);  // auto-reconnect
    return () => ws.current?.close();
  }, [outletId]);

  const on = (type: string, handler: (data: unknown) => void) => {
    handlers.current.set(type, handler);
  };

  return { on };
}
```
