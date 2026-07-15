import type { ComposeManifest } from '@projectx/shared-router'

function ManifestIcon(_props: { className?: string }) {
  return null
}

export const restaurantManifest: ComposeManifest = {
  id: 'restaurant',
  label: 'Restaurant Management',
  icon: ManifestIcon,
  prefix: '/restaurants',
  navItems: [
    { label: 'Operations Dashboard', path: '/restaurants/admin/dashboard', icon: ManifestIcon },
    { label: 'POS', path: '/restaurants/pos/orders', icon: ManifestIcon },
    { label: 'KDS', path: '/restaurants/kds', icon: ManifestIcon },
    { label: 'Tables', path: '/restaurants/pos/tables', icon: ManifestIcon },
    { label: 'Menu', path: '/restaurants/admin/menu', icon: ManifestIcon },
    { label: 'Inventory', path: '/restaurants/admin/inventory', icon: ManifestIcon },
    { label: 'Delivery Partners', path: '/restaurants/admin/aggregators', icon: ManifestIcon },
    { label: 'Reports', path: '/restaurants/admin/analytics', icon: ManifestIcon },
    { label: 'Customer', path: '/restaurants/customer/menu', icon: ManifestIcon },
  ],
  description: 'Multi-outlet restaurant operations',
}
