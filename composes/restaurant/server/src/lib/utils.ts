import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@db/client";
import { locations } from "@db/schema/location";
import { eq, and, sql } from "drizzle-orm";

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) return false;
  try {
    const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(computed);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function computeSplits(total: number, count: number): number[] {
  const base = Math.floor((total * 100) / count) / 100;
  const remainder = Math.round((total - base * count) * 100) / 100;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base));
}

export function isWithinOperatingHours(
  hours: { open: string; close: string },
  timezone: string,
): boolean {
  const now = new Date();
  const local = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return local >= hours.open && local < hours.close;
}

export async function nextLocationSeq(
  locationId: string,
  field: "lastOrderSeq" | "lastKotSeq" | "lastBillSeq",
): Promise<number> {
  const result = await db.execute(sql`
    UPDATE locations
    SET meta = jsonb_set(meta, ${sql.raw(`'{${field}}'`)}, (COALESCE((meta->>'${sql.raw(field)}')::int, 0) + 1)::text::jsonb)
    WHERE id = ${locationId}
    RETURNING (meta->>'${sql.raw(field)}')::int AS seq
  `);
  return (result as any)[0]?.seq ?? 1;
}

export function formatOrderNumber(outletCode: string, seq: number): string {
  const year = new Date().getFullYear();
  return `ORD-${outletCode}-${year}-${String(seq).padStart(6, "0")}`;
}

export function formatKotNumber(outletCode: string, seq: number): string {
  return `KOT-${outletCode}-${String(seq).padStart(4, "0")}`;
}

export function formatBillNumber(outletCode: string, seq: number): string {
  const year = new Date().getFullYear();
  return `BILL-${outletCode}-${year}-${String(seq).padStart(6, "0")}`;
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}
