import { createRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Route as WorkplaceLayoutRoute } from './layout'
import { useWorkplaceStore } from '../stores/index'
import { Card, CardHeader, CardTitle, CardContent } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/office',
  component: OfficePage,
})

function OfficePage() {
  const { assets, announcements, loading, fetchAssets, fetchAnnouncements } = useWorkplaceStore()

  useEffect(() => {
    fetchAssets()
    fetchAnnouncements()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Office</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assets</CardTitle>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets.</p>
            ) : (
              <div className="divide-y">
                {assets.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="py-2 flex justify-between">
                    <p className="text-sm">
                      {a.name} ({a.code})
                    </p>
                    <p className="text-xs text-muted-foreground">{a.status}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements.</p>
            ) : (
              <div className="divide-y">
                {announcements.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="py-2">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.priority}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
