import { useEffect, useState, type ReactNode } from 'react'
import { ensureAuthInitialized } from '../lib/store'

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
// `platform_token` into the shared session, and holds the tree until auth is ready.
export function AuthProvider({ children, apiBase }: AuthProviderProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void ensureAuthInitialized(resolveApiBase(apiBase)).finally(() => setReady(true))
  }, [apiBase])

  if (!ready) return null
  return <>{children}</>
}
