import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'
import { hospitalityApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/services',
  component: ServicesPage,
})

function ServicesPage() {
  return (
    <CrudTablePage
      title="Services"
      description="Service catalog."
      createLabel="Add Service"
      columns={[
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Price', accessor: (r) => String(r.price ?? '—') },
        { header: 'Category', accessor: (r) => r.category ?? '—' },
      ]}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'price', label: 'Price', type: 'number' },
        { key: 'category', label: 'Category' },
      ]}
      list={async () => normalizeList(await hospitalityApi.getServiceCatalog())}
      create={(body) => mutateOk(hospitalityApi.createServiceCatalogItem(body))}
      update={(id, body) => mutateOk(hospitalityApi.updateServiceCatalogItem(id, body))}
      remove={(id) => mutateOk(hospitalityApi.deleteServiceCatalogItem(id))}
    />
  )
}
