import type { ComposeManifest } from '@projectx/shared-router'

function ManifestIcon(_props: { className?: string }) {
  return null
}

export const hospitalityManifest: ComposeManifest = {
  id: 'hospitality',
  label: 'Hospitality Management',
  icon: ManifestIcon,
  prefix: '/hospitality',
  navItems: [
    { label: 'Dashboard', path: '/hospitality', icon: ManifestIcon },
    { label: 'Reservations', path: '/hospitality/reservations', icon: ManifestIcon },
    { label: 'Rooms', path: '/hospitality/rooms', icon: ManifestIcon },
    { label: 'Guests', path: '/hospitality/guests', icon: ManifestIcon },
    { label: 'Folios', path: '/hospitality/folios', icon: ManifestIcon },
    { label: 'Housekeeping', path: '/hospitality/housekeeping', icon: ManifestIcon },
    { label: 'Services', path: '/hospitality/services', icon: ManifestIcon },
    { label: 'Partners', path: '/hospitality/partners', icon: ManifestIcon },
    { label: 'Venues', path: '/hospitality/venues', icon: ManifestIcon },
    { label: 'Reports', path: '/hospitality/reports', icon: ManifestIcon },
  ],
  description: 'Multi-property hospitality management for hotels, guest houses and resorts',
}
