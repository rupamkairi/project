export function folderFor(...segments: Array<string | null | undefined>): string {
  return segments
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter((s) => s.length > 0)
    .join('/')
}

export function catalogMediaFolder(organizationId: string): string {
  return folderFor('org', organizationId, 'catalog')
}
