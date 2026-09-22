import { pgTable, text, integer, boolean, index } from 'drizzle-orm/pg-core'
import { baseColumns } from './helpers'

export const taxTemplates = pgTable(
  'tax_templates',
  {
    ...baseColumns,
    name: text('name').notNull(),
    provider: text('provider').notNull().default('manual'),
    jurisdiction: text('jurisdiction'),
  },
  (table) => [index('tax_templates_org_idx').on(table.organizationId)],
)

export const taxRates = pgTable(
  'tax_rates',
  {
    ...baseColumns,
    templateId: text('template_id').notNull(),
    name: text('name').notNull(),
    rateBps: integer('rate_bps').notNull().default(0),
    jurisdiction: text('jurisdiction'),
    productType: text('product_type'),
    isDefault: boolean('is_default').notNull().default(false),
  },
  (table) => [
    index('tax_rates_org_template_idx').on(table.organizationId, table.templateId),
  ],
)

export type TaxTemplate = typeof taxTemplates.$inferSelect
export type TaxRate = typeof taxRates.$inferSelect
