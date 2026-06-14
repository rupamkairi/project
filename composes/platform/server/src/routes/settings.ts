import Elysia, { t } from "elysia";
import { getAllSettings, setSetting } from "../lib/settings";

export const settingsRoutes = new Elysia({ prefix: "/settings" })
  .get("/", async () => {
    return getAllSettings();
  })
  .patch(
    "/:key",
    async ({ params, body, set }) => {
      const { key } = params;
      const { value } = body as { value: unknown };

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
