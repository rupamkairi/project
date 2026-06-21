# Phase 13 — Web Foundation

## Goal

Wire up both ecommerce web packages: layouts, auth guards, API clients, Tailwind source scanning, and Zustand stores. Everything downstream depends on this being correct.

---

## Step 1 — Fix `globals.css` Tailwind source

**File:** `apps/web/src/globals.css`

Add both ecommerce web packages to `@source`:

```css
@source "../../../composes/ecommerce/web/admin/src";
@source "../../../composes/ecommerce/web/storefront/src";
```

Without this, Tailwind won't scan ecommerce component classes and styles will be missing in production.

---

## Step 2 — Admin API client

**File:** `composes/ecommerce/web/admin/src/lib/api.ts`

Class-based client. Reads `platform_token` from auth store (admin users authenticate via platform login).

```typescript
import { useAuthStore } from "@projectx/platform-web";

const ADMIN_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/ecommerce/admin";

class EcommerceAdminApiClient {
  private get token() {
    return useAuthStore.getState().token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<{ data?: T; error?: string }> {
    const res = await fetch(`${ADMIN_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...init.headers,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` };
    return { data: body as T };
  }

  // Products
  getProducts(params?: Record<string, any>) { return this.request("/products", { method: "GET" }); }
  getProduct(id: string) { return this.request(`/products/${id}`); }
  createProduct(body: any) { return this.request("/products", { method: "POST", body: JSON.stringify(body) }); }
  updateProduct(id: string, body: any) { return this.request(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  deleteProduct(id: string) { return this.request(`/products/${id}`, { method: "DELETE" }); }
  publishProduct(id: string) { return this.request(`/products/${id}/publish`, { method: "POST" }); }
  archiveProduct(id: string) { return this.request(`/products/${id}/archive`, { method: "POST" }); }

  // Variants
  getVariants(productId: string) { return this.request(`/products/${productId}/variants`); }
  createVariant(productId: string, body: any) { return this.request(`/products/${productId}/variants`, { method: "POST", body: JSON.stringify(body) }); }
  updateVariant(productId: string, variantId: string, body: any) { return this.request(`/products/${productId}/variants/${variantId}`, { method: "PATCH", body: JSON.stringify(body) }); }
  deleteVariant(productId: string, variantId: string) { return this.request(`/products/${productId}/variants/${variantId}`, { method: "DELETE" }); }

  // Categories
  getCategories() { return this.request("/categories"); }
  createCategory(body: any) { return this.request("/categories", { method: "POST", body: JSON.stringify(body) }); }
  updateCategory(id: string, body: any) { return this.request(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  deleteCategory(id: string) { return this.request(`/categories/${id}`, { method: "DELETE" }); }

  // Orders
  getOrders(params?: Record<string, any>) { return this.request("/orders?" + new URLSearchParams(params).toString()); }
  getOrder(id: string) { return this.request(`/orders/${id}`); }
  updateOrderStatus(id: string, status: string) { return this.request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); }

  // Fulfillment
  getFulfillments(params?: Record<string, any>) { return this.request("/fulfillments?" + new URLSearchParams(params).toString()); }
  createFulfillment(orderId: string, body: any) { return this.request(`/orders/${orderId}/fulfillment`, { method: "POST", body: JSON.stringify(body) }); }
  updateFulfillment(id: string, body: any) { return this.request(`/fulfillments/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }

  // Returns
  getReturns(params?: Record<string, any>) { return this.request("/returns?" + new URLSearchParams(params).toString()); }
  getReturn(id: string) { return this.request(`/returns/${id}`); }
  approveReturn(id: string) { return this.request(`/returns/${id}/approve`, { method: "POST" }); }
  rejectReturn(id: string, reason: string) { return this.request(`/returns/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }); }
  processRefund(id: string, amount: number) { return this.request(`/returns/${id}/refund`, { method: "POST", body: JSON.stringify({ amount }) }); }

  // Customers
  getCustomers(params?: Record<string, any>) { return this.request("/customers?" + new URLSearchParams(params).toString()); }
  getCustomer(id: string) { return this.request(`/customers/${id}`); }

  // Analytics
  getAnalytics(params?: Record<string, any>) { return this.request("/analytics?" + new URLSearchParams(params).toString()); }

  // Settings: Regions, Shipping, Tax
  getRegions() { return this.request("/regions"); }
  createRegion(body: any) { return this.request("/regions", { method: "POST", body: JSON.stringify(body) }); }
  getShippingOptions(regionId?: string) { return this.request(`/shipping-options${regionId ? `?regionId=${regionId}` : ""}`); }
  createShippingOption(body: any) { return this.request("/shipping-options", { method: "POST", body: JSON.stringify(body) }); }
  getTaxProfiles() { return this.request("/tax-profiles"); }
  getCoupons() { return this.request("/coupons"); }
}

export const ecommerceAdminApi = new EcommerceAdminApiClient();
```

---

## Step 3 — Storefront API client

**File:** `composes/ecommerce/web/storefront/src/lib/api.ts`

Customer-facing client. Uses `eco_customer_token` — separate from platform token.

```typescript
const STORE_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/ecommerce/store";

class EcommerceStoreApiClient {
  private get token() {
    return localStorage.getItem("eco_customer_token");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<{ data?: T; error?: string }> {
    const res = await fetch(`${STORE_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...init.headers,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` };
    return { data: body as T };
  }

  // Auth (customer)
  login(email: string, password: string) { return this.request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); }
  register(body: { email: string; password: string; firstName: string; lastName: string }) { return this.request("/auth/register", { method: "POST", body: JSON.stringify(body) }); }
  forgotPassword(email: string) { return this.request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }); }
  resetPassword(token: string, password: string) { return this.request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }); }

  // Catalog
  getProducts(params?: Record<string, any>) { return this.request("/products?" + new URLSearchParams(params).toString()); }
  getProductByHandle(handle: string) { return this.request(`/products/${handle}`); }
  getCategories() { return this.request("/categories"); }
  getCategory(id: string) { return this.request(`/categories/${id}`); }
  searchProducts(q: string, params?: Record<string, any>) { return this.request(`/search?q=${encodeURIComponent(q)}&` + new URLSearchParams(params).toString()); }

  // Cart
  createCart(regionId: string) { return this.request("/cart", { method: "POST", body: JSON.stringify({ regionId }) }); }
  getCart(cartId: string) { return this.request(`/cart/${cartId}`); }
  addToCart(cartId: string, variantId: string, qty: number) { return this.request(`/cart/${cartId}/items`, { method: "POST", body: JSON.stringify({ variantId, qty }) }); }
  updateCartItem(cartId: string, itemId: string, qty: number) { return this.request(`/cart/${cartId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ qty }) }); }
  removeCartItem(cartId: string, itemId: string) { return this.request(`/cart/${cartId}/items/${itemId}`, { method: "DELETE" }); }
  applyCoupon(cartId: string, code: string) { return this.request(`/cart/${cartId}/coupon`, { method: "POST", body: JSON.stringify({ code }) }); }

  // Checkout
  setShippingAddress(cartId: string, address: any) { return this.request(`/cart/${cartId}/shipping-address`, { method: "POST", body: JSON.stringify(address) }); }
  getShippingOptions(cartId: string) { return this.request(`/cart/${cartId}/shipping-options`); }
  selectShippingOption(cartId: string, shippingOptionId: string) { return this.request(`/cart/${cartId}/shipping-option`, { method: "POST", body: JSON.stringify({ shippingOptionId }) }); }
  createPaymentSession(cartId: string) { return this.request(`/cart/${cartId}/payment-session`, { method: "POST" }); }
  completeCart(cartId: string, paymentData: any) { return this.request(`/cart/${cartId}/complete`, { method: "POST", body: JSON.stringify(paymentData) }); }

  // Customer account
  getAccount() { return this.request("/account"); }
  updateAccount(body: any) { return this.request("/account", { method: "PATCH", body: JSON.stringify(body) }); }
  getOrders() { return this.request("/account/orders"); }
  getOrder(id: string) { return this.request(`/account/orders/${id}`); }
  createReturn(orderId: string, body: any) { return this.request(`/account/orders/${orderId}/return`, { method: "POST", body: JSON.stringify(body) }); }
  getAddresses() { return this.request("/account/addresses"); }
  saveAddress(body: any) { return this.request("/account/addresses", { method: "POST", body: JSON.stringify(body) }); }
  deleteAddress(id: string) { return this.request(`/account/addresses/${id}`, { method: "DELETE" }); }
}

export const ecommerceStoreApi = new EcommerceStoreApiClient();
```

---

## Step 4 — Admin layout: NavBar + AuthGuard

**File:** `composes/ecommerce/web/admin/src/routes/layout.tsx`

```typescript
import { NavBar, Avatar, AvatarFallback, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@projectx/ui";
import { AuthGuard, useAuthStore } from "@projectx/platform-web";
import { Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Package, FolderOpen, ShoppingCart, Truck, RotateCcw, Users, BarChart3, Settings } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",   href: "/admin/ecommerce",            icon: LayoutDashboard, exact: true },
  { label: "Products",    href: "/admin/ecommerce/products",   icon: Package },
  { label: "Categories",  href: "/admin/ecommerce/categories", icon: FolderOpen },
  { label: "Orders",      href: "/admin/ecommerce/orders",     icon: ShoppingCart },
  { label: "Fulfillment", href: "/admin/ecommerce/fulfillment",icon: Truck },
  { label: "Returns",     href: "/admin/ecommerce/returns",    icon: RotateCcw },
  { label: "Customers",   href: "/admin/ecommerce/customers",  icon: Users },
  { label: "Analytics",   href: "/admin/ecommerce/analytics",  icon: BarChart3 },
  { label: "Settings",    href: "/admin/ecommerce/settings",   icon: Settings },
];

export default function EcommerceAdminLayout() {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <NavBar items={NAV_ITEMS} actions={<AdminUserMenu />} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  );
}
```

`AdminUserMenu` — same pattern as platform: avatar initials, Sign out dropdown.

Route prefix for admin layout: `/admin/ecommerce` (not `/ecommerce/admin`).

---

## Step 5 — Storefront layout: StorefrontHeader + CartDrawer

**File:** `composes/ecommerce/web/storefront/src/routes/layout.tsx`

Storefront is public — NO `AuthGuard` on root layout. Auth guard only on `/store/account/*` routes.

```typescript
import { Outlet } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Search, User } from "lucide-react";
import { useCartStore } from "../stores/cart";
import { CartDrawer } from "../components/CartDrawer";
import { useState } from "react";

export default function StorefrontLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const itemCount = useCartStore(s => s.items.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/store" className="text-lg font-semibold">Shop</Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/store/products">Products</Link>
            <Link to="/store/categories">Categories</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/store/search"><Search className="h-5 w-5" /></Link>
            <Link to="/store/account"><User className="h-5 w-5" /></Link>
            <button onClick={() => setCartOpen(true)} className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <Outlet />
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
```

---

## Step 6 — Cart store (persisted)

**File:** `composes/ecommerce/web/storefront/src/stores/cart.ts`

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  unitPrice: number;
  qty: number;
  imageUrl?: string;
}

interface CartStore {
  cartId: string | null;
  regionId: string | null;
  items: CartItem[];
  couponCode: string | null;
  loading: boolean;
  setCartId: (id: string) => void;
  setRegionId: (id: string) => void;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cartId: null,
      regionId: null,
      items: [],
      couponCode: null,
      loading: false,
      setCartId: (id) => set({ cartId: id }),
      setRegionId: (id) => set({ regionId: id }),
      setItems: (items) => set({ items }),
      addItem: (item) => {
        const existing = get().items.find(i => i.variantId === item.variantId);
        if (existing) {
          set({ items: get().items.map(i => i.variantId === item.variantId ? { ...i, qty: i.qty + item.qty } : i) });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (variantId) => set({ items: get().items.filter(i => i.variantId !== variantId) }),
      updateQty: (variantId, qty) => {
        if (qty <= 0) { get().removeItem(variantId); return; }
        set({ items: get().items.map(i => i.variantId === variantId ? { ...i, qty } : i) });
      },
      clearCart: () => set({ cartId: null, items: [], couponCode: null }),
    }),
    { name: "eco-cart-storage" }
  )
);
```

---

## Step 7 — Customer store

**File:** `composes/ecommerce/web/storefront/src/stores/customer.ts`

```typescript
import { create } from "zustand";

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface CustomerStore {
  customer: Customer | null;
  token: string | null;
  login: (customer: Customer, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customer: null,
  token: localStorage.getItem("eco_customer_token"),
  login: (customer, token) => {
    localStorage.setItem("eco_customer_token", token);
    set({ customer, token });
  },
  logout: () => {
    localStorage.removeItem("eco_customer_token");
    set({ customer: null, token: null });
  },
  isAuthenticated: () => !!get().token,
}));
```

---

## Step 8 — TypeScript env declarations

**File:** `composes/ecommerce/web/admin/src/vite-env.d.ts`
**File:** `composes/ecommerce/web/storefront/src/vite-env.d.ts`

Same content in both:

```typescript
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly [key: string]: string | boolean | undefined;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`VITE_STRIPE_PUBLISHABLE_KEY` needed by storefront payment step.

---

## Checks

- Admin nav renders with all 9 items; redirects to `/login` if no token
- Storefront header renders; cart icon shows item count badge
- `ecommerceAdminApi.getProducts()` resolves to `{ data }` or `{ error }`
- `ecommerceStoreApi.getProducts()` resolves without auth header
- Cart items survive page refresh (Zustand persist working)
- Customer login stores token to `eco_customer_token` key
