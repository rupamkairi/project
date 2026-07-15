import type { ComposeManifest } from '@projectx/shared-router'

function ManifestIcon(_props: { className?: string }) {
  return null
}

export const workplaceManifest: ComposeManifest = {
  id: 'workplace',
  label: 'Workplace',
  icon: ManifestIcon,
  prefix: '/workplace',
  navItems: [
    { label: 'Dashboard', path: '/workplace', icon: ManifestIcon },
    { label: 'Recruitment', path: '/workplace/recruitment', icon: ManifestIcon },
    { label: 'Onboarding', path: '/workplace/onboarding', icon: ManifestIcon },
    { label: 'People', path: '/workplace/people', icon: ManifestIcon },
    { label: 'Time & Leave', path: '/workplace/time', icon: ManifestIcon },
    { label: 'Performance', path: '/workplace/performance', icon: ManifestIcon },
    { label: 'Payroll', path: '/workplace/payroll', icon: ManifestIcon },
    { label: 'Expenses', path: '/workplace/expenses', icon: ManifestIcon },
    { label: 'Office', path: '/workplace/office', icon: ManifestIcon },
    { label: 'Reports', path: '/workplace/reports', icon: ManifestIcon },
    { label: 'My Workplace', path: '/workplace/my', icon: ManifestIcon },
    { label: 'Settings', path: '/workplace/settings', icon: ManifestIcon },
  ],
  description: 'Workplace — recruitment, HR, payroll, expenses, and office management',
}
