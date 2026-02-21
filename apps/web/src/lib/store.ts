import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, LMSRole } from "@/types/lms";
import { mockUser } from "@/lib/mock-data";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hasRole: (roles: LMSRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      login: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      logout: () => set({ user: null, isAuthenticated: false }),
      setLoading: (isLoading) => set({ isLoading }),
      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: "lms-auth-storage",
    },
  ),
);

export interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => void;
  removeNotification: (id: string) => void;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  notifications: [],
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
