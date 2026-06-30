import { eq, and } from "drizzle-orm";
import { db } from "@db/client";
import { ecoShippingOptions, ecoRegions } from "@projectx/ecommerce-server/db/schema/index";

export interface ShippingOption {
  id: string;
  name: string;
  type: string;
  rate: { amount: number; currency: string } | null;
  estimatedDays: number | null;
}

export async function resolveShippingOptions(
  cartId: string,
  orgId: string,
  regionId: string
): Promise<ShippingOption[]> {
  const options = await db
    .select()
    .from(ecoShippingOptions)
    .where(
      and(
        eq(ecoShippingOptions.organizationId, orgId),
        eq(ecoShippingOptions.regionId, regionId),
        eq(ecoShippingOptions.isActive, true)
      )
    );

  return options.map((opt) => ({
    id: opt.id,
    name: opt.name,
    type: opt.type,
    rate: opt.rate as { amount: number; currency: string } | null,
    estimatedDays: opt.estimatedDays,
  }));
}
