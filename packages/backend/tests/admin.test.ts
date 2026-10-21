/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import { api } from '../convex/_generated/api'
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  getEffectivePermissions,
} from '../convex/lib/permissions'
import { userFixture } from './fixtures'

describe('permissions', () => {
  it('lists every permission in a group, so each can be granted and shown', () => {
    const grouped = Object.values(PERMISSIONS).flatMap(group =>
      Object.values(group),
    )
    expect([...grouped].sort()).toEqual([...ALL_PERMISSIONS].sort())
  })

  it('gives admins every permission and members none by default', () => {
    expect([...getEffectivePermissions({ role: 'admin' })].sort()).toEqual(
      [...ALL_PERMISSIONS].sort(),
    )
    expect(getEffectivePermissions({ role: 'user' })).toEqual([])
    expect(
      getEffectivePermissions({
        role: 'user',
        permissionOverrides: ['users:view-all'],
      }),
    ).toEqual(['users:view-all'])
  })

  it('serves the permissions config to signed-in users only', async () => {
    const f = await userFixture()
    const config = await f.playerClient.query(
      api.functions.admin.getPermissionsConfig,
      {},
    )
    expect(config.rolePermissions.admin).toEqual([...ALL_PERMISSIONS])
    await expect(
      f.t.query(api.functions.admin.getPermissionsConfig, {}),
    ).rejects.toThrow()
  })
})
