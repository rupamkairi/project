import { useCallback, useEffect, useState } from 'react'

export interface AdminPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AdminListResult<T> {
  items: T[]
  total: number
}

export interface UseAdminListOptions<T> {
  load: (params: {
    page: number
    limit: number
    search: string
    filters: Record<string, string>
  }) => Promise<AdminListResult<T>>
  limit?: number
  autoLoad?: boolean
}

export function useAdminList<T>({ load, limit = 20, autoLoad = true }: UseAdminListOptions<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [pagination, setPagination] = useState<AdminPagination>({
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  })
  const [isLoading, setIsLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})

  const reload = useCallback(
    async (page = pagination.page) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await load({ page, limit, search, filters })
        setRows(result.items)
        setPagination({
          page,
          limit,
          total: result.total,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      }
      setIsLoading(false)
    },
    [filters, limit, load, pagination.page, search],
  )

  useEffect(() => {
    if (!autoLoad) return
    void reload(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      if (prev[key] === value) return prev
      return { ...prev, [key]: value }
    })
  }, [])

  return {
    rows,
    pagination,
    isLoading,
    error,
    setError,
    search,
    setSearch,
    filters,
    setFilter,
    reload,
  }
}
