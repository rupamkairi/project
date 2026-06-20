import { db } from "@db/client";
import { searchIndex } from "@db/schema/search";
import { eq, and, inArray, sql } from "drizzle-orm";
import type { SearchAdapter, SearchQuery, SearchResult } from "@core";
import type { DomainEvent } from "@core";

function extractText(doc: Record<string, unknown>): string {
  return Object.values(doc)
    .filter((v): v is string => typeof v === "string")
    .join(" ");
}

async function indexDocs(
  collection: string,
  documents: Record<string, unknown>[],
): Promise<void> {
  for (const doc of documents) {
    const entityId = String(doc.id ?? "");
    const orgId = String(doc.organizationId ?? doc.orgId ?? "");
    const rawText = extractText(doc);

    await db
      .insert(searchIndex)
      .values({
        id: `${collection}:${entityId}`,
        collection,
        entityId,
        orgId,
        content: sql`to_tsvector('english', ${rawText})`,
        raw: doc,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: searchIndex.id,
        set: {
          content: sql`to_tsvector('english', ${rawText})`,
          raw: doc,
          updatedAt: new Date(),
        },
      });
  }
}

async function deleteDocs(collection: string, ids: string[]): Promise<void> {
  const compositeIds = ids.map((id) => `${collection}:${id}`);
  await db.delete(searchIndex).where(inArray(searchIndex.id, compositeIds));
}

export function createPgSearchAdapter(): SearchAdapter {
  return {
    index: indexDocs,

    async search(collection: string, query: SearchQuery): Promise<SearchResult> {
      const { query: q, page = 1, limit = 20, filters } = query;
      const offset = (page - 1) * limit;
      const tsquery = sql`plainto_tsquery('english', ${q})`;

      const conditions = [
        eq(searchIndex.collection, collection),
        sql`${searchIndex.content} @@ ${tsquery}`,
        ...(filters?.orgId ? [eq(searchIndex.orgId, String(filters.orgId))] : []),
      ];

      const rows = await db
        .select({ entityId: searchIndex.entityId, raw: searchIndex.raw })
        .from(searchIndex)
        .where(and(...conditions))
        .orderBy(sql`ts_rank(${searchIndex.content}, ${tsquery}) DESC`)
        .limit(limit)
        .offset(offset);

      return {
        hits: rows.map((r) => ({
          id: r.entityId,
          ...(r.raw as Record<string, unknown>),
        })),
        total: rows.length,
        page,
      };
    },

    delete: deleteDocs,

    async sync(collection: string, event: DomainEvent): Promise<void> {
      const type = event.type;
      if (type.endsWith(".deleted") || type.endsWith(".archived")) {
        await deleteDocs(collection, [String(event.aggregateId)]);
      } else {
        const payload = (event.payload as Record<string, unknown>) ?? {};
        await indexDocs(collection, [
          { id: event.aggregateId, organizationId: event.orgId, ...payload },
        ]);
      }
    },
  };
}
