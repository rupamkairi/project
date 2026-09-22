import { redirect } from '@tanstack/react-router'
import { ensureAuthInitialized, useAuthStore } from './store'

// For use in route `beforeLoad`. Waits for initialization to finish before
// deciding; redirects to login only once the status is definitively anonymous.
export async function requireAuth() {
  await ensureAuthInitialized()
  const { status, isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated && status !== 'unavailable') {
    // TanStack Router intentionally uses a redirect value as control flow.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/login' })
  }
}

export async function redirectIfAuthenticated(to = '/dashboard') {
  await ensureAuthInitialized()
  if (useAuthStore.getState().isAuthenticated) {
    // TanStack Router intentionally uses a redirect value as control flow.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to })
  }
}
