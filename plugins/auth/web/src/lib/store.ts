import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  orgId: string;
  roles: string[];
  sessionId: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;

  setAuth: (user: AuthUser, token: string, refreshToken?: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,

      setAuth: (user, token, refreshToken) =>
        set({ user, token, refreshToken: refreshToken ?? null, isLoading: false }),

      clearAuth: () =>
        set({ user: null, token: null, refreshToken: null, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),

      getToken: () => get().token,
    }),
    {
      name: "auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
