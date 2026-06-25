import {
  pgTable, text, integer, boolean, numeric, timestamp, jsonb, date, time,
} from "drizzle-orm/pg-core";

// ─── Categories ───────────────────────────────────────────────────────────────

export const rstCategories = pgTable("rst_categories", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  parentId: text("parent_id"),
  isActive: boolean("is_active").default(true),
  mealPeriod: text("meal_period").default("all"),
});

// ─── KOT ──────────────────────────────────────────────────────────────────────

export const rstKot = pgTable("rst_kot", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  transactionId: text("transaction_id").notNull(),
  locationId: text("location_id"),
  kotNumber: text("kot_number").notNull(),
  station: text("station").notNull(),
  priority: text("priority").default("normal"),
  printedAt: timestamp("printed_at"),
  status: text("status").notNull().default("new"),
  sentAt: timestamp("sent_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  prepStartAt: timestamp("prep_start_at"),
  readyAt: timestamp("ready_at"),
  notes: text("notes"),
});

export const rstKotItems = pgTable("rst_kot_items", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  kotId: text("kot_id").notNull().references(() => rstKot.id),
  transactionLineId: text("transaction_line_id").notNull(),
  itemId: text("item_id").notNull(),
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  notes: text("notes"),
  modifiers: jsonb("modifiers").$type<string[]>().default([]),
  status: text("status").default("pending"),
});

// ─── Deliveries ───────────────────────────────────────────────────────────────

export const rstDeliveries = pgTable("rst_deliveries", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  transactionId: text("transaction_id").notNull(),
  personId: text("person_id"),
  stageId: text("stage_id"),
  trackingCode: text("tracking_code"),
  pickupAt: timestamp("pickup_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryAddress: text("delivery_address"),
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
  estimatedDeliveryAt: timestamp("estimated_delivery_at"),
  riderLocation: jsonb("rider_location").$type<{ lat: number; lng: number; updatedAt: string }>(),
  proofOfDelivery: text("proof_of_delivery"),
  failureReason: text("failure_reason"),
  status: text("status").notNull().default("unassigned"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Shifts ───────────────────────────────────────────────────────────────────

export const rstShifts = pgTable("rst_shifts", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  locationId: text("location_id").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  shiftType: text("shift_type"),
  status: text("status").default("open"),
  openedBy: text("opened_by"),
  closedBy: text("closed_by"),
  openingBalance: numeric("opening_balance", { precision: 10, scale: 2 }).default("0"),
  closingBalance: numeric("closing_balance", { precision: 10, scale: 2 }),
  variance: numeric("variance", { precision: 10, scale: 2 }),
  approvedBy: text("approved_by"),
  notes: text("notes"),
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const rstShiftAssignments = pgTable("rst_shift_assignments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  shiftId: text("shift_id").notNull().references(() => rstShifts.id),
  personId: text("person_id").notNull(),
  role: text("role").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
});

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const rstRecipes = pgTable("rst_recipes", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  itemId: text("item_id").notNull(),
  version: integer("version").default(1),
  yield: numeric("yield", { precision: 6, scale: 2 }),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rstRecipeIngredients = pgTable("rst_recipe_ingredients", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  recipeId: text("recipe_id").notNull().references(() => rstRecipes.id),
  itemId: text("item_id").notNull(),
  qty: numeric("qty", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
});

// ─── Reservations ─────────────────────────────────────────────────────────────

export const rstReservations = pgTable("rst_reservations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  locationId: text("location_id").notNull(),
  personId: text("person_id"),
  partySize: integer("party_size").notNull(),
  reservedAt: timestamp("reserved_at").notNull(),
  notes: text("notes"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Modifiers ────────────────────────────────────────────────────────────────

export const rstModifiers = pgTable("rst_modifiers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 8, scale: 2 }).default("0"),
});

export const rstModifierGroups = pgTable("rst_modifier_groups", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  selectionType: text("selection_type").notNull(),
  required: boolean("required").default(false),
  itemIds: jsonb("item_ids").$type<string[]>().default([]),
  modifierIds: jsonb("modifier_ids").$type<string[]>().default([]),
});

// ─── Aggregator mappings ──────────────────────────────────────────────────────

export const rstAggregatorMappings = pgTable("rst_aggregator_mappings", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  locationId: text("location_id").notNull(),
  platform: text("platform").notNull(),
  storeId: text("store_id").notNull(),
  apiKeyHash: text("api_key_hash"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status").default("idle"),
  createdAt: timestamp("created_at").defaultNow(),
});
