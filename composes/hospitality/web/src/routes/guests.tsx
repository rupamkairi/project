import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'
import { hospitalityApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/guests',
  component: GuestsPage,
})

function GuestsPage() {
  return (
    <CrudTablePage
      title="Guests"
      description="Guest profiles, preferences, and stay history."
      createLabel="Add Guest"
      columns={[
        { header: 'Name', accessor: (r) => [r.firstName, r.lastName].filter(Boolean).join(' ') || r.name || r.id },
        { header: 'Email', accessor: (r) => r.email ?? '—' },
        { header: 'Phone', accessor: (r) => r.phone ?? '—' },
      ]}
      fields={[
        { key: 'firstName', label: 'First name' },
        { key: 'lastName', label: 'Last name' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone' },
      ]}
      list={async () => {
        try {
          return normalizeList(await hospitalityApi.getGuests())
        } catch (e) {
          throw e instanceof Error ? e : new Error(String(e))
        }
      }}
      create={(body) => mutateOk(hospitalityApi.createGuest(body))}
      update={(id, body) => mutateOk(hospitalityApi.updateGuest(id, body))}
      remove={(id) => mutateOk(hospitalityApi.deleteGuest(id))}
    />
  )
}
