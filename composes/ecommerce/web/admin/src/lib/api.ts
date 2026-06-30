// Ecommerce Admin API Client
// Uses platform_token for admin authentication

const SERVER_ROOT = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_BASE = SERVER_ROOT + "/ecommerce/admin";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class EcommerceAdminApiClient {
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

  // Products
  async getProducts(params?: { page?: number; limit?: number; search?: string; status?: string; q?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.q) query.set("search", params.q);
    if (params?.status) query.set("status", params.status);
    return this.request<{ data: any[]; pagination: any }>(`/products?${query}`);
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`);
  }

  async createProduct(data: any) {
    return this.request<any>("/products", { method: "POST", body: JSON.stringify(data) });
  }

  async updateProduct(id: string, data: any) {
    return this.request<any>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteProduct(id: string) {
    return this.request<any>(`/products/${id}`, { method: "DELETE" });
  }

  // Variants
  async getVariants(productId: string) {
    return this.request<{ data: any[] }>(`/products/${productId}/variants`);
  }

  async getVariant(productId: string, variantId: string) {
    return this.request<any>(`/products/${productId}/variants/${variantId}`);
  }

  async createVariant(productId: string, data: any) {
    return this.request<any>(`/products/${productId}/variants`, { method: "POST", body: JSON.stringify(data) });
  }

  async updateVariant(productId: string, variantId: string, data: any) {
    return this.request<any>(`/products/${productId}/variants/${variantId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteVariant(productId: string, variantId: string) {
    return this.request<any>(`/products/${productId}/variants/${variantId}`, { method: "DELETE" });
  }

  // Categories
  async getCategories() {
    return this.request<{ data: any[] }>("/categories");
  }

  async getCategory(id: string) {
    return this.request<any>(`/categories/${id}`);
  }

  async createCategory(data: any) {
    return this.request<any>("/categories", { method: "POST", body: JSON.stringify(data) });
  }

  async updateCategory(id: string, data: any) {
    return this.request<any>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteCategory(id: string) {
    return this.request<any>(`/categories/${id}`, { method: "DELETE" });
  }

  // Orders
  async getOrders(params?: { page?: number; limit?: number; status?: string; q?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    if (params?.q) query.set("q", params.q);
    return this.request<{ data: any[]; pagination: any }>(`/orders?${query}`);
  }

  async getOrder(id: string) {
    return this.request<any>(`/orders/${id}`);
  }

  async updateOrder(id: string, data: any) {
    return this.request<any>(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async cancelOrder(id: string) {
    return this.request<any>(`/orders/${id}/cancel`, { method: "POST" });
  }

  async createFulfillment(orderId: string, data: any) {
    return this.request<any>(`/orders/${orderId}/fulfillments`, { method: "POST", body: JSON.stringify(data) });
  }

  // Customers
  async getCustomers(params?: { page?: number; limit?: number; search?: string; q?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.q) query.set("search", params.q);
    return this.request<{ data: any[]; pagination: any }>(`/customers?${query}`);
  }

  async getCustomer(id: string) {
    return this.request<any>(`/customers/${id}`);
  }

  // Fulfillments
  async getFulfillments(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return this.request<{ data: any[]; pagination: any }>(`/fulfillments?${query}`);
  }

  async updateFulfillmentStatus(id: string, status: string) {
    return this.request<any>(`/fulfillments/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
  }

  // Returns
  async getReturns(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    return this.request<{ data: any[]; pagination: any }>(`/returns?${query}`);
  }

  async getReturn(id: string) {
    return this.request<any>(`/returns/${id}`);
  }

  // Regions
  async getRegions() {
    return this.request<{ data: any[] }>("/regions");
  }

  async getRegion(id: string) {
    return this.request<any>(`/regions/${id}`);
  }

  async createRegion(data: any) {
    return this.request<any>("/regions", { method: "POST", body: JSON.stringify(data) });
  }

  async updateRegion(id: string, data: any) {
    return this.request<any>(`/regions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // Shipping Options
  async getShippingOptions(params?: { regionId?: string }) {
    const query = new URLSearchParams();
    if (params?.regionId) query.set("regionId", params.regionId);
    return this.request<{ data: any[] }>(`/shipping-options?${query}`);
  }

  // Tax
  async getTaxRates(params?: { regionId?: string }) {
    const query = new URLSearchParams();
    if (params?.regionId) query.set("regionId", params.regionId);
    return this.request<{ data: any[] }>(`/tax-rates?${query}`);
  }

  // Analytics
  async getAnalytics(params?: { period?: string }) {
    const query = new URLSearchParams();
    if (params?.period) query.set("period", params.period);
    return this.request<any>(`/analytics/overview?${query}`);
  }

  async getDashboard() {
    return this.getAnalytics({ period: "30d" });
  }
}

export const ecommerceAdminApi = new EcommerceAdminApiClient(API_BASE);
