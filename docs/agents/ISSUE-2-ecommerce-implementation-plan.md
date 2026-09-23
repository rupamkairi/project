# ISSUE-2 — Ecommerce implementation plan (`feature`/`ready`) — Generic modules, compose sagas, plugin reuse

Triage: `feature` / `ready`. Supersedes ISSUE-1 on layering: modules own generic table interactions with guardrails, composes own business sagas. No new compose tables.

## Problem Statement

Merchants need Catalog, Pricing without promotions, Inventory, Order lifecycle across Cart, Order, and Checkout, plus Payment with Tax, as a service inside ProjectX. Today the ecommerce vertical duplicates state across compose-prefixed tables, does cross-table joins inside route handlers, and hides a source-level dependency cycle through path aliases. Contributors need a build order that delivers the five priorities on master tables, keeps modules independent of compose vocabulary, and reuses payment, notification, and storage plugins.

## Solution

Build generic primitives once in modules, orchestrate them per business flow in the ecommerce compose, and extend plugins only with reusable capabilities. Freeze compose-prefixed tables, allow only generic reusable column additions on masters, break the hidden dependency cycle by depending downward on shared packages, and ship admin plus headless store APIs with idempotent checkout and exactly-once payment reconcile.

## User Stories

### Catalog
1. As a merchandiser, I want to create a product with name, slug, description, media, and tags, so that it can be sold without custom backend work.
2. As a merchandiser, I want to organize products into hierarchical categories, so that shoppers can browse by department.
3. As a merchandiser, I want to define variants by option attributes with distinct SKUs, barcodes, and units of measure, so that each sellable combination is unambiguous.
4. As a merchandiser, I want to draft, activate, and archive products and variants, so that unfinished work never reaches checkout.
5. As a store API consumer, I want to list active products with pagination, search, category, and tag filters, so that listing and search views work headlessly.
6. As a store API consumer, I want to fetch a product with variants, resolved prices, and availability pointers, so that detail views render correctly.
7. As an operator, I want catalog changes to emit domain events, so that search, analytics, and ERP listeners stay consistent.

### Pricing without promotions
8. As a merchandiser, I want to create a price list with currency, validity window, audience, and priority, so that regional and time-bounded pricing is deterministic.
9. As a merchandiser, I want to set variant prices with minimum-quantity tiers, so that bulk pricing works without coupon logic.
10. As a store API consumer, I want resolved pricing for a variant in context with the applied rule recorded, so that cart math is auditable.
11. As an operator, I want overlapping lists to resolve by priority, so that checkout never depends on insertion order.

### Inventory
12. As an inventory manager, I want to track on-hand and reserved quantities per variant bin, so that oversell is prevented.
13. As an inventory manager, I want checkout to reserve, confirmation to deduct, and failure or cancellation to release, so that concurrent carts do not double-sell.
14. As an inventory manager, I want every movement logged with reason and document reference, so that receipts, sales, adjustments, and corrections are traceable.
15. As an inventory manager, I want generic low-stock thresholds and explicit oversell policy per bin, so that replenishment works for every compose.
16. As a store API consumer, I want sellable availability per variant, so that detail and cart views can block or warn early.

### Order lifecycle
17. As a shopper, I want to create a cart and add, update, and remove lines, so that I can assemble an order over time.
18. As a shopper, I want cart lines revalidated on price, availability, and tax at every change, so that checkout never uses stale totals.
19. As a shopper, I want to step through address, selection, and review with resumable state, so that checkout survives interruption.
20. As a shopper, I want to place an order exactly once even on retry, so that double submissions never duplicate orders.
21. As a support agent, I want to view an order with lines, totals, tax breakdown, payment reference, and stage history, so that basic service is possible.
22. As a support agent, I want to cancel an unconfirmed order with stock release, so that inventory and finance stay correct.
23. As a support agent, I want admin-created drafts to convert through the same validation path, so that assisted orders follow identical rules.
24. As an operator, I want cart, placed, confirmed, and cancelled as guarded pipeline stages, so that lifecycle is a state machine.

### Payment plus tax
25. As a shopper, I want to start a payment session for my checkout total, so that I can pay through the configured provider.
26. As a shopper, I want payment failure to preserve my cart and reservation, so that I can retry without rebuilding.
27. As a shopper, I want payment success to confirm my order and post the receivable, so that finance sees the same truth.
28. As a finance operator, I want provider webhooks reconciled exactly once by provider event id, so that retries never double-confirm.
29. As a finance operator, I want refunds and voids recorded against the original document, so that money movement is auditable.
30. As a tax operator, I want jurisdiction rate books with default and product-type overrides plus explicit priority, so that overlapping rules resolve deterministically.
31. As a shopper, I want per-line tax and order tax totals with currency, so that charges are transparent.

### Customers basic
32. As a developer, I want basic customer records with addresses linked to orders, so that buying works without CRM segmentation.
33. As a support agent, I want to list a customer's orders, so that basic service is possible.

### Platform hygiene
34. As a contributor, I want module, compose, and plugin boundaries enforced by dependency direction, so that deleting the ecommerce folder deletes ecommerce logic and nothing else.
35. As a contributor, I want compose-prefixed tables frozen with a one-way backfill into masters, so that no new duplication accrues.

## Implementation Decisions

Seams, highest first, existing preferred:
- Primary seam: Mediator commands and queries for catalog, commerce, inventory, ledger, pipeline, party, and tax. All business invariants are exercised here.
- Secondary seam: compose library sagas that orchestrate primitives plus plugin adapters. Routes stay thin mapping and permission checks.
- Tertiary seam: plugin adapter interfaces for payment, notification delivery, and storage. No provider SDK outside plugins.
- No new seams. If unavoidable, new seams sit at the Mediator command level and use generic vocabulary.

Layering:
- Core stays free of business logic, domain vocabulary, and vendor dependencies.
- Modules own how master tables interact: single-table invariants, same-family cross-table writes, allow-list stage checks, money and rounding rules. Modules expose no cart, checkout, place-order, or ecommerce vocabulary. Example shape: reserve validates available quantity then writes stock and movement rows and emits a reserved event; moveStage validates the target stage exists and the document is not deleted, without knowing the ecommerce sequence.
- Composes own business sagas: the place-order sequence of resolve price, check availability, reserve, create payment session, mark placed, then on reconcile deduct stock, post ledger, and mark confirmed, with release on failure. Deleting the compose folder removes the saga.
- Bucket rule: pure core interaction goes to modules; core-plus-compose joins happen in compose library code that calls module commands for the core half and touches only its own detail rows for the compose half; compose-only state stays entirely in compose library plus routes. Modules never read compose-prefixed rows.
- Totals math lives in catalog and tax as stateless resolvers: input variant, quantity, currency, audience, jurisdiction; output unit price, applied rule identity, per-line tax. Every compose calls it rather than reimplementing.

Persistence:
- No new compose tables and no new columns on compose-prefixed tables. Active flows migrate one way into masters, then compose tables become read-only history.
- Generic master column additions only, each sensible from any compose: barcode and unit of measure on items, variants, and lines; threshold and allow-negative policy on stock; priority on price lists and tax rates; source and external reference on documents; variant link on lines. Compose-specific nuance uses existing meta, attributes, audience, and conditions fields. Any column naming a compose concept is rejected.
- Money remains integer minor units with currency; tax remains basis points; quantities remain integers.

Dependency direction:
- Shared kernel including core primitives, database client, and master schemas moves down into shared packages so both the server shell and every compose depend downward. Path-alias imports from compose code into the server application source are removed. The shell mounts composes; composes never import the shell or each other; modules never import composes or plugins; plugins never import modules. Compose meets plugins only through adapter interfaces and callback wiring.

Plugin reuse and builds, all generic for later composes:
- Payment remains the only payment seam. The compose calls the adapter and wires callbacks to commerce and ledger commands. Builds: per-organization provider resolution replacing the single-provider singleton; multi-line session creation from resolved totals; authorize versus capture separation; full and partial refund plus void; idempotent webhook handling keyed by provider event id with exactly-once reconcile and gateway reference persisted to the document external reference.
- Notification plus notification masters own messaging. The compose emits order and payment events; trigger rules map event patterns to templates. Builds: event-trigger evaluation, queued delivery with retry, delivery logging, and seedable system templates for placed, confirmed, cancelled, payment failed, and refund issued. The scheduled-send stub becomes real queue behavior for all composes.
- Storage owns catalog media. Media fields hold file identifiers and resolved URLs only. Builds: folder conventions and generic completion metadata passthrough, with no catalog logic inside the plugin.
- Auth and access unchanged: platform session plus compose role mapping on admin routes.

API contracts, orchestration only:
- Admin catalog, pricing, inventory reads and adjustments, order list and detail with cancel and draft-convert, all through module commands.
- Store catalog and pricing reads with context-resolved prices and availability; cart mutation with revalidation; checkout stepping with totals computation; idempotent payment-session creation and place; own orders and addresses.
- Idempotency keys required on place and session creation; webhook reconcile exactly once per provider event.

Key interactions:
- Place saga: revalidate, resolve prices, check availability, reserve, create session, mark placed, await reconcile, deduct and post ledger, mark confirmed; any failure releases reservations and leaves the cart retryable with reservation expiry handled by jobs.
- Price resolution: filter by status, currency, validity, audience, then priority, then tier conditions.
- Tax: resolve book by jurisdiction and product-type override with priority, apply per line, sum into document tax total, persist per-line snapshots.
- Movement reasons share one vocabulary with document reference on every entry.

## Testing Decisions

- Test external behavior at the Mediator seam: commands in, documents and stock out, events emitted. Do not assert SQL strings, route internals, or adapter call order.
- Cover lifecycle and uniqueness; overlapping price, audience, and tier resolution; reserve, deduct, release, and audit; cart validation and idempotent place; exactly-once reconcile across retries and failures; tax resolution and totals math; permission mapping at routes only.
- Mirror existing command-handler and hook-reconciliation patterns as prior art. Route coverage stays limited to auth mapping and status codes.

## Out of Scope

- Promotions engine including codes, automatic discounts, bundling rules, and stacking.
- Platform-as-a-service surface including multi-store channels, publishable keys, webhook marketplace, and theming.
- Customer-facing web application beyond existing screens; this plan is APIs plus admin orchestration.
- Shipping and fulfillment including carriers, zones, labels, tracking, and pick or pack.
- Advanced customers including groups, segments, marketing, loyalty, and B2B companies.
- Post-order commercial flows including gift cards, swaps, claims, and order edits beyond cancel, plus partial refunds beyond payment void or refund.
- Reporting beyond order, revenue, and availability basics.

## Further Notes

- Migration is one way with no dual writes: backfill behind a maintenance flag, switch reads, then mark compose tables read-only.
- Vocabulary follows the project domain glossary. New terms such as audience, reserve, and sellable are promoted into the glossary on first use.
- Open confirmations: exact generic column list, draft as order stage versus distinct document type, and durable workflow ownership for reservation expiry and reconcile retries.
