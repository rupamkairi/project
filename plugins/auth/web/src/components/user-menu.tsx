import { useNavigate } from '@tanstack/react-router'
import { UserMenuView, type UserMenuLinkItem } from '@projectx/ui'
import { useAuthStore } from '../lib/store'

export interface UserMenuProps {
  displayName?: string | null | undefined
  email?: string | null | undefined
  linkItems?: UserMenuLinkItem[] | undefined
  onAfterLogout?: (() => void | Promise<void>) | undefined
}

function initialsFor(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string | null,
) {
  const fromParts = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase()
  if (fromParts) return fromParts
  const fromFallback = (fallback ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
  return fromFallback || '?'
}

/**
 * Canonical session menu for Navbar-1. Reads the platform session from
 * `useAuthStore`; callers with a bespoke actor shape (e.g. LMS) pass
 * `displayName` / `email` / `onAfterLogout` overrides instead of forking
 * a second menu component.
 */
export function UserMenu({ displayName, email, linkItems, onAfterLogout }: UserMenuProps) {
  const actor = useAuthStore((state) => state.actor)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const fullName =
    displayName ?? [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ?? 'User'

  const handleLogout = async () => {
    await logout()
    await onAfterLogout?.()
    navigate({ to: '/login' })
  }

  return (
    <UserMenuView
      initials={initialsFor(actor?.firstName, actor?.lastName, fullName)}
      fullName={fullName || 'User'}
      email={email ?? actor?.email ?? null}
      linkItems={linkItems}
      onSignOut={() => void handleLogout()}
    />
  )
}
