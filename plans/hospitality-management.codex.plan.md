# Hospitality Management Compose

## Goal

Create an independently usable, multi-property Hospitality Management Compose for small hotels, guest houses and resorts. Cover property and room operations, staff-managed reservations, guest stays, folios, services, simple venue bookings, partner listings and operational reporting without implementing a public booking marketplace.

## Assumptions

- Use `hospitality` as the Compose ID, `/hospitality` as the server/web prefix, `createHospitalityCompose(...)` as the factory and `Hospitality Management` as the display name.
- Support multiple properties, buildings, floors and room inventories from the first release.
- Do not provide public room search or booking. Provide a single-page guest stay portal for an existing reservation.
- OTA and partner listings are manually recorded; no external API synchronization is included.
- Hospitality owns guest folios, deposits, refunds and final guest invoices; payment execution reuses the Payment plugin.
- Restaurant, Logistics and Event Management remain separate Composes. Hospitality integrates with them optionally and also supports manually managed external partners.
- Banquet and venue support is limited to availability, reservation, package, guest count, deposit and status; event execution remains outside this Compose.
- Reuse shared Party/Person, Location, Scheduling, Commerce, Documents, Notifications, Storage and Analytics capabilities. Add Hospitality-owned tables only for domain state that shared modules cannot represent safely.

## Steps

1. Create server and web packages, manifest, seed, permissions, hooks and jobs; mount `createHospitalityCompose` into both shells and expose `HospitalityApp` and `seedHospitality`.
2. Add property setup for properties, buildings, floors, room types, rooms, amenities, facilities, check-in/out policy, tax/service-charge settings, currencies, numbering and operational budgets.
3. Model room inventory with operational statuses such as available, reserved, occupied, dirty, cleaning, inspected, out-of-order and blocked; preserve room-status history.
4. Add rate plans, seasonal/date overrides, occupancy rules, meal-plan inclusion, extra-person/child charges, taxes, cancellation terms and manual channel-specific pricing/allocation.
5. Implement availability search for staff, reservation creation, room holds, confirmation, modification, cancellation, no-show, group reservations, room assignment/change, check-in, stay extension, early departure and check-out.
6. Reuse Person/Party for guests and companies while adding guest preferences, stay history references, identity-document attachments, special requests, companions and company/travel-agent booking details.
7. Implement folios with room charges, taxes, deposits, refunds, adjustments, service charges, split folios, company billing, payment allocation, outstanding balances and final invoices.
8. Add housekeeping operations for room queues, assignments, cleaning/inspection status, linen/minibar notes and simple room maintenance issues; exclude full asset-maintenance workflows.
9. Add a configurable service catalog and service requests for room service, laundry, parking, cab/travel assistance, wake-up calls and concierge requests, with internal or partner fulfilment and folio posting.
10. Add simple parking records for guest vehicles, spaces, passes, check-in/out and charge posting; do not implement fleet or valet logistics.
11. Add partner management for OTAs, external restaurants, cab providers, tour providers, event organizers and other facilities, including contacts, agreement dates, commission/fee notes, listing URLs/IDs, allocated room inventory and active status.
12. Add simple banquet/venue records and reservations for facility, date/time, expected guests, package, notes, deposit, charges and status; publish an optional hand-off event for a future Event Management Compose.
13. Provide operational surfaces: portfolio dashboard, property dashboard, room rack/calendar, reservations, arrivals, departures, in-house guests, housekeeping, folios, services, partners, venues, budgets, reports and settings.
14. Provide one guest-facing stay page showing reservation/stay summary, room, check-in information, current folio, service requests and hotel contact details; protect it with a scoped guest token.
15. Seed roles for Hospitality Admin, Owner, Property Manager, Reservations, Front Desk, Housekeeping, Cashier, Service Desk, Accountant and Guest; enforce organization/property-level permissions.
16. Add reports for occupancy, ADR, RevPAR, room revenue, service revenue, cancellations/no-shows, arrivals/departures, outstanding folios, deposits/refunds, housekeeping turnaround, channel/listing performance, partner charges and budget-versus-actual.
17. Publish optional integration events for restaurant room-service orders/folio charges, Logistics cab requests, Event venue hand-offs and ERP accounting exports without direct cross-Compose database references.

## Risks / checks

- Prevent overlapping active reservations and room assignments for the same room/date range.
- Verify timezone-safe hotel dates, overnight stays, extensions, early departures and no-show processing.
- Verify room availability remains consistent across holds, reservations, occupancy and maintenance blocks.
- Verify folio totals, taxes, deposits, partial payments, refunds, split billing and finalization.
- Verify guest tokens expose only the associated stay and allowed actions.
- Verify property and organization isolation across every API, report and guest page.
- Verify partner/OTA records remain manual and do not imply synchronization.
- Verify Restaurant, Logistics, Event Management and ERP integrations are optional.
- Test seeded setup, reservation lifecycle, check-in/out, housekeeping, services, venue booking, billing, permissions, reports, manifest and shell registration without starting development servers.
