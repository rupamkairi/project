# Phase 2 — Entities

---

```typescript
// hsp_room_types
export const hspRoomTypes = pgTable("hsp_room_types", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),  // 'STD', 'DLX', 'SUT', 'PENT'
  description: text("description"),
  maxOccupancy: integer("max_occupancy").notNull(),
  bedType: text("bed_type"),  // king | queen | twin | double
  amenities: jsonb("amenities").$type<string[]>().default([]),
  baseRate: numeric("base_rate", { precision: 10, scale: 2 }).notNull(),
  squareFeet: integer("square_feet"),
  thumbnailUrl: text("thumbnail_url"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

// hsp_rooms
export const hspRooms = pgTable("hsp_rooms", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  roomNumber: text("room_number").notNull().unique(),
  roomTypeId: text("room_type_id").notNull().references(() => hspRoomTypes.id),
  floor: integer("floor").notNull(),
  status: text("status").notNull().default("available"),
  // available | occupied | reserved | blocked | out-of-service
  housekeepingStatus: text("housekeeping_status").notNull().default("clean"),
  // clean | dirty | cleaning-in-progress | inspected | touch-up
  isBlocked: boolean("is_blocked").default(false),
  blockReason: text("block_reason"),
  currentReservationId: text("current_reservation_id"),
  lastCleanedAt: timestamp("last_cleaned_at"),
  lastInspectedAt: timestamp("last_inspected_at"),
  features: jsonb("features").$type<string[]>().default([]),
  // sea-view | balcony | smoking | connecting
  maintenanceNotes: text("maintenance_notes"),
});

// hsp_guest_profiles
export const hspGuestProfiles = pgTable("hsp_guest_profiles", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  actorId: text("actor_id"),  // linked platform actor (optional)
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  nationality: text("nationality"),
  idType: text("id_type"),  // passport | national-id | driving-license
  idNumber: text("id_number"),  // stored encrypted
  preferences: jsonb("preferences").$type<{
    floorPreference?: string;
    pillowType?: string;
    allergies?: string[];
    notes?: string;
  }>(),
  totalStays: integer("total_stays").default(0),
  totalSpend: numeric("total_spend", { precision: 12, scale: 2 }).default("0"),
  vipStatus: text("vip_status").default("standard"),
  // standard | silver | gold | platinum
  createdAt: timestamp("created_at").defaultNow(),
});

// hsp_reservations
export const hspReservations = pgTable("hsp_reservations", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  confirmationNumber: text("confirmation_number").notNull().unique(),
  guestId: text("guest_id").notNull().references(() => hspGuestProfiles.id),
  roomId: text("room_id"),  // null until check-in
  roomTypeId: text("room_type_id").notNull().references(() => hspRoomTypes.id),
  ratePlanId: text("rate_plan_id").notNull(),
  status: text("status").notNull().default("tentative"),
  // tentative | confirmed | checked-in | checked-out | no-show | cancelled
  source: text("source").notNull().default("direct-web"),
  // direct-web | direct-phone | walk-in | ota-booking | ota-expedia | ota-airbnb | gds | corporate | group
  checkInDate: text("check_in_date").notNull(),  // YYYY-MM-DD
  checkOutDate: text("check_out_date").notNull(),
  nights: integer("nights").notNull(),
  adults: integer("adults").notNull().default(1),
  children: integer("children").default(0),
  ratePerNight: numeric("rate_per_night", { precision: 10, scale: 2 }).notNull(),
  totalRate: numeric("total_rate", { precision: 10, scale: 2 }).notNull(),
  depositPaid: numeric("deposit_paid", { precision: 10, scale: 2 }).default("0"),
  specialRequests: text("special_requests"),
  arrivalTime: text("arrival_time"),
  corporateId: text("corporate_id"),
  groupId: text("group_id"),
  folioId: text("folio_id"),
  channelReference: text("channel_reference"),  // OTA booking ref
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// hsp_folios
export const hspFolios = pgTable("hsp_folios", {
  id: text("id").primaryKey().$defaultFn(createId),
  reservationId: text("reservation_id").notNull().references(() => hspReservations.id),
  guestId: text("guest_id").notNull(),
  status: text("status").notNull().default("open"),
  // open | settled | city-ledger
  totalCharges: numeric("total_charges", { precision: 12, scale: 2 }).default("0"),
  totalPayments: numeric("total_payments", { precision: 12, scale: 2 }).default("0"),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").default("USD"),
  settledAt: timestamp("settled_at"),
  ledgerTransactionId: text("ledger_transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// hsp_folio_charges
export const hspFolioCharges = pgTable("hsp_folio_charges", {
  id: text("id").primaryKey().$defaultFn(createId),
  folioId: text("folio_id").notNull().references(() => hspFolios.id),
  type: text("type").notNull(),
  // room | fnb | minibar | laundry | spa | tax | city-tax | misc
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").default("USD"),
  postedAt: timestamp("posted_at").defaultNow(),
  postedBy: text("posted_by").notNull(),
  referenceId: text("reference_id"),  // order id, service req id
  reversed: boolean("reversed").default(false),
  reversedAt: timestamp("reversed_at"),
  reversedBy: text("reversed_by"),
  date: text("date").notNull(),  // YYYY-MM-DD — which night this charge is for
});

// hsp_folio_payments
export const hspFolioPayments = pgTable("hsp_folio_payments", {
  id: text("id").primaryKey().$defaultFn(createId),
  folioId: text("folio_id").notNull().references(() => hspFolios.id),
  method: text("method").notNull(),
  // cash | card | upi | corporate | city-ledger
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  receivedAt: timestamp("received_at").defaultNow(),
  gatewayRef: text("gateway_ref"),
  processedBy: text("processed_by").notNull(),
});

// hsp_rate_plans
export const hspRatePlans = pgTable("hsp_rate_plans", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(),
  // public | corporate | package | ota | promotion
  mealPlan: text("meal_plan").default("ep"),
  // ep (room only) | cp (+ breakfast) | map (+ breakfast + dinner) | ap (all meals)
  minStay: integer("min_stay").default(1),
  maxAdvanceBookingDays: integer("max_advance_booking_days"),
  cancellationPolicy: jsonb("cancellation_policy").$type<{
    type: string;
    freeCancellationHours: number;
    penaltyPct: number;
  }>().notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// hsp_rate_plan_prices
export const hspRatePlanPrices = pgTable("hsp_rate_plan_prices", {
  id: text("id").primaryKey().$defaultFn(createId),
  ratePlanId: text("rate_plan_id").notNull().references(() => hspRatePlans.id),
  roomTypeId: text("room_type_id").notNull().references(() => hspRoomTypes.id),
  baseRate: numeric("base_rate", { precision: 10, scale: 2 }).notNull(),
  extraAdultRate: numeric("extra_adult_rate", { precision: 10, scale: 2 }).default("0"),
  extraChildRate: numeric("extra_child_rate", { precision: 10, scale: 2 }).default("0"),
  weekendSurcharge: numeric("weekend_surcharge", { precision: 10, scale: 2 }).default("0"),
});

// hsp_rate_overrides (seasonal or date-specific overrides)
export const hspRateOverrides = pgTable("hsp_rate_overrides", {
  id: text("id").primaryKey().$defaultFn(createId),
  ratePlanId: text("rate_plan_id").notNull().references(() => hspRatePlans.id),
  roomTypeId: text("room_type_id").notNull().references(() => hspRoomTypes.id),
  date: text("date").notNull(),  // YYYY-MM-DD
  rate: numeric("rate", { precision: 10, scale: 2 }),
  minStay: integer("min_stay"),
  stopSell: boolean("stop_sell").default(false),
  closeToArrival: boolean("close_to_arrival").default(false),
});

// hsp_housekeeping_tasks
export const hspHousekeepingTasks = pgTable("hsp_housekeeping_tasks", {
  id: text("id").primaryKey().$defaultFn(createId),
  roomId: text("room_id").notNull().references(() => hspRooms.id),
  type: text("type").notNull(),
  // departure-clean | stay-over | turndown | deep-clean | inspection | touch-up
  status: text("status").notNull().default("pending"),
  // pending | assigned | in-progress | done | inspected | failed
  assignedTo: text("assigned_to"),
  assignedBy: text("assigned_by"),
  priority: text("priority").default("normal"),  // normal | rush | vip
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  inspectedBy: text("inspected_by"),
  inspectionNotes: text("inspection_notes"),
  inspectionPassed: boolean("inspection_passed"),
  checklistResults: jsonb("checklist_results").$type<Record<string, boolean>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// hsp_maintenance_requests
export const hspMaintenanceRequests = pgTable("hsp_maintenance_requests", {
  id: text("id").primaryKey().$defaultFn(createId),
  roomId: text("room_id"),  // null for common areas
  location: text("location").notNull(),
  category: text("category").notNull(),
  // plumbing | electrical | hvac | furniture | it | cleaning
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  // low | medium | high | urgent
  status: text("status").notNull().default("open"),
  // open | assigned | in-progress | resolved | closed
  reportedBy: text("reported_by").notNull(),
  assignedTo: text("assigned_to"),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  partsUsed: jsonb("parts_used").$type<{ itemId: string; qty: number; name: string }[]>().default([]),
  roomBlockRequired: boolean("room_block_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// hsp_channel_inventory
export const hspChannelInventory = pgTable("hsp_channel_inventory", {
  id: text("id").primaryKey().$defaultFn(createId),
  roomTypeId: text("room_type_id").notNull().references(() => hspRoomTypes.id),
  channel: text("channel").notNull(),  // booking-com | expedia | airbnb | direct
  date: text("date").notNull(),  // YYYY-MM-DD
  allotment: integer("allotment").default(0),
  booked: integer("booked").default(0),
  available: integer("available").default(0),
  rate: numeric("rate", { precision: 10, scale: 2 }),
  lastSyncAt: timestamp("last_sync_at"),
});

// hsp_service_requests
export const hspServiceRequests = pgTable("hsp_service_requests", {
  id: text("id").primaryKey().$defaultFn(createId),
  reservationId: text("reservation_id").notNull().references(() => hspReservations.id),
  guestId: text("guest_id").notNull(),
  roomId: text("room_id"),
  type: text("type").notNull(),
  // housekeeping | fnb | concierge | maintenance | other
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  // pending | assigned | in-progress | completed | cancelled
  priority: text("priority").default("normal"),
  requestedAt: timestamp("requested_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
});

// hsp_group_bookings
export const hspGroupBookings = pgTable("hsp_group_bookings", {
  id: text("id").primaryKey().$defaultFn(createId),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  contactId: text("contact_id"),
  checkInDate: text("check_in_date").notNull(),
  checkOutDate: text("check_out_date").notNull(),
  roomCount: integer("room_count").notNull(),
  status: text("status").default("tentative"),
  // tentative | confirmed | checked-in | completed | cancelled
  contractDocId: text("contract_doc_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// hsp_org_config
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
  lastConfirmationSeq: integer("last_confirmation_seq").default(0),
  wifiPassword: text("wifi_password"),
  currency: text("currency").default("USD"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```
