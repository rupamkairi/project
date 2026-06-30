// Ecommerce Storefront API Client
// Uses eco_customer_token for customer authentication

const SERVER_ROOT = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_BASE = SERVER_ROOT + "/ecommerce/store";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class EcommerceStorefrontApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("eco_customer_token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("eco_customer_token", token);
    } else {
      localStorage.removeItem("eco_customer_token");
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

  // Catalog (public)
  async getProducts(params?: { page?: number; limit?: number; search?: string; categoryId?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.categoryId) query.set("categoryId", params.categoryId);
    return this.request<{ data: any[]; pagination: any }>(`/products?${query}`);
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`);
  }

  async getCategories() {
    return this.request<{ data: any[] }>("/categories");
  }

  // Cart
  async getCart(cartId: string) {
    return this.request<any>(`/cart/${cartId}`);
  }

  async createCart() {
    return this.request<any>("/cart", { method: "POST" });
  }

  async addToCart(cartId: string, variantId: string, quantity: number) {
    return this.request<any>(`/cart/${cartId}/items`, {
      method: "POST",
      body: JSON.stringify({ variantId, quantity }),
    });
  }

  async updateCartItem(cartId: string, itemId: string, quantity: number) {
    return this.request<any>(`/cart/${cartId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(cartId: string, itemId: string) {
    return this.request<any>(`/cart/${cartId}/items/${itemId}`, { method: "DELETE" });
  }

  // Checkout
  async setShippingAddress(cartId: string, address: any) {
    return this.request<any>(`/cart/${cartId}/shipping-address`, {
      method: "POST",
      body: JSON.stringify(address),
    });
  }

  async setBillingAddress(cartId: string, address: any) {
    return this.request<any>(`/cart/${cartId}/billing-address`, {
      method: "POST",
      body: JSON.stringify(address),
    });
  }

  async selectShippingOption(cartId: string, shippingOptionId: string) {
    return this.request<any>(`/cart/${cartId}/shipping-option`, {
      method: "POST",
      body: JSON.stringify({ shippingOptionId }),
    });
  }

  async createPaymentSession(cartId: string) {
    return this.request<any>(`/cart/${cartId}/payment-session`, { method: "POST" });
  }

  async completeCheckout(cartId: string, paymentData: any) {
    return this.request<any>("/checkout/complete", {
      method: "POST",
      body: JSON.stringify({ cartId, ...paymentData }),
    });
  }

  // Customer Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; customer: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
    return this.request<{ token: string; customer: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<any>("/auth/me");
  }

  // Customer Account (authenticated)
  async updateProfile(data: { firstName?: string; lastName?: string; phone?: string }) {
    return this.request<any>("/account", { method: "PATCH", body: JSON.stringify(data) });
  }

  async getOrders(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return this.request<{ data: any[]; pagination: any }>(`/account/orders?${query}`);
  }

  async getOrder(id: string) {
    return this.request<any>(`/account/orders/${id}`);
  }

  async getAddresses() {
    return this.request<{ data: any[] }>("/account/addresses");
  }

  async createAddress(data: any) {
    return this.request<any>("/account/addresses", { method: "POST", body: JSON.stringify(data) });
  }

  async updateAddress(id: string, data: any) {
    return this.request<any>(`/account/addresses/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteAddress(id: string) {
    return this.request<any>(`/account/addresses/${id}`, { method: "DELETE" });
  }

  async requestReturn(orderId: string, items: { transactionLineId: string; reason: string }[]) {
    return this.request<any>("/account/returns", {
      method: "POST",
      body: JSON.stringify({ orderId, items }),
    });
  }
}

export const ecommerceStorefrontApi = new EcommerceStorefrontApiClient(API_BASE);
