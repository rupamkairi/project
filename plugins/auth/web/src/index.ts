export { useAuthStore } from "./lib/store";
export type { AuthUser, AuthState } from "./lib/store";

export { createAuthClient } from "./lib/api";
export type { AuthApiConfig, AuthClient, LoginRequest, LoginResponse, MeResponse, RegisterRequest } from "./lib/api";

export { useAuth } from "./hooks/use-auth";

export { AuthGuard } from "./components/auth-guard";

export { AuthProvider } from "./providers/auth-provider";
