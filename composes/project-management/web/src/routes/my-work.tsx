import { createRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Route as projectLayoutRoute } from './layout'
import { projectManagementApi } from '../lib/api'
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/my-work',
  component: MyWorkPage,
})

function MyWorkPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await projectManagementApi.getMyWork()
      if (res.data) setItems(res.data.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="My Work" description="Work items assigned to you across all projects" />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Open Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No open items assigned to you
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.ref}: {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.type} · {item.priority} · {item.project?.name ?? item.projectId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
