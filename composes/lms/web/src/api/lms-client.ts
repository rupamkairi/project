// LMS API Client

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:10050";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getAuthToken(): string | null {
  try {
    const token = localStorage.getItem("platform_token");
    if (token) return token;
  } catch {}
  return null;
}

function redirectToLogin() {
  window.location.href = "/login";
}

export class LmsApiClient {
  private base = `${API_BASE}/lms`;

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      redirectToLogin();
      throw new ApiError(401, "Unauthorized");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.message ?? "Request failed", err.code);
    }
    return res.json();
  }

  get = <T>(path: string) => this.request<T>("GET", path);
  post = <T>(path: string, body?: unknown) => this.request<T>("POST", path, body);
  patch = <T>(path: string, body?: unknown) => this.request<T>("PATCH", path, body);
  delete = <T>(path: string) => this.request<T>("DELETE", path);
}

export const lmsApi = new LmsApiClient();
