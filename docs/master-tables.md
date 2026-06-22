# Master Table Architecture

How composes share a common data substrate instead of each re-inventing contacts, orders, and status flows.

---

## The problem

Every compose needs the same shapes: an external person, an external organization, a status flow, a
financial document, an interaction log, an address, a physical place. If each compose defined its own
tables for these, the system would carry seven copies of "contact", seven copies of "order", and no way
to report across them.

## The pattern

```
Master Table  → generic, type-discriminated, lives in the Module layer, shared by every compose
Detail Table  → compose-specific, typed columns, links to master(s) via plain id columns
```

A **master table** holds the columns every domain agrees on, plus a `type` discriminator and the `meta`
jsonb for sparse fields. A **detail table** belongs to one compose and carries only the columns that
compose adds. A detail row points at master rows through ordinary `text` id columns — no foreign-key
constraints (the codebase uses implicit FKs everywhere; see [conventions.md](./conventions.md) §7).

Detail tables are **not** restricted to 1:1. All cardinalities work because they are just id columns:

| Shape | Example |
|-------|---------|
| 1:1 | `lms_course_detail.item_id` → one detail row per course item |
| 1:M | `lms_modules.item_id` → many modules under one course item |
| M:1 | `transaction_lines.item_id` → many lines reference one item |
| M:N | `rst_menu_item_modifiers(item_id, modifier_id)` → junction table |
| Multi-master | `crm_deals(person_id, party_id, stage_id, item_id)` → one detail row links four masters |

---

## The masters

### New foundation modules

These are **foundation modules** — like `identity` (which owns `actors`, `organizations`), their tables
are **unprefixed** because they are universal, not owned by any one feature or compose.

| Module | Table(s) | Discriminator | Covers |
|--------|----------|---------------|--------|
| `party` | `persons` | `type`: lead, contact, customer, student, patient, guest, rider, vendor_contact, instructor | every external individual |
| `party` | `parties` | `type`: company, vendor, insurer, school, clinic, corporate, ngo | every external organization |
| `location` | `locations` | `type`: outlet, table, room, warehouse, ward, bed, virtual, building, floor | every place (hierarchical via `parent_id`) |
| `pipeline` | `pipelines`, `pipeline_stages` | `entity_type` per pipeline | every status flow |
| `commerce` | `transactions`, `transaction_lines` | `type`: order, invoice, purchase_order, sales_order, bill, folio, quote, receipt | every financial document |
| `activity` | `activities` | `type`: call, email, meeting, note, task, log, service_request, visit_note | every interaction log |

### Reused masters (already in the schema — do not duplicate)

| Master | Table | Serves |
|--------|-------|--------|
| Items | `cat_items` (catalog) | products, services, courses, menu items, room types, assets, stock items, drugs, lab tests — via the `type` column |
| Addresses | `geo_addresses` (geo) | all addresses — already polymorphic (`entity_id` + `entity_type`) |
| Scheduling | `sch_*` | appointments, live sessions, table reservations, room availability |
| Workflow | `wf_*` | approval chains, background automation |
| Ledger | `ldg_*` | double-entry accounting |
| Notification / Document / Analytics | respective tables | alerts, attachments, KPIs across composes |

Every master table starts from `baseColumns` (`id`, `organization_id`, `created_at`, `updated_at`,
`deleted_at`, `version`, `meta`). Use the `meta` jsonb for sparse, domain-specific fields rather than a
separate `metadata` column.

---

## Column reference

See the schema files in `apps/server/src/infra/db/schema/` for exact definitions:
`party.ts`, `location.ts`, `pipeline.ts`, `commerce.ts`, `activity.ts`, and the expanded `catalog.ts`.

- **`persons`** — `type`, `first_name`, `last_name`, `email`, `phone`, `source`, `party_id` (their org,
  nullable), `actor_id` (login bridge, nullable). `actors` stays auth-only; a person gets an `actor_id`
  only when they actually log in.
- **`parties`** — `type`, `name`, `domain`, `industry`, `employee_count`. `organizations` is the tenant
  boundary; `parties` are organizations a tenant *manages*, never tenants themselves.
- **`locations`** — `type`, `name`, `code`, `capacity`, `parent_id` (hierarchy), `address_id`, `status`.
- **`pipelines`** — `entity_type`, `name`, `is_default`. **`pipeline_stages`** — `pipeline_id`, `name`,
  `position`; `meta` holds probability / rot period / color.
- **`transactions`** — `type`, `reference_no`, `person_id`, `party_id`, `stage_id`, money columns
  `total_*`, `tax_*`. **`transaction_lines`** — `transaction_id`, `item_id`, `description`, `qty`,
  `unit_price_*`, `tax_rate`, `line_total_*`.
- **`activities`** — `type`, `subject`, `body`, `status`, `actor_id`, `entity_id` + `entity_type`
  (polymorphic target), `due_at`, `completed_at`.

---

## Pipelines and the FSM

`pipelines` + `pipeline_stages` only *store* stages. They do not enforce movement between them. A compose
that sequences an entity (e.g. `crm_deal`) registers a matching state machine with the Core FSM primitive
(see [core.md](./core.md)). The FSM validates the transition; the stage row records where the entity
landed. One is the rulebook, the other is the ledger.

## The polymorphic exception

`activities.entity_id` + `entity_type` point at *any* table, so Postgres cannot enforce a foreign key
there. This is the single accepted exception. Mitigate with application-level validation of the target
plus the composite `(organization_id, entity_type, entity_id)` index for fast lookups. This mirrors the
existing idiom in `geo_addresses` and `inv_movements.reference_id` / `reference_type`.

---

## Compose extension contract

A compose **never** defines its own `contacts`, `accounts`, or `orders`. Instead it:

1. **Seeds** its pipelines (and registers the matching FSMs), its item types, location types, and
   party/person types — from its own `db/seed/`. Use `seedPipeline(orgId, entityType, stages)` from
   `apps/server/src/infra/db/seed.ts`.
2. **Reads** master tables filtered by `organization_id` + `type`.
3. **Adds** detail tables only for the columns it genuinely owns, linking masters via plain id columns.

```typescript
// Read CRM contacts = persons filtered by type
const contacts = await db
  .select()
  .from(persons)
  .where(and(eq(persons.organizationId, orgId), inArray(persons.type, ["contact", "lead"])));

// A detail table links several masters via plain id columns (no references())
export const crmDeals = pgTable(
  "crm_deals",
  {
    ...baseColumns,
    personId: text("person_id"), // → persons
    partyId: text("party_id"),   // → parties
    stageId: text("stage_id"),   // → pipeline_stages
    itemId: text("item_id"),     // → cat_items
    probability: integer("probability"),
    expectedCloseDate: timestamp("expected_close_date"),
  },
  (t) => [index("crm_deals_org_stage_idx").on(t.organizationId, t.stageId)],
);
```

Net effect: a compose drops from ~12 tables to ~3–5 detail tables, and cross-compose reporting becomes a
single query against a master table.

---

## Rules

- Foundation master tables are **unprefixed and plural** (`persons`, `transactions`). Compose detail
  tables and feature-module tables keep their **3-letter prefix** (`crm_deals`, `rst_kot`).
- Never duplicate a master concept as a new compose table. If a compose needs "a customer", that is a
  `persons` row with `type = "customer"`, not a new `xyz_customers` table.
- Link to masters with plain `text("..._id")` columns + composite indexes. No `references()`.
- Put sparse domain fields in `meta`, not new columns, unless the field is queried or indexed.

→ Related: [module.md](./module.md) (foundation vs feature modules) · [compose.md](./compose.md)
(extending masters) · [conventions.md](./conventions.md) §7 (table naming).
