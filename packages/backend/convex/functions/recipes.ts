/**
 * Recipes (see docs/PLAN.md, Phase 3)
 *
 * A household's saved recipes: ones added by their link, and (from Phase 4)
 * the ones picked for a meal plan. Recipes always come from a page; Claude
 * only ever copies one out of a page that has no recipe data.
 */

import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from '../_generated/server'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import { v } from 'convex/values'
import { getCurrentUserOrNull } from '../lib/auth'
import { permanentError } from '../lib/errors'
import { getMembership, requireMyHousehold } from '../lib/households'
import {
  canonicalUrl,
  extractRecipe,
  normalizeHost,
  type ParsedRecipe,
} from '../lib/recipeParse'
import { claudeAvailable, extractWithClaude } from '../lib/recipeClaude'
import { fetchText } from '../lib/recipeFetch'
import { recipeIngredientValidator } from '../schema'

/** A recipe read less than this long ago isn't read again when added. */
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000
/** Saved recipes listed at once. */
const SAVED_LIMIT = 500

export const parsedRecipeValidator = v.object({
  title: v.string(),
  servings: v.optional(v.number()),
  totalMinutes: v.optional(v.number()),
  course: v.optional(v.string()),
  isMain: v.boolean(),
  ingredients: v.array(recipeIngredientValidator),
  steps: v.array(v.string()),
  tags: v.array(v.string()),
  imageUrl: v.optional(v.string()),
})

async function myHouseholdId(ctx: QueryCtx): Promise<Id<'households'> | null> {
  const user = await getCurrentUserOrNull(ctx)
  if (!user) return null
  return (await getMembership(ctx, user._id))?.householdId ?? null
}

// ============================================================================
// Saved recipes
// ============================================================================

/** The household's saved recipes, newest first, as a list shows them. */
export const saved = query({
  args: {},
  handler: async ctx => {
    const householdId = await myHouseholdId(ctx)
    if (!householdId) return []
    const links = await ctx.db
      .query('householdRecipes')
      .withIndex('by_household', q => q.eq('householdId', householdId))
      .order('desc')
      .take(SAVED_LIMIT)
    const recipes = await Promise.all(links.map(l => ctx.db.get(l.recipeId)))
    return recipes
      .filter(r => r !== null)
      .map(recipe => ({
        _id: recipe._id,
        title: recipe.title,
        host: recipe.host,
        imageUrl: recipe.imageUrl ?? null,
        totalMinutes: recipe.totalMinutes ?? null,
        servings: recipe.servings ?? null,
      }))
  },
})

export const get = query({
  args: { id: v.id('recipes') },
  handler: async (ctx, args) => {
    const householdId = await myHouseholdId(ctx)
    const recipe = await ctx.db.get(args.id)
    if (!householdId || !recipe) return null
    const link = await ctx.db
      .query('householdRecipes')
      .withIndex('by_household_and_recipe', q =>
        q.eq('householdId', householdId).eq('recipeId', recipe._id),
      )
      .first()
    return { ...recipe, saved: link !== null }
  },
})

/** Take a recipe out of the household's saved recipes. */
export const removeSaved = mutation({
  args: { recipeId: v.id('recipes') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { household } = await requireMyHousehold(ctx)
    const links = await ctx.db
      .query('householdRecipes')
      .withIndex('by_household_and_recipe', q =>
        q.eq('householdId', household._id).eq('recipeId', args.recipeId),
      )
      .collect()
    for (const link of links) await ctx.db.delete(link._id)
    return null
  },
})

// ============================================================================
// Adding by link
// ============================================================================

export const callerHousehold = internalQuery({
  args: {},
  handler: async ctx => myHouseholdId(ctx),
})

export const recipeByUrl = internalQuery({
  args: { url: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query('recipes')
      .withIndex('by_url', q => q.eq('url', args.url))
      .first(),
})

/** Store a recipe read from its page, replacing an older read of it. */
export async function upsertRecipe(
  ctx: MutationCtx,
  args: {
    url: string
    host: string
    recipe: ParsedRecipe
    extractedBy: 'json-ld' | 'claude'
  },
): Promise<Id<'recipes'>> {
  const fields = {
    url: args.url,
    host: args.host,
    ...args.recipe,
    extractedBy: args.extractedBy,
    fetchedAt: Date.now(),
  }
  const existing = await ctx.db
    .query('recipes')
    .withIndex('by_url', q => q.eq('url', args.url))
    .first()
  if (existing) {
    await ctx.db.replace(existing._id, fields)
    return existing._id
  }
  return await ctx.db.insert('recipes', fields)
}

export const saveRecipe = internalMutation({
  args: {
    url: v.string(),
    host: v.string(),
    recipe: parsedRecipeValidator,
    extractedBy: v.union(v.literal('json-ld'), v.literal('claude')),
  },
  returns: v.id('recipes'),
  handler: async (ctx, args) => await upsertRecipe(ctx, args),
})

export const linkRecipe = internalMutation({
  args: { householdId: v.id('households'), recipeId: v.id('recipes') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('householdRecipes')
      .withIndex('by_household_and_recipe', q =>
        q.eq('householdId', args.householdId).eq('recipeId', args.recipeId),
      )
      .first()
    if (!existing) {
      await ctx.db.insert('householdRecipes', { ...args, addedAt: Date.now() })
    }
    return null
  },
})

/**
 * The recipe on a page: from its recipe data, or failing that, from Claude
 * reading its text (when the deployment has a key and `allowClaude`).
 */
export async function readRecipePage(
  html: string,
  url: string,
  { allowClaude = true }: { allowClaude?: boolean } = {},
): Promise<{ recipe: ParsedRecipe; extractedBy: 'json-ld' | 'claude' } | null> {
  const fromData = extractRecipe(html)
  if (fromData) return { recipe: fromData, extractedBy: 'json-ld' }
  if (!allowClaude || !claudeAvailable()) return null
  const fromClaude = await extractWithClaude(html, url)
  return fromClaude ? { recipe: fromClaude, extractedBy: 'claude' } : null
}

/**
 * Save the recipe on a page to the household's recipes. Returns its id.
 *
 * @throws INVALID_ARGUMENT for a link that isn't a web page
 * @throws NOT_FOUND when the page can't be read or holds no recipe
 */
export const addFromUrl = action({
  args: { url: v.string() },
  returns: v.id('recipes'),
  handler: async (ctx, args): Promise<Id<'recipes'>> => {
    const householdId: Id<'households'> | null = await ctx.runQuery(
      internal.functions.recipes.callerHousehold,
    )
    if (!householdId) {
      throw permanentError('NOT_FOUND', 'You are not part of a household yet.')
    }
    const url = canonicalUrl(args.url)
    const host = url ? normalizeHost(url) : null
    if (!url || !host) {
      throw permanentError(
        'INVALID_ARGUMENT',
        'Paste the full link to a recipe page, starting with https://.',
      )
    }

    const known: Doc<'recipes'> | null = await ctx.runQuery(
      internal.functions.recipes.recipeByUrl,
      { url },
    )
    let recipeId = known?._id
    if (!known || known.fetchedAt < Date.now() - REFRESH_AFTER_MS) {
      let html: string
      try {
        html = await fetchText(url)
      } catch {
        throw permanentError(
          'NOT_FOUND',
          "We couldn't open this page. Check the link and try again.",
        )
      }
      const read = await readRecipePage(html, url)
      if (!read) {
        throw permanentError(
          'NOT_FOUND',
          "We couldn't find a recipe on this page. Try the link to the recipe itself.",
        )
      }
      recipeId = await ctx.runMutation(internal.functions.recipes.saveRecipe, {
        url,
        host,
        ...read,
      })
    }
    await ctx.runMutation(internal.functions.recipes.linkRecipe, {
      householdId,
      recipeId: recipeId!,
    })
    return recipeId!
  },
})
