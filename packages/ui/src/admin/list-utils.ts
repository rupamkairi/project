export function normalizeList(payload: unknown): { items: any[]; total: number } {
  if (!payload) return { items: [], total: 0 }
  if (Array.isArray(payload)) return { items: payload, total: payload.length }
  if (typeof payload !== 'object') return { items: [], total: 0 }
  const rec = payload as Record<string, unknown>
  if (Array.isArray(rec.data)) {
    const pagination = rec.pagination as { total?: number } | undefined
    const total =
      typeof rec.total === 'number' ? rec.total : typeof pagination?.total === 'number' ? pagination.total : rec.data.length
    return { items: rec.data, total }
  }
  for (const value of Object.values(rec)) {
    if (Array.isArray(value)) return { items: value, total: value.length }
  }
  return { items: [], total: 0 }
}

export async function mutateOk(promise: Promise<unknown>): Promise<{ error?: string }> {
  try {
    const result = (await promise) as { error?: string } | undefined
    if (result && typeof result === 'object' && result.error) return { error: result.error }
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
