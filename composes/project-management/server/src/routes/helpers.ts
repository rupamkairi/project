// Project Management Compose — route helpers

import type { AuthActor } from '@projectx/plugin-auth-server'

export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ParsedPage {
  page: number
  limit: number
  offset: number
}

export function parsePagination(query: Record<string, unknown>): ParsedPage {
  const page = Math.max(1, parseInt(String(query.page ?? '1')) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20')) || 20))
  return { page, limit, offset: (page - 1) * limit }
}

export function listResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): ListResponse<T> {
  return { data: items, total, page, limit }
}

export function getActor(ctx: any): AuthActor {
  return ctx.actor as AuthActor
}
