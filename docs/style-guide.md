# ProjectX Design System Style Guide

Design language for ForestCloud. All UI across every compose must follow these rules.

---

## Philosophy

- **Compact.** Every element should use the minimum space needed — not cramped, but dense. Dashboard users scan, not read.
- **Consistent.** Same color means same meaning, everywhere.
- **Systematic.** No one-off values. Every spacing, color, radius comes from a token.

---

## Color Tokens

Use semantic tokens only. Never raw hex, hsl values, or hardcoded Tailwind palette colors (`gray-500`, `blue-600`) in any component or route.

### Light Mode

| Token | Value | Use |
|---|---|---|
| `background` | `0 0% 100%` | Page background |
| `foreground` | `222.2 84% 4.9%` | Body text |
| `card` | `0 0% 100%` | Card surfaces |
| `card-foreground` | `222.2 84% 4.9%` | Card text |
| `primary` | `221.2 83.2% 53.3%` | Primary actions, links, active states |
| `primary-foreground` | `210 40% 98%` | Text on primary |
| `secondary` | `210 40% 96.1%` | Secondary button bg, subtle backgrounds |
| `muted` | `210 40% 96.1%` | Disabled, placeholder, inactive areas |
| `muted-foreground` | `215.4 16.3% 46.9%` | Subdued text, labels, captions |
| `accent` | `210 40% 96.1%` | Hover states, selected rows |
| `destructive` | `0 84.2% 60.2%` | Delete, error, danger |
| `border` | `214.3 31.8% 91.4%` | Dividers, input borders |
| `ring` | `221.2 83.2% 53.3%` | Focus rings |
| `sidebar` | `222.2 47.4% 11.2%` | Sidebar background (dark navy) |
| `sidebar-foreground` | `210 40% 98%` | Sidebar text |
| `sidebar-accent` | `217.2 32.6% 17.5%` | Sidebar nav hover/selected bg |
| `sidebar-border` | `217.2 32.6% 20%` | Sidebar internal borders |
| `sidebar-primary` | `221.2 83.2% 53.3%` | Sidebar active indicator |

### Usage rules

```tsx
// Correct — semantic token via Tailwind
<div className="bg-muted text-muted-foreground" />
<button className="bg-primary text-primary-foreground" />

// Wrong — hardcoded color
<div className="bg-gray-100 text-gray-500" />
<button className="bg-blue-600 text-white" />
```

---

## Radius

Base `--radius: 0.5rem`. Scale:

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | `0.375rem` | Badges, chips |
| `rounded-md` | `0.5rem` | Inputs, dropdown items |
| `rounded-lg` | `0.625rem` | Cards, dialogs, popovers |
| `rounded-xl` | `0.75rem` | Large modal containers |
| `rounded-full` | Full | Avatars, pills |

---

## Typography

| Role | Classes | Use |
|---|---|---|
| Page title | `text-xl font-semibold tracking-tight` | Route h1 |
| Section title | `text-base font-semibold` | Card headers, section headings |
| Body | `text-sm` | Table cells, form content, descriptions |
| Caption / label | `text-xs text-muted-foreground` | Column headers, timestamps, hints |
| Monospace | `font-mono text-xs` | Tokens, IDs, codes |

Body text is 14px (`text-sm`) across dashboard surfaces. Only page titles go to 16px+.

---

## Spacing

4px grid. Use Tailwind's scale directly:

| Token | Value | Use |
|---|---|---|
| `p-1` | 4px | Tight chip padding |
| `p-2` | 8px | Badge, small button padding |
| `p-3` | 12px | Input padding |
| `p-4` | 16px | Card inner padding, list item |
| `p-6` | 24px | Page-level padding |
| `gap-2` | 8px | Inline element gaps |
| `gap-4` | 16px | Form field gaps |
| `gap-6` | 24px | Section gaps |

---

## Density

Compact. Components use `sm` sizing as the default where variants exist.

| Component | Compact default |
|---|---|
| Input height | `h-8` (via `size="sm"`) |
| Table row padding | `py-2 px-3` |
| Button (default) | `h-9` — use `size="sm"` (`h-8`) inside tables/toolbars |
| Sidebar nav item | `py-1.5 px-3` |
| Dialog padding | `p-5` |

---

## Icons

**Library:** Lucide React only. No emoji, no other icon sets.

| Context | Size | strokeWidth |
|---|---|---|
| Inline with text | `h-4 w-4` | `1.75` |
| Sidebar nav | `h-4 w-4` | `1.75` |
| Card header | `h-5 w-5` | `1.75` |
| Empty state | `h-8 w-8` | `1.5` |
| Status indicator | `h-3 w-3` | `2` |

Always set `strokeWidth={1.75}` for icons used standalone. Use `aria-hidden` when decorative.

---

## Layout

### Sidebar pattern

Every compose uses the sidebar layout from `@projectx/ui`:

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (w-56, bg-sidebar)  │  Main (bg-background) │
│  - Logo                      │  <Outlet />            │
│  - Nav items                 │                        │
│  - User menu                 │                        │
└──────────────────────────────────────────────────────┘
```

- Sidebar: `w-56` fixed, collapsible to `w-14` (icon-only)
- Mobile: hidden, opens as left-side Sheet on hamburger
- Main content: `flex-1 overflow-auto p-6`

### Page structure

```
<div className="space-y-6 p-6">
  <PageHeader title="..." description="..." actions={<Button>...</Button>} />
  
  {/* content */}
</div>
```

---

## Component Patterns

### Status badges

Use `StatusBadge` from `@projectx/ui`. Never custom-color badges inline:

```tsx
// Correct
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="suspended" />

// Wrong
<Badge className="bg-green-100 text-green-800">Active</Badge>
```

Built-in statuses: `active`, `inactive`, `pending`, `suspended`, `expired`, `revoked`, `completed`, `cancelled`, `draft`, `processing`, `published`, `archived`

### Empty states

```tsx
<EmptyState
  icon={Users}
  title="No users yet"
  description="Invite your first team member to get started."
  action={{ label: "Invite user", onClick: handleInvite }}
/>
```

### Confirmation dialogs

Always use `ConfirmDialog` for destructive actions. Never custom confirm modals:

```tsx
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete user?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  onConfirm={handleDelete}
  variant="destructive"
/>
```

### Data tables

Use `DataTable` from `@projectx/ui` with TanStack Table columns:

```tsx
<DataTable
  columns={columns}
  data={users}
  searchPlaceholder="Search users..."
/>
```

---

## DO / DON'T

| DO | DON'T |
|---|---|
| Use `@projectx/ui` components | Create duplicate components per-compose |
| Use semantic color tokens | Use hardcoded `gray-*`, `blue-*` |
| Use `cn()` for className merging | Template literal class concat |
| Use Lucide icons with consistent sizing | Emoji, other icon libs |
| Use `StatusBadge` for status display | Inline colored badge spans |
| Use `ConfirmDialog` for destructive confirms | Inline confirm overlays |
| Use `DataTable` for lists | Custom table markup per route |

---

## Related

- [design-system.md](./design-system.md) — component API reference
- [gotchas/package-ui-gotchas.md](./gotchas/package-ui-gotchas.md) — CSS setup
- [compose.md](./compose.md) — compose checklist (includes `@source` registration)
