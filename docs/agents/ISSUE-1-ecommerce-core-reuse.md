# ISSUE-1 — Ecommerce core reuse spec (`feature`/`ready`) — Core-table-only Catalog, Pricing, Inventory, Order lifecycle, Payment + Tax

Triage: `feature` / `ready` (spec ready for agent; `ready-for-agent` requested but not in local vocabulary, using `ready`).

## Problem Statement

Merchants need Catalog, Pricing, Inventory, Order lifecycle (Cart, Order, Checkout), and Payment with Tax as a service inside ProjectX, with feature parity to the everyday Shopify/Medusa flows, but without growing a second ecommerce database. The current ecommerce vertical duplicates state across twenty compose-prefixed tables while the master tables already model items, prices, stock, documents, and tax. Contributors need a plan that delivers the five priority capabilities using only masters plus generic column additions.

## Solution

Build the five priority capabilities as orchestration over master tables, driven through the existing EventBus plus CQRS Mediator seams, with the ecommerce compose acting only as HTTP orchestration. Freeze the compose-prefixed tables (no new ones, no extensions), migrate active flows off them, and allow only generic, cross-compose reusable column additions. Ship admin and headless store APIs for the five areas; customers stay basic APIs only.

## User Stories

### Catalog
1. As a merchandiser, I want to create a product with name, slug, description, media, and tags, so that it can be sold in the store.
2. As a merchandiser, I want to organize products into hierarchical categories, so that shoppers can browse by department.
3. As a merchandiser, I want to define variants by option attributes (size, color), so that each sellable combination has its own SKU.
4. As a merchandiser, I want to draft, activate, and archive products and variants, so that unfinished work never leaks to checkout.
5. As a merchandiser, I want to attach barcodes and units of measure to items and variants, so that scanning and fulfillment use shared identifiers.
6. As a merchandiser, I want to tag and query products by type and status, so that courses, menu items, and retail products can share one catalog.
7. As a store API consumer, I want to list active products with pagination, search, category, and tag filters, so that I can build PLP and search without a custom backend.
8. As a store API consumer, I want to fetch a product with its variants and prices, so that PDP can render options and totals.
9. As an operator, I want catalog changes to emit domain events, so that search, analytics, and ERP listeners stay consistent.

### Pricing (promotions later)
10. As a merchandiser, I want to create a price list with currency and validity window, so that seasonal or regional pricing is time-bounded.
11. As a merchandiser, I want to set variant prices and volume-tier minimum quantities inside a list, so that bulk buyers see correct unit prices.
12. As a merchandiser, I want to scope a price list to an audience (region, customer group, channel), so that B2B and B2C prices coexist.
13. As a merchandiser, I want overlapping lists to resolve by explicit priority, so that the checkout price is deterministic.
14. As a store API consumer, I want resolved pricing for a variant in context (currency, qty, audience), so that cart math matches what was displayed.
15. As an operator, I want every price resolution to record which list and rule applied, so that disputes are auditable.

### Inventory
16. As an inventory manager, I want to track on-hand and reserved quantities per variant per bin, so that oversell is prevented.
17. As an inventory manager, I want checkout to reserve stock and confirmation to deduct it, so that concurrent carts do not double-sell.
18. As an inventory manager, I want cancellations and failures to release reservations, so that stock returns to sellable.
19. As an inventory manager, I want every stock change logged with reason and document reference, so that adjustments, receipts, sales, and corrections are traceable.
20. As an inventory manager, I want a generic low-stock threshold per variant bin, so that any compose can trigger replenishment alerts.
21. As an inventory manager, I want a generic allow-negative policy per variant, so that backorder behavior is explicit and shared with ERP and restaurant flows.
22. As a store API consumer, I want sellable availability per variant, so that PDP and cart can block or warn before checkout.

### Order lifecycle (Cart, Order, Checkout)
23. As a shopper, I want to create a cart and add, update, and remove lines, so that I can assemble an order over time.
24. As a shopper, I want cart lines to revalidate price, availability, and tax on every change, so that I never check out with stale totals.
25. As a shopper, I want to move a cart through address, method selection, and review steps, so that checkout is resumable.
26. As a shopper, I want checkout to compute line totals, tax, and grand total in one response, so that the review screen is trustworthy.
27. As a shopper, I want to place an order exactly once even on retry, so that double-clicks never create duplicates.
28. As a support agent, I want to view an order with lines, totals, tax breakdown, payment reference, and stage history, so that I can answer where is my order.
29. As a support agent, I want to cancel an unconfirmed order and release its reservation, so that stock and ledger stay correct.
30. As a support agent, I want draft orders created from admin to convert into real orders through the same validation path, so that phone orders follow identical rules.
31. As an operator, I want cart, placed, confirmed, and cancelled to be pipeline stages with guarded transitions, so that lifecycle is a state machine, not scattered flags.
32. As an operator, I want order events for created, stage-changed, and cancelled, so that notification, ledger, and analytics react uniformly.

### Payment plus tax
33. As a shopper, I want to start a payment session for my checkout total, so that I can pay via the configured provider.
34. As a shopper, I want payment failure to keep my cart and reservation intact, so that I can retry without rebuilding.
35. As a shopper, I want payment success to confirm my order and post the receivable, so that finance sees the same truth.
36. As a finance operator, I want provider webhooks to reconcile against the order exactly once, so that retries never double-confirm.
37. As a finance operator, I want refunds and voids recorded against the original document, so that money movement is auditable.
38. As a tax operator, I want jurisdiction rate books with default and product-type overrides, so that correct rates apply per line.
39. As a shopper, I want tax shown per line and in the order total with its currency, so that invoices are transparent.
40. As a finance operator, I want tax-inclusive and tax-exclusive price handling to be explicit, so that rounding matches the ledger.

### Customers (basic APIs only)
41. As a developer, I want to create and fetch basic customer records with addresses, so that orders can reference a buyer without a CRM dependency.
42. As a support agent, I want to list a customer's orders, so that basic service is possible without segmentation or marketing tools.

## Implementation Decisions

Seams under test (highest seams first, existing preferred, confirmation requested):
- Primary seam: Mediator commands and queries for catalog, commerce, inventory, ledger, pipeline, and party. New behavior is exercised here, not at the HTTP layer.
- Secondary seam: ecommerce compose HTTP orchestration for admin and store APIs. Thin mapping and permission checks only.
- Tertiary seam: payment provider adapter interface (Stripe, Razorpay) plus webhook handler. No new provider abstractions.
- No new seams proposed. If a new seam is unavoidable during build, it must sit at the Mediator command level, not inside compose internals.

Modules and responsibilities:
- Catalog module owns products, variants, categories, price lists, and price rules. It is the only writer for those masters.
- Commerce module owns documents (carts, draft orders, orders) and lines, plus stage transitions. Cart is a document stage, not a separate entity.
- Inventory module owns bins, stock units, reservations, deductions, releases, and movement log.
- Ledger module owns receivable posting on payment confirmation and refund or void postings.
- Pipeline module owns the order lifecycle stage machine. The compose-local finite state helpers are retired in favor of pipeline stages.
- Party module owns basic customer records and addresses. No customer groups, segments, or campaigns in this spec.
- Platform auth and access own permission checks. Ecommerce compose keeps its existing role mapping and adds no new auth seam.

Persistence alignment (no new compose tables):
- Freeze all compose-prefixed ecommerce tables: no new tables, no new columns on them. Active cart, draft-order, gift-card, swap, and claim flows migrate to masters. Existing rows become read-only history.
- All new state lives on masters. Compose-specific nuance goes into existing `meta`, `attributes`, `audience`, and `conditions` JSONB fields first.
- Allowed generic column additions only (each reusable by ERP, restaurant, LMS, or workplace):
  - Shared item and variant identity: `barcode` (text, nullable), `uom` (text, unit of measure, nullable with sensible default).
  - Sellable policy: `threshold` (integer, low-stock threshold on stock units), `allow_negative` (boolean, explicit oversell or backorder policy on variants).
  - Price resolution: `priority` (integer on price lists for deterministic overlap resolution).
  - Document traceability: `source` (text on documents, e.g. store, admin, pos — generic origin), `external_ref` (text on documents, generic provider or partner reference for payment or partner lookup).
  - Line precision: `variant_id` (text on document lines, nullable, alongside existing item link), `uom` (text on document lines, snapshot of selling unit).
  - Tax determinism: `priority` (integer on tax rates for overlapping jurisdiction resolution).
- Naming rule enforced: any column that mentions cart, checkout, ecommerce, swap, gift, or claim is rejected. Columns must read sensibly from any compose.
- Money stays integer minor units with explicit currency. Tax rates stay basis points. Quantities stay integers.

API contracts (orchestration only, no business logic in route handlers):
- Admin catalog: CRUD for products, variants, and categories plus publish lifecycle transitions. Responses include resolved default price and availability pointers.
- Admin pricing: CRUD for price lists and price rules including audience, validity, priority, and tier conditions.
- Admin inventory: read availability, adjust on-hand with reason, read movement ledger. All mutations flow through inventory commands.
- Admin orders: list and detail with lines, totals, tax breakdown, payment reference, and stage history; cancel with release; create draft and convert through the same validation path.
- Store catalog and pricing: list and detail of active sellables with context-resolved prices and availability.
- Store cart and checkout: create cart, mutate lines, revalidate, step through checkout, compute totals, create payment session, place idempotently, read own orders and addresses.
- Payment: create session returns provider session id, redirect URL, expiry, and order reference; webhook reconciles idempotently and drives confirm or fail transitions.
- Idempotency keys required on place-order and payment-session creation. Webhook handling is exactly-once per provider event id.

Key interactions:
- Place order saga: revalidate cart, reserve stock, resolve prices, compute tax, create payment session, await reconcile, confirm document and deduct stock, post ledger entries, emit order events. Failure at any step releases reservations and leaves the cart retryable.
- Price resolution order: filter lists by status, currency, validity window, and audience match, then sort by priority, then evaluate tier conditions and quantity breaks.
- Tax computation: resolve rate book by jurisdiction and product-type override, apply per line in basis points, sum into document tax total with currency, persist per-line rate snapshot.
- Inventory movement reasons use a shared vocabulary (receipt, sale, reserve, release, adjust, correction, transfer) with document reference id and type on every entry.

Plugin reuse and plugin builds (no new plugin tables; all reusable later):
- Payment plugin is the only payment seam. Ecommerce compose never calls Stripe or Razorpay directly; it calls the payment adapter interface and wires the plugin callbacks to commerce commands. Per-organization provider resolution replaces the current single-provider singleton so ERP, LMS, restaurant, and hospitality can each pick provider and keys by organization and region.
- Payment plugin builds (generic, reused by every compose that takes money): multi-line session creation from resolved totals with tax and currency, authorize versus capture separation, full and partial refund plus void, idempotent webhook handling keyed by provider event id with exactly-once reconcile, and gateway reference persisted to the document external reference field. No ecommerce vocabulary inside the plugin.
- Notification plugin plus notification masters own all order messaging. Ecommerce emits order and payment domain events; trigger rules map event patterns to template keys with recipient expressions and conditions. Builds needed (generic): event-trigger evaluation, queued delivery with retry, delivery log on the shared log table, and seedable system templates for order placed, confirmed, cancelled, payment failed, and refund issued. The current scheduled-send stub becomes real queue persistence, usable by CRM and workplace later.
- Storage plugin owns catalog media. Product and category media store storage file ids and resolved URLs only; upload, completion, and deletion flow through the storage plugin backed by the shared files table. Builds needed (generic): folder convention support and completion metadata passthrough (mime, size, dimensions) so restaurant menus, LMS thumbnails, and asset photos reuse the same path. No catalog-specific logic inside the plugin.
- Auth and access stay as-is: platform session plus compose role mapping guards admin routes; store routes use customer identity from the party module.

## Testing Decisions

- Test external behavior at the Mediator seam: commands in, documents and stock out, events emitted. Do not assert SQL strings, route internals, or adapter call order.
- Coverage per area: catalog lifecycle and variant uniqueness; price resolution across overlapping lists, audiences, and tiers; reservation, deduction, release, and movement audit; cart validation and idempotent place; payment reconcile exactly-once including retry and failure paths; tax resolution and totals math.
- Prior art to mirror: existing command-handler patterns in the catalog and commerce modules, plus hook-based reconciliation for payment and return events. Thin route tests only for auth mapping and status codes, not business rules.

## Out of Scope

- Promotions engine (codes, automatic discounts, BOGO, free shipping, stacking): price lists and tiers only.
- Platform-as-a-service surface: multi-store or sales channels, publishable keys, webhook marketplace, plugin SDK, theming.
- Customer-facing web app: storefront UI beyond what exists; this spec is APIs plus admin orchestration.
- Shipping and fulfillment: carriers, zones, labels, tracking, pick or pack, delivery promises.
- Advanced customers: groups, segments, marketing, loyalty, wishlists, B2B companies.
- Post-order commercial flows: gift cards, swaps, claims, order edits beyond cancel, partial refunds beyond void-or-refund of payment.
- Reporting beyond order, revenue, and availability basics.

## Further Notes

- Migration: dual-write is forbidden. Add a one-way backfill from compose-prefixed rows into masters behind a maintenance flag, then switch reads, then mark compose tables read-only.
- Vocabulary follows the project domain glossary: products, carts, orders, payments. If new terms appear (e.g. sellable, audience, reserve), promote them into the glossary on first use.
- Open confirmations needed: seams above, exact generic column list, and whether draft orders deserve a distinct document type or remain an order stage.
