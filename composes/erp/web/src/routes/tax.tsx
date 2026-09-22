import { createRoute } from '@tanstack/react-router'
import { Route as ErpLayoutRoute } from './layout'
import { erpApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: '/tax',
  component: TaxPage,
})

function TaxPage() {
  return (
    <CrudTablePage
      title="GST Templates"
      description="Tax templates and rates."
      createLabel="Add Template"
      columns={[
        { header: 'Name', accessor: (r) => r.name ?? r.key ?? r.id },
        { header: 'Rate', accessor: (r) => String(r.rate ?? r.gstRate ?? '—') },
        { header: 'Type', accessor: (r) => r.type ?? '—' },
      ]}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'rate', label: 'Rate', type: 'number', required: true },
        { key: 'type', label: 'Type' },
      ]}
      list={async () => {
        const res = await erpApi.gst.templates()
        if (res.error) throw new Error(res.error)
        return normalizeList(res.data)
      }}
      create={(body) => mutateOk(erpApi.gst.createTemplate(body))}
    />
  )
}
