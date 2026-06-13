# StoreAdmin Frontend — Full Development Plan

> Ecommerce Compose · `apps/admin` in Turborepo monorepo

---

## Stack (from project-setup-web)

| Layer           | Package                                              |
| --------------- | ---------------------------------------------------- |
| Base            | Vite + React + TypeScript                            |
| Routing         | TanStack Router (file-based, typed params)           |
| Server State    | TanStack Query                                       |
| API Client      | Eden Treaty → `import type { App } from '@repo/api'` |
| UI              | shadcn/ui + Radix + Tailwind                         |
| Forms           | react-hook-form + Zod                                |
| Tables          | TanStack Table (headless, server-side)               |
| Charts          | Recharts                                             |
| Real-Time       | Native WebSocket (matches RealTimeGateway)           |
| Global UI State | Zustand                                              |
| File Uploads    | Uppy + AWS S3 (presigned URLs)                       |
| Dates           | date-fns                                             |

---

## Route Tree

```
/login
/admin                              ← auth guard: store-admin | store-staff
  /                                 ← Dashboard (analytics overview)
  /orders
    /                               ← Orders list
    /$orderId                       ← Order detail + timeline
  /products
    /                               ← Product list
    /new                            ← Create product
    /$productId
      /                             ← Edit product
      /variants                     ← Variants manager
  /categories                       ← Category tree
  /price-lists
    /                               ← Price list index
    /$priceListId                   ← Rules editor
  /inventory
    /                               ← Stock levels
    /adjust                         ← Stock adjustment form
    /transfer                       ← Transfer between locations
    /low-stock                      ← Low stock alerts
  /customers
    /                               ← Customer list
    /$customerId                    ← Customer profile + order history
  /coupons
    /                               ← Coupon list
    /new                            ← Create coupon
    /$couponId                      ← Edit coupon
  /delivery-zones
    /                               ← Zone list + geo view
    /new
    /$zoneId
  /workflow
    /                               ← Active fulfillment workflows
    /$instanceId                    ← Workflow instance detail / task board
  /notifications
    /                               ← Notification template list
    /$templateKey                   ← Template editor
  /settings
    /                               ← General store settings [store-admin only]
    /payments                       ← Payment gateway config
    /team                           ← Team members + roles
```

---

## Parallel Agent Tracks

All tracks are independently executable after Track 0 is complete.

---

### Track 0 — Foundation (Prerequisite)

**Blocker for all other tracks. Do this first.**

**Scope:**

- Turborepo `apps/admin` scaffold (`bun create vite admin --template react-ts`)
- Install full stack deps (all packages listed above)
- `src/lib/api.ts` — Eden Treaty client setup with `import type { App } from '@repo/api'`
- `src/lib/query.ts` — TanStack Query `QueryClient` with sensible defaults (staleTime: 30s, retry: 1)
- `src/lib/ws.ts` — WebSocket singleton + Zustand slice for connection state
- `src/lib/auth.ts` — JWT decode, role check helpers (`hasRole`, `isStoreAdmin`)
- TanStack Router setup with `routeTree.gen.ts` via Vite plugin
- Root route with auth guard → redirect to `/login` if no valid JWT
- Layout route (`/admin`) — sidebar, topbar, outlet
- Login page + `POST /admin/auth/login` mutation
- Zustand store stubs: `useAuthStore`, `useWsStore`, `useInboxStore`
- shadcn/ui init + Tailwind config + base theme tokens
- Shared components: `<PageHeader>`, `<DataTable>` (TanStack Table wrapper), `<StatusBadge>`, `<MoneyDisplay>`, `<DateDisplay>`, `<EmptyState>`, `<ErrorBoundary>`, `<Spinner>`
- `useAdminQuery` and `useAdminMutation` typed wrappers

**APIs used:** `POST /admin/auth/login`, `GET /admin/auth/me`

---

### Track 1 — Dashboard & Analytics

**Depends on:** Track 0

**Scope:** `/admin/` route — the home screen with KPI cards + charts.

**Sections:**

1. **KPI Row** — Total revenue, orders today, active orders, low-stock alerts (4 cards with trend indicators)
2. **Sales Chart** — Daily/weekly/monthly toggle, line chart via Recharts → `GET /admin/analytics/sales`
3. **Recent Orders** — Last 10 orders mini-table with status badges → `GET /admin/orders?limit=10&sort=createdAt:desc`
4. **Inventory Alerts** — Low-stock variant list → `GET /admin/inventory/low-stock`
5. **Customer Acquisition** — New customers over period → `GET /admin/analytics/customers`
6. **Reports** — Trigger async report generation → `POST /admin/analytics/reports` + poll `GET /admin/analytics/reports/:jobId`

**Real-Time:** Subscribe to `org:{orgId}:orders` WS channel → on `order.*` events, invalidate `['orders']` and `['analytics', 'overview']` queries.

**APIs:** `GET /admin/analytics/overview`, `GET /admin/analytics/sales`, `GET /admin/analytics/customers`, `GET /admin/analytics/inventory`, `GET /admin/orders`

---

### Track 2 — Orders

**Depends on:** Track 0

**Scope:** Full order management lifecycle.

**Pages:**

**2a. Orders List** (`/admin/orders`)

- TanStack Table: columns = Order ID, customer, status badge, fulfillment status, total, date
- Server-side filters: `status`, `fulfillmentStatus`, `paymentStatus`, `dateRange`, search by order ID or customer name
- URL-synced search params (TanStack Router typed search params)
- `GET /admin/orders` with pagination

**2b. Order Detail** (`/admin/orders/$orderId`)

- Header: order ID, status badge, action buttons (Update Status, Cancel, Refund) — role-gated
- Items table with product images, variants, quantities, line totals
- Money breakdown: subtotal, discount, tax, shipping, total
- Addresses: shipping + billing display cards
- Payment info: gateway ref, status, method
- Fulfillment section: current workflow stage + task checklist (from `workflow` module)
- **Order Timeline** — event-sourced history from `GET /admin/orders/:id/timeline` — each event shown as timeline row with timestamp + actor
- Inline status update: `PATCH /admin/orders/:id/status`
- Cancel modal (confirmation + reason) → `POST /admin/orders/:id/cancel` [store-admin only]
- Refund modal (amount input + reason) → `POST /admin/orders/:id/refund` [store-admin only]

**Real-Time:** WS `org:{orgId}:orders` → when `order.{orderId}.*` event → invalidate `['order', orderId]`

**APIs:** `GET /admin/orders`, `GET /admin/orders/:id`, `GET /admin/orders/:id/timeline`, `PATCH /admin/orders/:id/status`, `POST /admin/orders/:id/cancel`, `POST /admin/orders/:id/refund`

---

### Track 3 — Catalog (Products, Categories, Price Lists)

**Depends on:** Track 0

**Scope:** Full product catalog management.

**Pages:**

**3a. Product List** (`/admin/products`)

- TanStack Table: image thumbnail, name, category, status badge (draft/published/archived), variant count, price range
- Filters: status, category, search
- Bulk actions: publish, archive
- `GET /admin/products`

**3b. Create/Edit Product** (`/admin/products/new` & `/admin/products/$productId`)

- Multi-section form (react-hook-form + Zod):
  - Basic Info: name, slug, description (rich text editor — Tiptap or simple textarea)
  - Media: Uppy drag-and-drop uploader → presigned S3 URLs; image reordering
  - Pricing: base price, compare-at price, cost price
  - Category: select/search dropdown
  - Attributes: dynamic key-value fields (mirrors `catalog.attributes` schema)
  - Status: draft → published toggle
- `POST /admin/products` or `PATCH /admin/products/:id`
- `POST /admin/products/:id/publish` / `POST /admin/products/:id/archive`

**3c. Variant Manager** (`/admin/products/$productId/variants`)

- List of variants with: option values (size, color), SKU, price override, stock level (read from inventory)
- Inline edit: price, SKU
- `GET /admin/products/:id/variants`, `POST /admin/products/:id/variants`

**3d. Category Tree** (`/admin/categories`)

- Nested tree display with expand/collapse
- Inline create/rename/delete
- `GET /admin/categories`, `POST /admin/categories`, `PATCH /admin/categories/:id`, `DELETE /admin/categories/:id`

**3e. Price Lists** (`/admin/price-lists`)

- List: name, currency, valid date range, rule count
- Detail: rule table (SKU/variant → override price), add/delete rules, set `validFrom`/`validTo` for flash sales
- `GET /admin/price-lists`, `POST /admin/price-lists`, `POST /admin/price-lists/:id/rules`, `DELETE /admin/price-lists/:id`

**APIs:** All `/admin/products/*`, `/admin/categories/*`, `/admin/price-lists/*`

---

### Track 4 — Inventory

**Depends on:** Track 0

**Scope:** Stock management operations.

**Pages:**

**4a. Inventory Overview** (`/admin/inventory`)

- TanStack Table: Product, Variant, SKU, Location, On-Hand qty, Reserved qty, Available qty
- Filters: location, product, low-stock toggle
- Inline click-through to adjust
- `GET /admin/inventory`, `GET /admin/inventory/:variantId`

**4b. Low-Stock Alerts** (`/admin/inventory/low-stock`)

- Filtered view of variants below reorder threshold
- Quick-action: trigger PO / mark as ordered (future hook)
- `GET /admin/inventory/low-stock`

**4c. Stock Adjustment** (`/admin/inventory/adjust`)

- Form: select variant, select location, adjustment type (add/remove/set), quantity, reason note
- `POST /admin/inventory/adjust`

**4d. Stock Transfer** (`/admin/inventory/transfer`)

- Form: from-location, to-location, variant, quantity
- Transfer history table
- `POST /admin/inventory/transfer`

**Real-Time:** WS `org:{orgId}:inventory:{locationId}` → `stock.*` events → invalidate `['inventory']`

---

### Track 5 — Customers

**Depends on:** Track 0

**Scope:** Customer account management.

**Pages:**

**5a. Customer List** (`/admin/customers`)

- TanStack Table: name, email, total orders, total spend, status, joined date
- Filters: status (active/suspended), search by name/email
- `GET /admin/customers`

**5b. Customer Profile** (`/admin/customers/$customerId`)

- Profile header: name, email, phone, joined date, status badge
- Stats row: total orders, lifetime value, avg order value
- **Orders tab**: mini order table → `GET /admin/customers/:id/orders`
- **Addresses tab**: saved addresses list
- Actions: Suspend customer (confirmation modal) → `POST /admin/customers/:id/suspend` [store-admin only]

**APIs:** `GET /admin/customers`, `GET /admin/customers/:id`, `GET /admin/customers/:id/orders`, `POST /admin/customers/:id/suspend`

---

### Track 6 — Coupons

**Depends on:** Track 0

**Scope:** Discount coupon lifecycle.

**Pages:**

**6a. Coupon List** (`/admin/coupons`)

- Table: code, type (% / fixed), value, usage count / limit, valid dates, status
- Status computed: active / expired / exhausted
- `GET /admin/coupons`

**6b. Create/Edit Coupon** (`/admin/coupons/new` & `/$couponId`)

- Form fields: code (auto-generate button), type, value, min order amount, usage limit, per-customer limit, valid date range, applicable products/categories (multi-select)
- Zod validation mirrors backend RuleExpr
- `POST /admin/coupons`, `PATCH /admin/coupons/:id`, `DELETE /admin/coupons/:id`

---

### Track 7 — Delivery Zones

**Depends on:** Track 0

**Scope:** Geo-based delivery zone management.

**Pages:**

**7a. Delivery Zones** (`/admin/delivery-zones`)

- Zone list: name, coverage description, shipping fee, enabled toggle
- Map view (optional enhancement — Leaflet or Google Maps embed) showing zone polygons
- `GET /admin/delivery-zones`

**7b. Create/Edit Zone** (`/admin/delivery-zones/new` & `/$zoneId`)

- Form: name, description, fee, min order for free shipping, pincode/region rule input (textarea or tag input)
- `POST /admin/delivery-zones`, `PATCH /admin/delivery-zones/:id`

---

### Track 8 — Workflow / Fulfillment Board

**Depends on:** Track 0

**Scope:** Live fulfillment task management for warehouse staff.

**Pages:**

**8a. Fulfillment Board** (`/admin/workflow`)

- Kanban-style view of `ORDER_FULFILLMENT` workflow instances grouped by stage: `pick-pack → quality-check → dispatch → delivery-confirmed`
- Each card: order ID, item count, customer name, stage entered time, assigned staff
- Click card → Workflow Instance Detail

**8b. Workflow Instance** (`/admin/workflow/$instanceId`)

- Header: linked order + current stage
- Task checklist: task list for current stage, mark task complete (role-gated)
- Stage history: completed stages with timestamps + actors
- Tracking number entry form (dispatch stage)

**Real-Time:** WS `org:{orgId}:workflow` → `task.*`, `stage.*` events → live board updates via query invalidation

---

### Track 9 — Notifications & Templates

**Depends on:** Track 0

**Scope:** Notification template management.

**Pages:**

**9a. Template List** (`/admin/notifications`)

- Table: key, channel (email/sms/in_app/push), last updated
- `GET /admin/notification-templates`

**9b. Template Editor** (`/admin/notifications/$templateKey`)

- Handlebars-aware editor (highlight `{{variable}}` tokens)
- Preview panel: render template with mock variables
- Channel-specific fields: subject (email only), body
- Available variables reference sidebar (derived from template key)
- `PATCH /admin/notification-templates/:key`

---

### Track 10 — Settings

**Depends on:** Track 0  
**Role guard:** store-admin only (entire section)

**Scope:** Store configuration.

**Pages:**

**10a. General Settings** (`/admin/settings`)

- Store name, logo upload (Uppy → S3), timezone, default currency, support email
- `GET /admin/settings`, `PATCH /admin/settings`

**10b. Payment Settings** (`/admin/settings/payments`)

- Toggle active payment gateway: Stripe / Razorpay
- API key fields (masked)
- Test connection button → `POST /admin/settings/payments/test`
- `GET /admin/settings/payments`

**10c. Team Management** (`/admin/settings/team`)

- Team member list: name, email, role badge
- Invite by email (role select: store-admin | store-staff) → sends invite notification via `actor.invite` template
- Suspend / remove member
- Uses identity module: `actor:manage` permission
- APIs from identity module endpoints

---

## Cross-Cutting Implementation Notes

### Auth Guard (all `/admin/*` routes)

```typescript
// Route beforeLoad — runs before every admin route render
beforeLoad: ({ context }) => {
  if (!context.auth.isAuthenticated) throw redirect({ to: "/login" });
  if (!hasRole(context.auth.user, ["store-admin", "store-staff"])) {
    throw redirect({ to: "/login" });
  }
};
```

### Role-Gated UI

Use a `<Can permission="order:refund">` wrapper component backed by the auth store role. Renders null if role doesn't match. Never just hide — also enforce on API call level (backend rejects with 403).

### WebSocket Integration

```typescript
// src/lib/ws.ts
// On connect: send auth token
// Subscribe to channels: org:{orgId}:orders, inventory, workflow, actor inbox
// On event: zustand dispatch → TanStack Query invalidate relevant keys
// On disconnect: exponential backoff reconnect
```

### Money Display

All `Money` objects from backend = `{ amount: number, currency: string }` where amount is in smallest unit (paise/cents). `<MoneyDisplay>` formats via `Intl.NumberFormat` — never do raw division in render.

### TanStack Table Pattern (consistent across all list pages)

- Server-side pagination: `page`, `pageSize` as URL search params
- Server-side sorting: `sortBy`, `sortDir` as URL search params
- Server-side filters: entity-specific filter keys as URL search params
- Column visibility stored in Zustand (persisted to localStorage per table key)

### Zod Schemas

Mirror backend validation on the frontend. Place in `src/schemas/{entity}.ts`. Import in forms. This gives instant client-side feedback before any API call.

---

## Delivery Order

```
Week 1:  Track 0 (Foundation)
Week 2:  Tracks 1 + 2 + 3a/3b (Dashboard, Orders, Product List/Form) — parallel
Week 3:  Tracks 3c/3d/3e + 4 + 5 (Variants, Categories, Inventory, Customers) — parallel
Week 4:  Tracks 6 + 7 + 8 (Coupons, Delivery Zones, Workflow Board) — parallel
Week 5:  Tracks 9 + 10 + polish (Notifications, Settings, role guards, E2E tests)
```

---

## Agent Assignment Map

| Agent   | Tracks                                   | Est. Complexity |
| ------- | ---------------------------------------- | --------------- |
| Agent A | Track 0                                  | High (blocker)  |
| Agent B | Track 1 (Dashboard + Analytics)          | Medium          |
| Agent C | Track 2 (Orders)                         | High            |
| Agent D | Track 3 (Catalog)                        | High            |
| Agent E | Track 4 + 7 (Inventory + Delivery Zones) | Medium          |
| Agent F | Track 5 + 6 (Customers + Coupons)        | Medium          |
| Agent G | Track 8 + 9 (Workflow + Notifications)   | Medium          |
| Agent H | Track 10 (Settings + Team)               | Low             |

Agents B–H can all begin as soon as Track 0 (`apps/admin` scaffold + shared components + API client) is pushed to the repo.
