import type { ComposeManifest } from '@projectx/shared-router'

function ManifestIcon(_props: { className?: string }) {
  return null
}

export const projectManagementManifest: ComposeManifest = {
  id: 'project-management',
  label: 'Projects',
  icon: ManifestIcon,
  prefix: '/projects',
  navItems: [
    { label: 'Dashboard', path: '/projects', icon: ManifestIcon },
    { label: 'Portfolios', path: '/projects/portfolios', icon: ManifestIcon },
    { label: 'My Work', path: '/projects/my-work', icon: ManifestIcon },
    { label: 'Boards', path: '/projects/boards', icon: ManifestIcon },
    { label: 'Reports', path: '/projects/reports', icon: ManifestIcon },
  ],
  description: 'Project Management — portfolios, projects, work items, sprints, boards, and PSA',
}
