import { createRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Route as projectLayoutRoute } from './layout'
import { projectManagementApi } from '../lib/api'
import {
  PageHeader,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from '@projectx/ui'
import { Plus } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/portfolios',
  component: PortfoliosPage,
})

function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const loadPortfolios = async () => {
    setLoading(true)
    const res = await projectManagementApi.getPortfolios()
    if (res.data) setPortfolios(res.data.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadPortfolios()
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    await projectManagementApi.createPortfolio({ name })
    setName('')
    setOpen(false)
    await loadPortfolios()
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Portfolios"
        description="Manage project portfolios"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Portfolio
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">All Portfolios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : portfolios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No portfolios yet</p>
          ) : (
            <div className="space-y-2">
              {portfolios.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Portfolio</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Portfolio name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
