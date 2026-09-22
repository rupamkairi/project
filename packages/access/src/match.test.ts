import { describe, expect, test } from 'bun:test'
import { canAccess, grantMatches, isGlobalSuperuser, permissionsForRole } from './match'

describe('grantMatches', () => {
  test('exact and global wildcards', () => {
    expect(grantMatches('housekeeping:read', 'housekeeping:read')).toBe(true)
    expect(grantMatches('*:*', 'housekeeping:read')).toBe(true)
    expect(grantMatches('*', 'erp:vendor:read')).toBe(true)
  })

  test('trailing star matches remaining segments', () => {
    expect(grantMatches('housekeeping:*', 'housekeeping:read')).toBe(true)
    expect(grantMatches('erp:*', 'erp:vendor:read')).toBe(true)
    expect(grantMatches('restaurant:read:*', 'restaurant:read:kds')).toBe(true)
  })

  test('single-segment star does not skip extra parts', () => {
    expect(grantMatches('*:read', 'housekeeping:read')).toBe(true)
    expect(grantMatches('*:read', 'erp:vendor:read')).toBe(false)
  })
})

describe('canAccess', () => {
  test('platform-admin and *:* are superusers', () => {
    expect(canAccess({ roleKeys: ['platform-admin'], permissions: ['*:*'] }, 'housekeeping:read')).toBe(
      true,
    )
    expect(
      canAccess({ roleKeys: ['platform-developer'], permissions: ['*:*'] }, 'erp:ledger:post'),
    ).toBe(true)
    expect(canAccess({ roles: ['*:*'], permissions: [] }, 'reservation:read')).toBe(true)
  })

  test('compose admin bypass', () => {
    expect(
      canAccess(
        { roleKeys: ['hsp:admin'], permissions: [] },
        'housekeeping:read',
        { composeAdminRoles: ['hsp:admin'] },
      ),
    ).toBe(true)
    expect(
      canAccess(
        { roleKeys: ['hsp:housekeeping'], permissions: ['housekeeping:*'] },
        'reservation:create',
        { composeAdminRoles: ['hsp:admin'] },
      ),
    ).toBe(false)
  })

  test('permission grants', () => {
    expect(
      canAccess(
        { roleKeys: ['hsp:housekeeping'], permissions: ['*:read', 'housekeeping:*'] },
        'housekeeping:read',
      ),
    ).toBe(true)
  })
})

describe('isGlobalSuperuser', () => {
  test('role keys', () => {
    expect(isGlobalSuperuser(['platform-admin'])).toBe(true)
    expect(isGlobalSuperuser(['hsp:admin'])).toBe(false)
  })
})

describe('permissionsForRole', () => {
  test('inverts a matrix', () => {
    const matrix = {
      'a:read': ['admin', 'viewer'],
      'a:write': ['admin'],
    }
    expect(permissionsForRole(matrix, 'admin')).toEqual(['a:read', 'a:write'])
    expect(permissionsForRole(matrix, 'viewer')).toEqual(['a:read'])
  })
})
