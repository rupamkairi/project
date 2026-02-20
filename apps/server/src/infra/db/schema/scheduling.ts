import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

export const slotStatusEnum = pgEnum("sch_slot_status", [
  "available",
  "partially_booked",
  "fully_booked",
  "cancelled",
  "expired",
]);
export const bookingStatusEnum = pgEnum("sch_booking_status", [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
]);

export const schCalendars = pgTable(
  "sch_calendars",
  {
    ...baseColumns,
    ownerId: text("owner_id").notNull(),
    ownerType: text("owner_type").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    workingHours: jsonb("working_hours").notNull().default("{}"),
  },
  (table) => [
    uniqueIndex("sch_calendars_org_owner_idx").on(
      table.organizationId,
      table.ownerId,
      table.ownerType,
    ),
  ],
);

export const schSlots = pgTable(
  "sch_slots",
  {
    ...baseColumns,
    calendarId: text("calendar_id").notNull(),
    resourceId: text("resource_id").notNull(),
    resourceType: text("resource_type").notNull(),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at").notNull(),
    capacity: integer("capacity").notNull().default(1),
    bookedCount: integer("booked_count").notNull().default(0),
    status: slotStatusEnum("status").notNull().default("available"),
    recurrenceId: text("recurrence_id"),
  },
  (table) => [
    index("sch_slots_org_calendar_start_idx").on(
      table.organizationId,
      table.calendarId,
      table.startAt,
    ),
    index("sch_slots_org_resource_start_idx").on(
      table.organizationId,
      table.resourceId,
      table.resourceType,
      table.startAt,
    ),
    index("sch_slots_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const schRecurrences = pgTable(
  "sch_recurrences",
  {
    ...baseColumns,
    calendarId: text("calendar_id").notNull(),
    rrule: text("rrule").notNull(),
    slotTemplate: jsonb("slot_template").notNull(),
    generatedUntil: timestamp("generated_until"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("sch_recurrences_org_calendar_idx").on(
      table.organizationId,
      table.calendarId,
    ),
  ],
);

export const schBookings = pgTable(
  "sch_bookings",
  {
    ...baseColumns,
    slotId: text("slot_id").notNull(),
    actorId: text("actor_id").notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    confirmedAt: timestamp("confirmed_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancellationReason: text("cancellation_reason"),
    checkedInAt: timestamp("checked_in_at"),
  },
  (table) => [
    index("sch_bookings_org_slot_idx").on(table.organizationId, table.slotId),
    index("sch_bookings_org_actor_status_idx").on(
      table.organizationId,
      table.actorId,
      table.status,
    ),
    index("sch_bookings_org_status_idx").on(table.organizationId, table.status),
  ],
);

export type SchCalendar = typeof schCalendars.$inferSelect;
export type SchSlot = typeof schSlots.$inferSelect;
export type SchRecurrence = typeof schRecurrences.$inferSelect;
export type SchBooking = typeof schBookings.$inferSelect;
