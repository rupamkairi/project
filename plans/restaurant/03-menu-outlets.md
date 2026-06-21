# Phase 3 — Menu & Outlets

---

## 3.1 Outlet Routes

```
GET    /restaurant/outlets                    public (org-scoped)
GET    /restaurant/outlets/:id                public
POST   /restaurant/admin/outlets              rst:admin
PATCH  /restaurant/admin/outlets/:id          rst:admin
POST   /restaurant/admin/outlets/:id/open     rst:manager
POST   /restaurant/admin/outlets/:id/close    rst:manager
POST   /restaurant/admin/outlets/:id/pause    rst:manager
```

**Open/close/pause** changes `status`:
- `open` — accepting orders normally
- `paused-orders` — kitchen or capacity limit; new orders rejected; `pauseReason` required
- `closed` — outside operating hours; all order types rejected
- `temporarily-closed` — maintenance, set by admin only

Operating hours validation on `close`: check no open KOTs remain. If yes, reject with list of active KOT IDs.

---

## 3.2 Category Routes

```
GET    /restaurant/outlets/:id/categories        public
POST   /restaurant/admin/outlets/:id/categories  menu:manage
PATCH  /restaurant/admin/categories/:id          menu:manage
DELETE /restaurant/admin/categories/:id          menu:manage
POST   /restaurant/admin/outlets/:id/categories/reorder  menu:manage
```

Delete guard: no active menu items referencing this category.

---

## 3.3 Menu Item Routes

```
GET    /restaurant/outlets/:id/menu           public
GET    /restaurant/outlets/:id/menu/:itemId   public
POST   /restaurant/admin/outlets/:id/menu     menu:manage
PATCH  /restaurant/admin/menu/:id             menu:manage
DELETE /restaurant/admin/menu/:id             menu:manage
POST   /restaurant/admin/menu/:id/toggle      menu:manage  (86-toggle)
POST   /restaurant/admin/menu/:id/popular     menu:manage
POST   /restaurant/admin/outlets/:id/menu/reorder  menu:manage
```

**Create menu item body:**
```typescript
{
  categoryId?: string;
  name: string;
  description?: string;
  basePrice: number;
  deliveryPrice?: number;
  type: "veg" | "non-veg" | "vegan" | "egg";
  station?: string;
  preparationTimeMinutes?: number;
  taxPct?: number;
  thumbnailUrl?: string;
  tags?: string[];
  modifierIds?: string[];  // attach existing modifier groups
}
```

**86-toggle** (`/toggle`): flips `isAvailable`. Body: `{ available: boolean, reason?: string }`.
When `available = false` → emit `menu.item-86d` on EventBus (KDS and POS apps subscribe to show visual indicator).

**Menu response (public):** grouped by category, sorted by `sortOrder`. Exclude `isAvailable = false` items from delivery-channel requests unless `showUnavailable=true` query param.

---

## 3.4 Modifier Routes

```
GET    /restaurant/admin/outlets/:id/modifiers   menu:manage
POST   /restaurant/admin/outlets/:id/modifiers   menu:manage
PATCH  /restaurant/admin/modifiers/:id           menu:manage
DELETE /restaurant/admin/modifiers/:id           menu:manage
POST   /restaurant/admin/menu/:id/modifiers      menu:manage  (attach)
DELETE /restaurant/admin/menu/:menuId/modifiers/:modId  menu:manage
```

**Create modifier body:**
```typescript
{
  name: string;               // "Spice Level", "Add-ons"
  type: "single" | "multi";
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: {
    id: string;               // UUID v4 generated client-side
    name: string;
    additionalPrice: number;
    isDefault: boolean;
    isAvailable: boolean;
  }[];
}
```

---

## 3.5 Operating Hours Validation

On each incoming order request, validate outlet is accepting orders:

```typescript
function validateOutletAcceptsOrders(outlet: Outlet, orderType: "dine-in" | "delivery" | "takeaway"): void {
  if (outlet.status === "closed" || outlet.status === "temporarily-closed") {
    throw new ConflictError("OUTLET_CLOSED", "Outlet is not accepting orders");
  }
  if (outlet.status === "paused-orders") {
    throw new ConflictError("OUTLET_PAUSED", "Outlet is temporarily paused");
  }
  if (orderType === "delivery" && !outlet.acceptsDelivery) {
    throw new ConflictError("DELIVERY_DISABLED", "Outlet does not accept delivery orders");
  }
  if (orderType === "dine-in" && !outlet.acceptsDineIn) {
    throw new ConflictError("DINE_IN_DISABLED", "Outlet does not accept dine-in orders");
  }
  if (orderType === "takeaway" && !outlet.acceptsTakeaway) {
    throw new ConflictError("TAKEAWAY_DISABLED", "Outlet does not accept takeaway orders");
  }

  // Operating hours check
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const hours = outlet.operatingHours?.[dayOfWeek];
  if (hours) {
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (currentTime < hours.open || currentTime > hours.close) {
      throw new ConflictError("OUTSIDE_HOURS", `Outlet accepts orders ${hours.open}–${hours.close}`);
    }
  }
}
```

---

## 3.6 Menu Item Availability Check on Order

When order item added, check both outlet and item:

```typescript
async function validateOrderItem(menuItemId: string, qty: number, outletId: string): Promise<MenuItem> {
  const item = await db.query.rstMenuItems.findFirst({
    where: and(
      eq(rstMenuItems.id, menuItemId),
      eq(rstMenuItems.outletId, outletId)
    ),
  });
  if (!item) throw new NotFoundError("MENU_ITEM_NOT_FOUND");
  if (!item.isAvailable) throw new ConflictError("ITEM_UNAVAILABLE", `${item.name} is currently unavailable`);
  return item;
}
```

---

## 3.7 Table Routes

```
GET    /restaurant/outlets/:id/tables    rst:staff
POST   /restaurant/admin/outlets/:id/tables   rst:manager
PATCH  /restaurant/admin/tables/:id          rst:manager
POST   /restaurant/admin/tables/:id/merge    rst:manager
POST   /restaurant/admin/tables/:id/unmerge  rst:manager
```

**Merge tables**: links multiple tables for large groups. Updates `mergedWithIds[]` on primary table. Merged tables set `status = 'blocked'` to prevent new assignment.

**Unmerge**: guard — active order must be settled or transferred first.
