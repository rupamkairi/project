// Ecommerce Storefront API Client
// Uses eco_customer_token for customer authentication

const SERVER_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:10050'
const API_BASE = SERVER_ROOT + '/ecommerce/store'

interface ApiResponse<T> {
  data?: T
  error?: string
}

class EcommerceStorefrontApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.token = localStorage.getItem('eco_customer_token')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('eco_customer_token', token)
    } else {
      localStorage.removeItem('eco_customer_token')
    }
  }

  getToken(): string | null {
    return this.token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Request failed' }
      }

      return { data }
    } catch (error) {
      return { error: 'Network error' }
    }
  }

  // Catalog (public)
  async getProducts(params?: {
    page?: number
    limit?: number
    search?: string
    categoryId?: string
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    if (params?.categoryId) query.set('categoryId', params.categoryId)
    return this.request<{ data: any[]; pagination: any }>(`/products?${query}`)
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`)
  }

  async getCategories() {
    return this.request<{ data: any[] }>('/categories')
  }

  // Cart
  async getCart(cartId: string) {
    return this.request<any>(`/cart/${cartId}`)
  }

  async createCart() {
    return this.request<any>('/cart', { method: 'POST' })
  }

  async addToCart(cartId: string, variantId: string, quantity: number) {
    return this.request<any>(`/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ variantId, quantity }),
    })
  }

  async updateCartItem(cartId: string, itemId: string, quantity: number) {
    return this.request<any>(`/cart/${cartId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    })
  }

  async removeFromCart(cartId: string, itemId: string) {
    return this.request<any>(`/cart/${cartId}/items/${itemId}`, { method: 'DELETE' })
  }

  // Checkout — backend mounts these under /checkout/:id/*
  async setShippingAddress(cartId: string, address: any) {
    return this.request<any>(`/checkout/${cartId}/shipping-address`, {
      method: 'POST',
      body: JSON.stringify(address),
    })
  }

  async getShippingOptions(cartId: string) {
    return this.request<any>(`/checkout/${cartId}/shipping-options`)
  }

  async selectShippingOption(cartId: string, shippingOptionId: string) {
    return this.request<any>(`/checkout/${cartId}/shipping-option`, {
      method: 'POST',
      body: JSON.stringify({ shippingOptionId }),
    })
  }

  async getTax(cartId: string) {
    return this.request<any>(`/checkout/${cartId}/tax`)
  }

  async createPaymentSession(cartId: string) {
    return this.request<any>(`/checkout/${cartId}/payment-session`, { method: 'POST' })
  }

  // Customer Auth — no dedicated store auth on the backend (anonymous
  // commerce + geo address book). These are local-only so the UI can
  // still sign in/out without 404s; backend wiring is out of scope.
  async login(
    email: string,
    _password: string,
  ): Promise<ApiResponse<{ token: string; customer: any }>> {
    const token = `local-${btoa(email)}.${Date.now()}`
    this.setToken(token)
    return {
      data: { token, customer: { id: `local-${email}`, email, firstName: '', lastName: '' } },
    }
  }

  async register(data: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }): Promise<ApiResponse<{ token: string; customer: any }>> {
    const token = `local-${btoa(data.email)}.${Date.now()}`
    this.setToken(token)
    const { password: _pw, ...rest } = data
    return {
      data: {
        token,
        customer: { id: `local-${data.email}`, firstName: '', lastName: '', ...rest },
      },
    }
  }

  async getMe(): Promise<ApiResponse<any>> {
    if (!this.token) return { error: 'Not signed in' }
    const head = this.token.split('.')[0] ?? ''
    const email = this.token.startsWith('local-') && head.length > 6 ? atob(head.slice(6)) : null
    return { data: { email } }
  }

  // Customer Account (anonymous commerce + geo address book)
  async updateProfile(_data: { firstName?: string; lastName?: string; phone?: string }) {
    return { error: 'Profile editing is not backed by the store API yet' as const }
  }

  async getOrders(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    return this.request<{ data: any[]; pagination: any }>(`/account/orders?${query}`)
  }

  async getOrder(id: string) {
    return this.request<any>(`/account/orders/${id}`)
  }

  async getAddresses() {
    return this.request<{ data: any[] }>('/account/addresses')
  }

  async createAddress(data: any) {
    return this.request<any>('/account/addresses', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateAddress(id: string, data: any) {
    return this.request<any>(`/account/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAddress(id: string) {
    return this.request<any>(`/account/addresses/${id}`, { method: 'DELETE' })
  }

  async requestReturn(_orderId: string, _items: { transactionLineId: string; reason: string }[]) {
    return { error: 'Store-initiated returns are admin-only in the current backend' as const }
  }

  async completeCheckout(_cartId: string, _paymentData?: any) {
    return { error: 'Use createPaymentSession; order placement is confirmed via payment webhook' as const }
  }

  async setBillingAddress(cartId: string, address: any) {
    return this.setShippingAddress(cartId, address)
  }
}

export const ecommerceStorefrontApi = new EcommerceStorefrontApiClient(API_BASE)
