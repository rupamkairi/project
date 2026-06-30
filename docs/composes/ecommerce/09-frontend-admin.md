# Ecommerce — Phase 9: Admin Frontend Pages

## Goal

Specify every admin dashboard page — layout, data requirements, and interactions.
All pages require `eco:admin`, `eco:manager`, `eco:fulfillment`, or `eco:support` role.

---

## 9.1 Dashboard — `/admin/ecommerce`

**KPI Cards (row of 5):**
- GMV today / GMV this month
- Orders today / Orders this month
- AOV (rolling 30-day)
- Pending returns count
- Low-stock variants count

**Charts:**
- Revenue over last 30 days (area chart, daily breakdown)
- Orders by status (donut: pending, processing, shipped, delivered, cancelled)

**Quick Actions:**
- New draft order
- View pending returns
- View low-stock alerts

**Recent Orders (last 10):**
- Order number, customer, total, status badge, date

---

## 9.2 Products List — `/admin/ecommerce/products`

**Layout:** DataTable with filter sidebar.

**Columns:** Thumbnail | Title | Status | Variants | Inventory | Price Range | Category | Actions

**Filters:**
- Status: all / draft / published / archived
- Category (tree select)
- In stock / out of stock
- Search (uses PgSearchAdapter)

**Bulk actions:** Publish, Archive, Delete (admin only).

**Actions:**
- "New Product" button → `/admin/ecommerce/products/new`
- Row click → product detail

---

## 9.3 Product Detail — `/admin/ecommerce/products/:id`

**Layout:** Two-column form.

**Left (form fields):**
- Title, handle (auto-generated from title, editable)
- Description (rich text editor)
- Category selector (tree)
- Tags (tag input)
- Weight + dimensions
- Status selector (draft / published)

**Right (panels):**
1. **Variants panel:**
   - Table: Variant title | SKU | Price | Stock | Status
   - Add variant button → sheet form (options: size/color/etc.)
   - Each variant inline-editable for price
2. **Media panel:**
   - Image upload grid (drag-to-reorder)
   - Thumbnail selection
3. **Pricing panel:**
   - Base price
   - Compare-at price (strike-through display)
   - Per-region price overrides
4. **SEO panel:**
   - Meta title, meta description, canonical URL

**Actions bar:** Save draft | Publish | Archive | Delete

---

## 9.4 Orders List — `/admin/ecommerce/orders`

**Tabs:** All | Pending | Processing | Fulfillment | Shipped | Delivered | Completed | Cancelled | Returns

**Columns:** Order # | Customer | Total | Status | Region | Date | Fulfillment | Actions

**Filters:**
- Date range
- Status (multi-select)
- Region
- Min/max total
- Payment method

**Row actions:** View detail, Cancel (if eligible), Create return.

---

## 9.5 Order Detail — `/admin/ecommerce/orders/:id`

**Layout:** Full-width with sections.

**Header:** Order number + status badge + creation date + action buttons (Cancel / Capture / Create Return / Create Fulfillment).

**Sections:**

1. **Items table:** Variant image + name, SKU, qty, unit price, total. Readonly.

2. **Summary:** Subtotal / Shipping / Tax / Discount / Total. Breakdown by line.

3. **Customer + Addresses:** Customer name (link to customer detail), shipping address, billing address.

4. **Fulfillments:** Per-fulfillment card showing: items, status badge, tracking number, carrier, timeline. "Update Tracking" button for fulfillment staff.

5. **Returns:** List of returns for this order with status. "Process Return" link.

6. **Payment:** Payment method, gateway reference, payment status, captured amount. "Capture" button if authorized.

7. **Timeline:** Full audit trail — order created, payment received, fulfillment created, shipped, etc. Sortable newest-first.

8. **Notes:** Admin-only notes field.

---

## 9.6 Customers — `/admin/ecommerce/customers`

**Columns:** Name | Email | Orders | Lifetime Value | Group | Joined | Status

**Filters:** Customer group, search.

### Customer Detail `/admin/ecommerce/customers/:id`

**Sections:**
1. Profile: name, email, phone, addresses
2. Stats: total orders, total spent, avg order value, last order date
3. Orders: list of customer orders (DataTable)
4. Returns: list of customer returns
5. Customer groups membership

---

## 9.7 Returns — `/admin/ecommerce/returns`

**Tabs:** All | Requested | Approved | Received | Processed | Refunded | Rejected

**Columns:** Return # | Order # | Customer | Items | Status | Reason | Requested | Actions

### Return Detail `/admin/ecommerce/returns/:id`

**Sections:**
1. Return items with conditions (after received)
2. Order reference
3. Shipping info (tracking for return shipment)
4. Refund calculation breakdown
5. Action buttons: Approve / Reject / Mark Received / Issue Refund

---

## 9.8 Regions — `/admin/ecommerce/regions`

**Layout:** List of region cards (not a table — relatively small dataset).

Each card: Region name | Countries flags | Currency | Tax profile | Shipping options count | Payment providers.

"Add Region" button → dialog form.

### Region Detail

- Edit region settings
- Manage shipping options (list + add/edit/remove)
- Tax profile assignment

---

## 9.9 Shipping Options — `/admin/ecommerce/shipping`

**List:** DataTable grouped by region.

**Columns:** Name | Type | Rate | Region | Estimated Days | Status (active/inactive)

**Form (dialog/sheet):**
- Name, type (flat_rate / calculated / free)
- Rate (if flat_rate): amount + currency
- Conditions (rule builder: e.g. "free if cart total > $50")
- Estimated delivery days
- Region assignment

---

## 9.10 Tax Management — `/admin/ecommerce/tax`

**Layout:** Tax profiles list → drill into rates.

**Tax Profile list:** Name | Provider | Regions using it | Rate count

**Tax Rate table (per profile):**
| Rate Name | Jurisdiction | Product Type | Rate % | Default |
|-----------|-------------|--------------|--------|---------|

Actions: Add rate, Edit, Delete.

---

## 9.11 Analytics — `/admin/ecommerce/analytics`

Access: admin + manager only.

**Sub-pages:**

### Overview
- GMV trend (line chart, selectable: 7d / 30d / 90d / 12m)
- Orders trend
- AOV trend
- Top 5 products by revenue (horizontal bar)

### Revenue
- Revenue breakdown: gross / discounts / refunds / net
- By region (map + table)
- By day-of-week heatmap

### Products
- Top products table: product | units sold | revenue | return rate
- Low-stock alerts: variants below reorder threshold

### Customers
- New vs returning customers (stacked bar over time)
- Customer LTV distribution (histogram)
- Acquisition by source

### Returns
- Return rate by product (highlight outliers)
- Return reasons breakdown (donut)
- Returns over time

---

## 9.12 Import — `/admin/ecommerce/import`

Same pattern as CRM import modal but for:

1. **Product Import** — CSV with columns: title, sku, price, category, stock, variants
2. **Inventory Import** — CSV with columns: sku, location, quantity_adjustment

Step flow: Upload → Map columns → Validate → Submit → Job status polling.
