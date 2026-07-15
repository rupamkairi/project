# Restaurant Management Compose Update

## Goal

Update the existing Restaurant Management Compose into a complete, standalone, multi-outlet restaurant system for dine-in, takeaway, pickup and partner-delivered orders. Expand staff, reservations, stock, equipment, billing and reporting while removing delivery dispatch/rider ownership for the future Logistics Compose.

## Assumptions

- Keep the existing `restaurant` Compose ID, `/restaurants` prefix, package names and `createRestaurantCompose(...)` factory; use `Restaurant Management` as the display name.
- Support multiple outlets from the first release.
- Restaurant staff management is standalone and does not depend on Workplace.
- Restaurant owns menus, customer orders, preparation, billing and readiness for hand-off.
- Logistics owns delivery jobs, dispatch, riders, tracking, routes and proof of delivery.
- No existing delivery data or backward-compatible routes need preservation.
- Logistics partnerships are simple manual configurations plus an event/API hand-off contract; no external delivery-provider connector is required initially.
- Equipment maintenance remains a small operational register and log, not a Field Service system.
- Provide a single-page customer ordering experience.
- Reuse shared Person/Party, Location, Catalog, Inventory, Commerce, Scheduling, Documents, Notifications and Analytics capabilities wherever their current contracts fit.

## Steps

1. Remove Restaurant-owned delivery tables, routes, jobs, WebSocket channels, dispatcher/rider UI, manifest navigation and delivery-specific analytics; remove auto-assignment and proof-of-delivery behavior completely.
2. Replace delivery ownership with a Logistics hand-off contract: Restaurant publishes an order-ready event containing order, outlet, customer and fulfilment references; it stores only partner/manual hand-off reference and consumed delivery status for customer visibility.
3. Retain dine-in, takeaway and pickup as native fulfilment modes; allow partner delivery only when a Logistics/manual partner is configured, without dispatch or rider management inside Restaurant.
4. Expand outlet setup with business hours, service modes, taxes, charges, printers, kitchen stations, table layout, numbering, currencies and receipt settings.
5. Add standalone restaurant staff records, outlet assignments, operational roles, shifts, clock-in/out, cash-shift assignment and attendance summaries; reuse Person identities but keep restaurant employment details local.
6. Expand table reservations with guest, outlet/table, party size, date/time, duration, occasion, source, deposit, notes, confirmation, seated, completed, cancelled and no-show states; add waitlist and seating flow.
7. Expand menu management with categories, menu periods, items, variants, modifiers, combos, outlet pricing, availability, allergens, dietary tags, images and temporary sold-out controls.
8. Keep a unified order lifecycle for draft, placed, accepted, preparing, ready, served/collected/handed-off, completed, rejected, cancelled and refunded; preserve every status transition and actor/time history.
9. Expand POS and KDS for table orders, order courses, kitchen stations, item notes, split/merge tables, transfer items, hold/fire, voids, discounts, tips and live preparation status.
10. Reuse Catalog and Inventory for ingredients/resources while adding restaurant-owned recipes, recipe versions, ingredient consumption, stock counts, receipts, transfers, adjustments, wastage, reorder alerts and outlet-level availability.
11. Add a simple equipment/tool register with outlet, category, serial/reference, purchase/warranty details, status, service dates, service cost and maintenance notes; support issue logging and resolved/out-of-service status only.
12. Expand billing for bills, split bills, discounts, taxes/service charges, tips, multiple payment methods, partial payments, refunds, voids, receipts, cashier shifts, opening/closing balances and variance approval.
13. Add manual partner records for Logistics providers and ordering aggregators, including contacts, platform/store IDs, agreement/commission notes, service areas, hand-off method and active status.
14. Provide operational surfaces: outlet dashboard, POS, tables/reservations, KDS, orders, menu, inventory, equipment, staff/shifts, partners, billing, reports and settings.
15. Consolidate customer functionality into one responsive page for outlet selection, menu browsing, cart, dine-in/takeaway/pickup or configured partner-delivery choice, checkout and order status.
16. Seed Restaurant Admin, Owner, Outlet Manager, Cashier, Waiter, Kitchen Manager, Kitchen Staff, Inventory Manager and Viewer roles with organization/outlet-scoped permissions.
17. Add reports for sales, payments, taxes, discounts, refunds, order channel/mode, item mix, menu profitability, food cost, stock valuation, wastage, reorder needs, table turnover, reservation/no-show rate, preparation time, staff shifts, cash variance, equipment cost and partner hand-offs.

## Risks / checks

- Verify all delivery dispatch/rider ownership is removed without breaking order preparation or partner hand-off.
- Verify Restaurant works fully when Logistics is absent; partner delivery must be disabled or manually handed off.
- Verify stock consumption and reversal follow order completion, cancellation, void and refund rules.
- Verify order, KOT and bill state transitions cannot skip required steps or double-apply stock/payment effects.
- Verify table reservations prevent conflicting assignments while allowing waitlists and walk-ins.
- Verify cash-shift totals, split payments, refunds, tips, discounts and tax calculations.
- Verify staff access is restricted by organization, outlet and role.
- Verify the single-page customer experience exposes no administrative data.
- Test delivery removal, outlet setup, staff shifts, reservations, POS/KDS, inventory, equipment, billing, reports, manifest and shell registration without starting development servers.
