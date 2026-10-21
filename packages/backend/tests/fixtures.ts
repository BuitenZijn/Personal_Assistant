/// <reference types="vite/client" />
/**
 * Shared fixtures for the backend tests: a test deployment with a few users,
 * and an assertion for coded (permanent) errors.
 */
import { convexTest } from 'convex-test'
import { expect } from 'vitest'
import schema from '../convex/schema'

const modules = import.meta.glob('../convex/**/*.ts')

export const DAY = 24 * 60 * 60 * 1000

/** Two plain members (author, player) and an admin. */
export async function userFixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async ctx => {
    const author = await ctx.db.insert('users', {
      firstName: 'Ada',
      email: 'ada@example.test',
      role: 'user',
    })
    const player = await ctx.db.insert('users', {
      firstName: 'Pia',
      email: 'pia@example.test',
      role: 'user',
    })
    const admin = await ctx.db.insert('users', { role: 'admin' })
    return { author, player, admin }
  })
  return {
    t,
    ...ids,
    authorClient: t.withIdentity({ subject: ids.author }),
    playerClient: t.withIdentity({ subject: ids.player }),
    adminClient: t.withIdentity({ subject: ids.admin }),
  }
}

export async function expectPermanentError(
  promise: Promise<unknown>,
  code: 'INVALID_ARGUMENT' | 'FORBIDDEN' | 'NOT_FOUND',
) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error, 'expected a rejection').not.toBeNull()
  expect(error).toMatchObject({ data: { code } })
}
