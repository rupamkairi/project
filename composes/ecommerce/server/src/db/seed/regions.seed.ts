import { db } from "@db/client";
import { ecoRegions, ecoTaxProfiles, ecoShippingOptions, ecoTaxRates } from "@projectx/ecommerce-server/db/schema";

const PLATFORM_ORG_ID = "org_platform";

const DEFAULT_TAX_PROFILES = [
  { name: "US Standard", provider: "manual" },
  { name: "EU VAT", provider: "manual" },
  { name: "India GST", provider: "manual" },
];

const DEFAULT_TAX_RATES: Record<string, { name: string; rate: number; jurisdiction?: string }[]> = {
  "US Standard": [
    { name: "Federal Tax", rate: 0, jurisdiction: "Federal" },
  ],
  "EU VAT": [
    { name: "Standard VAT", rate: 0.21, jurisdiction: "EU" },
    { name: "Reduced VAT", rate: 0.05, jurisdiction: "EU" },
  ],
  "India GST": [
    { name: "Central GST", rate: 0.09, jurisdiction: "Central" },
    { name: "State GST", rate: 0.09, jurisdiction: "State" },
  ],
};

const DEFAULT_REGIONS = [
  { name: "United States", currency: "USD", countries: ["US"], taxProfileName: "US Standard", isDefault: true },
  { name: "European Union", currency: "EUR", countries: ["DE", "FR", "NL", "IT", "ES"], taxProfileName: "EU VAT", isDefault: false },
  { name: "India", currency: "INR", countries: ["IN"], taxProfileName: "India GST", isDefault: false },
];

const DEFAULT_SHIPPING_OPTIONS: Record<string, { name: string; type: string; rate: number; estimatedDays: number }[]> = {
  "United States": [
    { name: "Standard Shipping", type: "flat_rate", rate: 599, estimatedDays: 5 },
    { name: "Express Shipping", type: "flat_rate", rate: 1299, estimatedDays: 2 },
  ],
  "European Union": [
    { name: "Standard Shipping", type: "flat_rate", rate: 499, estimatedDays: 7 },
  ],
  "India": [
    { name: "Standard Shipping", type: "flat_rate", rate: 99, estimatedDays: 5 },
    { name: "Express Shipping", type: "flat_rate", rate: 249, estimatedDays: 2 },
  ],
};

function generateId(): string {
  return `eco_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function seedEcommerceData(orgId: string = PLATFORM_ORG_ID) {
  console.log("Seeding ecommerce data...");

  const now = new Date();

  // 1. Seed tax profiles
  const taxProfileMap: Record<string, string> = {};
  for (const tp of DEFAULT_TAX_PROFILES) {
    const id = generateId();
    await db.insert(ecoTaxProfiles).values({
      id,
      organizationId: orgId,
      name: tp.name,
      provider: tp.provider,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    }).onConflictDoNothing();
    taxProfileMap[tp.name] = id;
  }
  console.log("Seeded tax profiles:", Object.keys(taxProfileMap));

  // 2. Seed tax rates
  for (const [profileName, rates] of Object.entries(DEFAULT_TAX_RATES)) {
    const profileId = taxProfileMap[profileName];
    if (!profileId) continue;
    for (const rate of rates) {
      await db.insert(ecoTaxRates).values({
        id: generateId(),
        organizationId: orgId,
        taxProfileId: profileId,
        name: rate.name,
        rate: rate.rate,
        jurisdiction: rate.jurisdiction ?? null,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      }).onConflictDoNothing();
    }
  }
  console.log("Seeded tax rates");

  // 3. Seed regions
  const regionMap: Record<string, string> = {};
  for (const region of DEFAULT_REGIONS) {
    const id = generateId();
    const taxProfileId = taxProfileMap[region.taxProfileName] ?? null;
    await db.insert(ecoRegions).values({
      id,
      organizationId: orgId,
      name: region.name,
      currency: region.currency,
      countries: region.countries,
      taxProfileId,
      isDefault: region.isDefault,
      taxIncluded: false,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    }).onConflictDoNothing();
    regionMap[region.name] = id;
  }
  console.log("Seeded regions:", Object.keys(regionMap));

  // 4. Seed shipping options
  for (const [regionName, options] of Object.entries(DEFAULT_SHIPPING_OPTIONS)) {
    const regionId = regionMap[regionName];
    if (!regionId) continue;
    for (const opt of options) {
      await db.insert(ecoShippingOptions).values({
        id: generateId(),
        organizationId: orgId,
        regionId,
        name: opt.name,
        type: opt.type,
        rate: opt.rate,
        estimatedDays: opt.estimatedDays,
        isActive: true,
        requiresShipping: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      }).onConflictDoNothing();
    }
  }
  console.log("Seeded shipping options");

  console.log("Ecommerce seed complete.");
}
