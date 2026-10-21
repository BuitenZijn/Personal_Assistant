/**
 * Convex Schema Definition
 *
 * Tables are grouped per feature. Each feature adds its tables in its own
 * section below the foundation.
 */

import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

// ============================================================================
// Exported validators (for use in function args)
// ============================================================================

export const mobilePlatformValidator = v.union(
  v.literal('ios'),
  v.literal('android'),
)

export const roleValidator = v.union(v.literal('user'), v.literal('admin'))

// ============================================================================
// Schema
// ============================================================================

export default defineSchema({
  ...authTables,

  // --------------------------------------------------------------------------
  // Users & Authentication
  // --------------------------------------------------------------------------

  users: defineTable({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.id('_storage')),
    role: v.optional(roleValidator),
    permissionOverrides: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    language: v.optional(v.string()), // Preferred language (e.g. 'nl', 'en')
    /**
     * Set when the user (or an admin) requested account deletion. The batched
     * deletion worker keeps running until the row itself is removed; the flag
     * lets a cron resume the cascade if a batch chain ever dies.
     */
    deletionRequestedAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('by_deletion_requested_at', ['deletionRequestedAt'])
    .index('by_role', ['role'])
    // User pickers search by name; email prefixes use the `email` index.
    .searchIndex('search_first_name', { searchField: 'firstName' })
    .searchIndex('search_last_name', { searchField: 'lastName' }),

  /**
   * Sign-in emails (verification codes, password-reset links) sent per
   * address, so the auth flows that send them without a password can't be
   * used to flood an inbox. See `authEmailSendDecision` in lib/auth.ts.
   */
  authEmailThrottles: defineTable({
    email: v.string(),
    kind: v.union(v.literal('verify'), v.literal('reset')),
    windowStart: v.number(),
    count: v.number(),
    lastSentAt: v.number(),
  }).index('by_email_and_kind', ['email', 'kind']),

  /**
   * Store-enforced release floor. There is at most one tiny policy document
   * per mobile platform, so the public query remains an indexed, cacheable
   * read regardless of user count.
   */
  mobileVersionPolicies: defineTable({
    platform: mobilePlatformValidator,
    minimumVersion: v.string(),
    minimumBuild: v.number(),
    storeUrl: v.string(),
    message: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_platform', ['platform']),

  // --------------------------------------------------------------------------
  // Storage Claims (who uploaded each blob — see lib/storageClaims.ts)
  // --------------------------------------------------------------------------

  storageClaims: defineTable({
    storageId: v.id('_storage'),
    userId: v.id('users'),
    claimedAt: v.number(),
  })
    .index('by_storage_id', ['storageId'])
    .index('by_user', ['userId']),
})
