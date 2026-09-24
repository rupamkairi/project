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

  // Orders are read-only in the backend (GET list/detail only).
  // Status changes flow through fulfillments + returns.
  async updateOrder(_id: string, _data: any) {
    return { error: 'Order updates are not backed by the admin API yet' as const }
  }

  async updateOrderStatus(_id: string, _status: string) {
    return { error: 'Order status changes flow through fulfillments' as const }
  }

  async cancelOrder(_id: string) {
    return { error: 'Order cancel is not backed by the admin API yet' as const }
  }

  async createFulfillment(_orderId: string, _data: any) {
    return {
      error: 'Use Fulfillment queue (POST /fulfillments/:id/status) instead' as const,
    }
  }

  async publishProduct(id: string) {
    return this.request<any>(`/products/${id}/publish`, { method: 'POST' })
  }

  async unpublishProduct(id: string) {
    return this.request<any>(`/products/${id}/unpublish`, { method: 'POST' })
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

  async approveReturn(id: string) {
    return this.request<any>(`/returns/${id}/approve`, { method: 'POST' })
  }

  async rejectReturn(id: string) {
    return this.request<any>(`/returns/${id}/reject`, { method: 'POST' })
  }

  async receiveReturn(id: string) {
    return this.request<any>(`/returns/${id}/receive`, { method: 'POST' })
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

  async deleteRegion(id: string) {
    return this.request<any>(`/regions/${id}`, { method: 'DELETE' })
  }

  // Shipping — backend prefix is /shipping
  async getShippingOptions() {
    return this.request<{ data: any[] }>('/shipping')
  }

  async createShippingOption(data: any) {
    return this.request<any>('/shipping', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateShippingOption(id: string, data: any) {
    return this.request<any>(`/shipping/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteShippingOption(id: string) {
    return this.request<any>(`/shipping/${id}`, { method: 'DELETE' })
  }

  // Tax — backend is /tax/profiles + /tax/profiles/:id/rates
  async getTaxProfiles() {
    return this.request<{ data: any[] }>('/tax/profiles')
  }

  async createTaxProfile(data: any) {
    return this.request<any>('/tax/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getTaxRates(profileId: string) {
    return this.request<{ data: any[] }>(`/tax/profiles/${profileId}/rates`)
  }

  async createTaxRate(profileId: string, data: any) {
    return this.request<any>(`/tax/profiles/${profileId}/rates`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Pricing — backend prefix is /pricing
  async getPriceLists(params?: { status?: string; currency?: string }) {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.currency) query.set('currency', params.currency)
    return this.request<{ data: any[] }>(`/pricing/price-lists?${query}`)
  }

  async createPriceList(data: any) {
    return this.request<any>('/pricing/price-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPriceRules(priceListId: string) {
    return this.request<{ data: any[] }>(`/pricing/price-lists/${priceListId}/rules`)
  }

  async createPriceRule(priceListId: string, data: any) {
    return this.request<any>(`/pricing/price-lists/${priceListId}/rules`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
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
