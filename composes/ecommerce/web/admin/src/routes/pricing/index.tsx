import { createRoute } from '@tanstack/react-router'
import { ecommerceAdminLayoutRoute } from '../admin.layout'
import { PageHeader, Input, Button } from '@projectx/ui'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ecommerceAdminApi } from '../../lib/api'

function AdminPricing() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-price-lists'],
    queryFn: () => ecommerceAdminApi.getPriceLists(),
  })
  const lists: any[] = (data?.data as any)?.data ?? (data?.data as any) ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: rulesData } = useQuery({
    queryKey: ['admin-price-rules', selectedId],
    queryFn: () => ecommerceAdminApi.getPriceRules(selectedId!),
    enabled: !!selectedId,
  })
  const rules: any[] = (rulesData?.data as any)?.data ?? (rulesData?.data as any) ?? []

  const create = useMutation({
    mutationFn: () => ecommerceAdminApi.createPriceList({ name, currency }),
    onSuccess: () => {
      setName('')
      queryClient.invalidateQueries({ queryKey: ['admin-price-lists'] })
    },
  })

  return (
    <div className="space-y-4">
      <PageHeader title="Pricing" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">Price lists</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No price lists yet</p>
          ) : (
            <div className="space-y-2">
              {lists.map((l: any) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedId(l.id)}
                  className={`w-full text-left border rounded-md px-3 py-2 text-sm hover:bg-muted/50 ${selectedId === l.id ? 'border-primary' : ''}`}
                >
                  <span className="font-medium">{l.name ?? l.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground ml-2">{l.currency ?? ''}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input placeholder="List name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="USD"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-24"
            />
            <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
              Add
            </Button>
          </div>
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">Rules</h3>
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">Select a price list</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules yet</p>
          ) : (
            <div className="space-y-2">
              {rules.map((r: any) => (
                <div key={r.id} className="border rounded-md px-3 py-2 text-sm">
                  <span className="font-medium">{r.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground ml-2">
                    {JSON.stringify(r.conditions ?? r.meta ?? {})}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const ecoAdminPricingRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: '/pricing',
  component: AdminPricing,
})
