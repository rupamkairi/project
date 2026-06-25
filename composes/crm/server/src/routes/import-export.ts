// CRM Compose — /crm/import + /crm/export routes.
//
// Import: CSV upload (multipart), creates/upserts contacts by email.
// Export: streams CSV of contacts or deals for the org.
// Both require admin or sales-manager role (data:import / data:export permission).
//
// CSV import columns (contacts): firstName,lastName,email,phone,title,accountName,tags,source
// Validation: skip rows with no email; deduplicate by email within the batch.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons, parties } from "@db/schema/party";
import { crmDeal } from "../db/schema/crm";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requirePermission } from "../permissions";
import { getActor } from "./helpers";

/** Minimal CSV line parser — handles quoted fields with commas. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function contactsToCsv(rows: any[]): string {
  const header = "id,firstName,lastName,email,phone,source,accountId,tags,status,leadScore,createdAt";
  const lines = rows.map((r) => {
    const meta = r.meta ?? {};
    return [
      r.id,
      r.firstName ?? "",
      r.lastName ?? "",
      r.email ?? "",
      r.phone ?? "",
      r.source ?? "",
      r.partyId ?? "",
      ((meta as any).tags ?? []).join("|"),
      (meta as any).status ?? "active",
      (meta as any).leadScore ?? 0,
      r.createdAt?.toISOString() ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header, ...lines].join("\n");
}

function dealsToCsv(rows: any[]): string {
  const header = "id,title,status,value,currency,probability,ownerId,stageId,pipelineId,expectedCloseDate,actualCloseDate,createdAt";
  const lines = rows.map((r) => {
    const val = r.value ?? {};
    return [
      r.id,
      r.title ?? "",
      r.status ?? "",
      (val as any).amount ?? "",
      (val as any).currency ?? "",
      r.probability ?? "",
      r.ownerId ?? "",
      r.stageId ?? "",
      r.pipelineId ?? "",
      r.expectedCloseDate?.toISOString() ?? "",
      r.actualCloseDate?.toISOString() ?? "",
      r.createdAt?.toISOString() ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header, ...lines].join("\n");
}

export function createImportExportRoutes(_mediator: Mediator) {
  return new Elysia()
    // --- Import: contacts ---------------------------------------------------
    .post("/import/contacts", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "data:import");

      const body = (ctx as any).body ?? {};
      const rawCsv: string = typeof body === "string"
        ? body
        : body.csv ?? body.file ?? "";

      if (!rawCsv) {
        (ctx as any).set.status = 400;
        return { error: "csv body or file field required" };
      }

      const lines = rawCsv.split("\n").filter(Boolean);
      if (lines.length < 2) {
        (ctx as any).set.status = 400;
        return { error: "CSV must have a header row and at least one data row" };
      }

      const headers = parseCsvLine(lines[0]!);
      const idx = (name: string) => headers.indexOf(name);

      const emailIdx = idx("email");
      if (emailIdx < 0) {
        (ctx as any).set.status = 400;
        return { error: "CSV must include an 'email' column" };
      }

      const results = { created: 0, skipped: 0, errors: [] as string[] };
      const seenEmails = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]!);
        const email = cols[emailIdx]?.toLowerCase();
        if (!email) { results.skipped++; continue; }
        if (seenEmails.has(email)) { results.skipped++; continue; }
        seenEmails.add(email);

        try {
          // Check existing
          const [existing] = await db
            .select({ id: persons.id })
            .from(persons)
            .where(and(eq(persons.organizationId, actor.orgId), eq(persons.email, email), isNull(persons.deletedAt)))
            .limit(1);

          if (existing) { results.skipped++; continue; }

          // Resolve or create account if accountName provided
          const accountName = cols[idx("accountName")] ?? "";
          let partyId: string | null = null;
          if (accountName) {
            const [party] = await db
              .select({ id: parties.id })
              .from(parties)
              .where(and(eq(parties.organizationId, actor.orgId), eq(parties.name, accountName), isNull(parties.deletedAt)))
              .limit(1);
            if (party) {
              partyId = party.id;
            } else {
              const now = new Date();
              const [created] = await db
                .insert(parties)
                .values({
                  id: generateId(),
                  organizationId: actor.orgId,
                  type: "company",
                  name: accountName,
                  createdAt: now,
                  updatedAt: now,
                  version: 1,
                  meta: {},
                })
                .returning({ id: parties.id });
              partyId = created?.id ?? null;
            }
          }

          const rawTags = cols[idx("tags")] ?? "";
          const tags = rawTags ? rawTags.split("|").filter(Boolean) : [];
          const now = new Date();

          await db.insert(persons).values({
            id: generateId(),
            organizationId: actor.orgId,
            type: "contact",
            firstName: cols[idx("firstName")] ?? null,
            lastName: cols[idx("lastName")] ?? null,
            email,
            phone: cols[idx("phone")] ?? null,
            source: cols[idx("source")] ?? null,
            partyId,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {
              title: cols[idx("title")] ?? null,
              tags,
              status: "active",
              ownerId: actor.id,
              leadScore: 0,
            },
          });

          results.created++;
        } catch (err: any) {
          results.errors.push(`Row ${i}: ${err?.message ?? "unknown error"}`);
        }
      }

      return results;
    })
    // --- Export: contacts ---------------------------------------------------
    .get("/export/contacts", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "data:export");

      const rows = await db
        .select()
        .from(persons)
        .where(and(eq(persons.organizationId, actor.orgId), eq(persons.type, "contact"), isNull(persons.deletedAt)))
        .orderBy(desc(persons.createdAt));

      const csv = contactsToCsv(rows);

      (ctx as any).set.headers["Content-Type"] = "text/csv";
      (ctx as any).set.headers["Content-Disposition"] = `attachment; filename="contacts-${actor.orgId}.csv"`;
      return csv;
    })
    // --- Export: deals ------------------------------------------------------
    .get("/export/deals", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "data:export");

      const rows = await db
        .select()
        .from(crmDeal)
        .where(and(eq(crmDeal.organizationId, actor.orgId), isNull(crmDeal.deletedAt)))
        .orderBy(desc(crmDeal.createdAt));

      const csv = dealsToCsv(rows);

      (ctx as any).set.headers["Content-Type"] = "text/csv";
      (ctx as any).set.headers["Content-Disposition"] = `attachment; filename="deals-${actor.orgId}.csv"`;
      return csv;
    });
}
