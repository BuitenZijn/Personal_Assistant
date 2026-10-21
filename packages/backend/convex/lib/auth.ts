/**
 * Authentication and authorization utilities for Convex functions
 *
 * Permission-based access control. Use `requirePermission()` for guards
 * and `hasPermission()` for inline checks.
 */

import { QueryCtx, MutationCtx } from '../_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import { Id } from '../_generated/dataModel'
import { hasPermission as _hasPermission, type Permission } from './permissions'

// ============================================================================
// Core Auth
// ============================================================================

/**
 * Require user to be authenticated
 * @throws Error if user is not logged in
 * @returns User ID
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (userId === null) {
    throw new Error('Unauthorized: Must be logged in')
  }
  return userId
}

/**
 * Get the current user's database record
 * @throws Error if user is not logged in or not found in database
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx)

  const user = await ctx.db.get(userId)

  if (!user || user.deletionRequestedAt) {
    throw new Error('User not found in database')
  }

  return user
}

/**
 * The current user's record, or null when signed out, gone or being deleted.
 *
 * For queries the app keeps subscribed. A query that throws takes down the
 * screen that subscribed to it, or the whole app when that is a gate above
 * the navigators. After an account is deleted the app still holds a valid
 * token until it signs out, so those queries have to answer "nobody" instead.
 */
export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (userId === null) return null

  const user = await ctx.db.get(userId)
  if (!user || user.deletionRequestedAt) return null

  return user
}

// ============================================================================
// Permission-Based Guards
// ============================================================================

/**
 * Require the current user to have a specific permission.
 * @throws Error if user is not logged in or lacks the permission
 * @returns The current user record
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permission: Permission,
) {
  const user = await getCurrentUser(ctx)

  if (!_hasPermission(user, permission)) {
    throw new Error(`Unauthorized: Missing permission '${permission}'`)
  }

  return user
}

/**
 * Check if the current user owns a resource OR has a specific permission.
 * Owners always pass. Users with the given permission can access any resource.
 * @throws Error if user doesn't own the resource and lacks the permission
 * @returns The current user record
 */
export async function requireOwnershipOrPermission(
  ctx: QueryCtx | MutationCtx,
  resourceUserId: Id<'users'>,
  permission: Permission,
) {
  const user = await getCurrentUser(ctx)

  // Owner can always access their own resources
  if (resourceUserId === user._id) {
    return user
  }

  // Otherwise the user needs the permission
  if (!_hasPermission(user, permission)) {
    throw new Error('Unauthorized: You can only modify your own resources')
  }

  return user
}

// ============================================================================
// Sign-in Emails
// ============================================================================

/**
 * The form an email address is stored and looked up in. People type
 * addresses with stray capitals and spaces, and `Jane@x.com` must reach the
 * same account as `jane@x.com`.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** The longest an email address can be (RFC 5321). */
export const MAX_EMAIL_LENGTH = 254

export const MIN_PASSWORD_LENGTH = 8

/** Sender of the auth emails when the deployment sets no `EMAIL_FROM`. */
export const DEFAULT_EMAIL_FROM =
  'Personal Assistant <noreply@buitenzijnvzw.be>'

/**
 * Codes the auth pages (web and app) switch on. Production hides the message
 * of a plain `Error`, so every failure a person can act on is coded.
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'INVALID_PASSWORD'
  | 'EMAIL_IN_USE'
  | 'INVALID_CODE'
  | 'TOO_MANY_REQUESTS'
  | 'INVALID_ARGUMENT'

export type AuthErrorData = {
  code: AuthErrorCode
  message: string
  retryAfterMs?: number
}

export function authError(
  code: AuthErrorCode,
  message: string,
  retryAfterMs?: number,
): ConvexError<AuthErrorData> {
  return new ConvexError(
    retryAfterMs === undefined
      ? { code, message }
      : { code, message, retryAfterMs },
  )
}

/**
 * The email address an auth request names, as sent.
 *
 * Requests carry whatever the caller put in them (`auth:signIn` takes any
 * params), and an address that isn't a string must not reach the library:
 * it turns `['jane@x.com']` into `'jane@x.com'`, past every check made on
 * the string. Looking an address up whatever its case costs a few reads per
 * character, so overlong ones are refused too.
 *
 * @throws ConvexError INVALID_ARGUMENT
 */
export function requireAuthEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw authError('INVALID_ARGUMENT', 'Enter your email address.')
  }
  if (email.trim().length > MAX_EMAIL_LENGTH) {
    throw authError(
      'INVALID_ARGUMENT',
      `An email address can be at most ${MAX_EMAIL_LENGTH} characters long.`,
    )
  }
  return email
}

/**
 * Verification codes and reset links one address can be sent: of each kind
 * one a minute, and ten an hour of both kinds together.
 *
 * Anyone can ask for these emails for any address, so the hourly cap must
 * not lock the address's owner out. Past it, a request sends nothing but is
 * answered as if it did while the last email of its kind is still valid:
 * the owner has that code or link in their inbox (the library keeps codes
 * hashed, so it can't be sent again). Once it expires a new one goes out.
 *
 * Whether it is still valid is judged by when it was sent and how long its
 * kind lasts, not by the library's stored code: an account holds one code at
 * a time, of either kind. Asking for a reset link and a new code in turn
 * replaced each with the other, so each request found the last one of its
 * kind gone and sent another, without end. Counting both kinds together
 * keeps taking turns from doubling the cap.
 *
 * So an address gets at most ten emails an hour, plus one each time the last
 * one of a kind expires: past the cap, a code every 15 minutes and a link
 * every hour.
 */
export const AUTH_EMAIL_COOLDOWN_MS = 60 * 1000
export const AUTH_EMAIL_WINDOW_MS = 60 * 60 * 1000
export const AUTH_EMAILS_PER_WINDOW = 10

export type AuthEmailKind = 'verify' | 'reset'

/** The emails of one kind an address was sent in its current hour. */
export type AuthEmailSendState = {
  windowStart: number
  count: number
  lastSentAt: number
}

/**
 * What to do with a request for another email to an address:
 * - `send` it (`newWindow`: its kind's hour starts over);
 * - `wait`: one of its kind went out less than a minute ago;
 * - `reuse`: send nothing, the last one of its kind sent still works.
 */
export type AuthEmailSendDecision =
  | { action: 'send'; newWindow: boolean }
  | { action: 'wait'; retryAfterMs: number }
  | { action: 'reuse' }

/**
 * Whether another email of `kind` may go to an address, given what it was
 * sent of each kind so far. `validForMs` is how long an email of `kind`
 * works (the provider's `maxAge`).
 */
export function authEmailSendDecision(
  kind: AuthEmailKind,
  sent: Partial<Record<AuthEmailKind, AuthEmailSendState>>,
  now: number,
  validForMs: number,
): AuthEmailSendDecision {
  const inWindow = (
    state: AuthEmailSendState | undefined,
  ): state is AuthEmailSendState =>
    state !== undefined && now - state.windowStart < AUTH_EMAIL_WINDOW_MS
  const last = sent[kind]
  if (last) {
    const cooldownLeft = last.lastSentAt + AUTH_EMAIL_COOLDOWN_MS - now
    if (cooldownLeft > 0) return { action: 'wait', retryAfterMs: cooldownLeft }
  }
  const sentThisHour = [sent.verify, sent.reset].reduce(
    (total, state) => total + (inWindow(state) ? state.count : 0),
    0,
  )
  if (
    sentThisHour >= AUTH_EMAILS_PER_WINDOW &&
    last &&
    now < last.lastSentAt + validForMs
  ) {
    return { action: 'reuse' }
  }
  return { action: 'send', newWindow: !inWindow(last) }
}

export function tooManyAuthEmailsError(
  retryAfterMs: number,
): ConvexError<AuthErrorData> {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000))
  return authError(
    'TOO_MANY_REQUESTS',
    `We just sent an email to this address. Use the code or link from that email, or try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
    retryAfterMs,
  )
}
