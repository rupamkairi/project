const SERVER_ROOT = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:10050";
const API_BASE = SERVER_ROOT + "/restaurants";

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

class RestaurantApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof localStorage !== "undefined") {
      this.token = localStorage.getItem("platform_token");
    }
  }

  getToken() {
    return this.token;
  }

  setToken(t: string | null) {
    this.token = t;
    if (typeof localStorage !== "undefined") {
      if (t) localStorage.setItem("platform_token", t);
      else localStorage.removeItem("platform_token");
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError(401, "Unauthorized");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.message ?? "Request failed", err.code);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T>(path: string) { return this.request<T>("GET", path); }
  post<T>(path: string, body?: unknown) { return this.request<T>("POST", path, body); }
  patch<T>(path: string, body?: unknown) { return this.request<T>("PATCH", path, body); }
  del<T>(path: string) { return this.request<T>("DELETE", path); }

  // Outlets
  getOutlets(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<{ data: Outlet[] }>("/outlets" + q);
  }
  getOutlet(id: string) { return this.get<Outlet>(`/outlets/${id}`); }
  createOutlet(body: Partial<Outlet>) { return this.post<{ data: Outlet }>("/outlets", body); }
  openOutlet(id: string) { return this.post(`/outlets/${id}/open`); }
  closeOutlet(id: string) { return this.post(`/outlets/${id}/close`); }

  // Tables
  getTables(outletId: string) { return this.get<{ data: Table[] }>(`/outlets/${outletId}/tables`); }
  createTable(outletId: string, body: Partial<Table>) { return this.post<{ data: Table }>(`/outlets/${outletId}/tables`, body); }

  // Categories
  getCategories(outletId: string) { return this.get<{ data: Category[] }>(`/outlets/${outletId}/categories`); }
  createCategory(outletId: string, body: Partial<Category>) { return this.post<{ data: Category }>(`/outlets/${outletId}/categories`, body); }

  // Menu
  getMenu(outletId: string) { return this.get<{ data: MenuItem[] }>(`/outlets/${outletId}/menu`); }
  getMenuItem(id: string) { return this.get<MenuItem>(`/menu/${id}`); }
  createMenuItem(body: Partial<MenuItem>) { return this.post<{ data: MenuItem }>("/menu", body); }
  updateMenuItem(id: string, body: Partial<MenuItem>) { return this.patch<{ data: MenuItem }>(`/menu/${id}`, body); }
  toggleMenuItem(id: string, available: boolean, reason?: string) {
    return this.post(`/menu/${id}/toggle`, { available, reason });
  }
  updateAggregatorIds(id: string, aggregatorIds: Record<string, string>) {
    return this.patch(`/menu/${id}/aggregator-ids`, { aggregatorIds });
  }

  // Orders
  getOrders(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<{ data: Order[] }>("/orders" + q);
  }
  getOrder(id: string) { return this.get<Order>(`/orders/${id}`); }
  createOrder(body: CreateOrderBody) { return this.post<{ data: Order }>("/orders", body); }
  placeOrder(id: string, items: OrderItem[]) { return this.post<{ status: string }>(`/orders/${id}/place`, { items }); }
  acceptOrder(id: string) { return this.post(`/orders/${id}/accept`); }
  rejectOrder(id: string, reason: string) { return this.post(`/orders/${id}/reject`, { reason }); }
  addOrderItems(id: string, items: OrderItem[]) { return this.post(`/orders/${id}/items`, { items }); }

  // KOTs
  getKots(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<{ data: Kot[] }>("/kots" + q);
  }
  getKot(id: string) { return this.get<Kot>(`/kots/${id}`); }
  acceptKot(id: string) { return this.post(`/kots/${id}/accept`); }
  startKot(id: string) { return this.post(`/kots/${id}/start`); }
  readyKot(id: string) { return this.post(`/kots/${id}/ready`); }
  cancelKot(id: string) { return this.post(`/kots/${id}/cancel`); }

  // Bills
  createBill(orderId: string) { return this.post<{ data: Bill }>("/bills", { orderId }); }
  getBill(id: string) { return this.get<Bill>(`/bills/${id}`); }
  settleBill(id: string, payments: Payment[], roundOff?: number) {
    return this.post(`/bills/${id}/settle`, { payments, roundOff: roundOff ?? 0 });
  }
  voidBill(id: string, reason: string) { return this.post(`/bills/${id}/void`, { reason }); }
  splitBill(orderId: string, splits: BillSplit[]) { return this.post<{ data: Bill[] }>("/bills/split", { orderId, splits }); }

  // Shifts
  getShifts(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<{ data: Shift[] }>("/shifts" + q);
  }
  openShift(outletId: string, openingBalance: number) {
    return this.post<{ data: Shift }>("/shifts", { outletId, openingBalance });
  }
  closeShift(id: string, closingBalance: number) {
    return this.post(`/shifts/${id}/close`, { closingBalance });
  }
  approveShift(id: string) { return this.post(`/shifts/${id}/approve`); }

  // Deliveries
  getDeliveries(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<DeliveriesResponse>("/deliveries" + q);
  }
  assignDelivery(id: string, riderId?: string) {
    return this.post(`/deliveries/${id}/assign`, riderId ? { riderId } : undefined);
  }
  updateDeliveryStatus(id: string, status: string, reason?: string) {
    return this.post(`/deliveries/${id}/status`, { status, reason });
  }

  // Riders
  getRiders(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<{ data: Rider[] }>("/riders" + q);
  }
  updateRiderLocation(id: string, lat: number, lng: number) {
    return this.patch(`/riders/${id}/location`, { lat, lng });
  }
  updateRiderStatus(id: string, status: string) {
    return this.patch(`/riders/${id}/status`, { status });
  }

  // Ingredients
  getIngredients(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<{ data: Ingredient[] }>("/inventory/ingredients" + q);
  }
  getLowStockAlerts(outletId: string) {
    return this.get<{ alerts: LowStockAlert[] }>(`/admin/ingredients/alerts?outletId=${outletId}`);
  }
  adjustStock(id: string, qty: number, reason: string) {
    return this.post(`/admin/ingredients/${id}/adjust`, { qty, reason });
  }

  // Aggregator orders
  getAggregatorOrders(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<{ data: AggregatorOrder[] }>("/aggregator-orders" + q);
  }

  // Analytics
  getAnalyticsOverview(params: Record<string, string>) {
    return this.get<AnalyticsOverview>("/analytics/overview?" + new URLSearchParams(params));
  }
  getKitchenAnalytics(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<KitchenAnalytics>("/analytics/kitchen" + q);
  }
  getDeliveryAnalytics(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<DeliveryAnalytics>("/analytics/delivery" + q);
  }

  // Aliases used by admin/analytics pages
  getAnalytics(params: Record<string, string>) {
    return this.get<{ data: Record<string, any> }>("/analytics?" + new URLSearchParams(params));
  }
  getOpenShift(outletId: string) {
    return this.get<{ data: Shift | null }>(`/shifts/open?outletId=${outletId}`);
  }
  markKotReady(id: string) { return this.readyKot(id); }

  // Aggregator mappings
  getAggregatorMappings(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params) : "";
    return this.get<{ data: any[] }>("/aggregators" + q);
  }
  createAggregatorMapping(body: Record<string, any>) {
    return this.post<{ data: any }>("/aggregators", body);
  }
  updateAggregatorMapping(id: string, body: Record<string, any>) {
    return this.patch<{ data: any }>(`/aggregators/${id}`, body);
  }
  testAggregator(id: string) { return this.post(`/aggregators/${id}/test`); }

  // Ingredient adjust alias
  adjustIngredient(id: string, body: { delta: number; reason: string }) {
    return this.post<{ data: any }>(`/inventory/ingredients/${id}/adjust`, body);
  }

  // Delivery assign alias
  assignRider(deliveryId: string, riderId?: string) {
    return this.post(`/delivery/deliveries/${deliveryId}/assign`, riderId ? { riderId } : undefined);
  }

  // Menu 86 toggle alias
  toggle86MenuItem(id: string, available: boolean) {
    return this.toggleMenuItem(id, available);
  }
}

export const rstApi = new RestaurantApiClient();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Outlet {
  id: string;
  name: string;
  code: string;
  status: string;
  organizationId: string;
  meta: {
    address?: string;
    phone?: string;
    timezone?: string;
    operatingHours?: Record<string, { open: string; close: string }>;
    lastOrderSeq?: number;
    lastKotSeq?: number;
    lastBillSeq?: number;
    aggregatorIds?: Record<string, string>;
    acceptsDelivery?: boolean;
    acceptsDineIn?: boolean;
  };
}

export interface Table {
  id: string;
  name: string;
  code: string;
  capacity: number;
  status: string;
  parentId: string;
  meta: { section?: string };
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  mealPeriod?: string;
  parentId?: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  meta: {
    outletId?: string;
    categoryId?: string;
    station?: string;
    basePrice?: string;
    deliveryPrice?: string;
    isAvailable?: boolean;
    isPopular?: boolean;
    preparationTimeMinutes?: number;
    taxPct?: number;
    foodType?: string;
    tags?: string[];
    aggregatorIds?: Record<string, string>;
    sortOrder?: number;
    thumbnailUrl?: string | null;
  };
}

export interface Order {
  id: string;
  type: string;
  status?: string;
  personId?: string | null;
  stageId?: string | null;
  organizationId: string;
  meta: {
    outletId?: string;
    orderNumber?: string;
    orderType?: string;
    source?: string;
    tableId?: string | null;
    status?: string;
    deliveryAddress?: Record<string, unknown> | null;
    total?: string;
    subtotal?: string;
  };
  lines?: OrderLine[];
  kots?: Kot[];
}

export interface OrderLine {
  id: string;
  itemId: string;
  qty: number;
  unitPriceAmount?: string;
  unitPrice?: string;
  meta?: { name?: string; modifiers?: unknown[]; station?: string };
}

export interface OrderItem {
  menuItemId: string;
  qty: number;
  modifiers?: { name: string; option: string; price?: number }[];
  note?: string;
}

export interface CreateOrderBody {
  outletId: string;
  type: "dine-in" | "takeaway" | "delivery";
  tableId?: string;
  customerId?: string;
  customer?: { name?: string; phone?: string };
  deliveryAddress?: Record<string, unknown>;
  coverCount?: number;
  specialInstructions?: string;
}

export interface Kot {
  id: string;
  organizationId: string;
  transactionId: string;
  locationId?: string | null;
  kotNumber: string;
  station: string;
  status: string;
  note?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  prepStartAt?: string | null;
  readyAt?: string | null;
  items?: KotItem[];
  lines: KotItem[];
}

export interface KotItem {
  id: string;
  kotId: string;
  itemId: string;
  name: string;
  qty: number;
  modifiers: unknown[];
  notes?: string | null;
  status: string;
}

export interface Bill {
  id: string;
  type: string;
  organizationId: string;
  meta: {
    orderId?: string;
    billNumber?: string;
    subtotal?: string;
    serviceCharge?: string;
    total?: string;
    status?: string;
    payments?: Payment[];
  };
}

export interface Payment {
  method: "cash" | "card" | "upi" | "wallet";
  amount: number;
}

export interface BillSplit {
  guestLabel: string;
  itemIds: string[];
}

export interface Shift {
  id: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  status: string;
  openedAt?: string | null;
  openingBalance?: string;
  closingBalance?: string | null;
  variance?: string | null;
}

export interface Delivery {
  id: string;
  organizationId: string;
  transactionId: string;
  personId?: string | null;
  status: string;
  trackingCode?: string;
  deliveryAddress?: string;
  riderLocation?: { lat: number; lng: number; updatedAt: string } | null;
  failureReason?: string | null;
  createdAt: string;
  meta?: {
    riderName?: string | null;
    riderId?: string | null;
    address?: string;
    orderNumber?: string;
    customerName?: string;
    distance?: string | number | null;
    [key: string]: any;
  };
}

export interface DeliveriesResponse {
  data: Delivery[];
  pendingAssignment: Delivery[];
  inProgress: Delivery[];
  completed: Delivery[];
  failed: Delivery[];
}

export interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  phone?: string;
  meta: {
    status?: string;
    isAvailable?: boolean;
    vehicleType?: string;
    phone?: string;
    currentLocation?: { lat: number; lng: number } | null;
    activeDeliveryId?: string | null;
  };
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  reorderLevel: number;
  meta: {
    unit?: string;
    currentStock?: string;
    reorderLevel?: string;
    costPerUnit?: string;
    outletId?: string;
  };
}

export interface LowStockAlert {
  ingredientId: string;
  name: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
}

export interface AggregatorOrder {
  id: string;
  source: string;
  aggregatorOrderId: string;
  outletId: string;
  status: string;
  rejectionReason?: string | null;
  internalOrderId?: string | null;
  receivedAt: string;
}

export interface AnalyticsOverview {
  revenue: { mtdTotal: number; today: number };
  orders: { total: number; avgOrderValue: number; rejected: number };
  channelMix: { channel: string; pct: number; revenue: number }[];
}

export interface KitchenAnalytics {
  avgKitchenTatMinutes: number;
  slaBreachPct: number;
  acceptanceTime: { p50: number; p90: number };
  avgKitchenTatByStation: { station: string; avgTat: number; p90Tat: number; kotsProcessed: number }[];
}

export interface DeliveryAnalytics {
  totalDeliveries: number;
  failureRate: number;
  avgDeliveryMinutes: number;
}
