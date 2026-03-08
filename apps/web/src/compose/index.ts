import { lmsWebCompose } from "@projectx/compose-lms/web";

const composeRegistry = {
  lms: lmsWebCompose,
} as const;

type ComposeId = keyof typeof composeRegistry;

function resolveActiveComposeId(): ComposeId {
  const activeComposeId = (
    import.meta as ImportMeta & {
      env: Record<string, string | undefined>;
    }
  ).env.VITE_ACTIVE_COMPOSE;

  return activeComposeId === "lms" ? activeComposeId : "lms";
}

const activeComposeId = resolveActiveComposeId();
const activeCompose = composeRegistry[activeComposeId];

export { activeComposeId, activeCompose, composeRegistry };
export type { ComposeId };
