// Restaurant Compose — detail tables (prefixed `rst_`).
//
// The restaurant compose reuses shared master tables (cat_items, cat_categories,
// cat_variants, transactions, locations, persons, activities) and defines its
// own detail tables here for the workflow it genuinely owns (menu periods,
// modifiers, KOT, shifts, staff, reservations, recipes, stock movements,
// partners, discounts, bill payments/splits, equipment logs). Each detail row
// links to a master via a plain `text(...)` id column — no `references()`
// (implicit FKs, per docs/agents/master-tables.md).
//
// Master-backed restaurant entities have NO schema file here:
//   Outlet / Table      → locations
//   Menu item           → cat_items (type = "menu_item")
//   Menu category       → cat_categories
//   Menu variant        → cat_variants
//   Allergen            → cat_items.meta.allergens
//   Order               → transactions (type = "order")
//   Bill                → transactions (type = "bill")
//   Equipment asset     → cat_items (type = "asset")
//   Order history       → activities
//
// All tables extend `baseColumns` (id, organizationId, createdAt, updatedAt,
// deletedAt, version, meta) imported from the identity module's helpers.

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
import { baseColumns } from '@db/schema/helpers'
import { relations } from 'drizzle-orm'
import { transactions } from '@db/schema/commerce'

// ─── Menu Periods ─────────────────────────────────────────────────────────────

export const rstMenuPeriods = pgTable('rst_menu_periods', {
  ...baseColumns,
  outletId: text('outlet_id').notNull(),
  name: text('name').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  daysOfWeek: jsonb('days_of_week').$type<number[]>().default([0, 1, 2, 3, 4, 5, 6]),
  isActive: boolean('is_active').default(true),
})

// ─── Modifiers ────────────────────────────────────────────────────────────────

export const rstModifiers = pgTable('rst_modifiers', {
  ...baseColumns,
  name: text('name').notNull(),
  priceAdjustment: numeric('price_adjustment', { precision: 8, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
})

export const rstModifierGroups = pgTable('rst_modifier_groups', {
  ...baseColumns,
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
  ...baseColumns,
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
  ...baseColumns,
  kotId: text('kot_id').notNull(),
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

// ─── Shifts ───────────────────────────────────────────────────────────────────

export const rstShifts = pgTable('rst_shifts', {
  ...baseColumns,
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
  ...baseColumns,
  shiftId: text('shift_id').notNull(),
  personId: text('person_id').notNull(),
  role: text('role').notNull(),
  clockIn: timestamp('clock_in'),
  clockOut: timestamp('clock_out'),
  totalHours: numeric('total_hours', { precision: 4, scale: 2 }),
  notes: text('notes'),
  bookingId: text('booking_id'),
})

// ─── Staff ────────────────────────────────────────────────────────────────────

export const rstStaff = pgTable('rst_outlet_assignments', {
  ...baseColumns,
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
})

export const rstOutletAssignments = rstStaff

// ─── Reservations ─────────────────────────────────────────────────────────────

export const rstReservations = pgTable('rst_reservations', {
  ...baseColumns,
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
  bookingId: text('booking_id'),
})

export const rstWaitlist = pgTable('rst_waitlist', {
  ...baseColumns,
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
  ...baseColumns,
  itemId: text('item_id').notNull(),
  name: text('name').notNull(),
  yieldQty: numeric('yield_qty', { precision: 6, scale: 2 }).notNull(),
  yieldUnit: text('yield_unit').default('portions'),
  isActive: boolean('is_active').default(true),
  instructions: text('instructions'),
  prepTimeMinutes: integer('prep_time_minutes'),
  cookTimeMinutes: integer('cook_time_minutes'),
  createdBy: text('created_by'),
})

export const rstRecipeIngredients = pgTable('rst_recipe_ingredients', {
  ...baseColumns,
  recipeId: text('recipe_id').notNull(),
  itemId: text('item_id').notNull(),
  qty: numeric('qty', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  wastagePct: numeric('wastage_pct', { precision: 5, scale: 2 }).default('0'),
  isOptional: boolean('is_optional').default(false),
})

// ─── Stock Movements ──────────────────────────────────────────────────────────

export const rstStockMovements = pgTable('rst_stock_movements', {
  ...baseColumns,
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
})

// ─── Equipment Logs ───────────────────────────────────────────────────────────

export const rstEquipmentLogs = pgTable('rst_equipment_logs', {
  ...baseColumns,
  itemId: text('item_id').notNull(),
  logType: text('log_type').notNull(),
  description: text('description').notNull(),
  serviceDate: date('service_date').notNull(),
  serviceCost: numeric('service_cost', { precision: 10, scale: 2 }),
  performedBy: text('performed_by'),
  notes: text('notes'),
  resolvedAt: timestamp('resolved_at'),
})

// ─── Partners ─────────────────────────────────────────────────────────────────

export const rstPartners = pgTable('rst_partners', {
  ...baseColumns,
  partyId: text('party_id'),
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
})

// ─── Aggregator Mappings ──────────────────────────────────────────────────────

export const rstAggregatorMappings = pgTable('rst_aggregator_mappings', {
  ...baseColumns,
  locationId: text('location_id').notNull(),
  platform: text('platform').notNull(),
  storeId: text('store_id').notNull(),
  apiKeyHash: text('api_key_hash'),
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: text('sync_status').default('idle'),
})

// ─── Bill Payments / Splits ───────────────────────────────────────────────────

export const rstBillPayments = pgTable('rst_bill_payments', {
  ...baseColumns,
  transactionId: text('transaction_id').notNull(),
  method: text('method').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  referenceNumber: text('reference_number'),
  cardLastFour: text('card_last_four'),
  isRefund: boolean('is_refund').default(false),
  refundReason: text('refund_reason'),
})

export const rstBillSplits = pgTable('rst_bill_splits', {
  ...baseColumns,
  transactionId: text('transaction_id').notNull(),
  guestLabel: text('guest_label').notNull(),
  itemIds: jsonb('item_ids').$type<string[]>().default([]),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).default('0'),
})

// ─── Discounts ────────────────────────────────────────────────────────────────

export const rstDiscounts = pgTable('rst_discounts', {
  ...baseColumns,
  name: text('name').notNull(),
  discountType: text('discount_type').notNull(),
  value: numeric('value', { precision: 8, scale: 2 }).notNull(),
  isPercentage: boolean('is_percentage').default(true),
  appliesTo: text('applies_to').default('order'),
  requiresApproval: boolean('requires_approval').default(false),
  isActive: boolean('is_active').default(true),
  outletId: text('outlet_id'),
})

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const rstKotRelations = relations(rstKot, ({ many }) => ({
  items: many(rstKotItems),
}))

export const rstKotItemsRelations = relations(rstKotItems, ({ one }) => ({
  kot: one(rstKot, { fields: [rstKotItems.kotId], references: [rstKot.id] }),
}))

export const rstRecipesRelations = relations(rstRecipes, ({ many }) => ({
  ingredients: many(rstRecipeIngredients),
}))

export const rstRecipeIngredientsRelations = relations(rstRecipeIngredients, ({ one }) => ({
  recipe: one(rstRecipes, { fields: [rstRecipeIngredients.recipeId], references: [rstRecipes.id] }),
}))

export const rstShiftAssignmentsRelations = relations(rstShiftAssignments, ({ one }) => ({
  shift: one(rstShifts, { fields: [rstShiftAssignments.shiftId], references: [rstShifts.id] }),
}))

export const rstShiftsRelations = relations(rstShifts, ({ many }) => ({
  assignments: many(rstShiftAssignments),
}))

export const rstBillPaymentsRelations = relations(rstBillPayments, ({ one }) => ({
  bill: one(transactions, {
    fields: [rstBillPayments.transactionId],
    references: [transactions.id],
  }),
}))

export const rstBillSplitsRelations = relations(rstBillSplits, ({ one }) => ({
  bill: one(transactions, {
    fields: [rstBillSplits.transactionId],
    references: [transactions.id],
  }),
}))
