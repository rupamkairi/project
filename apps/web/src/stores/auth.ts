import { create } from "zustand";
import { platformApi } from "@projectx/platform-web";

interface Actor {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

interface AuthState {
  actor: Actor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  actor: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await platformApi.login(email, password);

    if (error || !data) {
      set({ isLoading: false, error: error || "Login failed" });
      return false;
    }

    platformApi.setToken(data.token);
    set({
      actor: data.actor,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    return true;
  },

  logout: async () => {
    await platformApi.logout();
    platformApi.setToken(null);
    set({ actor: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = platformApi.getToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const { data } = await platformApi.getMe();

    if (data) {
      set({
        actor: data,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      platformApi.setToken(null);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
