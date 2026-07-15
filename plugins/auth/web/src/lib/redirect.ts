import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '../lib/store'

// For use in route `beforeLoad`. Waits for initialization to finish before
// deciding; redirects to login only once the status is definitively anonymous.
export function requireAuth() {
  const { status } = useAuthStore.getState()
  if (status === 'anonymous') {
    // TanStack Router intentionally uses a redirect value as control flow.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/login' })
  }
}
