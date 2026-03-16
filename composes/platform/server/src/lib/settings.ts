// Platform Settings Library
// Helper functions for working with platform settings

import { db } from "@projectx/server/infra/db/client";
import { pltSettings } from "../db/schema/platform";
import { eq } from "drizzle-orm";

export interface PlatformSetting {
  id: string;
  key: string;
  value: unknown;
  isPublic: boolean;
  description: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAllSettings(): Promise<PlatformSetting[]> {
  const settings = await db.select().from(pltSettings);
  return settings as PlatformSetting[];
}

export async function getSetting(
  key: string,
): Promise<PlatformSetting | undefined> {
  const [setting] = await db
    .select()
    .from(pltSettings)
    .where(eq(pltSettings.key, key))
    .limit(1);
  return setting as PlatformSetting | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .update(pltSettings)
    .set({
      value: JSON.stringify(value),
      updatedAt: new Date(),
    })
    .where(eq(pltSettings.key, key));
}

export async function getPublicSettings(): Promise<PlatformSetting[]> {
  const settings = await db
    .select()
    .from(pltSettings)
    .where(eq(pltSettings.isPublic, true));
  return settings as PlatformSetting[];
}
