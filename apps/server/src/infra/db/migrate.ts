import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { resolve } from "path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const sql = neon(url);
const db = drizzle(sql);

const migrationsFolder = resolve(import.meta.dir, "./migrations");

console.log("Running migrations from:", migrationsFolder);

await migrate(db, { migrationsFolder });

console.log("Migrations complete.");
process.exit(0);
