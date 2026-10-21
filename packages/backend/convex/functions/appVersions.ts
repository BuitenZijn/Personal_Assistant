import { v } from 'convex/values'
import { internalMutation, query } from '../_generated/server'
import { mobilePlatformValidator } from '../schema'

const versionPolicyValidator = v.object({
  platform: mobilePlatformValidator,
  minimumVersion: v.string(),
  minimumBuild: v.number(),
  storeUrl: v.string(),
  message: v.optional(v.string()),
})

/**
 * Public by design: signed-out users must also be able to learn that their
 * installed binary is no longer supported. Convex caches identical indexed
 * queries, so this is one cache key per platform rather than one database read
 * per client.
 */
export const getMinimumVersion = query({
  args: { platform: mobilePlatformValidator },
  returns: v.union(versionPolicyValidator, v.null()),
  handler: async (ctx, { platform }) => {
    const policy = await ctx.db
      .query('mobileVersionPolicies')
      .withIndex('by_platform', q => q.eq('platform', platform))
      .unique()

    if (!policy) return null

    return {
      platform: policy.platform,
      minimumVersion: policy.minimumVersion,
      minimumBuild: policy.minimumBuild,
      storeUrl: policy.storeUrl,
      message: policy.message,
    }
  },
})

/**
 * Release-operator entry point. Internal functions cannot be called by an app
 * client; set a floor from the Convex dashboard or CLI after the replacement
 * build is available in the corresponding store.
 */
export const setMinimumVersion = internalMutation({
  args: {
    platform: mobilePlatformValidator,
    minimumVersion: v.string(),
    minimumBuild: v.number(),
    storeUrl: v.string(),
    message: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const minimumVersion = args.minimumVersion.trim()
    const storeUrl = args.storeUrl.trim()
    const message = args.message?.trim() || undefined

    if (!minimumVersion || minimumVersion.length > 40) {
      throw new Error('minimumVersion must contain 1–40 characters')
    }
    if (!Number.isSafeInteger(args.minimumBuild) || args.minimumBuild < 1) {
      throw new Error('minimumBuild must be a positive safe integer')
    }

    let parsedStoreUrl: URL
    try {
      parsedStoreUrl = new URL(storeUrl)
    } catch {
      throw new Error('storeUrl must be a valid HTTPS URL')
    }
    if (parsedStoreUrl.protocol !== 'https:') {
      throw new Error('storeUrl must be a valid HTTPS URL')
    }

    const existing = await ctx.db
      .query('mobileVersionPolicies')
      .withIndex('by_platform', q => q.eq('platform', args.platform))
      .unique()
    const policy = {
      platform: args.platform,
      minimumVersion,
      minimumBuild: args.minimumBuild,
      storeUrl,
      message,
      updatedAt: Date.now(),
    }

    if (existing) await ctx.db.patch(existing._id, policy)
    else await ctx.db.insert('mobileVersionPolicies', policy)

    return null
  },
})
