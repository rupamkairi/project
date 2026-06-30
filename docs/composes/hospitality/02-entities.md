# Phase 2 — Entities

---

## Master Table Architecture

Hospitality does not create its own tables for rooms, room types, guests, reservations, or folios. These are owned by foundation modules and filtered by `type` + `organizationId`.

See `docs/master-tables.md` for full foundation table schemas.

---

## Master Tables (read/filter only — already exist)

### cat_items (room types)

- `type = "room_type"`
- `name`: Deluxe, Suite, Standard, etc.
- `sku`: room type code (DLX, STE, STD)
- `capacity`, `bedType`, `amenities` stored in `meta` (jsonb)
- `baseRate` in `meta` or via `cat_price_lists`
- Hospitality reads: `where type = 'room_type' and organizationId = orgId`

### locations (rooms)

- `type = "room"`
- `name`: room number (e.g. "201")
- `code`: room code
- `capacity`: max occupancy
- `parentId`: floor or wing `location.id` (hierarchy: property → floor → room)
- `status`: available | occupied | housekeeping | maintenance | out_of_order
- `meta`: `{ floor, view, smoking, accessible, roomTypeId }` — `roomTypeId` points to `cat_items.id`

### persons (guests)

- `type = "guest"`
- `firstName`, `lastName`, `email`, `phone`
- `actorId`: nullable — links to platform login if guest has account
- `meta`: `{ nationality, passportNo, loyaltyTier, loyaltyPoints, preferences }`

### transactions + transaction_lines (reservations and folios)

**Reservation** (`type = "order"`):
- `personId` = guest `persons.id`
- `stageId` → `hsp.reservation` pipeline stage (Confirmed, Checked In, etc.)
- `meta`: `{ checkIn, checkOut, roomId (locations.id), adults, children, ratePlanId, channelId, confirmationNumber, source }`
- `transaction_lines`: `itemId` → `cat_items` (room_type), `qty` = nights, `unitPrice` = nightly rate

**Folio/Bill** (`type = "bill"`):
- Linked to reservation transaction via `meta.reservationId`
- `transaction_lines`: each charge (room charge, restaurant, spa, minibar) as a line item

### pipelines + pipeline_stages

- `entityType = "hsp.reservation"`
- Stages: Inquiry → Confirmed → Checked In → Checked Out | Cancelled | No Show
- Seeded via `seedPipeline(orgId, "hsp.reservation", stages)` from `apps/server/src/infra/db/seed.ts`

### activities (housekeeping / maintenance / guest services)

- `type = "service_request"` — housekeeping requests, amenity requests, guest service requests
- `type = "log"` — maintenance logs, incident reports
- `entityId` + `entityType`: `"hsp.reservation"` or `"locations"` (room)
- `actorId` → staff member assigned

---

## Detail Tables (Hospitality-owned, hsp_ prefixed)

These tables are created and owned by the Hospitality compose. They reference master tables by ID.

### hsp_rate_plans

```typescript
export const hspRatePlans = pgTable("hsp_rate_plans", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  mealPlan: text("meal_plan").default("room_only"),
  // room_only | breakfast | half_board | full_board
  cancellationPolicy: jsonb("cancellation_policy").$type<{
    type: string;
    freeCancellationHours: number;
    penaltyPct: number;
  }>().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### hsp_rate_plan_seasons

```typescript
export const hspRatePlanSeasons = pgTable("hsp_rate_plan_seasons", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  ratePlanId: text("rate_plan_id").notNull().references(() => hspRatePlans.id),
  roomTypeId: text("room_type_id").notNull(), // cat_items.id where type = 'room_type'
  startDate: text("start_date").notNull(),    // YYYY-MM-DD
  endDate: text("end_date").notNull(),        // YYYY-MM-DD
  pricePerNight: numeric("price_per_night", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  minNights: integer("min_nights").default(1),
  maxNights: integer("max_nights"),
  conditions: jsonb("conditions").$type<Record<string, unknown>>().default({}), // RuleExpr jsonb
});
```

### hsp_channel_inventory

```typescript
export const hspChannelInventory = pgTable("hsp_channel_inventory", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  channelId: text("channel_id").notNull(), // ota | direct | walk_in | booking-com | expedia
  roomTypeId: text("room_type_id").notNull(), // cat_items.id where type = 'room_type'
  date: text("date").notNull(),            // YYYY-MM-DD
  totalRooms: integer("total_rooms").default(0),
  allocatedRooms: integer("allocated_rooms").default(0),
  blockedRooms: integer("blocked_rooms").default(0),
  rate: numeric("rate", { precision: 10, scale: 2 }),
  lastSyncAt: timestamp("last_sync_at"),
});
```

### hsp_payment_records

```typescript
export const hspPaymentRecords = pgTable("hsp_payment_records", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  transactionId: text("transaction_id").notNull(), // transactions.id (reservation or folio bill)
  method: text("method").notNull(),
  // cash | card | bank_transfer | ota
  gateway: text("gateway"),
  gatewayRef: text("gateway_ref"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  paidAt: timestamp("paid_at").defaultNow(),
  status: text("status").notNull().default("completed"),
  // pending | completed | failed | refunded
});
```

### hsp_housekeeping_assignments

```typescript
export const hspHousekeepingAssignments = pgTable("hsp_housekeeping_assignments", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  locationId: text("location_id").notNull(), // locations.id where type = 'room'
  actorId: text("actor_id").notNull(),        // staff actor id
  date: text("date").notNull(),               // YYYY-MM-DD
  shift: text("shift").default("morning"),    // morning | afternoon | evening
  status: text("status").notNull().default("pending"),
  // pending | in_progress | completed
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  checklistResults: jsonb("checklist_results").$type<Record<string, boolean>>().default({}),
  priority: text("priority").default("normal"), // normal | rush | vip
  taskType: text("task_type").notNull(),
  // departure-clean | stay-over | turndown | deep-clean | inspection | touch-up
  inspectedBy: text("inspected_by"),
  inspectionNotes: text("inspection_notes"),
  inspectionPassed: boolean("inspection_passed"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### hsp_maintenance_requests

```typescript
export const hspMaintenanceRequests = pgTable("hsp_maintenance_requests", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  locationId: text("location_id"), // locations.id — room or common area (nullable for non-room areas)
  reportedById: text("reported_by_id"), // persons.id or actorId
  category: text("category").notNull(),
  // plumbing | electrical | hvac | furniture | it | cleaning | other
  priority: text("priority").notNull().default("medium"),
  // low | medium | high | urgent
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  // open | assigned | in_progress | resolved | closed
  assignedTo: text("assigned_to"),  // actorId of maintenance staff
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  partsUsed: jsonb("parts_used").$type<{ itemId: string; qty: number; name: string }[]>().default([]),
  roomBlockRequired: boolean("room_block_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### hsp_packages

```typescript
export const hspPackages = pgTable("hsp_packages", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  roomTypeId: text("room_type_id"), // cat_items.id — nullable if applies to all room types
  ratePlanId: text("rate_plan_id").references(() => hspRatePlans.id),
  inclusions: jsonb("inclusions").$type<{ type: string; description: string; value: number }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### hsp_package_inclusions

```typescript
export const hspPackageInclusions = pgTable("hsp_package_inclusions", {
  id: text("id").primaryKey().$defaultFn(createId),
  organizationId: text("organization_id").notNull(),
  packageId: text("package_id").notNull().references(() => hspPackages.id),
  inclusionType: text("inclusion_type").notNull(),
  // service | item | activity
  name: text("name").notNull(),
  qty: integer("qty").default(1),
  value: numeric("value", { precision: 10, scale: 2 }).default("0"),
});
```

### hsp_org_config (unchanged — Hospitality-owned config)

```typescript
export const hspOrgConfig = pgTable("hsp_org_config", {
  orgId: text("org_id").primaryKey(),
  propertyName: text("property_name"),
  defaultCheckInTime: text("default_check_in_time").default("14:00"),
  defaultCheckOutTime: text("default_check_out_time").default("12:00"),
  earlyCheckInFee: numeric("early_check_in_fee", { precision: 8, scale: 2 }).default("0"),
  lateCheckOutFee: numeric("late_check_out_fee", { precision: 8, scale: 2 }).default("0"),
  noShowPolicy: jsonb("no_show_policy").$type<{
    chargeNights: number;
    chargeFromDeposit: boolean;
  }>().default({ chargeNights: 1, chargeFromDeposit: true }),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("18"),
  cityTaxPerNight: numeric("city_tax_per_night", { precision: 8, scale: 2 }).default("0"),
  wifiPassword: text("wifi_password"),
  currency: text("currency").default("USD"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```
