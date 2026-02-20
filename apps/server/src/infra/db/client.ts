// Database client - Neon + Drizzle

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "../env";
import * as schema from "./schema";

// Create Neon client
const sql = neon(env.DATABASE_URL);

// Create Drizzle instance
export const db = drizzle(sql, {
  schema,
  logger: env.NODE_ENV === "development",
});

// Export type
export type DB = typeof db;
