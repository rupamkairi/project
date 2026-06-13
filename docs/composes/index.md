# Compose Catalog

All planned and implemented composes. Each compose is a full-stack application layer built by orchestrating Core modules.

---

## Status

| Compose | ID | Status | Modules Used |
|---------|-----|--------|--------------|
| [Platform](./platform/README.md) | `platform` | **Built** | identity, notification |
| [CRM](./crm.md) | `crm` | Documented | identity, catalog, workflow, scheduling, notification, document, analytics |
| [ERP](./erp.md) | `erp` | Documented | identity, catalog, inventory, ledger, workflow, geo, notification, document, analytics |
| [LMS](./lms.md) | `lms` | Documented | identity, catalog, scheduling, document, notification, workflow, analytics |
| [Project Management](./pm.md) | `pm` | Documented | identity, workflow, scheduling, document, notification, analytics |
| [Office / HR](./office.md) | `office` | Documented | identity, workflow, scheduling, ledger, document, geo, notification, analytics |
| [Healthcare](./healthcare.md) | `healthcare` | Documented | identity, catalog, scheduling, document, ledger, workflow, notification, analytics |
| [Hospitality](./hospitality.md) | `hospitality` | Documented | identity, catalog, inventory, scheduling, ledger, workflow, notification, analytics |
| [Restaurant](./restaurant.md) | `restaurant` | Documented | identity, catalog, inventory, scheduling, ledger, workflow, geo, notification, analytics |
| [Ecommerce](./ecommerce.md) | `ecommerce` | Documented | identity, catalog, inventory, ledger, workflow, geo, notification, analytics |

---

## Sub-documentation

Some composes have detailed implementation docs in sub-folders:

| Compose | Sub-docs |
|---------|---------|
| `platform` | `platform/README.md` (features, credentials), `platform/dashboard.md` |
| `lms` | `lms/server.md` (Elysia plugin guide), `lms/web.md` (route setup), `lms/frontend.md` (UI guide) |
| `ecommerce` | `ecommerce/admin.md` (admin panel guide) |

---

## Adding a new compose

See [compose.md](../compose.md) for the full integration contract and checklist.

Quick reference:
- Server: create `composes/{name}/server/`, export `{name}Compose` and `{Name}App`
- Web: create `composes/{name}/web/`, export `{name}Routes` and `{name}Manifest`
- Register in `apps/server/src/index.ts` and `apps/web/src/router.tsx`
- Add DB prefix: 3-letter lowercase abbreviation

---

## Module legend

| Module | Provides |
|--------|---------|
| `identity` | Auth, users, roles, permissions, sessions |
| `catalog` | Products, services, pricing, variants |
| `inventory` | Stock, warehouses, movements, adjustments |
| `ledger` | Accounts, transactions, journal, reporting |
| `workflow` | Process definitions, steps, approvals, transitions |
| `scheduling` | Events, slots, availability, bookings |
| `document` | Files, attachments, versions, templates |
| `notification` | Channels, templates, delivery, preferences |
| `geo` | Locations, zones, coordinates, tracking |
| `analytics` | Metrics, aggregations, reports, dashboards |
