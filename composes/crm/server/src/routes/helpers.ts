// CRM Compose — route helpers shared across all resource routes.

import type { AuthActor } from "@projectx/plugin-auth-server";

/** Standard CRM list response, per plans/crm/03-backend-api.md. */
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Pagination values parsed from a query string (Elysia gives all strings). */
export interface ParsedPage {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(query: Record<string, unknown>): ParsedPage {
  const page = Math.max(1, parseInt(String(query.page ?? "1")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query.limit ?? "20")) || 20),
  );
  return { page, limit, offset: (page - 1) * limit };
}

export function listResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): ListResponse<T> {
  return { data: items, total, page, limit };
}

/** Auth plugin attaches `actor` to ctx; coerce out of the Elysia context. */
export function getActor(ctx: any): AuthActor {
  return ctx.actor as AuthActor;
}
