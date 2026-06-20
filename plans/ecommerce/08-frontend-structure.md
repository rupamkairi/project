# Ecommerce — Phase 8: Frontend Structure

## Goal

Define the structure of both ecommerce web packages:
1. `composes/ecommerce/web/admin/` — internal admin dashboard (same auth as server admin roles)
2. `composes/ecommerce/web/storefront/` — customer-facing headless storefront

These are two separate packages with two separate route trees.

---

## 8.1 Admin Package Layout

```
composes/ecommerce/web/admin/
  package.json              @projectx/compose-ecommerce-admin
  tsconfig.json
  src/
    index.ts
    routes/
      index.ts
      layout.tsx            Admin shell (sidebar + topbar)
      dashboard.tsx         /admin/ecommerce
      products/
        index.tsx           Products list
        $id.tsx             Product detail + variant manager
        new.tsx
      orders/
        index.tsx           Orders list with filters
        $id.tsx             Order detail (items, fulfillment, timeline)
        draft/
          index.tsx
          new.tsx
          $id.tsx
      customers/
        index.tsx
        $id.tsx
        groups/
          index.tsx
          $id.tsx
      returns/
        index.tsx
        $id.tsx
      claims/
        index.tsx
        $id.tsx
      fulfillments/
        index.tsx
        $id.tsx
      regions/
        index.tsx
        $id.tsx
      shipping/
        index.tsx
        $id.tsx
      tax/
        index.tsx
      analytics/
        index.tsx           GMV overview
        revenue.tsx
        products.tsx
        customers.tsx
        returns.tsx
    components/
      order-timeline.tsx
      fulfillment-card.tsx
      return-form.tsx
      product-variant-table.tsx
      inventory-badge.tsx
      order-status-badge.tsx
      region-selector.tsx
      shipping-option-form.tsx
      analytics-chart.tsx   recharts wrapper
      import-upload.tsx
    hooks/
      use-orders.ts
      use-products.ts
      use-analytics.ts
      use-returns.ts
    stores/
      admin.store.ts
    lib/
      api.ts                Eden Treaty → EcommerceApp
```

---

## 8.2 Storefront Package Layout

```
composes/ecommerce/web/storefront/
  package.json              @projectx/compose-ecommerce-storefront
  tsconfig.json
  src/
    index.ts
    routes/
      index.ts
      layout.tsx            Storefront shell (header + footer)
      index.tsx             / — Home page
      products/
        index.tsx           /products — PLP (product listing page)
        $handle.tsx         /products/:handle — PDP (product detail)
      categories/
        $id.tsx             /categories/:id — Category PLP
      search/
        index.tsx           /search — Search results
      cart/
        index.tsx           /cart
      checkout/
        index.tsx           /checkout — Multi-step checkout
        address.tsx         Step 1: shipping address
        shipping.tsx        Step 2: shipping option
        payment.tsx         Step 3: payment
        confirmation.tsx    /checkout/confirmation
      account/
        layout.tsx          Account section layout
        index.tsx           /account — Profile
        orders/
          index.tsx         /account/orders — Order history
          $id.tsx           /account/orders/:id — Order detail + tracking
          $id.return.tsx    /account/orders/:id/return — Return form
        addresses/
          index.tsx
        settings.tsx
      auth/
        login.tsx
        register.tsx
        forgot-password.tsx
        reset-password.tsx
    components/
      product-card.tsx          Grid card with image, title, price
      product-gallery.tsx       Image carousel / zoom
      variant-selector.tsx      Size/color option buttons
      price-display.tsx         Price with tax label, compare price
      add-to-cart-button.tsx
      cart-drawer.tsx           Slide-out mini cart
      cart-item.tsx
      checkout-steps.tsx        Progress indicator
      address-form.tsx
      shipping-option-card.tsx
      order-card.tsx
      order-timeline.tsx
      return-form.tsx
      review-form.tsx
      star-rating.tsx
      product-filter-bar.tsx    Sort + filter controls
      search-bar.tsx
      quantity-selector.tsx
    hooks/
      use-cart.ts
      use-checkout.ts
      use-product.ts
      use-customer.ts
      use-search.ts
    stores/
      cart.store.ts
      checkout.store.ts
      auth.store.ts
    lib/
      api.ts                    Eden Treaty → EcommerceApp (store routes)
```

---

## 8.3 Admin Route Tree

```typescript
// composes/ecommerce/web/admin/src/routes/index.ts
export const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/ecommerce",
  component: AdminLayout,
  beforeLoad: ({ context }) => {
    if (!context.actor?.roles.some(r => ECO_ADMIN_ROLES.includes(r))) {
      throw redirect({ to: "/login" });
    }
  },
});

export const adminRoutes = [adminLayoutRoute.addChildren([
  dashboardRoute,
  productsRoute, productDetailRoute, productNewRoute,
  ordersRoute, orderDetailRoute, draftOrdersRoute,
  customersRoute, customerDetailRoute, customerGroupsRoute,
  returnsRoute, returnDetailRoute,
  claimsRoute, claimDetailRoute,
  fulfillmentsRoute,
  regionsRoute, regionDetailRoute,
  shippingRoute,
  taxRoute,
  analyticsRoute,
])];
```

---

## 8.4 Storefront Route Tree

```typescript
// composes/ecommerce/web/storefront/src/routes/index.ts
export const storefrontLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: StorefrontLayout,
});

export const storefrontRoutes = [storefrontLayoutRoute.addChildren([
  homeRoute,          // /
  productsRoute,      // /products
  productRoute,       // /products/:handle
  categoryRoute,      // /categories/:id
  searchRoute,        // /search
  cartRoute,          // /cart
  checkoutRoute,      // /checkout (with nested step routes)
  confirmationRoute,  // /checkout/confirmation
  accountRoutes,      // /account/* (requires auth)
  authRoutes,         // /auth/login, /auth/register, etc.
])];
```

---

## 8.5 API Clients

### Admin API client

```typescript
// admin/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { EcommerceApp } from "@projectx/compose-ecommerce-server";

export const adminApi = treaty<EcommerceApp>(window.location.origin);
// Usage: adminApi.ecommerce.admin.orders.get({ query: { status: "processing" } })
```

### Storefront API client

```typescript
// storefront/src/lib/api.ts
export const storeApi = treaty<EcommerceApp>(window.location.origin);
// Usage: storeApi.ecommerce.store.products.get({ query: { page: 1 } })
```

---

## 8.6 Shared Stores

### Cart Store (storefront)

```typescript
interface CartStore {
  cartId: string | null;                 // persisted in localStorage
  items: CartItemDetail[];
  totals: CartTotals;
  isOpen: boolean;                       // cart drawer visible
  isLoading: boolean;

  initCart: () => Promise<void>;         // load or create cart
  addItem: (variantId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
}
```

### Checkout Store (storefront)

```typescript
interface CheckoutStore {
  step: "address" | "shipping" | "payment" | "confirmation";
  shippingAddress: Address | null;
  billingAddress: Address | null;
  selectedShippingOption: ShippingOption | null;
  availableShippingOptions: ShippingOption[];
  taxLines: TaxLine[];
  paymentSession: { sessionId: string; url: string } | null;
  orderId: string | null;

  setAddress: (address: Address, type: "shipping" | "billing") => void;
  loadShippingOptions: () => Promise<void>;
  selectShippingOption: (optionId: string) => Promise<void>;
  calculateTax: () => Promise<void>;
  createPaymentSession: () => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
}
```

---

## 8.7 Design System — Ecommerce Specifics

Admin uses same zinc shadcn/ui design as rest of platform.

Storefront can have a distinct visual identity since it faces customers.
Recommended: white/neutral base, product-first layout, generous whitespace.

Key design decisions for storefront:
- Product grid: 2-col mobile, 3-col tablet, 4-col desktop
- Cart: persistent slide-out drawer (not a full page until /cart)
- Checkout: single-page multi-step with progress bar
- Product images: aspect-ratio 4:3 with lazy loading
- Mobile: bottom sticky CTA (Add to Cart / Checkout) on PDP and cart

Components from `@projectx/ui` for admin:
- `DataTable`, `Sheet`, `Badge`, `Select`, `DateRangePicker`, `AreaChart`

Custom storefront components (not from `@projectx/ui`):
- `ProductCard`, `ProductGallery`, `VariantSelector`, `CartDrawer`, `CheckoutSteps`
