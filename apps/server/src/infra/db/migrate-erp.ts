/**
 * Deprecated. Canonical schema changes go through Drizzle:
 *   bun run db:migrate
 *   bun run db:push
 */
console.error(
  'migrate-erp.ts is retired. From apps/server run `bun run db:migrate` or `bun run db:push`.',
)
process.exit(1)
