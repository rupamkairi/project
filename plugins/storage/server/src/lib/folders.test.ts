import { describe, it, expect } from 'bun:test'
import { folderFor, catalogMediaFolder } from './folders'

describe('folderFor', () => {
  it('joins segments and drops empties and slashes', () => {
    expect(folderFor('org', 'org-1', 'catalog')).toBe('org/org-1/catalog')
    expect(folderFor('/org/', null, undefined, '', 'catalog/')).toBe('org/catalog')
  })

  it('namespaces catalog media per organization', () => {
    expect(catalogMediaFolder('org-1')).toBe('org/org-1/catalog')
  })
})
