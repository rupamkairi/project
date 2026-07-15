import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../lib/store'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
}

// Router-aware guard. Every hook is called unconditionally; the redirect happens
// inside a single unconditional effect once initialization has settled.
export function AuthGuard({ children, fallback = null, redirectTo = '/login' }: AuthGuardProps) {
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: redirectTo, replace: true })
    }
  }, [isLoading, isAuthenticated, navigate, redirectTo])

  if (isLoading || status === 'unavailable') return <>{fallback}</>
  if (!isAuthenticated) return <>{fallback}</>
  return <>{children}</>
}
