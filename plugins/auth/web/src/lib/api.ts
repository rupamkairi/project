// Auth API client — thin fetch wrapper with auto-bearer injection

export interface AuthApiConfig {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  actorId: string;
}

export interface MeResponse {
  actorId: string;
  orgId: string;
  roles: string[];
  sessionId: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
}

export interface RegisterResponse {
  actorId: string;
}

export function createAuthClient(config: AuthApiConfig) {
  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = config.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${config.baseUrl}${path}`, { ...init, headers });

    if (res.status === 401) {
      config.onUnauthorized?.();
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? "Request failed");
    }

    return res.json() as Promise<T>;
  }

  return {
    login: (data: LoginRequest) =>
      request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    logout: () =>
      request<{ success: boolean }>("/auth/logout", { method: "POST" }),

    me: () => request<MeResponse>("/auth/me"),

    refresh: (refreshToken: string) =>
      request<{ token: string; refreshToken?: string }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),

    register: (data: RegisterRequest) =>
      request<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    forgotPassword: (email: string, orgId: string) =>
      request<{ success: boolean }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email, orgId }),
      }),

    resetPassword: (token: string, newPassword: string) =>
      request<{ success: boolean }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      }),
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
