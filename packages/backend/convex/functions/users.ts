/**
 * User Management Functions
 *
 * Combines:
 * - Current user profile queries (userQueries.ts)
 * - Admin user management (users.ts)
 */

import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
} from '../_generated/server'
import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'
import { internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import { getAuthUserId, signInViaProvider } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import {
  requirePermission,
  getCurrentUser,
  normalizeEmail,
  authEmailSendDecision,
  requireAuthEmail,
  tooManyAuthEmailsError,
  type AuthEmailKind,
} from '../lib/auth'
import { permanentError } from '../lib/errors'
import { hasPermission, type Permission } from '../lib/permissions'
import { roleValidator } from '../schema'
import {
  getEffectivePermissions,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../lib/permissions'
import { claimStorage, deleteOwnedBlob } from '../lib/storageClaims'
import { ResendOTP } from '../ResendOTP'
import { ResendOTPPasswordReset } from '../ResendOTPPasswordReset'

// ============================================================================
// Current User (Self)
// ============================================================================

/**
 * Get current user's profile with resolved image URL
 */
export const me = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null

    const user = await ctx.db.get(userId)
    if (!user) return null

    const imageUrl = user.image ? await ctx.storage.getUrl(user.image) : null
    const effectivePermissions = getEffectivePermissions(user)

    // Return as nested object to preserve type inference
    return { user, imageUrl, effectivePermissions }
  },
})

/**
 * Generate upload URL for profile image
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new Error('Not authenticated')
    }
    return await ctx.storage.generateUploadUrl()
  },
})

/** A profile text field: omit to keep it, `null` or blank to clear it. */
const clearableText = v.optional(v.union(v.string(), v.null()))

/**
 * Update current user's profile.
 *
 * Omitted fields are left alone. `null` or an empty string clears a text
 * field, and `image: null` removes the profile picture. A replaced or removed
 * picture is deleted if it is the user's own file.
 */
export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: clearableText,
    image: v.optional(v.union(v.id('_storage'), v.null())),
    bio: clearableText,
    phone: clearableText,
    location: clearableText,
    language: clearableText,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new Error('Not authenticated')
    }
    const user = await ctx.db.get(userId)
    if (!user) throw new Error('User not found')

    const updates: Partial<Doc<'users'>> = {}
    if (args.firstName !== undefined) {
      const firstName = args.firstName.trim()
      if (!firstName) {
        throw permanentError(
          'INVALID_ARGUMENT',
          'Your first name cannot be empty.',
        )
      }
      updates.firstName = firstName
    }
    // Patching a field to undefined removes it.
    const text = (value: string | null) => value?.trim() || undefined
    if (args.lastName !== undefined) updates.lastName = text(args.lastName)
    if (args.bio !== undefined) updates.bio = text(args.bio)
    if (args.phone !== undefined) updates.phone = text(args.phone)
    if (args.location !== undefined) updates.location = text(args.location)
    if (args.language !== undefined) updates.language = text(args.language)

    if (args.image !== undefined) {
      // Only the user's own upload: the profile image is deleted with the
      // account, so accepting any storage id let a user delete someone
      // else's file (a quest cover, a puzzle image) by deleting their account.
      if (args.image !== null && args.image !== user.image) {
        await claimStorage(ctx, args.image, userId)
      }
      updates.image = args.image ?? undefined
      if (user.image && user.image !== args.image) {
        await deleteOwnedBlob(ctx, user.image, userId, user._creationTime)
      }
    }

    await ctx.db.patch(userId, updates)

    return null
  },
})

// ============================================================================
// Sign-in Emails (used by the password provider in convex/auth.ts)
// ============================================================================

const PASSWORD_PROVIDER = 'password'

async function findPasswordAccount(ctx: QueryCtx, email: string) {
  return await ctx.db
    .query('authAccounts')
    .withIndex('providerAndAccountId', q =>
      q.eq('provider', PASSWORD_PROVIDER).eq('providerAccountId', email),
    )
    .unique()
}

/**
 * Whether some password account's address starts with `prefix`, exactly as
 * stored.
 */
async function hasPasswordAccountStartingWith(ctx: QueryCtx, prefix: string) {
  const account = await ctx.db
    .query('authAccounts')
    .withIndex('providerAndAccountId', q =>
      q
        .eq('provider', PASSWORD_PROVIDER)
        .gte('providerAccountId', prefix)
        .lt('providerAccountId', `${prefix}￿`),
    )
    .first()
  return account !== null
}

/**
 * The password account stored under some capitalisation of `email` (a
 * normalised address), e.g. `Jane@X.test` for `jane@x.test`: accounts from
 * before addresses were normalised, until `normalizeStoredEmails` migrates
 * them.
 *
 * The index is exact, so this walks the address one letter at a time, in
 * both cases, keeping only the prefixes some stored address starts with. It
 * reads a few index entries per letter: stored addresses are lower case now,
 * apart from the few old ones.
 */
async function findPasswordAccountIgnoringCase(ctx: QueryCtx, email: string) {
  let prefixes = ['']
  for (const char of email) {
    const upper = char.toUpperCase()
    const cases =
      upper !== char && upper.toLowerCase() === char ? [char, upper] : [char]
    const extended = prefixes.flatMap(prefix => cases.map(c => prefix + c))
    if (cases.length === 1) {
      prefixes = extended
      continue
    }
    prefixes = []
    for (const prefix of extended) {
      if (await hasPasswordAccountStartingWith(ctx, prefix)) {
        prefixes.push(prefix)
      }
    }
    if (prefixes.length === 0) return null
  }
  for (const prefix of prefixes) {
    const account = await findPasswordAccount(ctx, prefix)
    if (account) return account
  }
  return null
}

/**
 * The password account an email address signs in to, and the form of the
 * address to use for it: the stored one, or for an address without an
 * account the normalised one (see `normalizeEmail`) it would be created
 * under.
 *
 * Clients send the address as typed (trimmed), and it is looked up:
 * - exactly as typed: two accounts differing only in case (which
 *   `normalizeStoredEmails` reports and leaves alone) are each reached by
 *   typing theirs exactly;
 * - normalised;
 * - in any capitalisation, so an account stored with capitals before
 *   addresses were normalised is reached however it is typed, and signing
 *   up can't create a second account for it.
 */
export const passwordAccountState = internalQuery({
  args: { email: v.string() },
  returns: v.object({
    email: v.string(),
    accountId: v.union(v.id('authAccounts'), v.null()),
    verified: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const typed = args.email.trim()
    const normalized = normalizeEmail(args.email)
    const account =
      (await findPasswordAccount(ctx, typed)) ??
      (typed === normalized
        ? null
        : await findPasswordAccount(ctx, normalized)) ??
      (await findPasswordAccountIgnoringCase(ctx, normalized))
    return {
      email: account?.providerAccountId ?? normalized,
      accountId: account?._id ?? null,
      verified: !!account?.emailVerified,
    }
  },
})

const authEmailKindValidator = v.union(v.literal('verify'), v.literal('reset'))

/**
 * How long each kind of auth email works: its provider's `maxAge`, in
 * seconds. `Email()` keeps the config it was given in `options`, which the
 * library merges over its own defaults (an hour) when it loads the provider.
 */
function providerValidForMs(provider: typeof ResendOTP) {
  return (provider.options?.maxAge ?? provider.maxAge ?? 60 * 60) * 1000
}
const AUTH_EMAIL_VALID_FOR_MS: Record<AuthEmailKind, number> = {
  verify: providerValidForMs(ResendOTP),
  reset: providerValidForMs(ResendOTPPasswordReset),
}

/**
 * Count an email about to be sent to an address, or say why not to send it
 * (see `authEmailSendDecision`). A sign-up claims before its account exists.
 *
 * Callers only claim for addresses they are about to email, so the table
 * holds at most a row per account and kind. A row is reused once its hour is
 * over, and deleted with the account.
 */
export const claimAuthEmailSend = internalMutation({
  args: {
    email: v.string(),
    kind: authEmailKindValidator,
  },
  returns: v.union(
    v.object({ action: v.literal('send') }),
    v.object({ action: v.literal('wait'), retryAfterMs: v.number() }),
    v.object({ action: v.literal('reuse') }),
  ),
  handler: async (ctx, { email, kind }) => {
    const now = Date.now()
    // Both kinds: the hourly cap counts them together.
    const rows = await ctx.db
      .query('authEmailThrottles')
      .withIndex('by_email_and_kind', q => q.eq('email', email))
      .collect()
    const row = rows.find(r => r.kind === kind) ?? null
    const decision = authEmailSendDecision(
      kind,
      {
        verify: rows.find(r => r.kind === 'verify'),
        reset: rows.find(r => r.kind === 'reset'),
      },
      now,
      AUTH_EMAIL_VALID_FOR_MS[kind],
    )
    if (decision.action === 'wait') {
      return { action: 'wait' as const, retryAfterMs: decision.retryAfterMs }
    }
    if (decision.action === 'reuse') return { action: 'reuse' as const }
    if (!row) {
      await ctx.db.insert('authEmailThrottles', {
        email,
        kind,
        windowStart: now,
        count: 1,
        lastSentAt: now,
      })
    } else if (decision.newWindow) {
      await ctx.db.patch(row._id, {
        windowStart: now,
        count: 1,
        lastSentAt: now,
      })
    } else {
      await ctx.db.patch(row._id, { count: row.count + 1, lastSentAt: now })
    }
    return { action: 'send' as const }
  },
})

/**
 * Send a new email-verification code to an address that signed up but hasn't
 * verified yet. Needs no password: "Resend code" used to sign in with an
 * empty one, which never sent anything and counted as a failed sign-in.
 *
 * Throttled per address (see `authEmailSendDecision`). Answers `reused`
 * when, past the hourly cap, nothing was sent because the last code still
 * works, so the page can say to use that one instead of waiting for a new
 * one.
 *
 * An address with nothing to verify is answered `sent`, as if a code went
 * out, and nothing is stored for it, so asking for any number of addresses
 * leaves nothing behind. Asking twice within a minute (or past the cap) does
 * tell an unverified account from none, which signing up tells anyway
 * ("already exists").
 *
 * @throws ConvexError TOO_MANY_REQUESTS when a code went out less than a
 *   minute ago
 * @throws ConvexError INVALID_ARGUMENT for an address over 254 characters
 */
export const resendVerificationCode = action({
  args: { email: v.string() },
  returns: v.object({
    status: v.union(v.literal('sent'), v.literal('reused')),
  }),
  handler: async (ctx, args): Promise<{ status: 'sent' | 'reused' }> => {
    requireAuthEmail(args.email)
    const account: {
      email: string
      accountId: Id<'authAccounts'> | null
      verified: boolean
    } = await ctx.runQuery(internal.functions.users.passwordAccountState, {
      email: args.email,
    })
    if (account.accountId === null || account.verified) {
      return { status: 'sent' }
    }
    const claim: { action: string; retryAfterMs?: number } =
      await ctx.runMutation(internal.functions.users.claimAuthEmailSend, {
        email: account.email,
        kind: 'verify',
      })
    if (claim.action === 'wait') {
      throw tooManyAuthEmailsError(claim.retryAfterMs ?? 0)
    }
    // The last code sent still works.
    if (claim.action === 'reuse') return { status: 'reused' }

    await signInViaProvider(withAuthConfig(ctx), ResendOTP, {
      accountId: account.accountId,
      params: { email: account.email },
    })
    return { status: 'sent' }
  },
})

/**
 * The library's sign-in helpers expect the context `auth:signIn` runs with,
 * which carries the auth config. Sending a code only reads its email theme,
 * and the redirect callback when `redirectTo` is set (it isn't here).
 */
function withAuthConfig(ctx: ActionCtx) {
  return {
    ...ctx,
    auth: {
      ...ctx.auth,
      config: {
        providers: [],
        theme: {
          colorScheme: 'auto' as const,
          logo: '',
          brandColor: '',
          buttonText: '',
        },
      },
    },
  }
}

// ============================================================================
// Admin User Management
// ============================================================================

/**
 * Get all users (admin only)
 */
export const list = query({
  args: {},
  handler: async ctx => {
    await requirePermission(ctx, 'users:view-all')
    return await ctx.db.query('users').order('desc').take(200)
  },
})

export const listPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'users:view-all')
    return await ctx.db
      .query('users')
      .order('desc')
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 50),
        maximumRowsRead: 100,
      })
  },
})

/** How many users a picker lists at once. */
const USER_PICKER_LIMIT = 100
/** How many matches a picker search returns. */
const USER_SEARCH_LIMIT = 20

/**
 * Users for a picker: the newest ones, or with `search`, those whose email
 * starts with it or whose first or last name matches it. Accounts being
 * deleted are left out. Callers check permissions.
 */
export async function searchUsers(
  ctx: QueryCtx,
  search: string | undefined,
): Promise<Doc<'users'>[]> {
  const term = search?.trim() ?? ''
  if (!term) {
    const newest = await ctx.db
      .query('users')
      .order('desc')
      .take(USER_PICKER_LIMIT)
    return newest.filter(u => !u.deletionRequestedAt)
  }

  const found = new Map<Id<'users'>, Doc<'users'>>()
  const add = (users: Doc<'users'>[]) => {
    for (const user of users) {
      if (found.size >= USER_SEARCH_LIMIT) return
      if (!user.deletionRequestedAt) found.set(user._id, user)
    }
  }
  // Stored emails are lower case (see normalizeEmail).
  const prefix = normalizeEmail(term)
  add(
    await ctx.db
      .query('users')
      .withIndex('email', q => q.gte('email', prefix).lt('email', `${prefix}￿`))
      .take(USER_SEARCH_LIMIT),
  )
  add(
    await ctx.db
      .query('users')
      .withSearchIndex('search_first_name', q => q.search('firstName', term))
      .take(USER_SEARCH_LIMIT),
  )
  add(
    await ctx.db
      .query('users')
      .withSearchIndex('search_last_name', q => q.search('lastName', term))
      .take(USER_SEARCH_LIMIT),
  )
  return [...found.values()]
}

/**
 * Users for a filter dropdown: the whole directory (newest first, or those
 * matching `search`) for callers with `users:view-all`, otherwise just the
 * caller.
 */
async function usersForFilter(ctx: QueryCtx, search: string | undefined) {
  const user = await getCurrentUser(ctx)

  if (hasPermission(user, 'users:view-all')) {
    const users = await searchUsers(ctx, search)
    return users.map(u => ({ _id: u._id, name: filterName(u) }))
  }

  return [{ _id: user._id, name: filterName(user) }]
}

/** Full name, or the email address for a user without one. */
function filterName(user: Doc<'users'>): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return fullName || user.email || 'Onbekend'
}

/**
 * Get users list for filter dropdowns.
 * Returns the newest users when caller has `users:view-all`, otherwise just
 * the current user. `searchForFilter` finds the others.
 */
export const listForFilter = query({
  args: {},
  handler: async ctx => usersForFilter(ctx, undefined),
})

/**
 * `listForFilter` with a search: email prefix, first or last name. A filter
 * dropdown uses it to reach users older than the newest hundred.
 */
export const searchForFilter = query({
  args: { search: v.string() },
  handler: async (ctx, args) => usersForFilter(ctx, args.search),
})

// ============================================================================
// Account Deletion (GDPR / Google Play data-deletion requirement)
// ============================================================================

/**
 * Work budget per deletion pass. Each pass runs in its own transaction and
 * reschedules itself until everything is gone, so the budget only has to keep
 * a single pass far below Convex's per-mutation limits (32k documents
 * scanned / 16k written / 4,096 index ranges). A location-heavy account (GPS
 * is recorded every 2s during gameplay) can hold far more rows than one
 * transaction may touch, which is why this cannot be a single mutation.
 */
const DELETION_PASS_BUDGET = 500

/**
 * Revoke all auth state for a user: sessions (+ refresh tokens) so every
 * device is signed out immediately, and accounts (+ pending verification
 * codes) so the email address is freed for re-registration. Without this the
 * user's email and credentials would outlive the account, and sessions on
 * other devices would keep resolving to a deleted user id.
 */
async function revokeAuthState(ctx: MutationCtx, userId: Id<'users'>) {
  const sessions = await ctx.db
    .query('authSessions')
    .withIndex('userId', q => q.eq('userId', userId))
    .collect()
  for (const session of sessions) {
    const refreshTokens = await ctx.db
      .query('authRefreshTokens')
      .withIndex('sessionId', q => q.eq('sessionId', session._id))
      .collect()
    for (const token of refreshTokens) await ctx.db.delete(token._id)
    await ctx.db.delete(session._id)
  }

  const accounts = await ctx.db
    .query('authAccounts')
    .withIndex('userIdAndProvider', q => q.eq('userId', userId))
    .collect()
  for (const account of accounts) {
    const codes = await ctx.db
      .query('authVerificationCodes')
      .withIndex('accountId', q => q.eq('accountId', account._id))
      .collect()
    for (const code of codes) await ctx.db.delete(code._id)
    // The address's email throttle (see `claimAuthEmailSend`).
    if (account.provider === PASSWORD_PROVIDER) {
      const throttles = await ctx.db
        .query('authEmailThrottles')
        .withIndex('by_email_and_kind', q =>
          q.eq('email', account.providerAccountId),
        )
        .collect()
      for (const throttle of throttles) await ctx.db.delete(throttle._id)
    }
    await ctx.db.delete(account._id)
  }
}

/**
 * Mark the user, revoke auth everywhere, and kick off the batched cascade.
 *
 * The email address is removed from the row straight away. Signing up links
 * a new account to an existing user with the same verified email, so while
 * the cascade ran, signing up again attached the new account to the user
 * being deleted — and the cascade then deleted it.
 */
async function beginAccountDeletion(ctx: MutationCtx, userId: Id<'users'>) {
  await revokeAuthState(ctx, userId)
  const user = await ctx.db.get(userId)
  if (user && !user.deletionRequestedAt) {
    await ctx.db.patch(userId, {
      deletionRequestedAt: Date.now(),
      email: undefined,
      emailVerificationTime: undefined,
    })
  }
  await ctx.scheduler.runAfter(
    0,
    internal.functions.users.processAccountDeletion,
    { userId },
  )
}

/**
 * One step of the deletion cascade: deletes at most `budget` of the user's
 * rows and returns how many it used. Returning less than `budget` means the
 * step has nothing left.
 */
type DeletionStep = (
  ctx: MutationCtx,
  userId: Id<'users'>,
  budget: number,
) => Promise<number>

/**
 * Every remaining blob the user uploaded, including ones no longer attached
 * to anything (a replaced profile picture).
 */
async function deleteClaimedStorage(
  ctx: MutationCtx,
  userId: Id<'users'>,
  budget: number,
): Promise<number> {
  const claims = await ctx.db
    .query('storageClaims')
    .withIndex('by_user', q => q.eq('userId', userId))
    .take(budget)
  for (const claim of claims) {
    if (await ctx.db.system.get(claim.storageId)) {
      await ctx.storage.delete(claim.storageId)
    }
    await ctx.db.delete(claim._id)
  }
  return claims.length
}

/**
 * Delete the currently authenticated user's account and all associated data.
 *
 * This mutation only revokes auth state (every session dies immediately and
 * the email is freed) and schedules the batched cascade — see
 * `processAccountDeletion` for what gets removed and why it runs in passes.
 */
export const deleteAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    const user = await ctx.db.get(userId)
    if (!user) throw new Error('User not found')
    await beginAccountDeletion(ctx, userId)
    return null
  },
})

/**
 * One budgeted pass of the deletion cascade. Each step deletes at most the
 * remaining budget and reports how much it used; a step reporting less than
 * asked has nothing left. When all steps are drained in a single pass, the
 * profile image and the user row itself are removed. Passes chain via the
 * scheduler; a cron resumes the chain if it ever dies (scheduled functions
 * are not retried automatically).
 */
export const processAccountDeletion = internalMutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    // Each feature that stores rows per user adds its step here, before the
    // storage step (a feature's rows may reference claimed blobs).
    const steps: DeletionStep[] = [deleteClaimedStorage]

    let budget = DELETION_PASS_BUDGET
    for (const step of steps) {
      budget -= await step(ctx, userId, budget)
      if (budget <= 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.functions.users.processAccountDeletion,
          { userId },
        )
        return null
      }
    }

    // Everything drained. Sweep auth state once more (an in-flight sign-in
    // could have re-created a session since the request), then remove the
    // profile image and the user row itself.
    await revokeAuthState(ctx, userId)
    const user = await ctx.db.get(userId)
    if (user) {
      if (user.image) {
        await deleteOwnedBlob(ctx, user.image, userId, user._creationTime)
      }
      await ctx.db.delete(userId)
    }
    return null
  },
})

/**
 * Safety net, run from crons: restart the deletion cascade for any user whose
 * batch chain died before finishing (their row still carries
 * deletionRequestedAt). The sparse timestamp index avoids scanning every
 * healthy account just to find the exceptional rows.
 */
export const resumeStuckAccountDeletions = internalMutation({
  args: {},
  returns: v.null(),
  handler: async ctx => {
    const stuck = await ctx.db
      .query('users')
      .withIndex('by_deletion_requested_at', q =>
        q.gt('deletionRequestedAt', 0),
      )
      .take(20)
    for (const user of stuck) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.users.processAccountDeletion,
        { userId: user._id },
      )
    }
    return null
  },
})

// `users:manage` can be granted on its own, as an override. Its holder must
// not be able to use it to make themselves (or anyone) more powerful than they
// are, or to lock the admins out:
// - nobody changes their own role or overrides here;
// - only admins change or delete an admin, or make someone an admin;
// - others only grant permissions they hold themselves;
// - the last admin is never demoted or deleted.

function isAdmin(user: Doc<'users'>): boolean {
  return user.role === 'admin'
}

/** Whether an admin other than this user remains (not being deleted). */
async function hasOtherAdmin(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<boolean> {
  const other = await ctx.db
    .query('users')
    .withIndex('by_role', q => q.eq('role', 'admin'))
    .filter(q =>
      q.and(
        q.neq(q.field('_id'), userId),
        q.eq(q.field('deletionRequestedAt'), undefined),
      ),
    )
    .first()
  return other !== null
}

/**
 * @throws FORBIDDEN when the caller is changing their own account, or an
 *   admin while not being one
 */
function requireManageable(
  caller: Doc<'users'>,
  target: Doc<'users'>,
  selfMessage: string,
) {
  if (target._id === caller._id) throw permanentError('FORBIDDEN', selfMessage)
  if (isAdmin(target) && !isAdmin(caller)) {
    throw permanentError(
      'FORBIDDEN',
      'Only an admin can change or remove another admin.',
    )
  }
}

/** The caller (with `users:manage`) and the other user they are changing. */
async function requireManageableUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
  selfMessage: string,
) {
  const caller = await requirePermission(ctx, 'users:manage')
  const target = await ctx.db.get(userId)
  if (!target || target.deletionRequestedAt) {
    throw permanentError('NOT_FOUND', 'User not found.')
  }
  requireManageable(caller, target, selfMessage)
  return { caller, target }
}

/** Refuse when a non-admin caller would grant permissions they lack. */
function requireHeldPermissions(
  caller: Doc<'users'>,
  granted: readonly string[],
) {
  if (isAdmin(caller)) return
  const missing = granted.filter(p => !hasPermission(caller, p as Permission))
  if (missing.length > 0) {
    throw permanentError(
      'FORBIDDEN',
      `Alleen een admin kan rechten geven die je zelf niet hebt: ${missing.join(', ')}.`,
    )
  }
}

/**
 * Delete a user (admin only)
 *
 * Runs the same cascade as self-service account deletion: the user is signed
 * out everywhere immediately and their data is removed in batches. The user
 * row disappears once the cascade finishes (typically within seconds).
 */
export const remove = mutation({
  args: {
    id: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caller = await requirePermission(ctx, 'users:manage')
    const target = await ctx.db.get(args.id)
    // Already gone, or already being deleted.
    if (!target || target.deletionRequestedAt) return null
    requireManageable(
      caller,
      target,
      'Delete your own account from your account settings.',
    )
    if (isAdmin(target) && !(await hasOtherAdmin(ctx, target._id))) {
      throw permanentError('FORBIDDEN', 'The last admin cannot be removed.')
    }
    await beginAccountDeletion(ctx, args.id)
    return null
  },
})

/**
 * Update user role (admin only)
 */
export const updateRole = mutation({
  args: {
    userId: v.id('users'),
    role: v.optional(roleValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { caller, target } = await requireManageableUser(
      ctx,
      args.userId,
      'You cannot change your own role.',
    )
    const role = args.role ?? 'user'
    if (role === 'admin' && !isAdmin(caller)) {
      throw permanentError(
        'FORBIDDEN',
        'Only an admin can make someone an admin.',
      )
    }
    requireHeldPermissions(caller, ROLE_PERMISSIONS[role])
    if (
      isAdmin(target) &&
      role !== 'admin' &&
      !(await hasOtherAdmin(ctx, target._id))
    ) {
      throw permanentError(
        'FORBIDDEN',
        'The last admin cannot lose their role.',
      )
    }
    await ctx.db.patch(args.userId, { role: args.role })
    return null
  },
})

/**
 * Update permission overrides for a user (admin only)
 *
 * Sets the per-user permission overrides, which are merged with role permissions.
 * Only accepts valid permission strings from ALL_PERMISSIONS.
 */
export const updatePermissionOverrides = mutation({
  args: {
    userId: v.id('users'),
    permissionOverrides: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { caller, target } = await requireManageableUser(
      ctx,
      args.userId,
      'You cannot change your own permissions.',
    )

    // Validate all permission strings
    const validPermissions = new Set<string>(ALL_PERMISSIONS)
    const invalid = args.permissionOverrides.filter(
      p => !validPermissions.has(p),
    )
    if (invalid.length > 0) {
      throw permanentError(
        'INVALID_ARGUMENT',
        `Ongeldige rechten: ${invalid.join(', ')}`,
      )
    }

    const current = new Set(target.permissionOverrides ?? [])
    requireHeldPermissions(
      caller,
      args.permissionOverrides.filter(p => !current.has(p)),
    )

    await ctx.db.patch(args.userId, {
      permissionOverrides: args.permissionOverrides,
    })
    return null
  },
})
