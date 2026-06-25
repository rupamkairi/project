import { eq, and } from "drizzle-orm";
import { db } from "@db/client";
import { ecoTaxProfiles, ecoTaxRates, ecoRegions } from "@projectx/ecommerce-server/db/schema/index";

export interface TaxLine {
  itemId: string;
  name: string;
  rate: number;
  amount: { amount: number; currency: string };
}

export async function calculateTax(
  cartId: string,
  orgId: string,
  regionId: string
): Promise<{ total: { amount: number; currency: string }; lines: TaxLine[] }> {
  const region = await db
    .select()
    .from(ecoRegions)
    .where(eq(ecoRegions.id, regionId))
    .limit(1);

  if (!region.length || !region[0].taxProfileId) {
    return { total: { amount: 0, currency: "USD" }, lines: [] };
  }

  const profile = await db
    .select()
    .from(ecoTaxProfiles)
    .where(eq(ecoTaxProfiles.id, region[0].taxProfileId))
    .limit(1);

  if (!profile.length) {
    return { total: { amount: 0, currency: "USD" }, lines: [] };
  }

  const rates = await db
    .select()
    .from(ecoTaxRates)
    .where(eq(ecoTaxRates.taxProfileId, region[0].taxProfileId!));

  const lines: TaxLine[] = [];
  let totalAmount = 0;

  for (const rate of rates) {
    const taxAmount = Math.round(0 * parseFloat(rate.rate) / 100);
    totalAmount += taxAmount;
    lines.push({
      itemId: rate.id,
      name: rate.name,
      rate: parseFloat(rate.rate),
      amount: { amount: taxAmount, currency: region[0].currency },
    });
  }

  return {
    total: { amount: totalAmount, currency: region[0].currency },
    lines,
  };
}
