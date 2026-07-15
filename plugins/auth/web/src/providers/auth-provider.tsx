import { useEffect, useRef, type ReactNode } from 'react'
import { useAuthStore } from '../lib/store'

function resolveApiBase(explicit?: string): string {
  if (explicit) return explicit
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  return env?.VITE_API_URL || 'http://localhost:10050'
}

interface AuthProviderProps {
  children: ReactNode
  apiBase?: string
}

// Mounted once above the router. Configures the API root, migrates any legacy
// `platform_token` into the shared session, and initializes authentication a
// single time.
export function AuthProvider({ children, apiBase }: AuthProviderProps) {
  const initialize = useAuthStore((s) => s.initialize)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    void initialize(resolveApiBase(apiBase))
  }, [initialize, apiBase])

  return <>{children}</>
}
