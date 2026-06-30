import { create } from "zustand"

interface LmsAuthState {
  actor: { id: string; name: string; email: string; role: string } | null
  permissions: string[]
  setActor: (actor: LmsAuthState["actor"], permissions: string[]) => void
  hasPermission: (perm: string) => boolean
  clear: () => void
}

export const useLmsAuthStore = create<LmsAuthState>((set, get) => ({
  actor: null,
  permissions: [],
  setActor: (actor, permissions) => set({ actor, permissions }),
  hasPermission: (perm) => {
    const { permissions } = get()
    return permissions.includes("lms:admin") || permissions.includes(perm)
  },
  clear: () => set({ actor: null, permissions: [] }),
}))
