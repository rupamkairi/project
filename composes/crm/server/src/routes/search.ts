// CRM Compose — /crm/search routes.
//
// Cross-entity search across persons, parties, and CRM detail tables.
// Returns ranked results grouped by entity type.

import Elysia from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons, parties } from "@db/schema/party";
import { crmDeal, crmLead } from "../db/schema/crm";
import { eq, and, isNull, ilike, or, count, desc } from "drizzle-orm";
import { requirePermission, isManager } from "../permissions";
import { parsePagination, listResponse, getActor } from "./helpers";

export function createSearchRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/search" })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      // Any CRM role can search
      requirePermission(actor, "contact:read");
      const q = (ctx as any).query ?? {};
      const query = (q.q as string)?.trim();
      if (!query) {
        (ctx as any).set.status = 400;
        return { error: "Search query 'q' is required" };
      }
      const entityType = q.type as string | undefined; // contact|account|lead|deal|all
      const { page, limit, offset } = parsePagination(q);
      const pattern = `%${query}%`;

      const promises: Promise<{ results: any[]; entity: string }>[] = [];

      if (!entityType || entityType === "contact") {
        promises.push(
          db
            .select()
            .from(persons)
            .where(
              and(
                eq(persons.organizationId, actor.orgId),
                eq(persons.type, "contact"),
                isNull(persons.deletedAt),
                or(
                  ilike(persons.firstName, pattern),
                  ilike(persons.lastName, pattern),
                  ilike(persons.email, pattern),
                  ilike(persons.phone, pattern),
                )!,
              ),
            )
            .limit(limit)
            .then((rows) => ({
              results: rows.map((r) => ({
                id: r.id,
                type: "contact",
                title: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
                subtitle: r.email,
              })),
              entity: "contact",
            })),
        );
      }

      if (!entityType || entityType === "account") {
        promises.push(
          db
            .select()
            .from(parties)
            .where(
              and(
                eq(parties.organizationId, actor.orgId),
                eq(parties.type, "company"),
                isNull(parties.deletedAt),
                or(
                  ilike(parties.name, pattern),
                  ilike(parties.domain, pattern),
                )!,
              ),
            )
            .limit(limit)
            .then((rows) => ({
              results: rows.map((r) => ({
                id: r.id,
                type: "account",
                title: r.name,
                subtitle: r.domain,
              })),
              entity: "account",
            })),
        );
      }

      if (!entityType || entityType === "lead") {
        promises.push(
          (async () => {
            const leads = await db
              .select()
              .from(crmLead)
              .where(
                and(
                  eq(crmLead.organizationId, actor.orgId),
                  isNull(crmLead.deletedAt),
                ),
              )
              .limit(limit);
            const personIds = leads.map((l) => l.personId);
            const people = personIds.length
              ? await db
                  .select()
                  .from(persons)
                  .where(
                    and(
                      eq(persons.organizationId, actor.orgId),
                      or(
                        ilike(persons.firstName, pattern),
                        ilike(persons.lastName, pattern),
                        ilike(persons.email, pattern),
                      )!,
                    ),
                  )
              : [];
            const personSet = new Set(people.map((p) => p.id));
            const matched = leads.filter((l) => personSet.has(l.personId));
            return {
              results: matched.map((l) => ({
                id: l.id,
                type: "lead",
                title: l.interest ?? "Lead",
                subtitle: l.status,
              })),
              entity: "lead",
            };
          })(),
        );
      }

      if (!entityType || entityType === "deal") {
        promises.push(
          db
            .select()
            .from(crmDeal)
            .where(
              and(
                eq(crmDeal.organizationId, actor.orgId),
                isNull(crmDeal.deletedAt),
                ilike(crmDeal.title, pattern),
              ),
            )
            .limit(limit)
            .then((rows) => ({
              results: rows.map((r) => ({
                id: r.id,
                type: "deal",
                title: r.title,
                subtitle: r.status,
              })),
              entity: "deal",
            })),
        );
      }

      const groups = await Promise.all(promises);
      const allResults = groups.flatMap((g) =>
        g.results.map((r) => ({ ...r, entityType: g.entity })),
      );

      return listResponse(allResults, allResults.length, page, limit);
    });
}
