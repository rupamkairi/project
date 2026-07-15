import { createAuthenticatedClient, useAuthStore } from '@projectx/plugin-auth-web'

const SERVER_ROOT =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:10050'
const API_BASE = SERVER_ROOT + '/restaurants'

const transport = createAuthenticatedClient({
  baseUrl: API_BASE,
  getToken: () => useAuthStore.getState().token,
  refresh: () => useAuthStore.getState().refresh(),
  onSessionExpired: () => useAuthStore.getState().clearAuth(),
})

type Metadata = Record<string, unknown>
type ListResponse<T> = { data: T[]; pagination?: Metadata }

export interface MenuItem {
  id: string
  name: string
  description?: string | null
  meta?: Metadata & {
    basePrice?: string | number
    categoryId?: string
    station?: string
    isAvailable?: boolean
    isPopular?: boolean
  }
}

export interface Ingredient {
  id: string
  name: string
  unit?: string
  stock: number
  reorderLevel?: number
  meta?: Metadata
}

export interface OrderLine {
  id: string
  itemId: string
  qty: number
  name?: string
  unitPrice?: string | number
  unitPriceAmount?: string | number
  modifiers?: string[]
  meta?: Metadata & { name?: string }
}
export interface Kot {
  id: string
  status: string
  kotNumber?: string
  station: string
  sentAt?: string
  readyAt?: string
  note?: string
  lines: OrderLine[]
}
export interface Order {
  id: string
  lines?: OrderLine[]
  kots?: Kot[]
  meta?: Metadata & {
    status?: string
    orderNumber?: string
    orderType?: string
    tableId?: string
    total?: string | number
  }
}
export interface Payment {
  method: string
  amount: number
}
export interface RestaurantTable {
  id: string
  code: string
  status: string
  capacity: number
  meta?: Metadata & { section?: string }
}
export interface Aggregator {
  id: string
  name?: string
  meta?: Metadata & { storeId?: string; active?: boolean; syncStatus?: string; lastSyncAt?: string }
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class RestaurantApiClient {
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const options: RequestInit = { method }
    if (body !== undefined) options.body = JSON.stringify(body)
    try {
      return await transport.request<T>(path, options)
    } catch (error) {
      throw new ApiError(0, error instanceof Error ? error.message : 'Request failed')
    }
  }

  private qs(params?: Record<string, string>) {
    if (!params) return ''
    const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    if (filtered.length === 0) return ''
    return '?' + new URLSearchParams(Object.fromEntries(filtered))
  }

  // ── Outlets ──
  getOutlets = (params?: Record<string, string>) =>
    this.request<any>('GET', '/outlets' + this.qs(params))
  getOutlet = (id: string) => this.request<any>('GET', `/outlets/${id}`)
  createOutlet = (body: any) => this.request<any>('POST', '/outlets', body)
  patchOutlet = (id: string, body: any) => this.request<any>('PATCH', `/outlets/${id}`, body)
  openOutlet = (id: string) => this.request<any>('POST', `/outlets/${id}/open`)
  closeOutlet = (id: string, reason: string) =>
    this.request<any>('POST', `/outlets/${id}/close`, { reason })
  getTables = (outletId: string) =>
    this.request<ListResponse<RestaurantTable>>('GET', `/outlets/${outletId}/tables`)
  createTable = (outletId: string, body: any) =>
    this.request<any>('POST', `/outlets/${outletId}/tables`, body)
  createTablesBulk = (outletId: string, tables: any[]) =>
    this.request<any>('POST', `/outlets/${outletId}/tables/bulk`, { tables })

  // ── Menu ──
  getMenuItems = (params?: Record<string, string>) =>
    this.request<ListResponse<MenuItem>>('GET', '/menu/items' + this.qs(params))
  getMenu = (outletId: string) =>
    this.request<ListResponse<MenuItem>>('GET', `/menu/items?outletId=${outletId}`)
  createMenuItem = (body: any) => this.request<any>('POST', '/menu/items', body)
  patchMenuItem = (id: string, body: any) => this.request<any>('PATCH', `/menu/items/${id}`, body)
  toggle86MenuItem = (id: string, available: boolean) =>
    this.request<any>('POST', `/menu/items/${id}/toggle-86`, { available })
  getCategories = (outletId: string) =>
    this.request<ListResponse<{ id: string; name: string }>>(
      'GET',
      `/menu/categories?outletId=${outletId}`,
    )
  createCategory = (body: any) => this.request<any>('POST', '/menu/categories', body)
  patchCategory = (id: string, body: any) =>
    this.request<any>('PATCH', `/menu/categories/${id}`, body)
  getMenuPeriods = (params?: Record<string, string>) =>
    this.request<any>('GET', '/menu/periods' + this.qs(params))
  createMenuPeriod = (body: any) => this.request<any>('POST', '/menu/periods', body)
  addItemVariant = (itemId: string, body: any) =>
    this.request<any>('POST', `/menu/items/${itemId}/variants`, body)
  addItemAllergen = (itemId: string, body: any) =>
    this.request<any>('POST', `/menu/items/${itemId}/allergens`, body)
  getModifiers = (params?: Record<string, string>) =>
    this.request<any>('GET', '/menu/modifiers' + this.qs(params))
  createModifier = (body: any) => this.request<any>('POST', '/menu/modifiers', body)
  getModifierGroups = (params?: Record<string, string>) =>
    this.request<any>('GET', '/menu/modifier-groups' + this.qs(params))
  createModifierGroup = (body: any) => this.request<any>('POST', '/menu/modifier-groups', body)

  // Backward compat: updateMenuItem(old)
  updateMenuItem = (id: string, body: any) => this.patchMenuItem(id, body)

  // ── Orders ──
  getOrders = (params?: Record<string, string>) =>
    this.request<ListResponse<Order>>('GET', '/orders' + this.qs(params))
  getOrder = (id: string) => this.request<Order>('GET', `/orders/${id}`)
  createOrder = (body: any) => this.request<any>('POST', '/orders', body)
  placeOrder = (id: string, body: any) => this.request<any>('POST', `/orders/${id}/place`, body)
  acceptOrder = (id: string) => this.request<any>('POST', `/orders/${id}/accept`)
  rejectOrder = (id: string, reason: string) =>
    this.request<any>('POST', `/orders/${id}/reject`, { reason })
  transitionOrder = (id: string, status: string, note?: string) =>
    this.request<any>('POST', `/orders/${id}/transition`, { status, note })
  holdOrder = (id: string) => this.request<any>('POST', `/orders/${id}/hold`)
  fireOrder = (id: string) => this.request<any>('POST', `/orders/${id}/fire`)
  getOrderHistory = (id: string) => this.request<any>('GET', `/orders/${id}/history`)

  // ── KDS ──
  getKots = (params?: Record<string, string>) =>
    this.request<ListResponse<Kot>>('GET', '/kds/kots' + this.qs(params))
  getKot = (id: string) => this.request<Kot>('GET', `/kds/kots/${id}`)
  acceptKot = (id: string) => this.request<any>('POST', `/kds/kots/${id}/accept`)
  startPreparingKot = (id: string) => this.request<any>('POST', `/kds/kots/${id}/preparing`)
  readyKot = (id: string) => this.request<any>('POST', `/kds/kots/${id}/ready`)
  bumpKot = (id: string) => this.request<any>('POST', `/kds/kots/${id}/bump`)
  cancelKot = (id: string, reason: string) =>
    this.request<any>('POST', `/kds/kots/${id}/cancel`, { reason })
  markKotItemStatus = (kotId: string, itemId: string, status: string) =>
    this.request<any>('POST', `/kds/kots/${kotId}/item/${itemId}/status`, { status })
  // alias for old POS usage
  markKotReady = (id: string) => this.readyKot(id)

  // ── Billing ──
  createBill = (orderId: string, body?: any) =>
    this.request<any>('POST', '/billing/bills', { orderId, ...body })
  getBills = (params?: Record<string, string>) =>
    this.request<any>('GET', '/billing/bills' + this.qs(params))
  getBill = (id: string) => this.request<any>('GET', `/billing/bills/${id}`)
  settleBillRaw = (id: string, payments: any[], partial?: boolean) =>
    this.request<any>('POST', `/billing/bills/${id}/settle`, { payments, partial })
  voidBill = (id: string, reason: string, refundPayments?: any[]) =>
    this.request<any>('POST', `/billing/bills/${id}/void`, { reason, refundPayments })
  splitBill = (id: string, body: any) =>
    this.request<any>('POST', `/billing/bills/${id}/split`, body)
  getDiscounts = (params?: Record<string, string>) =>
    this.request<any>('GET', '/billing/discounts' + this.qs(params))
  createDiscount = (body: any) => this.request<any>('POST', '/billing/discounts', body)
  getShifts = (params?: Record<string, string>) =>
    this.request<any>('GET', '/billing/shifts' + this.qs(params))
  getOpenShift = (outletId: string) =>
    this.request<any>('GET', `/billing/shifts/open?outletId=${outletId}`)
  openShift = (outletId: string, openingBalance: number) =>
    this.request<any>('POST', '/billing/shifts', { outletId, openingBalance })
  closeShift = (id: string, body: any) =>
    this.request<any>('POST', `/billing/shifts/${id}/close`, body)
  approveShiftVariance = (id: string) =>
    this.request<any>('POST', `/billing/shifts/${id}/approve-variance`)
  // backward compat: settleBill(bill, payments)
  settleBill = (idOrBill: string | { id: string }, payments: any[] = []) => {
    const id = typeof idOrBill === 'string' ? idOrBill : idOrBill.id
    return this.settleBillRaw(id, payments)
  }

  // ── Inventory ──
  getIngredients = (params?: Record<string, string>) =>
    this.request<ListResponse<Ingredient>>('GET', '/inventory/ingredients' + this.qs(params))
  getIngredient = (id: string) => this.request<any>('GET', `/inventory/ingredients/${id}`)
  adjustStock = (id: string, body: any) =>
    this.request<any>('POST', `/inventory/ingredients/${id}/adjust`, body)
  adjustIngredient = (id: string, body: { delta: number; reason: string }) =>
    this.adjustStock(id, body)
  transferStock = (id: string, body: any) =>
    this.request<any>('POST', `/inventory/ingredients/${id}/transfer`, body)
  receiveStock = (body: any) => this.request<any>('POST', '/inventory/ingredients/receive', body)
  getRecipes = (params?: Record<string, string>) =>
    this.request<any>('GET', '/inventory/recipes' + this.qs(params))
  getRecipe = (id: string) => this.request<any>('GET', `/inventory/recipes/${id}`)
  createRecipe = (body: any) => this.request<any>('POST', '/inventory/recipes', body)
  deactivateRecipe = (id: string) =>
    this.request<any>('POST', `/inventory/recipes/${id}/deactivate`)
  consumeRecipe = (id: string, body: any) =>
    this.request<any>('POST', `/inventory/recipes/${id}/consume`, body)
  getStockMovements = (params?: Record<string, string>) =>
    this.request<any>('GET', '/inventory/movements' + this.qs(params))

  // ── Partners ──
  getPartners = (params?: Record<string, string>) =>
    this.request<any>('GET', '/partners' + this.qs(params))
  createPartner = (body: any) => this.request<any>('POST', '/partners', body)
  patchPartner = (id: string, body: any) => this.request<any>('PATCH', `/partners/${id}`, body)
  togglePartner = (id: string, active: boolean) =>
    this.request<any>('POST', `/partners/${id}/toggle`, { active })

  // ── Aggregators ──
  getAggregatorMappings = (params?: Record<string, string>) =>
    this.request<ListResponse<Aggregator>>('GET', '/aggregators' + this.qs(params))
  createAggregatorMapping = (body: any) => this.request<any>('POST', '/aggregators', body)
  updateAggregatorMapping = (id: string, body: any) =>
    this.request<any>('PATCH', `/aggregators/${id}`, body)
  testAggregator = (id: string) => this.request<any>('POST', `/aggregators/${id}/test`)
  toggleAggregator = (id: string, active: boolean) =>
    this.request<any>('POST', `/aggregators/${id}/toggle`, { active })

  // ── Staff ──
  getStaff = (params?: Record<string, string>) =>
    this.request<any>('GET', '/staff' + this.qs(params))
  getStaffMember = (id: string) => this.request<any>('GET', `/staff/${id}`)
  createStaff = (body: any) => this.request<any>('POST', '/staff', body)
  patchStaff = (id: string, body: any) => this.request<any>('PATCH', `/staff/${id}`, body)
  clockIn = (id: string, shiftId: string, role: string) =>
    this.request<any>('POST', `/staff/${id}/clock-in`, { shiftId, role })
  clockOut = (id: string) => this.request<any>('POST', `/staff/${id}/clock-out`)
  getStaffAttendance = (id: string, params?: Record<string, string>) =>
    this.request<any>('GET', `/staff/${id}/attendance` + this.qs(params))
  getShiftSummary = (params?: Record<string, string>) =>
    this.request<any>('GET', '/staff/shifts/summary' + this.qs(params))

  // ── Reservations ──
  getReservations = (params?: Record<string, string>) =>
    this.request<any>('GET', '/reservations' + this.qs(params))
  getReservation = (id: string) => this.request<any>('GET', `/reservations/${id}`)
  createReservation = (body: any) => this.request<any>('POST', '/reservations', body)
  confirmReservation = (id: string) => this.request<any>('POST', `/reservations/${id}/confirm`)
  seatReservation = (id: string, tableId?: string) =>
    this.request<any>('POST', `/reservations/${id}/seat`, { tableId })
  completeReservation = (id: string) => this.request<any>('POST', `/reservations/${id}/complete`)
  cancelReservation = (id: string, reason: string) =>
    this.request<any>('POST', `/reservations/${id}/cancel`, { reason })
  noShowReservation = (id: string) => this.request<any>('POST', `/reservations/${id}/no-show`)
  getWaitlist = (params?: Record<string, string>) =>
    this.request<any>('GET', '/reservations/waitlist' + this.qs(params))
  addToWaitlist = (body: any) => this.request<any>('POST', '/reservations/waitlist', body)
  notifyWaitlist = (id: string) => this.request<any>('POST', `/reservations/waitlist/${id}/notify`)
  seatWaitlist = (id: string) => this.request<any>('POST', `/reservations/waitlist/${id}/seat`)

  // ── Equipment ──
  getEquipment = (params?: Record<string, string>) =>
    this.request<any>('GET', '/equipment' + this.qs(params))
  getEquipmentItem = (id: string) => this.request<any>('GET', `/equipment/${id}`)
  createEquipment = (body: any) => this.request<any>('POST', '/equipment', body)
  patchEquipment = (id: string, body: any) => this.request<any>('PATCH', `/equipment/${id}`, body)
  markOutOfService = (id: string, body: any) =>
    this.request<any>('POST', `/equipment/${id}/out-of-service`, body)
  resolveEquipment = (id: string, body: any) =>
    this.request<any>('POST', `/equipment/${id}/resolve`, body)
  addEquipmentLog = (id: string, body: any) =>
    this.request<any>('POST', `/equipment/${id}/log`, body)

  // ── Analytics ──
  getAnalytics = (params?: Record<string, string>) =>
    this.request<any>('GET', '/analytics' + this.qs(params))
  getBillingAnalytics = (params?: Record<string, string>) =>
    this.request<any>('GET', '/analytics/billing' + this.qs(params))
  getStockAnalytics = (params?: Record<string, string>) =>
    this.request<any>('GET', '/analytics/stock' + this.qs(params))
  getShiftAnalytics = (params?: Record<string, string>) =>
    this.request<any>('GET', '/analytics/shifts' + this.qs(params))
}

export const rstApi = new RestaurantApiClient()
