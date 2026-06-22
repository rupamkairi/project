import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dir, "../../../../.env") });

const sql = neon(process.env.DATABASE_URL!);

async function reset() {
  console.log("Fetching all tables in public schema...");

  const tables = await sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;

  if (tables.length === 0) {
    console.log("No tables found — DB already empty.");
    return;
  }

  console.log(`Dropping ${tables.length} tables:`);
  tables.forEach((t) => console.log(`  - ${t.tablename}`));

  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await sql.unsafe(`DROP TABLE IF EXISTS ${names} CASCADE`);

  console.log("✓ All tables dropped.");
}

reset().catch((err) => {
  console.error("Reset failed:", err.message);
  process.exit(1);
});
