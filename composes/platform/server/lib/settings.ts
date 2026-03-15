// Platform Settings Helper

import { db } from "../../../apps/server/src/infra/db/client";
import { pltSettings } from "../../../apps/server/src/infra/db/schema/platform";
import { eq } from "drizzle-orm";
import { generateId } from "../../../apps/server/src/core/entity";

// Platform settings interface
export interface PlatformSettings {
  "platform.name": string;
  "platform.logo": string;
  "auth.allowSelfRegistration": boolean;
  "auth.requireEmailVerification": boolean;
  "auth.sessionTTLSeconds": number;
  "auth.maxSessionsPerActor": number;
  "auth.passwordPolicy.minLength": number;
  "notification.defaultChannel": string;
  "notification.supportedChannels": string[];
}

// Default settings
const DEFAULT_SETTINGS: Record<string, unknown> = {
  "platform.name": "Platform",
  "platform.logo": "",
  "auth.allowSelfRegistration": false,
  "auth.requireEmailVerification": true,
  "auth.sessionTTLSeconds": 28800,
  "auth.maxSessionsPerActor": 3,
  "auth.passwordPolicy.minLength": 8,
  "notification.defaultChannel": "email",
  "notification.supportedChannels": ["email", "in_app"],
};

// Get a single setting
export async function getSetting<K extends keyof PlatformSettings>(
  key: K,
  _orgId?: string,
): Promise<PlatformSettings[K]> {
  const [setting] = await db
    .select()
    .from(pltSettings)
    .where(eq(pltSettings.key, key))
    .limit(1);

  if (setting) {
    return (setting.value as { value: PlatformSettings[K] }).value;
  }

  return DEFAULT_SETTINGS[key] as PlatformSettings[K];
}

// Get all settings
export async function getAllSettings(
  _orgId?: string,
): Promise<PlatformSettings> {
  const settings = await db.select().from(pltSettings);

  const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const setting of settings) {
    result[setting.key] = (setting.value as { value: unknown }).value;
  }

  return result as unknown as PlatformSettings;
}

// Set a single setting
export async function setSetting<K extends keyof PlatformSettings>(
  key: K,
  value: PlatformSettings[K],
  _orgId?: string,
): Promise<void> {
  const keyValue = key.replace(/\./g, "_");

  await db
    .insert(pltSettings)
    .values({
      id: `plt_set_${keyValue}`,
      organizationId: "org_platform_default",
      key,
      value: { value },
      isPublic: key.startsWith("platform."),
      description: `Setting: ${key}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      deletedAt: null,
      meta: {},
    })
    .onConflictDoUpdate({
      target: pltSettings.key,
      set: {
        value: { value },
        updatedAt: new Date(),
      },
    });
}

// Initialize default settings if they don't exist
export async function initializeDefaultSettings(): Promise<void> {
  const existingSettings = await db.select().from(pltSettings);

  if (existingSettings.length === 0) {
    console.log("Initializing default platform settings...");

    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      await setSetting(key as keyof PlatformSettings, defaultValue as never);
    }

    console.log("Default platform settings initialized");
  }
}
