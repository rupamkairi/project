import { createAuthenticatedClient, useAuthStore } from '@projectx/plugin-auth-web'

// Ecommerce Admin API Client

const SERVER_ROOT =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ||
  'http://localhost:10050'
const API_BASE = SERVER_ROOT + '/ecommerce/admin'

const transport = createAuthenticatedClient({
  baseUrl: API_BASE,
  getToken: () => useAuthStore.getState().token,
  refresh: () => useAuthStore.getState().refresh(),
  onSessionExpired: () => useAuthStore.getState().clearAuth(),
})

interface ApiResponse<T> {
  data?: T
  error?: string
}

class EcommerceAdminApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      return { data: await transport.request<T>(endpoint, options) }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Request failed' }
    }
  }

  // Products
  async getProducts(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    q?: string
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    if (params?.q) query.set('search', params.q)
    if (params?.status) query.set('status', params.status)
    return this.request<{ data: any[]; pagination: any }>(`/products?${query}`)
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`)
  }

  async createProduct(data: any) {
    return this.request<any>('/products', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateProduct(id: string, data: any) {
    return this.request<any>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  async deleteProduct(id: string) {
    return this.request<any>(`/products/${id}`, { method: 'DELETE' })
  }

  // Variants
  async getVariants(productId: string) {
    return this.request<{ data: any[] }>(`/products/${productId}/variants`)
  }

  async getVariant(productId: string, variantId: string) {
    return this.request<any>(`/products/${productId}/variants/${variantId}`)
  }

  async createVariant(productId: string, data: any) {
    return this.request<any>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateVariant(productId: string, variantId: string, data: any) {
    return this.request<any>(`/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteVariant(productId: string, variantId: string) {
    return this.request<any>(`/products/${productId}/variants/${variantId}`, { method: 'DELETE' })
  }

  // Categories
  async getCategories() {
    return this.request<{ data: any[] }>('/categories')
  }

  async getCategory(id: string) {
    return this.request<any>(`/categories/${id}`)
  }

  async createCategory(data: any) {
    return this.request<any>('/categories', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateCategory(id: string, data: any) {
    return this.request<any>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  async deleteCategory(id: string) {
    return this.request<any>(`/categories/${id}`, { method: 'DELETE' })
  }

  // Orders
  async getOrders(params?: { page?: number; limit?: number; status?: string; q?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.status) query.set('status', params.status)
    if (params?.q) query.set('q', params.q)
    return this.request<{ data: any[]; pagination: any }>(`/orders?${query}`)
  }

  async getOrder(id: string) {
    return this.request<any>(`/orders/${id}`)
  }

  async updateOrder(id: string, data: any) {
    return this.request<any>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  async updateOrderStatus(id: string, status: string) {
    return this.updateOrder(id, { status })
  }

  async cancelOrder(id: string) {
    return this.request<any>(`/orders/${id}/cancel`, { method: 'POST' })
  }

  async createFulfillment(orderId: string, data: any) {
    return this.request<any>(`/orders/${orderId}/fulfillments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Customers
  async getCustomers(params?: { page?: number; limit?: number; search?: string; q?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    if (params?.q) query.set('search', params.q)
    return this.request<{ data: any[]; pagination: any }>(`/customers?${query}`)
  }

  async getCustomer(id: string) {
    return this.request<any>(`/customers/${id}`)
  }

  // Fulfillments
  async getFulfillments(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.status) query.set('status', params.status)
    return this.request<{ data: any[]; pagination: any }>(`/fulfillments?${query}`)
  }

  async updateFulfillmentStatus(id: string, status: string) {
    return this.request<any>(`/fulfillments/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  // Returns
  async getReturns(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.status) query.set('status', params.status)
    return this.request<{ data: any[]; pagination: any }>(`/returns?${query}`)
  }

  async getReturn(id: string) {
    return this.request<any>(`/returns/${id}`)
  }

  // Regions
  async getRegions() {
    return this.request<{ data: any[] }>('/regions')
  }

  async getRegion(id: string) {
    return this.request<any>(`/regions/${id}`)
  }

  async createRegion(data: any) {
    return this.request<any>('/regions', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateRegion(id: string, data: any) {
    return this.request<any>(`/regions/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  // Shipping Options
  async getShippingOptions(params?: { regionId?: string }) {
    const query = new URLSearchParams()
    if (params?.regionId) query.set('regionId', params.regionId)
    return this.request<{ data: any[] }>(`/shipping-options?${query}`)
  }

  // Tax
  async getTaxRates(params?: { regionId?: string }) {
    const query = new URLSearchParams()
    if (params?.regionId) query.set('regionId', params.regionId)
    return this.request<{ data: any[] }>(`/tax-rates?${query}`)
  }

  // Analytics
  async getAnalytics(params?: { period?: string }) {
    const query = new URLSearchParams()
    if (params?.period) query.set('period', params.period)
    return this.request<any>(`/analytics/overview?${query}`)
  }

  async getDashboard() {
    return this.getAnalytics({ period: '30d' })
  }
}

export const ecommerceAdminApi = new EcommerceAdminApiClient()
