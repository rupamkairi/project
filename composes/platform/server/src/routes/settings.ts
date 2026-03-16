// Platform Settings Routes - Get and update platform settings

import Elysia from "elysia";
import { t } from "elysia";
import { getAllSettings, setSetting } from "../lib/settings";

export const settingsRoutes = new Elysia({ prefix: "/settings" })
  .get("/", async ({ headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const settings = await getAllSettings();
    return settings;
  })
  .patch(
    "/:key",
    async ({ params, body, headers, set }) => {
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const { key } = params;
      const { value } = body as { value: unknown };

      // Validate key format
      if (!key.includes(".")) {
        set.status = 400;
        return { error: "Key must be in format: category.settingName" };
      }

      await setSetting(key as any, value as any);
      return { success: true, key, value };
    },
    {
      body: t.Object({
        value: t.Unknown(),
      }),
    },
  );

export type SettingsRoutes = typeof settingsRoutes;
