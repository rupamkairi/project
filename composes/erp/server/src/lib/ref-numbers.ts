import { count, like, eq, and } from "drizzle-orm";

export async function nextRefNo(
  db: any,
  orgId: string,
  prefix: string,
  year: number,
  table: any,
  refNoCol: any,
): Promise<string> {
  const pattern = `${prefix}-${year}-%`;
  const [row] = await db.select({ c: count() }).from(table)
    .where(and(eq(table.organizationId, orgId), like(refNoCol, pattern)));
  const seq = (Number(row?.c ?? 0)) + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
