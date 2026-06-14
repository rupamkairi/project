import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "../lib/store";
import { createAuthClient } from "../lib/api";

interface AuthProviderProps {
  children: ReactNode;
  apiBase: string;
}

export function AuthProvider({ children, apiBase }: AuthProviderProps) {
  const { token, setAuth, clearAuth, setLoading } = useAuthStore();

  const client = createAuthClient({
    baseUrl: apiBase,
    getToken: () => useAuthStore.getState().token,
    onUnauthorized: clearAuth,
  });

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    client
      .me()
      .then((me) => {
        const existing = useAuthStore.getState().user;
        if (existing) {
          setAuth(
            {
              id: me.actorId,
              orgId: me.orgId,
              roles: me.roles,
              sessionId: me.sessionId,
            },
            token,
            useAuthStore.getState().refreshToken ?? undefined,
          );
        }
      })
      .catch(() => clearAuth())
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
