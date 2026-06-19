# `@projectx/ui` Gotchas

Known issues and required patterns when using or extending the UI package.

---

## Tailwind v4 — Monorepo Source Scanning

**Symptom:** Components imported from `@projectx/ui` render with no styles. Classes on elements inside `composes/` or `apps/web/src/` also have no CSS generated.

**Root cause:** Tailwind v4 generates CSS only for classes it can find in its configured source paths. The `@tailwindcss/vite` plugin runs inside `apps/web`. Its auto-detection scans from the Vite project root (`apps/web/`). Files in `packages/ui/src/` and `composes/*/web/src/` sit outside that root — Tailwind never scans them, so their classes produce no output.

---

### The pattern this repo uses

`apps/web/src/globals.css` is the single Tailwind entry point for the entire web shell. It owns:
- `@import "tailwindcss"` — Tailwind initialization (one place only)
- `@import "@projectx/ui/tokens.css"` — design tokens (CSS vars + `@theme`)
- `@source` declarations for every directory that uses Tailwind classes

```css
/* apps/web/src/globals.css */
@import "tailwindcss";
@import "@projectx/ui/tokens.css";

@source "../../../packages/ui/src";
@source "../../../composes/platform/web/src";
@source ".";
```

`apps/web/src/main.tsx` imports this file:

```ts
import "./globals.css";
```

**`@projectx/ui/tokens.css`** exports only design tokens — no `@import "tailwindcss"`. This avoids two Tailwind instances competing.

**`@projectx/ui/index.css`** is the standalone entry for tools like Storybook that run outside the app shell. Do not import it from `apps/web` or any compose.

**`packages/ui/src/index.ts`** does NOT auto-import CSS. CSS is the consuming app's responsibility.

---

### Adding a new compose

When a new compose web is wired into `apps/web`, add one line to `apps/web/src/globals.css`:

```css
@source "../../../composes/{name}/web/src";
```

`@source` paths are relative to the CSS file (`apps/web/src/globals.css`), so three `../` steps reach the repo root.

If the compose is added but its `@source` line is missing, all Tailwind classes inside that compose will silently produce no CSS.

---

### Quick reference — CSS file roles

| File | Role | Import from |
|------|------|-------------|
| `packages/ui/src/tokens.css` | Design tokens only. No Tailwind init. | `apps/web/src/globals.css` via `@import "@projectx/ui/tokens.css"` |
| `packages/ui/src/index.css` | Standalone entry (Tailwind + tokens + `@source "."`) | Storybook / isolated tools only |
| `apps/web/src/globals.css` | App Tailwind entry. Owns `@source` for all dirs. | `apps/web/src/main.tsx` |

---

## `@/lib/utils` alias in UI components

Components in `packages/ui/src/components/ui/` that use `@/lib/utils` resolve the `@` alias to `apps/web/src/` (via Vite config). This works because `apps/web/src/lib/utils.ts` also exports `cn`. New components in `packages/ui` must use a relative import instead:

```ts
// Correct
import { cn } from "../../lib/utils";

// Will resolve to apps/web/src/lib/utils — avoid
import { cn } from "@/lib/utils";
```

---

## Do not create duplicate components in apps or composes

`apps/web/src/components/ui/` contains legacy copies of some shadcn components (card, tabs, popover, etc.). These should be removed and replaced with imports from `@projectx/ui`. Never add new shadcn components to an app or compose — add them to `packages/ui` and export from `packages/ui/src/index.ts`.
