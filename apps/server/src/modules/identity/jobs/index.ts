import { db } from "@db/client";
import { sessions } from "@db/schema/identity";
import { lt } from "drizzle-orm";

export async function purgeExpiredSessionsJob(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
