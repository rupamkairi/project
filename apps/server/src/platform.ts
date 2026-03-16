// Platform compose re-export
// This file re-exports platform functionality from @projectx/platform-server
// The actual implementation lives in composes/platform/server

export { platformCompose, type PlatformApp } from "@projectx/platform-server";

export {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
  seedPlatform,
} from "@projectx/platform-server";
