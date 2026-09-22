import type { ReactNode } from 'react'
import { PageHeader } from '../components/page-header'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription } from '../components/ui/alert'
import type { AdminPagination } from './use-admin-list'

export interface AdminListPageProps {
  title: string
  description?: string
  actions?: ReactNode
  toolbar?: ReactNode
  error?: string | null
  pagination?: AdminPagination
  onPageChange?: (page: number) => void
  children: ReactNode
}

export function AdminListPage({
  title,
  description,
  actions,
  toolbar,
  error,
  pagination,
  onPageChange,
  children,
}: AdminListPageProps) {
  return (
    <div className="space-y-4 p-6">
      <PageHeader title={title} description={description} actions={actions} />
      {toolbar ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{toolbar}</div> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {children}
      {pagination && pagination.totalPages > 1 && onPageChange ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}
