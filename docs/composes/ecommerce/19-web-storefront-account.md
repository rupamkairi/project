# Phase 19 — Storefront: Customer Auth & Account

---

## Customer Auth — separate from platform auth

Customer auth uses `POST /ecommerce/store/auth/login` → returns `eco_customer_token`.
This is NOT the same as platform actor JWT. Never mix the two.

Auth guard for account routes:
```typescript
// composes/ecommerce/web/storefront/src/components/CustomerAuthGuard.tsx
import { useCustomerStore } from "../stores/customer";
import { Navigate } from "@tanstack/react-router";

export function CustomerAuthGuard({ children }: { children: React.ReactNode }) {
  const token = useCustomerStore(s => s.token);
  if (!token) return <Navigate to="/store/auth/login" />;
  return <>{children}</>;
}
```

Wrap `/store/account/*` layout in `<CustomerAuthGuard>`.

---

## Login Page — `routes/auth/login.tsx`

Route: `/store/auth/login`

```
┌─ Centered card (max-w-sm) ──────────────────────────────────────┐
│  H2: "Sign in to your account"                                    │
│                                                                   │
│  Email*    [──────────────────────]                              │
│  Password* [──────────────────────]                              │
│                                                                   │
│  [Sign In ──────────────────────────────────────────────────]   │
│                                                                   │
│  [Forgot password?]              [Create an account →]           │
└───────────────────────────────────────────────────────────────────┘
```

On submit:
```typescript
const { data, error } = await ecommerceStoreApi.login(email, password);
if (error) { setFormError(error); return; }
useCustomerStore.getState().login(data.customer, data.token);
navigate({ to: redirectTo || "/store/account" });
```

`redirectTo`: read from search params (e.g. `/store/auth/login?redirect=/store/checkout`).

---

## Register Page — `routes/auth/register.tsx`

Route: `/store/auth/register`

```
┌─ Centered card (max-w-sm) ──────────────────────────────────────┐
│  H2: "Create an account"                                          │
│                                                                   │
│  First Name*  [──────────────]  Last Name*  [──────────────]    │
│  Email*       [──────────────────────────────────────]          │
│  Password*    [──────────────────────────────────────]          │
│  (min 8 chars, show strength indicator)                          │
│                                                                   │
│  [Create Account ─────────────────────────────────────────]     │
│                                                                   │
│  Already have an account? [Sign in →]                            │
└───────────────────────────────────────────────────────────────────┘
```

On submit:
```typescript
const { data, error } = await ecommerceStoreApi.register({ email, password, firstName, lastName });
if (error) { setFormError(error); return; }
useCustomerStore.getState().login(data.customer, data.token);
navigate({ to: "/store/account" });
```

---

## Forgot Password — `routes/auth/forgot.tsx`

Route: `/store/auth/forgot-password`

```
┌─ Centered card (max-w-sm) ──────────────────────────────────────┐
│  H2: "Reset your password"                                        │
│  p: "Enter your email and we'll send a reset link."             │
│                                                                   │
│  Email*  [──────────────────────────────────────────────]       │
│                                                                   │
│  [Send Reset Link ─────────────────────────────────────────]    │
│                                                                   │
│  (After submit: success message, no redirect)                    │
└───────────────────────────────────────────────────────────────────┘
```

Reset password page at `/store/auth/reset-password?token=XXX` — shows password + confirm password fields.

---

## Account Overview — `routes/account/index.tsx`

Route: `/store/account`
Wrapped in `<CustomerAuthGuard>`.

```
┌─ "My Account" ─────────────────────────────────────────────────┐
├─ Tabs: Profile | Orders | Addresses ───────────────────────────┤
│                                                                  │
│  Profile tab:                                                    │
│    Form: First Name | Last Name | Email | Phone                  │
│    [Save Changes]                                                │
│    ─────────────────────────────────────────────────────────── │
│    Change Password section (separate form below)                 │
│    Current Password | New Password | Confirm                     │
│                                                                  │
│  Orders tab: → see Orders section below                         │
│                                                                  │
│  Addresses tab: → see Addresses section below                   │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceStoreApi.getAccount()` — returns customer profile.

Profile save: `ecommerceStoreApi.updateAccount({ firstName, lastName, phone })`

---

## Orders Tab

```
Table: Order # | Date | Status | Items | Total | Actions
───────────────────────────────────────────────────────
#001   June 20   Fulfilled   3   $95.96   [View]
#002   June 15   Processing  1   $19.99   [View]
```

Data: `ecommerceStoreApi.getOrders()` — customer's own orders only (server enforces via `eco_customer_token` context).

Status badges — same colors as admin.

---

## Order Detail — `routes/account/orders/$id.tsx`

Route: `/store/account/orders/:id`

```
┌─ [← My Orders]  Order #001  [Fulfilled badge] ─────────────────┐
│  Placed: June 20, 2026 | Total: $95.96                          │
│                                                                  │
│  ┌─ Items ───────────────────────────────────────────────────┐  │
│  │  Sneaker X / Red / M × 1          $49.99                  │  │
│  │  T-Shirt / Blue / L × 2           $39.98                  │  │
│  │  ────────────────────────────────────────────────────     │  │
│  │  Subtotal $89.97 | Shipping $5.99 | Total $95.96          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Shipping ─────────────────────────────────────────────────┐  │
│  │  123 Main St, New York, NY 10001                           │  │
│  │  Carrier: DHL | Tracking: 1234567890 [Track →]            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  (If fulfilled and within 30 days):                             │
│  [Request Return ─────────────────────────────────────────]     │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceStoreApi.getOrder(id)`

Return button: shown only if `status === "fulfilled"` and `placedAt > now - 30 days`.

---

## Return Request Dialog

Triggered from Order Detail.

```
┌─ Dialog: "Request a Return" ────────────────────────────────────┐
│  Select items to return:                                          │
│  ☑ Sneaker X / Red / M × 1          $49.99                      │
│  ☐ T-Shirt / Blue / L × 2           $39.98                      │
│                                                                  │
│  Reason*:                                                        │
│  [Item damaged on arrival ─────────────────────────────────]   │
│                                                                  │
│  [Submit Return Request]                                         │
└───────────────────────────────────────────────────────────────────┘
```

On submit: `ecommerceStoreApi.createReturn(orderId, { items: selectedItems, reason })`

After submit: success message "Return request submitted. Our team will review within 1-2 business days."

---

## Addresses Tab

```
┌─ Saved Addresses ──────────────────── [+ Add Address] ─────────┐
│  ┌─ Card ────────────────────────────────────────────────────┐  │
│  │  John Doe                                                  │  │
│  │  123 Main St, New York, NY 10001                          │  │
│  │  United States                                            │  │
│  │  [Default]  [Edit]  [Delete]                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌─ Card ────────────────────────────────────────────────────┐  │
│  │  Work Address                                              │  │
│  │  456 Office Ave, Brooklyn, NY 11201                       │  │
│  │  [Set Default]  [Edit]  [Delete]                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceStoreApi.getAddresses()`

Add/Edit Address Dialog — same fields as checkout Step 1 shipping address form.

Delete: `ecommerceStoreApi.deleteAddress(id)` — confirm dialog.

---

## Checks

- Login redirects to `/store/account` (or `?redirect=` param destination)
- Unauthenticated `/store/account` → redirects to `/store/auth/login?redirect=/store/account`
- Register creates customer + auto-logs in
- Orders tab shows customer's own orders only
- Return request dialog: items checklist + reason field
- Saved addresses can be added/deleted
- Profile save updates `firstName`/`lastName` fields
