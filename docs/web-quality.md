# Web Quality Standard

This is the source of truth for all web code in ProjectX.

## Rules

- React: components stay pure, hooks stay in hooks, no render side effects.
- TypeScript: strict types on shared surfaces, no avoidable `any`.
- Zustand: one store per concern, typed state/actions, persistence only when needed.
- Routing: one root route, compose routes exported as arrays, no mixed tree styles.
- UI: use `@projectx/ui` first, semantic tokens only, no raw palette classes.
- API: one client pattern per tier, no cross-compose private imports.

## Review Checks

- Route export shape matches docs.
- Shell imports come from compose public entrypoints only.
- No direct `localStorage` spread unless it is the store boundary.
- No shared helper imported from another compose internals folder.
- No raw `bg-*/text-*/border-*` palette drift in touched code.
