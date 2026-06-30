import { seedEcommerceRoles } from "./roles.seed";
import { seedEcommerceData } from "./regions.seed";

const PLATFORM_ORG_ID = "org_platform";

export async function seedEcommerce(orgId: string = PLATFORM_ORG_ID) {
  await seedEcommerceRoles(orgId);
  await seedEcommerceData(orgId);
}
