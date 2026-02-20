Good timing to think this through before starting — a dashboard for this architecture has some specific needs that change the stack decisions. Let me go layer by layer.

---

## What This Dashboard Actually Needs

Before suggesting tools, map what the StoreAdmin dashboard has to do:

```
1. Auth              → Login, session, role-based route access
2. Data Tables       → Orders, products, customers — paginated, filterable, sortable
3. Forms             → Create/edit products, variants, price rules, workflows
4. Real-Time         → Live order feed, inventory updates, task board
5. Charts            → Analytics dashboard — sales, inventory, funnels
6. File Uploads      → Product images → Storage adapter → CDN
7. Type-Safe API     → Eden Treaty from your Elysia backend
8. State Management  → Server state (API data) + UI state (modals, selections)
9. Rich Text / JSON  → Product descriptions, notification template editor
```

---

## The Stack

### Base

**Vite + React + TypeScript** — your instinct is right. No argument here. Use the `react-ts` template.

```bash
bun create vite store-admin --template react-ts
```

---

### Routing — TanStack Router

Not React Router. **TanStack Router** for this project specifically because:

- File-based routing with full TypeScript — route params are typed
- Built-in route-level data loading (loaders) — fetch before render, not after
- Built-in auth guards at the route level — protect `/admin/*` routes cleanly
- Search param type safety — your filtered tables (`?page=2&status=confirmed`) are typed

```bash
bun add @tanstack/react-router @tanstack/router-devtools
bun add -D @tanstack/router-plugin   # Vite plugin for file-based routing
```

---

### Server State — TanStack Query

Non-negotiable for a data-heavy dashboard. Every API call goes through TanStack Query:

- Automatic caching, background refetch, stale-while-revalidate
- Pagination (`useInfiniteQuery`) for your order/product tables
- Optimistic updates for mutations (status changes, stock adjustments)
- Real-time sync — invalidate queries when WebSocket events arrive

```bash
bun add @tanstack/react-query @tanstack/react-query-devtools
```

---

### API Client — Eden Treaty (already on your server)

This is the key piece. Because your backend is Elysia, you get end-to-end type safety with zero codegen:

```typescript
// src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { App } from "../../api/src/index"; // import server type

export const api = treaty<App>("http://localhost:3000");

// Usage — fully typed, no manual type declarations
const { data, error } = await api.admin.orders.get({
  query: { page: 1, status: "confirmed" },
});
// data is typed as PaginatedResult<Order>
```

Pair this with TanStack Query:

```typescript
const { data } = useQuery({
  queryKey: ["orders", filters],
  queryFn: () => api.admin.orders.get({ query: filters }).then((r) => r.data),
});
```

```bash
bun add @elysiajs/eden
```

---

### UI Component Library — shadcn/ui

Not a package you install — it's a component collection you own. This matters for a dashboard because you'll customize heavily. shadcn/ui gives you:

- Every dashboard primitive: Table, Dialog, Sheet, Dropdown, Command palette, Tabs, Form, Calendar, DatePicker
- Built on Radix UI (accessible, unstyled primitives) + Tailwind
- You copy components into your project — no version lock-in, full control
- Works perfectly with react-hook-form and Zod

```bash
bun add tailwindcss @tailwindcss/vite
bunx shadcn@latest init
```

---

### Forms — Tanstack Form + Zod

Your EntitySchema system on the backend is already Zod/TypeBox compatible. On the frontend, Zod schemas validate forms with the same rules as the server:

```typescript
// Share schema or mirror it
const createProductSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string(),
  price: z.number().int().positive(),
  attributes: z.record(z.unknown()),
});

const form = useForm({ resolver: zodResolver(createProductSchema) });
```

shadcn/ui's Form component wraps Tanstack Form — they're designed together.

```bash
bun add react-hook-form zod @hookform/resolvers
```

---

### Data Tables — TanStack Table

Your order list, product catalog, inventory view, customer list — all need server-side pagination, sorting, column visibility, row selection. TanStack Table handles all of this headlessly (you own the markup via shadcn/ui):

```bash
bun add @tanstack/react-table
```

---

### Charts — Recharts

For the analytics module dashboards — sales over time, inventory levels, order funnel, revenue breakdown. Recharts is the most React-native charting library, composable, and works cleanly with Tailwind:

```bash
bun add recharts
```

---

### Real-Time — Native WebSocket + Zustand

Your RealTimeGateway uses Bun's native WebSocket with channel subscriptions. On the client:

```typescript
// src/lib/realtime.ts
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "subscribe",
      channels: [`org:${orgId}:orders`, `org:${orgId}:actor:${actorId}:inbox`],
    }),
  );
};

ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  // dispatch to Zustand store or invalidate TanStack Query
};
```

For global UI state (notification inbox count, active WebSocket connection status, sidebar state), use **Zustand** — lightweight, no boilerplate:

```bash
bun add zustand
```

---

### File Uploads — Uppy

Product images, document attachments, invoice PDFs. Uppy handles multipart uploads with progress, drag-and-drop, preview — and can upload directly to S3/R2 via presigned URLs (your Storage adapter generates these):

```bash
bun add @uppy/core @uppy/react @uppy/dashboard @uppy/aws-s3
```

---

### Date Handling — date-fns

For your scheduling module views (booking calendars, slot pickers), date range filters on order tables, and formatting timestamps from the EventStore. date-fns is tree-shakeable and Temporal-compatible:

```bash
bun add date-fns
```

---

## Complete Stack Summary

| Need            | Package                      | Why                                          |
| --------------- | ---------------------------- | -------------------------------------------- |
| Base            | Vite + React + TypeScript    | —                                            |
| Routing         | TanStack Router              | Typed params, route loaders, auth guards     |
| Server State    | TanStack Query               | Caching, pagination, optimistic updates      |
| API Client      | Eden Treaty                  | End-to-end types from Elysia backend         |
| UI Components   | shadcn/ui + Radix + Tailwind | Own your components, accessible primitives   |
| Forms           | Tanstack Form + Zod          | Mirrors backend validation, shadcn/ui native |
| Tables          | TanStack Table               | Headless, server-side pagination & sorting   |
| Charts          | Recharts                     | React-native, composable                     |
| Real-Time       | Native WebSocket             | Matches your RealTimeGateway exactly         |
| Global UI State | Zustand                      | WS status, inbox, sidebar — lightweight      |
| File Uploads    | Uppy                         | S3 presigned URL uploads, drag-and-drop      |
| Dates           | date-fns                     | Formatting, range ops, locale support        |

---

## Monorepo Consideration

Since you already have a Bun backend, the cleanest setup is a monorepo — **Turborepo** — so Eden Treaty can import the server type directly:

```
apps/
  api/          ← your Elysia server (already built)
  admin/        ← Vite + React dashboard
  storefront/   ← Next.js or Nuxt (separate decision)
packages/
  types/        ← shared types between all apps (Money, ID, etc.)
  ui/           ← shared shadcn components if storefront also needs some
```

```bash
bunx create-turbo@latest
```

With Turborepo, `admin` can do:

```typescript
import type { App } from "@repo/api";
```

And Eden Treaty gives you full type safety with zero manual sync. This is the setup that makes the whole Eden Treaty value proposition actually work — without a monorepo you'd need to publish types or copy them manually.

---
