export * from "./helpers";
export * from "./events";
export * from "./outbox";
export * from "./identity";
export * from "./catalog";
export * from "./inventory";
// Foundation master tables (unprefixed, cross-compose — see docs/master-tables.md)
export * from "./party";
export * from "./location";
export * from "./pipeline";
export * from "./commerce";
export * from "./activity";
export * from "./ledger";
export * from "./workflow";
export * from "./scheduling";
export * from "./document";
export * from "./notification";
export * from "./geo";
export * from "./analytics";
export * from "./storage";
export * from "./search";

// ERP schema - re-exported from compose
export * from "@projectx/erp-server/db/schema/erp";

// Platform schema - re-exported from compose
import {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
} from "@projectx/platform-server/db/schema/platform";

export {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
};
