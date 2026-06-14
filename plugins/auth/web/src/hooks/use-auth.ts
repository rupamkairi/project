import { useAuthStore } from "../lib/store";

export function useAuth() {
  const { user, token, isLoading, setAuth, clearAuth } = useAuthStore();

  return {
    actor: user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    setAuth,
    logout: clearAuth,
  };
}
