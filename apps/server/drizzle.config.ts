import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/db/schema/index.ts",
  out: "./src/infra/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
});
