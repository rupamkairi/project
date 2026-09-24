-- 0008: ecommerce generic columns — reusable master-table additions only.
--
-- No new tables and no compose-prefixed changes. All additions are
-- nullable or carry defaults, so the migration is safe to apply on
-- live data. Code reads every addition with a fallback, so it runs
-- both before and after this migration lands.
--
-- * `cat_price_lists.priority`, `tax_rates.priority` — deterministic
--   overlap resolution for price lists and tax rate books.
-- * `transactions.external_ref` — gateway / partner reference for
--   documents (payment reconcile writes the gateway ref here).
-- * `cat_items.barcode`, `cat_items.uom`, `cat_variants.barcode`,
--   `cat_variants.uom` — shared sellable identity (scanning units).

ALTER TABLE "cat_price_lists" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "external_ref" text;--> statement-breakpoint
ALTER TABLE "cat_items" ADD COLUMN IF NOT EXISTS "barcode" text;--> statement-breakpoint
ALTER TABLE "cat_items" ADD COLUMN IF NOT EXISTS "uom" text;--> statement-breakpoint
ALTER TABLE "cat_variants" ADD COLUMN IF NOT EXISTS "barcode" text;--> statement-breakpoint
ALTER TABLE "cat_variants" ADD COLUMN IF NOT EXISTS "uom" text;
