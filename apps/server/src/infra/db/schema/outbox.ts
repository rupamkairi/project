import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const evtOutbox = pgTable(
  "evt_outbox",
  {
    id: text("id").primaryKey(),
    event: jsonb("event").notNull(),
    publishedAt: timestamp("published_at"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("evt_outbox_published_at_null_idx").on(table.publishedAt),
    index("evt_outbox_attempts_idx").on(table.attempts),
    index("evt_outbox_created_at_idx").on(table.createdAt),
  ],
);

export type EventOutbox = typeof evtOutbox.$inferSelect;
export type NewEventOutbox = typeof evtOutbox.$inferInsert;
