import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  date,
  time,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// rst_categories — Menu categories (starters, mains, etc.)
export const rstCategories = pgTable(
  "rst_categories",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0),
    parentId: text("parent_id"),
    isActive: boolean("is_active").default(true),
    mealPeriod: text("meal_period").default("all"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_categories_org_idx").on(table.organizationId),
  ],
);

// rst_modifiers — Add-on modifier options
export const rstModifiers = pgTable(
  "rst_modifiers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    priceAdjustment: numeric("price_adjustment", { precision: 8, scale: 2 }).default("0"),
    isAvailable: boolean("is_available").default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_modifiers_org_idx").on(table.organizationId),
  ],
);

// rst_modifier_groups — Groups of modifiers linked to menu items
export const rstModifierGroups = pgTable(
  "rst_modifier_groups",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    selectionType: text("selection_type").notNull().default("single"),
    required: boolean("required").default(false),
    minSelect: integer("min_select").default(0),
    maxSelect: integer("max_select").default(1),
    itemIds: jsonb("item_ids").$type<string[]>().default([]),
    modifierIds: jsonb("modifier_ids").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_modifier_groups_org_idx").on(table.organizationId),
  ],
);

// rst_kot — Kitchen Order Tickets
export const rstKot = pgTable(
  "rst_kot",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    transactionId: text("transaction_id").notNull(),
    locationId: text("location_id"),
    kotNumber: text("kot_number").notNull(),
    station: text("station").notNull(),
    priority: text("priority").default("normal"),
    printedAt: timestamp("printed_at"),
    status: text("status").notNull().default("sent"),
    sentAt: timestamp("sent_at").defaultNow(),
    acceptedAt: timestamp("accepted_at"),
    prepStartAt: timestamp("prep_start_at"),
    readyAt: timestamp("ready_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_kot_org_transaction_idx").on(table.organizationId, table.transactionId),
    index("rst_kot_org_status_idx").on(table.organizationId, table.status),
    index("rst_kot_org_station_idx").on(table.organizationId, table.station),
  ],
);

// rst_kot_items — Line items within a KOT
export const rstKotItems = pgTable(
  "rst_kot_items",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    kotId: text("kot_id").notNull().references(() => rstKot.id),
    transactionLineId: text("transaction_line_id").notNull(),
    itemId: text("item_id").notNull(),
    name: text("name").notNull(),
    qty: integer("qty").notNull(),
    notes: text("notes"),
    modifiers: jsonb("modifiers").$type<{ name: string; option: string; price?: number }[]>().default([]),
    status: text("status").default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_kot_items_kot_idx").on(table.kotId),
  ],
);

// rst_deliveries — Delivery tracking detail per order
export const rstDeliveries = pgTable(
  "rst_deliveries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    transactionId: text("transaction_id").notNull(),
    personId: text("person_id"),
    stageId: text("stage_id"),
    status: text("status").notNull().default("pending-assignment"),
    pickupAt: timestamp("pickup_at"),
    deliveredAt: timestamp("delivered_at"),
    deliveryAddress: text("delivery_address"),
    distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
    estimatedDeliveryAt: timestamp("estimated_delivery_at"),
    riderLocation: jsonb("rider_location").$type<{ lat: number; lng: number; updatedAt: string } | null>(),
    proofOfDelivery: text("proof_of_delivery"),
    failureReason: text("failure_reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("rst_deliveries_org_transaction_idx").on(table.organizationId, table.transactionId),
    index("rst_deliveries_org_person_idx").on(table.organizationId, table.personId),
    index("rst_deliveries_org_status_idx").on(table.organizationId, table.status),
  ],
);

// rst_shifts — Staff shifts per outlet
export const rstShifts = pgTable(
  "rst_shifts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    locationId: text("location_id").notNull(),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time"),
    shiftType: text("shift_type"),
    status: text("status").default("open"),
    openingBalance: numeric("opening_balance", { precision: 10, scale: 2 }).default("0"),
    closingBalance: numeric("closing_balance", { precision: 10, scale: 2 }),
    expectedBalance: numeric("expected_balance", { precision: 10, scale: 2 }),
    variance: numeric("variance", { precision: 10, scale: 2 }),
    approvedBy: text("approved_by"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_shifts_org_location_idx").on(table.organizationId, table.locationId),
    index("rst_shifts_org_status_idx").on(table.organizationId, table.status),
  ],
);

// rst_shift_assignments — Who worked which shift
export const rstShiftAssignments = pgTable(
  "rst_shift_assignments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    shiftId: text("shift_id").notNull().references(() => rstShifts.id),
    personId: text("person_id").notNull(),
    role: text("role").notNull(),
    clockIn: timestamp("clock_in"),
    clockOut: timestamp("clock_out"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_shift_assignments_shift_idx").on(table.shiftId),
  ],
);

// rst_recipes — Ingredient breakdown per menu item
export const rstRecipes = pgTable(
  "rst_recipes",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    itemId: text("item_id").notNull(),
    version: integer("version").default(1),
    yield: numeric("yield", { precision: 6, scale: 2 }),
    isActive: boolean("is_active").default(true),
    updatedAt: timestamp("updated_at").defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_recipes_org_item_idx").on(table.organizationId, table.itemId),
  ],
);

// rst_recipe_ingredients — Ingredient rows per recipe
export const rstRecipeIngredients = pgTable(
  "rst_recipe_ingredients",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    recipeId: text("recipe_id").notNull().references(() => rstRecipes.id),
    itemId: text("item_id").notNull(),
    qty: numeric("qty", { precision: 10, scale: 3 }).notNull(),
    unit: text("unit").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("rst_recipe_ingredients_recipe_idx").on(table.recipeId),
  ],
);

// rst_reservations — Table reservation records
export const rstReservations = pgTable(
  "rst_reservations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    locationId: text("location_id").notNull(),
    personId: text("person_id"),
    partySize: integer("party_size").notNull(),
    reservedAt: timestamp("reserved_at").notNull(),
    notes: text("notes"),
    status: text("status").default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("rst_reservations_org_location_idx").on(table.organizationId, table.locationId),
    index("rst_reservations_org_status_idx").on(table.organizationId, table.status),
  ],
);

// rst_aggregator_orders — Raw aggregator webhook records + mapping
export const rstAggregatorOrders = pgTable(
  "rst_aggregator_orders",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    source: text("source").notNull(),
    aggregatorOrderId: text("aggregator_order_id").notNull(),
    outletId: text("outlet_id").notNull(),
    internalOrderId: text("internal_order_id"),
    rawPayload: jsonb("raw_payload"),
    status: text("status").notNull().default("received"),
    rejectionReason: text("rejection_reason"),
    receivedAt: timestamp("received_at").defaultNow(),
    acknowledgedAt: timestamp("acknowledged_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("rst_aggregator_orders_source_id_idx").on(table.source, table.aggregatorOrderId),
    index("rst_aggregator_orders_org_idx").on(table.organizationId),
    index("rst_aggregator_orders_outlet_idx").on(table.outletId),
    index("rst_aggregator_orders_status_idx").on(table.status),
  ],
);

// Types
export type RstCategory = typeof rstCategories.$inferSelect;
export type RstModifier = typeof rstModifiers.$inferSelect;
export type RstModifierGroup = typeof rstModifierGroups.$inferSelect;
export type RstKot = typeof rstKot.$inferSelect;
export type RstKotItem = typeof rstKotItems.$inferSelect;
export type RstDelivery = typeof rstDeliveries.$inferSelect;
export type RstShift = typeof rstShifts.$inferSelect;
export type RstShiftAssignment = typeof rstShiftAssignments.$inferSelect;
export type RstRecipe = typeof rstRecipes.$inferSelect;
export type RstRecipeIngredient = typeof rstRecipeIngredients.$inferSelect;
export type RstReservation = typeof rstReservations.$inferSelect;
export type RstAggregatorOrder = typeof rstAggregatorOrders.$inferSelect;
