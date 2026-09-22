# Fix auth reset on full page reload

## Goal

After login, a full browser refresh should rehydrate the session from localStorage (Zustand persist key `auth`), validate it via `/platform/auth/me` (and refresh if needed), and keep the user signed in.

## Assumptions

- Persisted shape remains `partialize`: `user`, `actor`, `token`, `refreshToken` (key `auth`).
- API base stays `VITE_API_URL` / default `http://localhost:10050` and auth path `/platform/auth`.
- If `/me` returns 401 and refresh fails, clearing the session is still correct.

## Steps

1. Add `ensureAuthInitialized` and eager rehydrate; harden `restore()` so it does not wipe storage before hydration.
2. Make `requireAuth` async and return that promise from compose `beforeLoad` handlers.
3. Gate `RouterProvider` behind `AuthProvider` until initialization completes.
4. Redirect authenticated users from `/` and `/login` to `/dashboard`.
5. Dedupe `zustand` in the web Vite config.

## Risks / checks

- Login still lands on `/dashboard`.
- Full reload on `/` stays authenticated and redirects to `/dashboard`.
- Full reload on `/dashboard` keeps the session and persist payload.
- Logout still clears `auth` and sends `/dashboard` to `/login`.
- API down marks `unavailable` without wiping stored tokens.
