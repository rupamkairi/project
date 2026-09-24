import { createRoute } from '@tanstack/react-router'
import { ecommerceAdminLayoutRoute } from '../admin.layout'
import { PageHeader, Input, Button, Badge } from '@projectx/ui'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ecommerceAdminApi } from '../../lib/api'

function RegionsCard() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin-regions'],
    queryFn: () => ecommerceAdminApi.getRegions(),
  })
  const regions: any[] = (data?.data as any)?.data ?? (data?.data as any) ?? []
  const [name, setName] = useState('')
  const create = useMutation({
    mutationFn: () => ecommerceAdminApi.createRegion({ name }),
    onSuccess: () => {
      setName('')
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] })
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => ecommerceAdminApi.deleteRegion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-regions'] }),
  })
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h3 className="font-semibold">Regions</h3>
      {regions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No regions yet</p>
      ) : (
        <div className="space-y-2">
          {regions.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <span className="font-medium">{r.name ?? r.id.slice(0, 8)}</span>
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="New region name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
          Add
        </Button>
      </div>
    </div>
  )
}

function ShippingCard() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin-shipping'],
    queryFn: () => ecommerceAdminApi.getShippingOptions(),
  })
  const options: any[] = (data?.data as any)?.data ?? (data?.data as any) ?? []
  const [name, setName] = useState('')
  const create = useMutation({
    mutationFn: () => ecommerceAdminApi.createShippingOption({ name }),
    onSuccess: () => {
      setName('')
      queryClient.invalidateQueries({ queryKey: ['admin-shipping'] })
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => ecommerceAdminApi.deleteShippingOption(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-shipping'] }),
  })
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h3 className="font-semibold">Shipping options</h3>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shipping options yet</p>
      ) : (
        <div className="space-y-2">
          {options.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <span className="font-medium">{o.name ?? o.id.slice(0, 8)}</span>
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(o.id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="New option name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
          Add
        </Button>
      </div>
    </div>
  )
}

function TaxCard() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin-tax-profiles'],
    queryFn: () => ecommerceAdminApi.getTaxProfiles(),
  })
  const profiles: any[] = (data?.data as any)?.data ?? (data?.data as any) ?? []
  const [name, setName] = useState('')
  const create = useMutation({
    mutationFn: () => ecommerceAdminApi.createTaxProfile({ name }),
    onSuccess: () => {
      setName('')
      queryClient.invalidateQueries({ queryKey: ['admin-tax-profiles'] })
    },
  })
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h3 className="font-semibold">Tax profiles</h3>
      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tax profiles yet</p>
      ) : (
        <div className="space-y-2">
          {profiles.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <span className="font-medium">{p.name ?? p.id.slice(0, 8)}</span>
              <Badge variant="secondary">rates via API</Badge>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="New profile name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
          Add
        </Button>
      </div>
    </div>
  )
}

export const ecoAdminSettingsRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: '/settings',
  component: AdminSettings,
})

function AdminSettings() {
  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="Settings" />
      <RegionsCard />
      <ShippingCard />
      <TaxCard />
    </div>
  )
}
