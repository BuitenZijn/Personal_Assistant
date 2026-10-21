/// <reference types="vite/client" />
/**
 * Managing users (roles, overrides, deletion), editing your own profile, and
 * the user pickers' search.
 */
import { describe, expect, it } from 'vitest'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { userFixture, expectPermanentError } from './fixtures'

type Fixture = Awaited<ReturnType<typeof userFixture>>

/** A plain user who was given `users:manage` (and nothing else) as an override. */
async function withManager(f: Fixture) {
  const manager = await f.t.run(ctx =>
    ctx.db.insert('users', {
      firstName: 'Max',
      email: 'max@example.test',
      role: 'user',
      permissionOverrides: ['users:manage'],
    }),
  )
  return { manager, managerClient: f.t.withIdentity({ subject: manager }) }
}

const roleOf = (f: Fixture, id: Id<'users'>) =>
  f.t.run(async ctx => (await ctx.db.get(id))?.role)

describe('users:manage can’t escalate or lock out admins (W-S3)', () => {
  it('refuses changes to your own role and permissions', async () => {
    const f = await userFixture()
    const { manager, managerClient } = await withManager(f)
    await expectPermanentError(
      managerClient.mutation(api.functions.users.updateRole, {
        userId: manager,
        role: 'admin',
      }),
      'FORBIDDEN',
    )
    await expectPermanentError(
      managerClient.mutation(api.functions.users.updatePermissionOverrides, {
        userId: manager,
        permissionOverrides: ['users:manage', 'admin:dashboard'],
      }),
      'FORBIDDEN',
    )
    // Admins too: an admin demoting themselves could leave no admin at all.
    await expectPermanentError(
      f.adminClient.mutation(api.functions.users.updateRole, {
        userId: f.admin,
        role: 'user',
      }),
      'FORBIDDEN',
    )
    await expectPermanentError(
      f.adminClient.mutation(api.functions.users.remove, { id: f.admin }),
      'FORBIDDEN',
    )
    expect(await roleOf(f, manager)).toBe('user')
    expect(await roleOf(f, f.admin)).toBe('admin')
  })

  it('lets only admins grant admin or permissions the caller lacks', async () => {
    const f = await userFixture()
    const { managerClient } = await withManager(f)
    await expectPermanentError(
      managerClient.mutation(api.functions.users.updateRole, {
        userId: f.player,
        role: 'admin',
      }),
      'FORBIDDEN',
    )
    await expectPermanentError(
      managerClient.mutation(api.functions.users.updatePermissionOverrides, {
        userId: f.player,
        permissionOverrides: ['admin:dashboard'],
      }),
      'FORBIDDEN',
    )
    // What the manager holds themselves they may hand on, and take away.
    await managerClient.mutation(
      api.functions.users.updatePermissionOverrides,
      { userId: f.player, permissionOverrides: ['users:manage'] },
    )
    await managerClient.mutation(
      api.functions.users.updatePermissionOverrides,
      { userId: f.author, permissionOverrides: [] },
    )

    await f.adminClient.mutation(api.functions.users.updateRole, {
      userId: f.player,
      role: 'admin',
    })
    expect(await roleOf(f, f.player)).toBe('admin')
  })

  it('keeps non-admins away from admin accounts', async () => {
    const f = await userFixture()
    const { managerClient } = await withManager(f)
    await expectPermanentError(
      managerClient.mutation(api.functions.users.updateRole, {
        userId: f.admin,
        role: 'user',
      }),
      'FORBIDDEN',
    )
    await expectPermanentError(
      managerClient.mutation(api.functions.users.updatePermissionOverrides, {
        userId: f.admin,
        permissionOverrides: [],
      }),
      'FORBIDDEN',
    )
    await expectPermanentError(
      managerClient.mutation(api.functions.users.remove, { id: f.admin }),
      'FORBIDDEN',
    )
    expect(
      (await f.t.run(ctx => ctx.db.get(f.admin)))?.deletionRequestedAt,
    ).toBeUndefined()
  })

  it('lets one admin demote another while an admin remains', async () => {
    const f = await userFixture()
    const second = await f.t.run(ctx =>
      ctx.db.insert('users', { role: 'admin' }),
    )
    await f.adminClient.mutation(api.functions.users.updateRole, {
      userId: second,
      role: 'user',
    })
    expect(await roleOf(f, second)).toBe('user')
  })

  it('reports invalid permission names as a coded error', async () => {
    const f = await userFixture()
    await expectPermanentError(
      f.adminClient.mutation(api.functions.users.updatePermissionOverrides, {
        userId: f.player,
        permissionOverrides: ['quests:everything'],
      }),
      'INVALID_ARGUMENT',
    )
  })
})

describe('editing your profile', () => {
  it('clears text fields sent as empty or null', async () => {
    const f = await userFixture()
    await f.playerClient.mutation(api.functions.users.updateProfile, {
      lastName: 'Pan',
      bio: 'Hello',
      phone: '+32 470 00 00 00',
      location: 'Gent',
    })
    await f.playerClient.mutation(api.functions.users.updateProfile, {
      firstName: 'Pia',
      lastName: '',
      bio: '  ',
      phone: null,
      location: '',
    })
    const user = await f.t.run(ctx => ctx.db.get(f.player))
    expect(user).toMatchObject({ firstName: 'Pia' })
    expect(user?.lastName).toBeUndefined()
    expect(user?.bio).toBeUndefined()
    expect(user?.phone).toBeUndefined()
    expect(user?.location).toBeUndefined()

    await expectPermanentError(
      f.playerClient.mutation(api.functions.users.updateProfile, {
        firstName: ' ',
      }),
      'INVALID_ARGUMENT',
    )
  })

  it('removes the picture with null and deletes replaced pictures', async () => {
    const f = await userFixture()
    const upload = () => f.t.run(ctx => ctx.storage.store(new Blob(['me'])))
    const exists = (id: Id<'_storage'>) =>
      f.t.run(async ctx => (await ctx.db.system.get(id)) !== null)

    const first = await upload()
    await f.playerClient.mutation(api.functions.users.updateProfile, {
      image: first,
    })
    const second = await upload()
    await f.playerClient.mutation(api.functions.users.updateProfile, {
      image: second,
    })
    expect(await exists(first)).toBe(false)
    expect(await exists(second)).toBe(true)

    await f.playerClient.mutation(api.functions.users.updateProfile, {
      image: null,
    })
    expect((await f.t.run(ctx => ctx.db.get(f.player)))?.image).toBeUndefined()
    expect(await exists(second)).toBe(false)
  })
})

describe('user pickers search the whole directory', () => {
  it('finds users older than the newest hundred by email or name', async () => {
    const f = await userFixture()
    const old = await f.t.run(async ctx => {
      // convex-test's search fake fails on documents without the searched
      // field (Convex itself skips them), so every user gets both names.
      for (const user of await ctx.db.query('users').collect()) {
        await ctx.db.patch(user._id, {
          firstName: user.firstName ?? 'Someone',
          lastName: user.lastName ?? 'Else',
        })
      }
      const id = await ctx.db.insert('users', {
        firstName: 'Zelda',
        lastName: 'Oldtimer',
        email: 'zelda.old@example.test',
      })
      for (let i = 0; i < 110; i++) {
        await ctx.db.insert('users', {
          firstName: `Newer${i}`,
          lastName: 'Player',
          email: `newer${i}@example.test`,
        })
      }
      return id
    })

    const listed = await f.adminClient.query(
      api.functions.users.listForFilter,
      {},
    )
    expect(listed.map(u => u._id)).not.toContain(old)

    for (const search of ['zelda.o', 'Zelda', 'oldtimer']) {
      const filter = await f.adminClient.query(
        api.functions.users.searchForFilter,
        { search },
      )
      expect(filter.map(u => u._id)).toContain(old)
    }
  })

  it('still shows only yourself to users without the directory', async () => {
    const f = await userFixture()
    expect(
      await f.authorClient.query(api.functions.users.searchForFilter, {
        search: 'pia',
      }),
    ).toEqual([{ _id: f.author, name: 'Ada' }])
  })
})
