# Goal

Reuse shared infra tables so composes keep only prefixed detail rows. Align docs with code-first rules. Apply migrations, then post finance on `ldg_*`, stock on `inv_*`, BOM on `cat_bom_*`, employment/partners/scheduling/tax on masters.

# Assumptions

Neon had foundation + `plt_*` only when planned. Implicit FKs stay `text` ids. Ledger/inventory writes live in server modules, not `@core`.

# Steps

1. Add `docs/agents/master-tables.md`; fix stale `master-tables.md` comments.
2. Apply Drizzle migrations / push; retire `migrate-erp.ts` as canonical DDL.
3. ERP posting on `ldg_*`; drop compose GL/journal tables from `erp.ts`.
4. Stock movements on `inv_*`; ERP stock headers remain `erp_stock_entries`.
5. Shared `cat_bom_*`; ERP BOM and restaurant recipes use it.
6. Restaurant staff as outlet assignment; shifts optionally link `sch_bookings`.
7. Partners via `parties`; reservations link `sch_bookings`; core `tax_*`.
8. PM work-item activity log; approvals start `wf_*` instances.

# Risks / checks

`locations` vs `inv_locations` must not be mixed. Period close must look at `ldg_transactions` pending status. Typecheck after route rewires.
