# Phase 2 — Entities

---

```typescript
// rst_outlets
export const rstOutlets = pgTable("rst_outlets", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),  // 'BLR-01', 'MUM-02'
  type: text("type").notNull(),  // dine-in | cloud-kitchen | qsr | cafe | kiosk
  status: text("status").notNull().default("open"),
  // open | closed | temporarily-closed | paused-orders
  address: text("address"),
  location: jsonb("location").$type<{ lat: number; lng: number }>(),
  operatingHours: jsonb("operating_hours").$type<Record<string, { open: string; close: string }>>(),
  acceptsDelivery: boolean("accepts_delivery").default(true),
  acceptsDineIn: boolean("accepts_dine_in").default(true),
  acceptsTakeaway: boolean("accepts_takeaway").default(true),
  deliveryRadius: numeric("delivery_radius", { precision: 5, scale: 2 }).default("5"),
  preparationTimeMinutes: integer("preparation_time_minutes").default(20),
  aggregatorIds: jsonb("aggregator_ids").$type<Record<string, string>>().default({}),
  lastOrderSeq: integer("last_order_seq").default(0),
  lastKotSeq: integer("last_kot_seq").default(0),
  lastBillSeq: integer("last_bill_seq").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// rst_categories
export const rstCategories = pgTable("rst_categories", {
  id: text("id").primaryKey().$defaultFn(createId),
  outletId: text("outlet_id").notNull().references(() => rstOutlets.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  mealPeriod: text("meal_period").default("all"),
  // breakfast | lunch | dinner | all
});

// rst_menu_items
export const rstMenuItems = pgTable("rst_menu_items", {
  id: text("id").primaryKey().$defaultFn(createId),
  outletId: text("outlet_id").notNull().references(() => rstOutlets.id),
  categoryId: text("category_id").references(() => rstCategories.id),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  deliveryPrice: numeric("delivery_price", { precision: 10, scale: 2 }),
  type: text("type").notNull().default("veg"),  // veg | non-veg | vegan | egg
  station: text("station"),  // grill | cold | beverages | tandoor
  isAvailable: boolean("is_available").default(true),
  isPopular: boolean("is_popular").default(false),
  sortOrder: integer("sort_order").default(0),
  thumbnailUrl: text("thumbnail_url"),
  tags: jsonb("tags").$type<string[]>().default([]),
  preparationTimeMinutes: integer("preparation_time_minutes").default(10),
  taxPct: numeric("tax_pct", { precision: 5, scale: 2 }).default("5"),
  createdAt: timestamp("created_at").defaultNow(),
});

// rst_menu_modifiers
export const rstMenuModifiers = pgTable("rst_menu_modifiers", {
  id: text("id").primaryKey().$defaultFn(createId),
  outletId: text("outlet_id").notNull().references(() => rstOutlets.id),
  name: text("name").notNull(),  // 'Spice Level', 'Add-ons', 'Size'
  type: text("type").notNull(),  // single | multi
  required: boolean("required").default(false),
  minSelect: integer("min_select").default(0),
  maxSelect: integer("max_select").default(1),
  options: jsonb("options").notNull().$type<{
    id: string;
    name: string;
    additionalPrice: number;
    isDefault: boolean;
    isAvailable: boolean;
  }[]>(),
});

// rst_menu_item_modifiers (join table)
export const rstMenuItemModifiers = pgTable("rst_menu_item_modifiers", {
  menuItemId: text("menu_item_id").notNull().references(() => rstMenuItems.id),
  modifierId: text("modifier_id").notNull().references(() => rstMenuModifiers.id),
});

// rst_orders
export const rstOrders = pgTable("rst_orders", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  outletId: text("outlet_id").notNull().references(() => rstOutlets.id),
  orderNumber: text("order_number").notNull().unique(),
  type: text("type").notNull(),  // dine-in | takeaway | delivery
  status: text("status").notNull().default("draft"),
  source: text("source").notNull().default("pos"),
  // pos | qr-self-order | customer-app | swiggy | zomato | ubereats | phone
  tableId: text("table_id"),
  tableNumber: text("table_number"),
  coverCount: integer("cover_count"),
  waiterId: text("waiter_id"),
  customerId: text("customer_id"),
  deliveryAddress: jsonb("delivery_address"),
  riderId: text("rider_id"),
  estimatedDeliveryAt: timestamp("estimated_delivery_at"),
  deliveredAt: timestamp("delivered_at"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  tax: numeric("tax", { precision: 10, scale: 2 }).default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).default("0"),
  paymentStatus: text("payment_status").default("pending"),
  paymentMethod: text("payment_method"),
  couponCode: text("coupon_code"),
  specialInstructions: text("special_instructions"),
  aggregatorOrderId: text("aggregator_order_id"),
  ledgerTransactionId: text("ledger_transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// rst_order_items
export const rstOrderItems = pgTable("rst_order_items", {
  id: text("id").primaryKey().$defaultFn(createId),
  orderId: text("order_id").notNull().references(() => rstOrders.id),
  menuItemId: text("menu_item_id").notNull(),
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  modifiers: jsonb("modifiers").$type<{ name: string; option: string; price: number }[]>().default([]),
  note: text("note"),
  status: text("status").default("pending"),
  // pending | preparing | done | voided
});

// rst_tables
export const rstTables = pgTable("rst_tables", {
  id: text("id").primaryKey().$defaultFn(createId),
  outletId: text("outlet_id").notNull().references(() => rstOutlets.id),
  tableNumber: text("table_number").notNull(),
  section: text("section").default("main"),  // indoor | outdoor | bar | private
  capacity: integer("capacity").notNull(),
  status: text("status").notNull().default("available"),
  // available | occupied | reserved | dirty | blocked
  currentOrderId: text("current_order_id"),
  qrCode: text("qr_code").unique(),
  mergedWithIds: jsonb("merged_with_ids").$type<string[]>().default([]),
});

// rst_kots
export const rstKots = pgTable("rst_kots", {
  id: text("id").primaryKey().$defaultFn(createId),
  orderId: text("order_id").notNull().references(() => rstOrders.id),
  outletId: text("outlet_id").notNull(),
  kotNumber: text("kot_number").notNull(),
  status: text("status").notNull().default("sent"),
  // sent | accepted | preparing | ready | cancelled
  station: text("station").notNull(),
  priority: text("priority").default("normal"),
  sentAt: timestamp("sent_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  prepStartAt: timestamp("prep_start_at"),
  readyAt: timestamp("ready_at"),
});

// rst_kot_items
export const rstKotItems = pgTable("rst_kot_items", {
  id: text("id").primaryKey().$defaultFn(createId),
  kotId: text("kot_id").notNull().references(() => rstKots.id),
  orderItemId: text("order_item_id").notNull(),
  menuItemId: text("menu_item_id").notNull(),
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  modifiers: jsonb("modifiers").$type<string[]>().default([]),
  status: text("status").default("pending"),
  // pending | preparing | done | voided
});

// rst_deliveries
export const rstDeliveries = pgTable("rst_deliveries", {
  id: text("id").primaryKey().$defaultFn(createId),
  orderId: text("order_id").notNull().references(() => rstOrders.id),
  outletId: text("outlet_id").notNull(),
  riderId: text("rider_id"),
  status: text("status").notNull().default("pending-assignment"),
  // pending-assignment | assigned | rider-heading-to-outlet | reached-outlet | picked-up | out-for-delivery | delivered | failed | returned
  pickupAddress: text("pickup_address"),
  dropAddress: jsonb("drop_address"),
  distance: numeric("distance", { precision: 6, scale: 2 }),
  estimatedPickupAt: timestamp("estimated_pickup_at"),
  pickedUpAt: timestamp("picked_up_at"),
  estimatedDeliveryAt: timestamp("estimated_delivery_at"),
  deliveredAt: timestamp("delivered_at"),
  riderLocation: jsonb("rider_location").$type<{ lat: number; lng: number; updatedAt: string }>(),
  proofOfDelivery: text("proof_of_delivery"),  // doc id
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// rst_riders
export const rstRiders = pgTable("rst_riders", {
  id: text("id").primaryKey().$defaultFn(createId),
  actorId: text("actor_id").notNull(),
  outletId: text("outlet_id").notNull().references(() => rstOutlets.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  vehicleType: text("vehicle_type"),  // bike | bicycle | car
  status: text("status").default("offline"),
  // available | busy | offline
  currentLocation: jsonb("current_location").$type<{ lat: number; lng: number }>(),
  activeDeliveryId: text("active_delivery_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// rst_bills
export const rstBills = pgTable("rst_bills", {
  id: text("id").primaryKey().$defaultFn(createId),
  orderId: text("order_id").notNull().references(() => rstOrders.id),
  outletId: text("outlet_id").notNull(),
  billNumber: text("bill_number").notNull().unique(),
  status: text("status").notNull().default("open"),
  // open | printed | settled | voided
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  tax: numeric("tax", { precision: 10, scale: 2 }),
  serviceCharge: numeric("service_charge", { precision: 10, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }),
  splitWith: jsonb("split_with").$type<string[]>().default([]),
  payments: jsonb("payments").$type<{
    method: string; amount: number; reference?: string; receivedAt: string;
  }[]>().default([]),
  settledAt: timestamp("settled_at"),
  ledgerTransactionId: text("ledger_transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// rst_shifts
export const rstShifts = pgTable("rst_shifts", {
  id: text("id").primaryKey().$defaultFn(createId),
  outletId: text("outlet_id").notNull().references(() => rstOutlets.id),
  cashierId: text("cashier_id").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  status: text("status").default("open"),
  // open | closing | closed | variance-flagged
  openingBalance: numeric("opening_balance", { precision: 10, scale: 2 }).default("0"),
  closingBalance: numeric("closing_balance", { precision: 10, scale: 2 }),
  expectedBalance: numeric("expected_balance", { precision: 10, scale: 2 }),
  variance: numeric("variance", { precision: 10, scale: 2 }),
  approvedBy: text("approved_by"),
  notes: text("notes"),
});

// rst_ingredients
export const rstIngredients = pgTable("rst_ingredients", {
  id: text("id").primaryKey().$defaultFn(createId),
  outletId: text("outlet_id").notNull().references(() => rstOutlets.id),
  name: text("name").notNull(),
  unit: text("unit").notNull(),  // g | ml | pcs | kg | L
  currentStock: numeric("current_stock", { precision: 10, scale: 3 }).default("0"),
  reorderLevel: numeric("reorder_level", { precision: 10, scale: 3 }).default("0"),
  costPerUnit: numeric("cost_per_unit", { precision: 8, scale: 4 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// rst_recipes
export const rstRecipes = pgTable("rst_recipes", {
  id: text("id").primaryKey().$defaultFn(createId),
  menuItemId: text("menu_item_id").notNull().references(() => rstMenuItems.id),
  ingredients: jsonb("ingredients").notNull().$type<{
    ingredientId: string;
    qty: number;
    unit: string;
  }[]>(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// rst_aggregator_orders
export const rstAggregatorOrders = pgTable("rst_aggregator_orders", {
  id: text("id").primaryKey().$defaultFn(createId),
  outletId: text("outlet_id").notNull(),
  source: text("source").notNull(),  // swiggy | zomato | ubereats
  aggregatorOrderId: text("aggregator_order_id").notNull().unique(),
  rawPayload: jsonb("raw_payload").notNull(),
  internalOrderId: text("internal_order_id"),
  status: text("status").default("received"),
  // received | acknowledged | placed | rejected
  receivedAt: timestamp("received_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  rejectionReason: text("rejection_reason"),
});

// rst_coupons
export const rstCoupons = pgTable("rst_coupons", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),  // percentage | fixed
  value: numeric("value", { precision: 8, scale: 2 }).notNull(),
  minOrderValue: numeric("min_order_value", { precision: 10, scale: 2 }).default("0"),
  maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }),
  usedCount: integer("used_count").default(0),
  maxUses: integer("max_uses"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
});

// rst_table_reservations
export const rstTableReservations = pgTable("rst_table_reservations", {
  id: text("id").primaryKey().$defaultFn(createId),
  outletId: text("outlet_id").notNull(),
  tableId: text("table_id"),
  guestName: text("guest_name").notNull(),
  phone: text("phone").notNull(),
  partySize: integer("party_size").notNull(),
  reservedAt: timestamp("reserved_at").notNull(),
  status: text("status").default("confirmed"),
  // confirmed | seated | no-show | cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
```
