# Phase 19 — Web: Shared Foundation

---

## 19.1 Auth Store

```typescript
import { create } from "zustand";

interface RstAuthState {
  actor: { id: string; name: string; role: string; outletId?: string } | null;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  setActor: (actor: RstAuthState["actor"], permissions: string[]) => void;
  clear: () => void;
}

export const useRstAuthStore = create<RstAuthState>((set, get) => ({
  actor: null,
  permissions: [],
  hasPermission: (perm) => {
    const { permissions } = get();
    return permissions.includes("rst:admin") || permissions.includes(perm);
  },
  setActor: (actor, permissions) => set({ actor, permissions }),
  clear: () => set({ actor: null, permissions: [] }),
}));
```

---

## 19.2 Outlet Store

```typescript
export const useOutletStore = create<{ outletId: string | null; setOutlet: (id: string) => void }>(set => ({
  outletId: null,
  setOutlet: (outletId) => set({ outletId }),
}));
```

Persisted to localStorage. Outlet selection shown on login if user has multiple outlet access.

---

## 19.3 Cart Store (CustomerApp)

```typescript
interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  modifiers: { name: string; option: string; price: number }[];
}

export const useCartStore = create<{
  items: CartItem[];
  outletId: string | null;
  orderType: "dine-in" | "takeaway" | "delivery";
  tableId: string | null;
  addItem: (item: MenuItem, modifiers: Modifier[]) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  total: () => { subtotal: number; tax: number; total: number };
}>(/* ... */);
```

---

## 19.4 Shared Components

**OrderCard:**
```tsx
export function OrderCard({ order, onClick }) {
  const statusColor = {
    draft: "border-l-zinc-300",
    placed: "border-l-blue-400",
    accepted: "border-l-amber-400",
    preparing: "border-l-amber-500",
    ready: "border-l-green-500",
    served: "border-l-zinc-400",
    completed: "border-l-zinc-300",
  }[order.status] ?? "border-l-zinc-300";

  return (
    <div className={cn("border border-l-4 rounded-lg p-3 cursor-pointer hover:bg-muted/50", statusColor)} onClick={onClick}>
      <div className="flex justify-between">
        <p className="font-mono font-bold">{order.orderNumber}</p>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-muted-foreground capitalize">{order.type}</p>
      <p className="text-sm"><AmountDisplay amount={order.total} /></p>
    </div>
  );
}
```

**KotStatusCard:**
```tsx
export function KotStatusCard({ kot }) {
  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex justify-between">
        <p className="font-mono text-sm font-bold">{kot.kotNumber}</p>
        <StatusBadge status={kot.status} />
      </div>
      <p className="text-xs text-muted-foreground">Station: {kot.station}</p>
      {kot.readyAt && <p className="text-xs text-green-600">Ready at {formatTime(kot.readyAt)}</p>}
    </div>
  );
}
```

---

## 19.5 Restaurant API Client

The API client maps frontend resource names to MTA-backed endpoints. Outlets and tables are `locations` filtered by type. Menu items and ingredients are `cat_items` filtered by type. Orders are `transactions` filtered by type.

```typescript
export class RestaurantApiClient {
  private base = "/restaurant";

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { redirectToLogin(); throw new Error("Unauthorized"); }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.message ?? "Request failed", err.code);
    }
    return res.json();
  }

  get = <T>(path: string) => this.request<T>("GET", path);
  post = <T>(path: string, body?: unknown) => this.request<T>("POST", path, body);
  patch = <T>(path: string, body?: unknown) => this.request<T>("PATCH", path, body);
  delete = <T>(path: string) => this.request<T>("DELETE", path);

  // Outlets — locations?type=outlet
  getOutlets(params?: Record<string, string>) {
    return this.get("/outlets?" + new URLSearchParams(params))
  }

  // Tables for an outlet — locations?type=table&parentId=outletId
  getTables(outletId?: string) {
    const p: Record<string, string> = { type: "table" }
    if (outletId) p.parentId = outletId
    return this.get("/tables?" + new URLSearchParams(p))
  }

  // Menu items — cat_items?type=menu_item
  getMenuItems(params?: Record<string, string>) {
    return this.get("/menu-items?" + new URLSearchParams(params))
  }

  // Ingredients — cat_items?type=stock_item
  getIngredients(params?: Record<string, string>) {
    return this.get("/ingredients?" + new URLSearchParams(params))
  }

  // Orders — transactions?type=order
  getOrders(params?: Record<string, string>) {
    return this.get("/orders?" + new URLSearchParams(params))
  }

  // Customers — persons?type=customer
  getCustomers(params?: Record<string, string>) {
    return this.get("/customers?" + new URLSearchParams(params))
  }

  // Riders — persons?type=rider
  getRiders(params?: Record<string, string>) {
    return this.get("/riders?" + new URLSearchParams(params))
  }
}

export const rstApi = new RestaurantApiClient();
```

**Table grid view** fetches `locations?type=table&parentId={selectedOutletId}` for the selected outlet.
**POS order screen** creates a transaction via `commerce.createTransaction` then adds lines via `commerce.addLine`.

---

## 19.6 App Exports

**File:** `packages/restaurant-web/src/index.ts`

```typescript
export { PosApp } from "./apps/pos";
export { KdsApp } from "./apps/kds";
export { DeliveryApp } from "./apps/delivery";
export { CustomerApp } from "./apps/customer";
export { RestaurantAdminApp } from "./apps/admin";
```
