import { Client } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dir, "../../../../.env") });

async function reset() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("Fetching all tables in public schema...");

    const result = await client.query<{ tablename: string }>(
      `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `,
    );

    if (result.rows.length === 0) {
      console.log("No tables found — DB already empty.");
      return;
    }

    console.log(`Truncating ${result.rows.length} tables:`);
    result.rows.forEach((t) => console.log(`  - ${t.tablename}`));

    const names = result.rows.map((t) => `"public"."${t.tablename}"`).join(", ");

    await client.query("BEGIN");
    await client.query(`TRUNCATE TABLE ${names} CASCADE`);
    await client.query("COMMIT");

    console.log("✓ All tables truncated.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

reset().catch((err) => {
  console.error("Reset failed:", err.message);
  process.exit(1);
});
