# Ecommerce — Phase 10: Storefront Frontend Pages

## Goal

Specify every customer-facing storefront page. Focus on UX flow, data requirements,
and key interactions. Mobile-first design throughout.

---

## 10.1 Home — `/`

**Sections:**
1. **Hero banner:** Configurable image/video + headline + CTA button
2. **Featured collections:** Horizontal scroll of CollectionCard components
3. **Trending products:** Grid of ProductCard (2-col mobile, 4-col desktop)
4. **Promotions banner:** If active flash sale or promotion — countdown timer + CTA
5. **Categories grid:** Visual category tiles

**Data:**
- `GET /ecommerce/store/collections` — featured collections
- `GET /ecommerce/store/products?sort=trending&limit=8` — trending products
- `GET /ecommerce/store/categories` — category tree

---

## 10.2 Product Listing — `/products` + `/categories/:id`

**Layout:** Filter sidebar (desktop) / filter drawer (mobile) + product grid.

**Filter options:**
- Price range (slider)
- Categories (checkboxes, tree)
- In stock only (toggle)
- Rating (star filter)
- Sort: Relevance / Price: Low–High / Price: High–Low / Newest / Best Selling

**Product grid:** `<ProductCard>` × N. Infinite scroll or paginated (load more).

**Active filters display:** Pills showing applied filters with remove buttons.

**Empty state:** "No products match your filters. Try removing some filters."

**Data:** `GET /ecommerce/store/products?categoryId=&minPrice=&maxPrice=&inStock=&sort=`

---

## 10.3 Product Detail — `/products/:handle`

**Layout:** Left: image gallery. Right: product info + add-to-cart.

**Image gallery (`<ProductGallery />`):**
- Main image (large, zoom on hover)
- Thumbnail strip (horizontal scroll on mobile)
- Swipe gesture on mobile

**Product info:**
- Title (h1)
- Price: current price + compare-at price (strikethrough) + tax label ("incl. VAT" if tax-inclusive)
- Rating summary: star avg + review count (click → scroll to reviews)
- `<VariantSelector />`: option buttons (e.g. Size: S / M / L / XL). Selected option highlighted. Out-of-stock options grayed out with "Sold Out" label.
- `<QuantitySelector />`: +/- stepper
- Stock status: "In Stock (12 left)" / "Low Stock (2 left!)" / "Out of Stock"
- `<AddToCartButton />`: disabled if out of stock. Opens CartDrawer after add.
- Delivery estimate: "Estimated delivery: 3-5 business days"
- Description: collapsible rich text section
- Shipping + Returns info: accordion

**Reviews section:**
- Average rating + distribution bar chart
- Review list (sorted by: Newest / Most Helpful)
- "Write a Review" button (requires login + verified purchase)

**Related products:** Horizontal scroll of ProductCards from same category.

---

## 10.4 Search Results — `/search`

**Layout:** Search bar (pre-filled with query) + results grid.

**No sidebar** — lightweight filter row: Category dropdown, Price range, In Stock toggle.

**Data:** `GET /ecommerce/store/search?q=...&page=...`

**Empty state with suggestions:** "No results for 'X'. Try: [suggestions based on partial match]"

---

## 10.5 Cart — `/cart`

**Also: `<CartDrawer />` — slide-in mini cart (instant, no navigation)**

**Full cart page layout:**

Left (items list):
- `<CartItem />` per line: image thumbnail | variant title + selected options | unit price | qty stepper | remove button | line total
- Out-of-stock warning inline if variant became unavailable

Right (order summary):
- Subtotal
- Estimated shipping (shown after address set)
- Discount (coupon applied)
- Gift card balance used
- Tax (estimated or calculated)
- **Total**
- Coupon code input (`<CouponField />`)
- Gift card input
- "Proceed to Checkout" button

**Empty cart:** Illustration + "Your cart is empty" + "Browse products" CTA.

---

## 10.6 Checkout — `/checkout`

**Multi-step progress bar:** Address → Shipping → Payment → Confirmation

### Step 1: Address `/checkout/address`

**Form fields:**
- Email (if guest, required for order confirmation)
- First name / Last name
- Address line 1 / 2
- City / State / Postal code / Country (dropdown)
- Phone
- "Same as shipping" checkbox for billing address

Saved addresses shown for logged-in customers (selectable cards).

On submit: `POST /ecommerce/store/carts/:id/shipping-address`

### Step 2: Shipping `/checkout/shipping`

Loads: `GET /ecommerce/store/carts/:id/shipping-options`

**Display:** List of `<ShippingOptionCard>` per available option:
- Option name + provider logo
- Delivery estimate
- Price (or "Free")
- Radio selection

On select: `POST /ecommerce/store/carts/:id/shipping-option`
Tax auto-recalculates.

### Step 3: Payment `/checkout/payment`

**Order summary (sticky sidebar on desktop):** Final totals with tax line, shipping, discount.

**Payment UI depends on provider:**

**Stripe:** Stripe.js / Elements embedded card form (CardElement). "Pay {amount}" button.
Stripe Checkout hosted page alternative: redirect to `paymentSession.url`.

**Razorpay:** Razorpay checkout.js modal. "Pay with Razorpay" button triggers modal.

On pay button click:
1. `POST /ecommerce/store/carts/:id/payment-session` — create session
2. Redirect to `session.url` (Stripe Checkout) OR open Razorpay modal with `session.sessionId`
3. After payment: gateway redirects to `/checkout/confirmation?orderId=...`

### Confirmation `/checkout/confirmation`

**Loads:** `GET /ecommerce/store/orders/:id`

**Sections:**
1. Success banner: "Your order has been placed! 🎉"
2. Order number (large)
3. "You'll receive a confirmation email at {email}"
4. Order summary: items, shipping address, totals
5. Estimated delivery date
6. CTAs: "Track your order" | "Continue shopping" | "Create account" (if guest)

---

## 10.7 Account — `/account`

Requires login. Redirects to `/auth/login?redirect=/account` if not authenticated.

### Profile `/account`

- Name, email, phone (editable)
- Password change form
- Account deletion option (soft delete)

### Order History `/account/orders`

- DataTable of orders: order # | date | items count | total | status badge | Track link
- Click → order detail

### Order Detail `/account/orders/:id`

- Full order detail with items, shipping address, tracking link
- Fulfillment progress bar (ordered → processing → shipped → delivered)
- "Request Return" button (visible if within return window and order is delivered)

### Return Form `/account/orders/:id/return`

**Steps:**
1. Select items to return + quantity per item
2. Select reason for each item (defective / wrong / changed mind / etc.)
3. Add optional note
4. Submit → `POST /ecommerce/store/orders/:id/returns`
5. Confirmation: return ID, instructions for shipping, estimated refund

### Saved Addresses `/account/addresses`

- List of saved addresses
- Default badge on primary address
- Add / Edit / Delete / Set as default

---

## 10.8 Auth Pages

Minimal, centered layout.

### Login `/auth/login`
- Email + password
- "Forgot password?" link
- "Create account" link
- OAuth buttons (if configured: Google, GitHub)
- After login: redirect to `?redirect` param or `/account`

### Register `/auth/register`
- First name / Last name / Email / Password / Confirm password
- Terms checkbox
- After register: welcome email sent, redirect to account

### Forgot Password `/auth/forgot-password`
- Email field → `POST /ecommerce/store/auth/forgot-password`
- Success: "Check your email for a reset link"

### Reset Password `/auth/reset-password`
- New password + confirm → `POST /ecommerce/store/auth/reset-password`

---

## 10.9 Key UX Patterns

**Cart drawer:**
- Opens immediately on "Add to Cart"
- Shows item added + cart total
- "View Cart" and "Checkout" buttons
- Does not require page navigation

**Stock indicators:**
- Green dot: In stock
- Orange dot: Low stock (< 5 units)
- Gray dot: Out of stock — variant option grayed + tooltip "Sold Out"

**Price display:**
- If region.taxIncluded = true: show price + "(incl. VAT)" label
- If taxIncluded = false: show price + "+ tax at checkout"
- Compare-at price shown in gray strikethrough when different from current price

**Loading patterns:**
- Product grid: Skeleton cards (not spinner)
- PDP: Skeleton for gallery + content while loading
- Checkout steps: inline loading on button click, no full-page loading

**Error handling:**
- Stock reduced during checkout: inline warning on cart item
- Payment failure: error message on payment step with retry button
- Network error: toast notification with retry option
