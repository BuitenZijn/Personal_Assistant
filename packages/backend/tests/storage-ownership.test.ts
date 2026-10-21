/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { DAY, expectPermanentError, userFixture } from './fixtures'

afterEach(() => vi.useRealTimers())

type Fixture = Awaited<ReturnType<typeof userFixture>>

function upload(f: Fixture, content = 'file') {
  return f.t.run(ctx => ctx.storage.store(new Blob([content])))
}

function blobExists(f: Fixture, storageId: Id<'_storage'>) {
  return f.t.run(async ctx => (await ctx.db.system.get(storageId)) !== null)
}

function deleteAccount(f: Fixture, userId: Id<'users'>) {
  return f.t.mutation(internal.functions.users.processAccountDeletion, {
    userId,
  })
}

describe('attaching storage ids (S3)', () => {
  it('rejects another user’s file as a profile image, so deleting the account leaves it alone', async () => {
    const f = await userFixture()
    const victimImage = await upload(f, 'victim avatar')
    await f.authorClient.mutation(api.functions.users.updateProfile, {
      image: victimImage,
    })
    await expectPermanentError(
      f.playerClient.mutation(api.functions.users.updateProfile, {
        image: victimImage,
      }),
      'FORBIDDEN',
    )
    await deleteAccount(f, f.player)
    expect(await blobExists(f, victimImage)).toBe(true)
  })

  it('rejects an old unclaimed file the caller did not just upload', async () => {
    vi.useFakeTimers()
    const f = await userFixture()
    // Uploaded long ago and never claimed: its id may be visible on content.
    const legacyImage = await upload(f, 'old image')
    vi.setSystemTime(Date.now() + 2 * DAY)
    await expectPermanentError(
      f.playerClient.mutation(api.functions.users.updateProfile, {
        image: legacyImage,
      }),
      'FORBIDDEN',
    )
  })

  it('accepts and claims the caller’s own fresh upload, and deletes it with the account', async () => {
    const f = await userFixture()
    const avatar = await upload(f, 'my avatar')
    await f.playerClient.mutation(api.functions.users.updateProfile, {
      image: avatar,
    })
    // Setting it again is fine: it is the caller's own file now.
    await f.playerClient.mutation(api.functions.users.updateProfile, {
      image: avatar,
      firstName: 'Pia',
    })
    const replaced = await upload(f, 'my new avatar')
    await f.playerClient.mutation(api.functions.users.updateProfile, {
      image: replaced,
    })
    await deleteAccount(f, f.player)
    // Both the current and the replaced picture were the player's uploads.
    expect(await blobExists(f, avatar)).toBe(false)
    expect(await blobExists(f, replaced)).toBe(false)
  })
})
