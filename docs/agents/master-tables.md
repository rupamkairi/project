# Master tables (orientation)

Inspect `apps/server/src/infra/db/schema/` for columns. This file is not a field catalog. Compose table families: [database-design.md](./database-design.md).

## Rule

Shared masters live in the server infra schema (unprefixed or short family prefixes). Compose tables use a compose prefix (`crm_`, `erp_`, `eco_`, `rst_`, `lms_`, `hsp_`, `pjm_`, `workplace_`, `plt_`) and hold **detail only**. Link masters with plain `text` id columns (implicit FKs — no Drizzle `references()`).

## Families

| Family                  | Tables                                                                    | Use for                                                         |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Identity                | `organizations`, `actors`, `roles`, `sessions`, `api_keys`                | Tenants and login                                               |
| Party                   | `persons`, `parties`                                                      | People and orgs (contacts, vendors, channel partners)           |
| Location                | `locations`                                                               | Hierarchical places (outlet, table, room, warehouse, ward)      |
| Inventory bins          | `inv_locations`, `inv_stock_units`, `inv_movements`                       | Stock quantities. `locations` = place; `inv_locations` = bin    |
| Catalog                 | `cat_categories`, `cat_items`, `cat_variants`, `cat_price_*`, `cat_bom_*` | Sellable/stock items and assemblies                             |
| Commerce                | `transactions`, `transaction_lines`                                       | Orders, invoices, POs, bills                                    |
| Ledger                  | `ldg_accounts`, `ldg_transactions`, `ldg_journal_entries`                 | Chart of accounts and posting                                   |
| Tax                     | `tax_templates`, `tax_rates`                                              | Org-scoped rate books. Filing stays compose (`erp_gst_returns`) |
| Pipeline                | `pipelines`, `pipeline_stages`                                            | Kanban / stage machines                                         |
| Activity                | `activities`                                                              | Interaction and audit log                                       |
| Scheduling              | `sch_calendars`, `sch_slots`, `sch_bookings`                              | Time windows and bookings                                       |
| Workflow                | `wf_process_templates`, `wf_process_instances`, `wf_tasks`                | Approvals and task inboxes                                      |
| Document / notify / geo | `doc_*`, `ntf_*`, `geo_*`                                                 | Files, messages, addresses                                      |

Composes read/write masters via `@db/client` (org-scoped) or the matching module commands (`party.*`, `ledger.*`, `inventory.*`, `catalog.*`, `activity.*`, `scheduling.*`, `workflow.*`).
