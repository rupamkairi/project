# Phase 19 — Web: Shared Foundation

---

## 19.1 Auth Store

```typescript
export const useHspAuthStore = create<{
  actor: { id: string; name: string; role: string } | null;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  setActor: (actor: any, permissions: string[]) => void;
  clear: () => void;
}>(/* standard pattern */);
```

---

## 19.2 Property Store

```typescript
export const usePropertyStore = create<{
  property: {
    orgId: string;
    propertyName: string;
    currency: string;
    defaultCheckInTime: string;
    defaultCheckOutTime: string;
    wifiPassword?: string;
  } | null;
  load: () => void;
}>(/* ... */);
```

Loaded on app mount from `/hospitality/admin/config`. Shared across all apps.

---

## 19.3 Hospitality API Client

```typescript
export class HospitalityApiClient {
  private base = "/hospitality";

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.base + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { redirectToLogin(); throw new Error("Unauthorized"); }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.message, err.code);
    }
    return res.json();
  }

  get = <T>(path: string) => this.request<T>("GET", path);
  post = <T>(path: string, body?: unknown) => this.request<T>("POST", path, body);
  patch = <T>(path: string, body?: unknown) => this.request<T>("PATCH", path, body);
  delete = <T>(path: string) => this.request<T>("DELETE", path);

  // Master table accessors (filtered views via backend routes)
  getRoomTypes(params?: Record<string, string>) { return this.get("/room-types") }  // cat_items?type=room_type
  getRooms(params?: Record<string, string>) { return this.get("/rooms") }            // locations?type=room
  getGuests(params?: Record<string, string>) { return this.get("/guests") }          // persons?type=guest
  getReservations(params?: Record<string, string>) { return this.get("/reservations") } // transactions?type=order

  // hsp-owned table accessors
  getHousekeepingAssignments(params?: Record<string, string>) { return this.get("/housekeeping/assignments") }
  getRatePlans(params?: Record<string, string>) { return this.get("/rate-plans") }
  getChannelInventory(params?: Record<string, string>) { return this.get("/channel-inventory") }
  getMaintenanceRequests(params?: Record<string, string>) { return this.get("/maintenance") }
}

export const hspApi = new HospitalityApiClient();
```

---

## 19.4 Shared Components

**RoomStatusCard:**
```tsx
export function RoomStatusCard({ room }) {
  const hkColors = {
    inspected: "bg-green-100 border-green-300",
    clean: "bg-green-50 border-green-200",
    dirty: "bg-red-100 border-red-300",
    "cleaning-in-progress": "bg-amber-100 border-amber-300",
    done: "bg-blue-100 border-blue-300",
    "touch-up": "bg-orange-100 border-orange-300",
  };

  return (
    <div className={cn("border rounded-lg p-3", hkColors[room.housekeepingStatus], room.isBlocked && "opacity-50 border-dashed")}>
      <p className="font-bold">{room.roomNumber}</p>
      <p className="text-xs text-muted-foreground">{room.roomType}</p>
      <StatusBadge status={room.housekeepingStatus} />
      {room.isBlocked && <p className="text-xs text-red-500 mt-1">Blocked</p>}
    </div>
  );
}
```

**GuestBadge:**
```tsx
export function GuestBadge({ guest }) {
  return (
    <div className="flex items-center gap-2">
      <span>{guest.firstName} {guest.lastName}</span>
      {guest.vipStatus !== "standard" && (
        <span className={cn("text-xs font-medium",
          guest.vipStatus === "platinum" ? "text-purple-600" :
          guest.vipStatus === "gold" ? "text-amber-600" : "text-zinc-500"
        )}>
          {guest.vipStatus.toUpperCase()}
        </span>
      )}
    </div>
  );
}
```

**FolioSummary:**
```tsx
export function FolioSummary({ folio }) {
  return (
    <div className="bg-muted rounded-lg p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span>Total Charges</span><AmountDisplay amount={folio.totalCharges} />
      </div>
      <div className="flex justify-between text-sm">
        <span>Total Payments</span><AmountDisplay amount={folio.totalPayments} />
      </div>
      <div className={cn("flex justify-between font-bold", parseFloat(folio.balance) > 0 ? "text-red-600" : "text-green-600")}>
        <span>Balance</span><AmountDisplay amount={folio.balance} />
      </div>
    </div>
  );
}
```

---

## 19.5 App Exports

**File:** `packages/hospitality-web/src/index.ts`

```typescript
export { FrontDeskApp } from "./apps/front-desk";
export { HousekeepingApp } from "./apps/housekeeping";
export { ReservationsApp } from "./apps/reservations";
export { RevenueApp } from "./apps/revenue";
export { GuestApp } from "./apps/guest";
export { HospitalityAdminApp } from "./apps/admin";
```

---

## 19.6 Date/Currency Utilities

```typescript
// Date format: DD MMM YYYY
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

// Currency: use property currency from store
export function AmountDisplay({ amount, currency }: { amount: number | string; currency?: string }) {
  const propertyCurrency = usePropertyStore(s => s.property?.currency ?? "USD");
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? propertyCurrency,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount as string));
  return <span>{formatted}</span>;
}
```
