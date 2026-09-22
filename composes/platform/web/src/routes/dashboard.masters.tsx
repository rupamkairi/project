import { createRoute } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { CrudTablePage } from '@projectx/ui/admin'
import { Button } from '@projectx/ui'
import { Route as dashboardLayoutRoute } from './dashboard.layout'
import { platformApi } from '../lib/api/platform'

const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : '—')
const name = (r: any) => [r.firstName, r.lastName].filter(Boolean).join(' ') || '—'

async function unwrapList(res: { data?: { data: any[]; pagination?: { total: number } }; error?: string }) {
  if (res.error) throw new Error(res.error)
  return { items: res.data?.data ?? [], total: res.data?.pagination?.total ?? res.data?.data?.length ?? 0 }
}

function labelize(value: string) {
  return value.replace(/_/g, ' ')
}

const PERSON_TYPES = [
  'lead',
  'contact',
  'customer',
  'student',
  'patient',
  'guest',
  'rider',
  'vendor_contact',
  'instructor',
]
const PARTY_TYPES = ['company', 'vendor', 'insurer', 'school', 'clinic', 'corporate', 'ngo']
const LOCATION_TYPES = ['outlet', 'table', 'room', 'warehouse', 'ward', 'bed', 'virtual', 'building', 'floor']
const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'task', 'log', 'service_request', 'visit_note']

function opts(values: string[]) {
  return values.map((value) => ({ value, label: labelize(value) }))
}

function PersonsPage() {
  return (
    <CrudTablePage
      title="Persons"
      description="Leads, contacts, customers and other external people."
      createLabel="Add Person"
      searchPlaceholder="Search by name or email..."
      filterKey="type"
      filterOptions={[{ value: '', label: 'All' }, ...opts(PERSON_TYPES)]}
      columns={[
        { header: 'Name', accessor: name },
        { header: 'Type', accessor: (r) => r.type },
        { header: 'Email', accessor: (r) => r.email ?? '—' },
        { header: 'Phone', accessor: (r) => r.phone ?? '—' },
        { header: 'Created', accessor: (r) => fmtDate(r.createdAt) },
      ]}
      fields={[
        { key: 'type', label: 'Type', type: 'select', required: true, options: opts(PERSON_TYPES) },
        { key: 'firstName', label: 'First name' },
        { key: 'lastName', label: 'Last name' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone' },
        { key: 'source', label: 'Source' },
        { key: 'partyId', label: 'Party ID' },
      ]}
      defaults={{ type: 'contact' }}
      list={async ({ page, limit, filters }) =>
        unwrapList(await platformApi.getPersons({ page, limit, type: filters.type || undefined }))
      }
      create={(body) => platformApi.createPerson(body)}
      update={(id, body) => platformApi.updatePerson(id, body)}
      remove={(id) => platformApi.deletePerson(id)}
    />
  )
}

function PartiesPage() {
  return (
    <CrudTablePage
      title="Parties"
      description="External organizations a tenant manages."
      createLabel="Add Party"
      filterKey="type"
      filterOptions={[{ value: '', label: 'All' }, ...opts(PARTY_TYPES)]}
      columns={[
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Type', accessor: (r) => r.type },
        { header: 'Domain', accessor: (r) => r.domain ?? '—' },
        { header: 'Industry', accessor: (r) => r.industry ?? '—' },
        { header: 'Created', accessor: (r) => fmtDate(r.createdAt) },
      ]}
      fields={[
        { key: 'type', label: 'Type', type: 'select', required: true, options: opts(PARTY_TYPES) },
        { key: 'name', label: 'Name', required: true },
        { key: 'domain', label: 'Domain' },
        { key: 'industry', label: 'Industry' },
        { key: 'employeeCount', label: 'Employee count', type: 'number' },
      ]}
      defaults={{ type: 'company' }}
      list={async ({ page, limit, filters }) =>
        unwrapList(await platformApi.getParties({ page, limit, type: filters.type || undefined }))
      }
      create={(body) => platformApi.createParty(body)}
      update={(id, body) => platformApi.updateParty(id, body)}
      remove={(id) => platformApi.deleteParty(id)}
    />
  )
}

function LocationsPage() {
  return (
    <CrudTablePage
      title="Locations"
      description="Outlets, rooms, warehouses and other places."
      createLabel="Add Location"
      filterKey="type"
      filterOptions={[{ value: '', label: 'All' }, ...opts(LOCATION_TYPES)]}
      columns={[
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Type', accessor: (r) => r.type },
        { header: 'Code', accessor: (r) => r.code ?? '—' },
        { header: 'Status', accessor: (r) => r.status },
        { header: 'Created', accessor: (r) => fmtDate(r.createdAt) },
      ]}
      fields={[
        { key: 'type', label: 'Type', type: 'select', required: true, options: opts(LOCATION_TYPES) },
        { key: 'name', label: 'Name', required: true },
        { key: 'code', label: 'Code' },
        { key: 'capacity', label: 'Capacity', type: 'number' },
        { key: 'parentId', label: 'Parent ID' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'active' },
            { value: 'inactive', label: 'inactive' },
          ],
        },
      ]}
      defaults={{ type: 'outlet', status: 'active' }}
      list={async ({ page, limit, filters }) =>
        unwrapList(await platformApi.getLocations({ page, limit, type: filters.type || undefined }))
      }
      create={(body) => platformApi.createLocation(body)}
      update={(id, body) => platformApi.updateLocation(id, body)}
      remove={(id) => platformApi.deleteLocation(id)}
    />
  )
}

function ActivitiesPage() {
  return (
    <CrudTablePage
      title="Activities"
      description="Calls, emails, notes, tasks and other interactions."
      createLabel="Log Activity"
      filterKey="type"
      filterOptions={[{ value: '', label: 'All' }, ...opts(ACTIVITY_TYPES)]}
      columns={[
        { header: 'Subject', accessor: (r) => r.subject ?? '—' },
        { header: 'Type', accessor: (r) => r.type },
        { header: 'Status', accessor: (r) => r.status },
        { header: 'Created', accessor: (r) => fmtDate(r.createdAt) },
      ]}
      fields={[
        { key: 'type', label: 'Type', type: 'select', required: true, options: opts(ACTIVITY_TYPES), createOnly: true },
        { key: 'subject', label: 'Subject' },
        { key: 'body', label: 'Body', type: 'textarea' },
        { key: 'entityType', label: 'Entity type', createOnly: true },
        { key: 'entityId', label: 'Entity ID', createOnly: true },
        { key: 'dueAt', label: 'Due at', type: 'datetime' },
      ]}
      defaults={{ type: 'note' }}
      list={async ({ page, limit, filters }) =>
        unwrapList(await platformApi.getActivities({ page, limit, type: filters.type || undefined }))
      }
      create={(body) => platformApi.createActivity(body)}
      update={(id, body) => platformApi.updateActivity(id, body)}
      remove={(id) => platformApi.deleteActivity(id)}
      extraRowActions={(row, reload) =>
        row.status === 'pending' ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Complete"
              onClick={async () => {
                await platformApi.completeActivity(row.id)
                reload()
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Cancel"
              onClick={async () => {
                await platformApi.cancelActivity(row.id)
                reload()
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : null
      }
    />
  )
}

export const personsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/persons',
  component: PersonsPage,
})
export const partiesRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/parties',
  component: PartiesPage,
})
export const locationsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/locations',
  component: LocationsPage,
})
export const activitiesRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/activities',
  component: ActivitiesPage,
})

export const masterRoutes = [personsRoute, partiesRoute, locationsRoute, activitiesRoute]
