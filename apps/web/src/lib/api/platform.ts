// Platform API client using Eden Treaty patterns
// This connects to the server's platform compose routes

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("platform_token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("platform_token", token);
    } else {
      localStorage.removeItem("platform_token");
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Request failed" };
      }

      return { data };
    } catch (error) {
      return { error: "Network error" };
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; actor: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
  }

  async getMe() {
    return this.request<any>("/auth/me");
  }

  // Users
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);

    return this.request<{ data: any[]; pagination: any }>(`/users?${query}`);
  }

  async getUser(id: string) {
    return this.request<any>(`/users/${id}`);
  }

  async createUser(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }) {
    return this.request<any>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateUser(
    id: string,
    data: { firstName?: string; lastName?: string; avatarUrl?: string },
  ) {
    return this.request<any>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async suspendUser(id: string) {
    return this.request<any>(`/users/${id}/suspend`, { method: "POST" });
  }

  async activateUser(id: string) {
    return this.request<any>(`/users/${id}/activate`, { method: "POST" });
  }

  async deleteUser(id: string) {
    return this.request<any>(`/users/${id}`, { method: "DELETE" });
  }

  async getUserSessions(id: string) {
    return this.request<any[]>(`/users/${id}/sessions`);
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.request<any>(`/users/${userId}/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  // Roles
  async getRoles(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    return this.request<{ data: any[]; pagination: any }>(`/roles?${query}`);
  }

  async getRole(id: string) {
    return this.request<any>(`/roles/${id}`);
  }

  async createRole(data: {
    name: string;
    description?: string;
    permissions: string[];
  }) {
    return this.request<any>("/roles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.request<any>(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteRole(id: string) {
    return this.request<any>(`/roles/${id}`, { method: "DELETE" });
  }

  async assignRole(roleId: string, actorIds: string[]) {
    return this.request<any>(`/roles/${roleId}/assign`, {
      method: "POST",
      body: JSON.stringify({ actorIds }),
    });
  }

  async revokeRole(roleId: string, actorIds: string[]) {
    return this.request<any>(`/roles/${roleId}/revoke`, {
      method: "POST",
      body: JSON.stringify({ actorIds }),
    });
  }

  // Notifications
  async getTemplates(params?: {
    page?: number;
    limit?: number;
    search?: string;
    channel?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.channel) query.set("channel", params.channel);

    return this.request<{ data: any[]; pagination: any }>(
      `/notifications/templates?${query}`,
    );
  }

  async getTemplate(id: string) {
    return this.request<any>(`/notifications/templates/${id}`);
  }

  async createTemplate(data: {
    key: string;
    channel: string;
    subject?: string;
    body: string;
    locale?: string;
  }) {
    return this.request<any>("/notifications/templates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string, data: { subject?: string; body?: string }) {
    return this.request<any>(`/notifications/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string) {
    return this.request<any>(`/notifications/templates/${id}`, {
      method: "DELETE",
    });
  }

  async getTriggers(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    return this.request<{ data: any[]; pagination: any }>(
      `/notifications/triggers?${query}`,
    );
  }

  async createTrigger(data: {
    eventPattern: string;
    templateKey: string;
    channel: string;
    recipientExpr?: object;
  }) {
    return this.request<any>("/notifications/triggers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteTrigger(id: string) {
    return this.request<any>(`/notifications/triggers/${id}`, {
      method: "DELETE",
    });
  }

  async getLogs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    templateKey?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    if (params?.templateKey) query.set("templateKey", params.templateKey);

    return this.request<{ data: any[]; pagination: any }>(
      `/notifications/logs?${query}`,
    );
  }

  // Settings
  async getSettings() {
    return this.request<any>("/settings");
  }

  async updateSetting(key: string, value: unknown) {
    return this.request<any>(`/settings/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });
  }
}

export const platformApi = new ApiClient(API_BASE);
