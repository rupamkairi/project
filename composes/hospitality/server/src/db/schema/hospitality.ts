import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  baseColumns,
} from '@db/schema/helpers'
import { date } from 'drizzle-orm/pg-core'

// --- Rate Plans ------------------------------------------------------------
// Rate plan definitions with occupancy rules, meal plans, cancellation terms.
// Room types → cat_items (type = "room_type"). Pricing → cat_price_lists + cat_price_rules.
export const hspRatePlan = pgTable(
  'hsp_rate_plans',
  {
    ...baseColumns,
    propertyId: text('property_id').notNull(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    minStay: integer('min_stay').notNull().default(1),
    maxStay: integer('max_stay'),
    minGuests: integer('min_guests').notNull().default(1),
    maxGuests: integer('max_guests').notNull().default(1),
    maxAdults: integer('max_adults').notNull().default(2),
    maxChildren: integer('max_children').notNull().default(0),
    mealPlan: text('meal_plan'),
    extraPersonCharge: jsonb('extra_person_charge'),
    extraChildCharge: jsonb('extra_child_charge'),
    cancellationPolicy: jsonb('cancellation_policy'),
    terms: text('terms'),
  },
  (table) => [
    index('hsp_rate_plans_org_property_idx').on(table.organizationId, table.propertyId),
    index('hsp_rate_plans_org_code_idx').on(table.organizationId, table.code),
  ],
)

// --- Rate Overrides ---------------------------------------------------------
// Seasonal/date overrides, channel-specific pricing and allocation.
export const hspRateOverride = pgTable(
  'hsp_rate_overrides',
  {
    ...baseColumns,
    ratePlanId: text('rate_plan_id').notNull(),
    roomTypeItemId: text('room_type_item_id').notNull(),
    date: date('date').notNull(),
    priceOverride: jsonb('price_override'),
    allocationOverride: integer('allocation_override'),
    channelPartnerId: text('channel_partner_id'),
    isClosed: boolean('is_closed').notNull().default(false),
    minStayOverride: integer('min_stay_override'),
    maxStayOverride: integer('max_stay_override'),
  },
  (table) => [
    index('hsp_rate_overrides_org_plan_date_idx').on(
      table.organizationId,
      table.ratePlanId,
      table.date,
    ),
    index('hsp_rate_overrides_org_channel_idx').on(table.organizationId, table.channelPartnerId),
  ],
)

// --- Reservations -----------------------------------------------------------
// Reservation master. Rooms linked via hsp_reservation_rooms. Bookings → sch_bookings.
export const hspReservation = pgTable(
  'hsp_reservations',
  {
    ...baseColumns,
    reservationNumber: text('reservation_number').notNull(),
    propertyId: text('property_id').notNull(),
    personId: text('person_id').notNull(),
    partyId: text('party_id'),
    bookingId: text('booking_id'),
    status: text('status').notNull().default('hold'),
    holdExpiresAt: timestamp('hold_expires_at'),
    source: text('source').notNull().default('direct'),
    channelPartnerId: text('channel_partner_id'),
    groupId: text('group_id'),
    groupName: text('group_name'),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    guestCount: integer('guest_count').notNull().default(1),
    adultCount: integer('adult_count').notNull().default(1),
    childCount: integer('child_count').notNull().default(0),
    confirmedAt: timestamp('confirmed_at'),
    cancelledAt: timestamp('cancelled_at'),
    cancellationReason: text('cancellation_reason'),
    noShowAt: timestamp('no_show_at'),
    checkedInAt: timestamp('checked_in_at'),
    checkedOutAt: timestamp('checked_out_at'),
    extendedToDate: date('extended_to_date'),
    earlyDepartureAt: timestamp('early_departure_at'),
    arrivalTime: text('arrival_time'),
    departureTime: text('departure_time'),
    specialRequests: text('special_requests'),
    notes: text('notes'),
    createdByActorId: text('created_by_actor_id'),
  },
  (table) => [
    index('hsp_reservations_org_property_idx').on(table.organizationId, table.propertyId),
    index('hsp_reservations_org_person_idx').on(table.organizationId, table.personId),
    index('hsp_reservations_org_status_idx').on(table.organizationId, table.status),
    index('hsp_reservations_org_dates_idx').on(table.organizationId, table.checkIn, table.checkOut),
    index('hsp_reservations_org_group_idx').on(table.organizationId, table.groupId),
    index('hsp_reservations_org_number_idx').on(table.organizationId, table.reservationNumber),
  ],
)

// --- Reservation Rooms -----------------------------------------------------
// Room-level assignment within a reservation.
export const hspReservationRoom = pgTable(
  'hsp_reservation_rooms',
  {
    ...baseColumns,
    reservationId: text('reservation_id').notNull(),
    roomLocationId: text('room_location_id'),
    roomTypeItemId: text('room_type_item_id').notNull(),
    ratePlanId: text('rate_plan_id'),
    roomCount: integer('room_count').notNull().default(1),
    dailyRate: jsonb('daily_rate'),
    status: text('status').notNull().default('pending'),
    assignedRoomId: text('assigned_room_id'),
    assignedAt: timestamp('assigned_at'),
  },
  (table) => [
    index('hsp_res_rooms_org_reservation_idx').on(table.organizationId, table.reservationId),
    index('hsp_res_rooms_org_room_idx').on(table.organizationId, table.assignedRoomId),
  ],
)

// --- Room Status History ---------------------------------------------------
// Audit trail of room operational status changes.
export const hspRoomStatusHistory = pgTable(
  'hsp_room_status_history',
  {
    ...baseColumns,
    roomLocationId: text('room_location_id').notNull(),
    status: text('status').notNull(),
    previousStatus: text('previous_status'),
    changedByActorId: text('changed_by_actor_id'),
    reason: text('reason'),
    reservationId: text('reservation_id'),
  },
  (table) => [
    index('hsp_room_status_hist_org_room_idx').on(table.organizationId, table.roomLocationId),
    index('hsp_room_status_hist_org_date_idx').on(table.organizationId, table.createdAt),
  ],
)

// --- Housekeeping ----------------------------------------------------------
// Cleaning/inspection tasks per room.
export const hspHousekeeping = pgTable(
  'hsp_housekeeping',
  {
    ...baseColumns,
    propertyId: text('property_id').notNull(),
    roomLocationId: text('room_location_id').notNull(),
    taskType: text('task_type').notNull().default('cleaning'),
    status: text('status').notNull().default('queued'),
    priority: text('priority').notNull().default('normal'),
    assignedActorId: text('assigned_actor_id'),
    scheduledDate: date('scheduled_date'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    inspectedById: text('inspected_by_id'),
    inspectedAt: timestamp('inspected_at'),
    inspectionResult: text('inspection_result'),
    linenNotes: text('linen_notes'),
    minibarNotes: text('minibar_notes'),
    maintenanceIssues: jsonb('maintenance_issues'),
    notes: text('notes'),
    reservationId: text('reservation_id'),
  },
  (table) => [
    index('hsp_hk_org_property_status_idx').on(
      table.organizationId,
      table.propertyId,
      table.status,
    ),
    index('hsp_hk_org_room_idx').on(table.organizationId, table.roomLocationId),
    index('hsp_hk_org_assignee_idx').on(table.organizationId, table.assignedActorId),
    index('hsp_hk_org_date_idx').on(table.organizationId, table.scheduledDate),
  ],
)

// --- Service Catalog -------------------------------------------------------
// Configurable services offered by the property.
export const hspServiceCatalog = pgTable(
  'hsp_service_catalog',
  {
    ...baseColumns,
    propertyId: text('property_id').notNull(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    category: text('category').notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    isAvailable24x7: boolean('is_available_24x7').notNull().default(false),
    availableFrom: text('available_from'),
    availableTo: text('available_to'),
    basePrice: jsonb('base_price'),
    fulfillmentType: text('fulfillment_type').notNull().default('internal'),
    partnerId: text('partner_id'),
    autoPostToFolio: boolean('auto_post_to_folio').notNull().default(true),
    requiresRoom: boolean('requires_room').notNull().default(false),
  },
  (table) => [
    index('hsp_svc_catalog_org_property_idx').on(table.organizationId, table.propertyId),
    index('hsp_svc_catalog_org_code_idx').on(table.organizationId, table.code),
  ],
)

// --- Service Requests ------------------------------------------------------
// Guest or staff service requests.
export const hspServiceRequest = pgTable(
  'hsp_service_requests',
  {
    ...baseColumns,
    propertyId: text('property_id').notNull(),
    serviceCatalogId: text('service_catalog_id'),
    reservationId: text('reservation_id'),
    roomLocationId: text('room_location_id'),
    personId: text('person_id'),
    status: text('status').notNull().default('requested'),
    priority: text('priority').notNull().default('normal'),
    requestedAt: timestamp('requested_at').notNull().defaultNow(),
    assignedActorId: text('assigned_actor_id'),
    completedAt: timestamp('completed_at'),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: jsonb('unit_price'),
    totalCharge: jsonb('total_charge'),
    transactionLineId: text('transaction_line_id'),
    notes: text('notes'),
    guestFeedback: text('guest_feedback'),
    guestRating: integer('guest_rating'),
  },
  (table) => [
    index('hsp_svc_req_org_property_status_idx').on(
      table.organizationId,
      table.propertyId,
      table.status,
    ),
    index('hsp_svc_req_org_reservation_idx').on(table.organizationId, table.reservationId),
    index('hsp_svc_req_org_room_idx').on(table.organizationId, table.roomLocationId),
    index('hsp_svc_req_org_assignee_idx').on(table.organizationId, table.assignedActorId),
  ],
)

// --- Parking ---------------------------------------------------------------
// Guest vehicle parking records.
export const hspParking = pgTable(
  'hsp_parking',
  {
    ...baseColumns,
    propertyId: text('property_id').notNull(),
    reservationId: text('reservation_id').notNull(),
    personId: text('person_id'),
    vehiclePlate: text('vehicle_plate'),
    vehicleMake: text('vehicle_make'),
    vehicleModel: text('vehicle_model'),
    vehicleColor: text('vehicle_color'),
    spaceNumber: text('space_number'),
    passNumber: text('pass_number'),
    checkIn: timestamp('check_in'),
    checkOut: timestamp('check_out'),
    dailyCharge: jsonb('daily_charge'),
    transactionLineId: text('transaction_line_id'),
    notes: text('notes'),
    status: text('status').notNull().default('active'),
  },
  (table) => [
    index('hsp_parking_org_property_idx').on(table.organizationId, table.propertyId),
    index('hsp_parking_org_reservation_idx').on(table.organizationId, table.reservationId),
    index('hsp_parking_org_status_idx').on(table.organizationId, table.status),
  ],
)

// --- Partners --------------------------------------------------------------
// OTAs, external restaurants, cab providers, tour providers, etc.
export const hspPartner = pgTable(
  'hsp_partners',
  {
    ...baseColumns,
    partyId: text('party_id'),
    name: text('name').notNull(),
    type: text('type').notNull(),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    agreementStart: date('agreement_start'),
    agreementEnd: date('agreement_end'),
    commissionRate: integer('commission_rate'),
    feeNotes: text('fee_notes'),
    listingUrl: text('listing_url'),
    listingId: text('listing_id'),
    allocatedRoomInventory: jsonb('allocated_room_inventory'),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),
  },
  (table) => [
    index('hsp_partners_org_type_idx').on(table.organizationId, table.type),
    index('hsp_partners_org_party_idx').on(table.organizationId, table.partyId),
  ],
)

// --- Venues ----------------------------------------------------------------
// Banquet/venue facilities.
export const hspVenue = pgTable(
  'hsp_venues',
  {
    ...baseColumns,
    propertyId: text('property_id').notNull(),
    locationId: text('location_id').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull().default('hall'),
    capacity: integer('capacity'),
    areaSqft: integer('area_sqft'),
    basePrice: jsonb('base_price'),
    packages: jsonb('packages'),
    amenities: jsonb('amenities'),
    isActive: boolean('is_active').notNull().default(true),
    minHours: integer('min_hours'),
    maxHours: integer('max_hours'),
    notes: text('notes'),
  },
  (table) => [
    index('hsp_venues_org_property_idx').on(table.organizationId, table.propertyId),
    index('hsp_venues_org_location_idx').on(table.organizationId, table.locationId),
  ],
)

// --- Venue Reservations ----------------------------------------------------
// Banquet/venue bookings.
export const hspVenueReservation = pgTable(
  'hsp_venue_reservations',
  {
    ...baseColumns,
    venueId: text('venue_id').notNull(),
    propertyId: text('property_id').notNull(),
    personId: text('person_id'),
    partyId: text('party_id'),
    eventName: text('event_name'),
    eventType: text('event_type'),
    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at').notNull(),
    expectedGuests: integer('expected_guests'),
    actualGuests: integer('actual_guests'),
    packageId: text('package_id'),
    packageDetails: jsonb('package_details'),
    status: text('status').notNull().default('tentative'),
    depositRequired: jsonb('deposit_required'),
    depositReceived: jsonb('deposit_received'),
    totalCharges: jsonb('total_charges'),
    transactionId: text('transaction_id'),
    notes: text('notes'),
    specialRequirements: text('special_requirements'),
    cancelledAt: timestamp('cancelled_at'),
    cancellationReason: text('cancellation_reason'),
  },
  (table) => [
    index('hsp_venue_res_org_venue_idx').on(table.organizationId, table.venueId),
    index('hsp_venue_res_org_property_idx').on(table.organizationId, table.propertyId),
    index('hsp_venue_res_org_status_idx').on(table.organizationId, table.status),
    index('hsp_venue_res_org_dates_idx').on(table.organizationId, table.startAt, table.endAt),
  ],
)

// --- Inferred types --------------------------------------------------------
export type HspRatePlan = typeof hspRatePlan.$inferSelect
export type HspRateOverride = typeof hspRateOverride.$inferSelect
export type HspReservation = typeof hspReservation.$inferSelect
export type HspReservationRoom = typeof hspReservationRoom.$inferSelect
export type HspRoomStatusHistory = typeof hspRoomStatusHistory.$inferSelect
export type HspHousekeeping = typeof hspHousekeeping.$inferSelect
export type HspServiceCatalog = typeof hspServiceCatalog.$inferSelect
export type HspServiceRequest = typeof hspServiceRequest.$inferSelect
export type HspParking = typeof hspParking.$inferSelect
export type HspPartner = typeof hspPartner.$inferSelect
export type HspVenue = typeof hspVenue.$inferSelect
export type HspVenueReservation = typeof hspVenueReservation.$inferSelect
