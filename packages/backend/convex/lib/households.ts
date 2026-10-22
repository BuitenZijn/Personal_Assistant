/**
 * Household membership.
 *
 * Every app user belongs to exactly one household: one is set up on first
 * sign-in, and joining another (with an invite) leaves it. All household data
 * is scoped by `householdId`, and functions reach it only through
 * `requireMyHousehold`, so a user can never read or change another
 * household's data.
 */

import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import { getCurrentUser } from './auth'
import { permanentError } from './errors'

/** How long an invite can be used. */
export const INVITE_VALID_FOR_MS = 14 * 24 * 60 * 60 * 1000

/** Invite codes: no 0/O, 1/I/L, so they survive being read out or typed. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const INVITE_CODE_LENGTH = 8

/** The form a typed invite code is looked up in: upper case, no separators. */
export function normalizeInviteCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export async function getMembership(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<Doc<'householdMembers'> | null> {
  return await ctx.db
    .query('householdMembers')
    .withIndex('by_user', q => q.eq('userId', userId))
    .first()
}

/**
 * The current user, their membership and their household.
 *
 * @throws NOT_FOUND when the user has no household yet (the app sets one up
 *   on first sign-in, see `households.setUp`)
 */
export async function requireMyHousehold(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx)
  const membership = await getMembership(ctx, user._id)
  const household = membership ? await ctx.db.get(membership.householdId) : null
  if (!membership || !household) {
    throw permanentError('NOT_FOUND', 'You are not part of a household yet.')
  }
  return { user, membership, household }
}

/**
 * Take the user out of their household. The last member out deletes it with
 * its invites and (in the background) its receipts; an owner leaving others behind hands ownership to the member
 * who joined first. Returns how many rows it deleted.
 */
export async function leaveHousehold(
  ctx: MutationCtx,
  userId: Id<'users'>,
): Promise<number> {
  const membership = await getMembership(ctx, userId)
  if (!membership) return 0
  await ctx.db.delete(membership._id)

  const remaining = await ctx.db
    .query('householdMembers')
    .withIndex('by_household', q => q.eq('householdId', membership.householdId))
    .collect()
  if (remaining.length === 0) {
    const invites = await ctx.db
      .query('householdInvites')
      .withIndex('by_household', q =>
        q.eq('householdId', membership.householdId),
      )
      .collect()
    for (const invite of invites) await ctx.db.delete(invite._id)
    await ctx.db.delete(membership.householdId)
    // Its receipts can be more than this transaction may delete.
    await ctx.scheduler.runAfter(
      0,
      internal.functions.receipts.deleteHouseholdData,
      { householdId: membership.householdId },
    )
    return invites.length + 2
  }
  if (membership.role === 'owner' && !remaining.some(m => m.role === 'owner')) {
    const next = remaining.reduce((a, b) => (a.joinedAt <= b.joinedAt ? a : b))
    await ctx.db.patch(next._id, { role: 'owner' })
  }
  return 1
}
