import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  date,
  time,
} from 'drizzle-orm/pg-core'

// ─── Categories ───────────────────────────────────────────────────────────────

export const rstCategories = pgTable('rst_categories', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  parentId: text('parent_id'),
  isActive: boolean('is_active').default(true),
  mealPeriod: text('meal_period').default('all'),
  imageUrl: text('image_url'),
  outletId: text('outlet_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Menu Periods ─────────────────────────────────────────────────────────────

export const rstMenuPeriods = pgTable('rst_menu_periods', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  outletId: text('outlet_id').notNull(),
  name: text('name').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  daysOfWeek: jsonb('days_of_week').$type<number[]>().default([0, 1, 2, 3, 4, 5, 6]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Item Variants ────────────────────────────────────────────────────────────

export const rstItemVariants = pgTable('rst_item_variants', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  itemId: text('item_id').notNull(),
  name: text('name').notNull(),
  priceAdjustment: numeric('price_adjustment', { precision: 8, scale: 2 }).default('0'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
})

// ─── Item Allergens ───────────────────────────────────────────────────────────

export const rstItemAllergens = pgTable('rst_item_allergens', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  itemId: text('item_id').notNull(),
  allergen: text('allergen').notNull(),
  severity: text('severity').default('contains'),
})

// ─── Modifiers ────────────────────────────────────────────────────────────────

export const rstModifiers = pgTable('rst_modifiers', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  priceAdjustment: numeric('price_adjustment', { precision: 8, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
})

export const rstModifierGroups = pgTable('rst_modifier_groups', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  selectionType: text('selection_type').notNull(),
  minSelections: integer('min_selections').default(0),
  maxSelections: integer('max_selections').default(1),
  required: boolean('required').default(false),
  itemIds: jsonb('item_ids').$type<string[]>().default([]),
  modifierIds: jsonb('modifier_ids').$type<string[]>().default([]),
  isActive: boolean('is_active').default(true),
  outletId: text('outlet_id'),
})

// ─── KOT ──────────────────────────────────────────────────────────────────────

export const rstKot = pgTable('rst_kot', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  transactionId: text('transaction_id').notNull(),
  locationId: text('location_id'),
  kotNumber: text('kot_number').notNull(),
  station: text('station').notNull(),
  course: text('course').default('main'),
  priority: text('priority').default('normal'),
  holdFire: text('hold_fire').default('fire'),
  printedAt: timestamp('printed_at'),
  status: text('status').notNull().default('new'),
  sentAt: timestamp('sent_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  prepStartAt: timestamp('prep_start_at'),
  readyAt: timestamp('ready_at'),
  bumpedAt: timestamp('bumped_at'),
  notes: text('notes'),
})

export const rstKotItems = pgTable('rst_kot_items', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  kotId: text('kot_id')
    .notNull()
    .references(() => rstKot.id),
  transactionLineId: text('transaction_line_id').notNull(),
  itemId: text('item_id').notNull(),
  name: text('name').notNull(),
  qty: integer('qty').notNull(),
  notes: text('notes'),
  modifiers: jsonb('modifiers')
    .$type<{ name: string; option: string; price?: number }[]>()
    .default([]),
  status: text('status').default('pending'),
})

// ─── Order History ────────────────────────────────────────────────────────────

export const rstOrderHistory = pgTable('rst_order_history', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  orderId: text('order_id').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  note: text('note'),
  changedAt: timestamp('changed_at').defaultNow(),
})

// ─── Shifts ───────────────────────────────────────────────────────────────────

export const rstShifts = pgTable('rst_shifts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  locationId: text('location_id').notNull(),
  date: date('date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time'),
  shiftType: text('shift_type'),
  status: text('status').default('open'),
  openedBy: text('opened_by'),
  closedBy: text('closed_by'),
  openingBalance: numeric('opening_balance', { precision: 10, scale: 2 }).default('0'),
  closingBalance: numeric('closing_balance', { precision: 10, scale: 2 }),
  expectedBalance: numeric('expected_balance', { precision: 10, scale: 2 }),
  variance: numeric('variance', { precision: 10, scale: 2 }),
  varianceApproved: boolean('variance_approved').default(false),
  approvedBy: text('approved_by'),
  notes: text('notes'),
  openedAt: timestamp('opened_at').defaultNow(),
  closedAt: timestamp('closed_at'),
})

export const rstShiftAssignments = pgTable('rst_shift_assignments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  shiftId: text('shift_id')
    .notNull()
    .references(() => rstShifts.id),
  personId: text('person_id').notNull(),
  role: text('role').notNull(),
  clockIn: timestamp('clock_in'),
  clockOut: timestamp('clock_out'),
  totalHours: numeric('total_hours', { precision: 4, scale: 2 }),
  notes: text('notes'),
})

// ─── Staff ────────────────────────────────────────────────────────────────────

export const rstStaff = pgTable('rst_staff', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  personId: text('person_id').notNull(),
  employeeCode: text('employee_code'),
  outletId: text('outlet_id').notNull(),
  operationalRoles: jsonb('operational_roles').$type<string[]>().default([]),
  isActive: boolean('is_active').default(true),
  hireDate: date('hire_date'),
  exitDate: date('exit_date'),
  hourlyRate: numeric('hourly_rate', { precision: 8, scale: 2 }),
  bankAccount: text('bank_account'),
  emergencyContact: jsonb('emergency_contact').$type<{
    name: string
    phone: string
    relation: string
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Reservations ─────────────────────────────────────────────────────────────

export const rstReservations = pgTable('rst_reservations', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  locationId: text('location_id').notNull(),
  tableId: text('table_id'),
  personId: text('person_id'),
  guestName: text('guest_name').notNull(),
  guestPhone: text('guest_phone'),
  guestEmail: text('guest_email'),
  partySize: integer('party_size').notNull(),
  reservedAt: timestamp('reserved_at').notNull(),
  durationMinutes: integer('duration_minutes').default(90),
  occasion: text('occasion'),
  source: text('source').default('phone'),
  depositAmount: numeric('deposit_amount', { precision: 8, scale: 2 }).default('0'),
  depositPaid: boolean('deposit_paid').default(false),
  notes: text('notes'),
  status: text('status').default('pending'),
  confirmedAt: timestamp('confirmed_at'),
  seatedAt: timestamp('seated_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  noShowAt: timestamp('no_show_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const rstWaitlist = pgTable('rst_waitlist', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  locationId: text('location_id').notNull(),
  guestName: text('guest_name').notNull(),
  guestPhone: text('guest_phone'),
  partySize: integer('party_size').notNull(),
  quotedMinutes: integer('quoted_minutes'),
  status: text('status').default('waiting'),
  joinedAt: timestamp('joined_at').defaultNow(),
  notifiedAt: timestamp('notified_at'),
  seatedAt: timestamp('seated_at'),
  cancelledAt: timestamp('cancelled_at'),
  notes: text('notes'),
})

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const rstRecipes = pgTable('rst_recipes', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  itemId: text('item_id').notNull(),
  name: text('name').notNull(),
  version: integer('version').default(1),
  yieldQty: numeric('yield_qty', { precision: 6, scale: 2 }).notNull(),
  yieldUnit: text('yield_unit').default('portions'),
  isActive: boolean('is_active').default(true),
  instructions: text('instructions'),
  prepTimeMinutes: integer('prep_time_minutes'),
  cookTimeMinutes: integer('cook_time_minutes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const rstRecipeIngredients = pgTable('rst_recipe_ingredients', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => rstRecipes.id),
  itemId: text('item_id').notNull(),
  qty: numeric('qty', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  wastagePct: numeric('wastage_pct', { precision: 5, scale: 2 }).default('0'),
  isOptional: boolean('is_optional').default(false),
})

// ─── Stock Movements ──────────────────────────────────────────────────────────

export const rstStockMovements = pgTable('rst_stock_movements', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  itemId: text('item_id').notNull(),
  outletId: text('outlet_id').notNull(),
  movementType: text('movement_type').notNull(),
  qty: numeric('qty', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  beforeQty: numeric('before_qty', { precision: 10, scale: 3 }),
  afterQty: numeric('after_qty', { precision: 10, scale: 3 }),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  reason: text('reason'),
  performedBy: text('performed_by'),
  costPerUnit: numeric('cost_per_unit', { precision: 10, scale: 3 }),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Equipment ────────────────────────────────────────────────────────────────

export const rstEquipment = pgTable('rst_equipment', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  outletId: text('outlet_id').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  serialNumber: text('serial_number'),
  reference: text('reference'),
  purchaseDate: date('purchase_date'),
  warrantyExpiry: date('warranty_expiry'),
  purchaseCost: numeric('purchase_cost', { precision: 10, scale: 2 }),
  status: text('status').default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const rstEquipmentLogs = pgTable('rst_equipment_logs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  equipmentId: text('equipment_id')
    .notNull()
    .references(() => rstEquipment.id),
  logType: text('log_type').notNull(),
  description: text('description').notNull(),
  serviceDate: date('service_date').notNull(),
  serviceCost: numeric('service_cost', { precision: 10, scale: 2 }),
  performedBy: text('performed_by'),
  notes: text('notes'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Partners ─────────────────────────────────────────────────────────────────

export const rstPartners = pgTable('rst_partners', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  partnerType: text('partner_type').notNull(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  platform: text('platform'),
  storeId: text('store_id'),
  agreementNotes: text('agreement_notes'),
  commissionPct: numeric('commission_pct', { precision: 5, scale: 2 }),
  serviceAreas: jsonb('service_areas').$type<string[]>().default([]),
  handoffMethod: text('handoff_method').default('manual'),
  apiKeyHash: text('api_key_hash'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Aggregator Mappings ──────────────────────────────────────────────────────

export const rstAggregatorMappings = pgTable('rst_aggregator_mappings', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  locationId: text('location_id').notNull(),
  platform: text('platform').notNull(),
  storeId: text('store_id').notNull(),
  apiKeyHash: text('api_key_hash'),
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: text('sync_status').default('idle'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Bills ────────────────────────────────────────────────────────────────────

export const rstBills = pgTable('rst_bills', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  orderId: text('order_id').notNull(),
  outletId: text('outlet_id').notNull(),
  billNumber: text('bill_number').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  discountTotal: numeric('discount_total', { precision: 10, scale: 2 }).default('0'),
  taxTotal: numeric('tax_total', { precision: 10, scale: 2 }).default('0'),
  serviceCharge: numeric('service_charge', { precision: 10, scale: 2 }).default('0'),
  tipAmount: numeric('tip_amount', { precision: 10, scale: 2 }).default('0'),
  roundOff: numeric('round_off', { precision: 4, scale: 2 }).default('0'),
  grandTotal: numeric('grand_total', { precision: 10, scale: 2 }).notNull().default('0'),
  status: text('status').default('open'),
  tableId: text('table_id'),
  coverCount: integer('cover_count'),
  cashierId: text('cashier_id'),
  shiftId: text('shift_id'),
  receiptNumber: text('receipt_number'),
  createdAt: timestamp('created_at').defaultNow(),
  settledAt: timestamp('settled_at'),
  voidedAt: timestamp('voided_at'),
  voidReason: text('void_reason'),
})

export const rstBillPayments = pgTable('rst_bill_payments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  billId: text('bill_id')
    .notNull()
    .references(() => rstBills.id),
  method: text('method').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  referenceNumber: text('reference_number'),
  cardLastFour: text('card_last_four'),
  isRefund: boolean('is_refund').default(false),
  refundReason: text('refund_reason'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const rstBillSplits = pgTable('rst_bill_splits', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  billId: text('bill_id')
    .notNull()
    .references(() => rstBills.id),
  guestLabel: text('guest_label').notNull(),
  itemIds: jsonb('item_ids').$type<string[]>().default([]),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).default('0'),
})

// ─── Discounts ────────────────────────────────────────────────────────────────

export const rstDiscounts = pgTable('rst_discounts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  discountType: text('discount_type').notNull(),
  value: numeric('value', { precision: 8, scale: 2 }).notNull(),
  isPercentage: boolean('is_percentage').default(true),
  appliesTo: text('applies_to').default('order'),
  requiresApproval: boolean('requires_approval').default(false),
  isActive: boolean('is_active').default(true),
  outletId: text('outlet_id'),
  createdAt: timestamp('created_at').defaultNow(),
})
