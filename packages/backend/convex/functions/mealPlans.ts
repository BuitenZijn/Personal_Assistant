/**
 * Meal plans (see docs/PLAN.md, Phase 4)
 *
 * Suggesting a week's dinners runs in three steps, each a scheduled action
 * that records its progress on the plan (so the app shows it live):
 *
 * 1. `findCandidates`: Claude picks likely dinners from the names of all of
 *    colruyt.be's recipes (the catalog, from its sitemap).
 * 2. `readCandidate`: those pages are read one at a time, every 5 seconds
 *    as the site asks; recipes read recently are reused.
 * 3. `chooseSuggestions`: Claude chooses, from the recipes read, the ones
 *    that suit the household (allergies, diets, time, preferences).
 *
 * The household then picks the dinners it wants, sets servings, replaces
 * suggestions it doesn't like and confirms; confirmed recipes are saved.
 */

import {
  internalAction,
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
import { planWeekStart } from '../lib/mealPlanWeek'
import {
  COLRUYT,
  READ_DELAY_SECONDS,
  catalogFromSitemap,
  couldBeDinner,
  sampleEntries,
  type CatalogEntry,
} from '../lib/recipeCatalog'
import {
  SuggestionsUnavailableError,
  chooseSuggestions as claudeChoose,
  householdProfile,
  pickByName,
} from '../lib/mealPlanClaude'
import { extractRecipe } from '../lib/recipeParse'
import { fetchText } from '../lib/recipeFetch'

const CATALOG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
/** A recipe read less than this long ago isn't read again. */
const RECIPE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
/** A plan still suggesting after this long has stalled and can restart. */
const STALLED_AFTER_MS = 10 * 60 * 1000
const MAX_SERVINGS = 20
/** Products named as a hint of what they like. */
const USUALLY_BOUGHT = 25
/**
 * Recipe names Claude picks from in one run, chosen at random from the
 * catalog. About 20 tokens each: this keeps the prompt well under the 100K
 * tokens above which Claude Haiku 5.5 costs five times as much.
 */
const NAMES_PER_RUN = 3500

/** Suggestions for a week: twice the dinners, to pick from. */
export function suggestionsWanted(dinnersPerWeek: number): number {
  return Math.min(Math.max(dinnersPerWeek * 2, 4), 14)
}

/** Pages to read: twice the suggestions, as some won't suit them. */
function candidatesWanted(dinnersPerWeek: number): number {
  return Math.min(suggestionsWanted(dinnersPerWeek) * 2, 24)
}

function defaultServings(household: Doc<'households'>): number {
  return Math.max(1, household.people.length)
}

// ============================================================================
// The current plan
// ============================================================================

async function planFor(
  ctx: QueryCtx,
  householdId: Id<'households'>,
  weekStart: string,
) {
  return await ctx.db
    .query('mealPlans')
    .withIndex('by_household_and_week', q =>
      q.eq('householdId', householdId).eq('weekStart', weekStart),
    )
    .first()
}

/** This week's plan with its suggested recipes, or null before planning. */
export const current = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrNull(ctx)
    const membership = user ? await getMembership(ctx, user._id) : null
    if (!membership) return null
    const plan = await planFor(
      ctx,
      membership.householdId,
      planWeekStart(Date.now()),
    )
    if (!plan) return null
    const suggestions = await Promise.all(
      plan.suggestions.map(async s => {
        const recipe = await ctx.db.get(s.recipeId)
        return {
          ...s,
          title: recipe?.title ?? 'Recipe',
          imageUrl: recipe?.imageUrl ?? null,
          totalMinutes: recipe?.totalMinutes ?? null,
          recipeServings: recipe?.servings ?? null,
        }
      }),
    )
    return {
      _id: plan._id,
      weekStart: plan.weekStart,
      status: plan.status,
      progress: plan.progress ?? null,
      suggestions,
      sparesLeft: plan.spares.length,
      note: plan.note ?? null,
      error: plan.error ?? null,
      claudeCostUsd: plan.claudeCostUsd ?? null,
      updatedAt: plan.updatedAt,
    }
  },
})

// ============================================================================
// Suggesting
// ============================================================================

/**
 * Start suggesting dinners for the week, replacing suggestions not yet
 * confirmed. Does nothing while a run is under way (unless it stalled).
 */
export const suggest = mutation({
  args: {},
  returns: v.id('mealPlans'),
  handler: async ctx => {
    const { household } = await requireMyHousehold(ctx)
    const now = Date.now()
    const weekStart = planWeekStart(now)
    const plan = await planFor(ctx, household._id, weekStart)
    if (
      plan?.status === 'suggesting' &&
      plan.updatedAt > now - STALLED_AFTER_MS
    ) {
      return plan._id
    }
    const fresh = {
      status: 'suggesting' as const,
      progress: { step: 'finding' as const, done: 0, total: 1 },
      candidates: [],
      readRecipeIds: [],
      suggestions: [],
      spares: [],
      note: undefined,
      error: undefined,
      claudeCostUsd: 0,
      updatedAt: now,
    }
    let planId: Id<'mealPlans'>
    let runId: number
    if (plan) {
      runId = plan.runId + 1
      // Suggestions shown before count as turned down: look for others.
      const shown = plan.suggestions.filter(s => !s.picked).map(s => s.recipeId)
      await ctx.db.patch(plan._id, {
        ...fresh,
        runId,
        rejected: [...new Set([...plan.rejected, ...shown])],
      })
      planId = plan._id
    } else {
      runId = 1
      planId = await ctx.db.insert('mealPlans', {
        householdId: household._id,
        weekStart,
        ...fresh,
        rejected: [],
        runId,
      })
    }
    await ctx.scheduler.runAfter(
      0,
      internal.functions.mealPlans.findCandidates,
      { planId, runId },
    )
    return planId
  },
})

const runArgs = { planId: v.id('mealPlans'), runId: v.number() }

/** The plan, if this run is still the current one and still suggesting. */
async function activeRun(
  ctx: QueryCtx,
  args: { planId: Id<'mealPlans'>; runId: number },
) {
  const plan = await ctx.db.get(args.planId)
  return plan && plan.runId === args.runId && plan.status === 'suggesting'
    ? plan
    : null
}

/** What the steps need: the plan, household and what to avoid. */
export const runContext = internalQuery({
  args: runArgs,
  handler: async (ctx, args) => {
    const plan = await activeRun(ctx, args)
    if (!plan) return null
    const household = await ctx.db.get(plan.householdId)
    if (!household) return null

    const stats = await ctx.db
      .query('productStats')
      .withIndex('by_household_and_times_bought', q =>
        q.eq('householdId', household._id),
      )
      .order('desc')
      .take(USUALLY_BOUGHT)
    // Recently planned and turned-down recipes: not again.
    const recentPlans = await ctx.db
      .query('mealPlans')
      .withIndex('by_household_and_week', q =>
        q.eq('householdId', household._id),
      )
      .order('desc')
      .take(3)
    const avoidIds = new Set<Id<'recipes'>>(plan.rejected)
    for (const recent of recentPlans) {
      for (const s of recent.suggestions) if (s.picked) avoidIds.add(s.recipeId)
    }
    const avoid = await Promise.all([...avoidIds].map(id => ctx.db.get(id)))
    const catalog = await ctx.db
      .query('recipeCatalogs')
      .withIndex('by_host', q => q.eq('host', COLRUYT.host))
      .first()

    return {
      plan,
      household,
      profile: householdProfile(
        household,
        stats.map(s => s.name.toLowerCase()),
      ),
      avoid: avoid
        .filter(r => r !== null)
        .map(r => ({ url: r.url, title: r.title })),
      catalog,
    }
  },
})

export const saveCatalog = internalMutation({
  args: { storageId: v.id('_storage'), count: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('recipeCatalogs')
      .withIndex('by_host', q => q.eq('host', COLRUYT.host))
      .first()
    const fields = { ...args, host: COLRUYT.host, refreshedAt: Date.now() }
    if (existing) {
      await ctx.storage.delete(existing.storageId)
      await ctx.db.replace(existing._id, fields)
    } else {
      await ctx.db.insert('recipeCatalogs', fields)
    }
    return null
  },
})

/** Add a Claude call's cost to the run's total. */
export const addClaudeCost = internalMutation({
  args: { ...runArgs, costUsd: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await activeRun(ctx, args)
    if (!plan) return null
    await ctx.db.patch(plan._id, {
      claudeCostUsd: (plan.claudeCostUsd ?? 0) + args.costUsd,
    })
    return null
  },
})

export const setCandidates = internalMutation({
  args: { ...runArgs, candidates: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await activeRun(ctx, args))) return null
    await ctx.db.patch(args.planId, {
      candidates: args.candidates,
      progress: { step: 'reading', done: 0, total: args.candidates.length },
      updatedAt: Date.now(),
    })
    return null
  },
})

/** Record a candidate read; `recipeId` when it is a dinner. */
export const recordRead = internalMutation({
  args: { ...runArgs, recipeId: v.optional(v.id('recipes')) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await activeRun(ctx, args)
    if (!plan?.progress) return null
    await ctx.db.patch(plan._id, {
      readRecipeIds: args.recipeId
        ? [...plan.readRecipeIds, args.recipeId]
        : plan.readRecipeIds,
      progress: { ...plan.progress, done: plan.progress.done + 1 },
      updatedAt: Date.now(),
    })
    return null
  },
})

export const setChoosing = internalMutation({
  args: runArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await activeRun(ctx, args))) return null
    await ctx.db.patch(args.planId, {
      progress: { step: 'choosing', done: 0, total: 1 },
      updatedAt: Date.now(),
    })
    return null
  },
})

export const setSuggestions = internalMutation({
  args: {
    ...runArgs,
    chosen: v.array(
      v.object({ recipeId: v.id('recipes'), reason: v.string() }),
    ),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await activeRun(ctx, args)
    const household = plan ? await ctx.db.get(plan.householdId) : null
    if (!plan || !household) return null
    const wanted = suggestionsWanted(household.dinnersPerWeek)
    const servings = defaultServings(household)
    await ctx.db.patch(plan._id, {
      status: 'choosing',
      progress: undefined,
      suggestions: args.chosen
        .slice(0, wanted)
        .map(c => ({ ...c, picked: false, servings })),
      spares: args.chosen.slice(wanted),
      note: args.note,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const fail = internalMutation({
  args: { ...runArgs, error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await activeRun(ctx, args))) return null
    await ctx.db.patch(args.planId, {
      status: 'failed',
      progress: undefined,
      error: args.error,
      updatedAt: Date.now(),
    })
    return null
  },
})

/** What a person reads when a step fails. */
function failureMessage(error: unknown): string {
  if (error instanceof SuggestionsUnavailableError) return error.message
  return "We couldn't finish the suggestions. Check your connection and try again."
}

/** The catalog of colruyt.be's recipes, refreshed when a week old. */
async function loadCatalog(
  ctx: {
    storage: { get: (id: Id<'_storage'>) => Promise<Blob | null> }
    store: (entries: CatalogEntry[]) => Promise<void>
  },
  catalog: Doc<'recipeCatalogs'> | null,
): Promise<CatalogEntry[]> {
  if (catalog && catalog.refreshedAt > Date.now() - CATALOG_MAX_AGE_MS) {
    const blob = await ctx.storage.get(catalog.storageId)
    if (blob) return JSON.parse(await blob.text()) as CatalogEntry[]
  }
  const [robots, sitemap] = await Promise.all([
    fetchText(COLRUYT.robotsUrl),
    fetchText(COLRUYT.sitemapUrl),
  ])
  const entries = catalogFromSitemap(COLRUYT, sitemap, robots)
  if (entries.length === 0) throw new Error('The recipe sitemap was empty.')
  await ctx.store(entries)
  return entries
}

/** Step 1: likely dinners, by name. */
export const findCandidates = internalAction({
  args: runArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.runQuery(
      internal.functions.mealPlans.runContext,
      args,
    )
    if (!run) return null
    try {
      const entries = await loadCatalog(
        {
          storage: ctx.storage,
          store: async list => {
            const storageId = await ctx.storage.store(
              new Blob([JSON.stringify(list)], { type: 'application/json' }),
            )
            await ctx.runMutation(internal.functions.mealPlans.saveCatalog, {
              storageId,
              count: list.length,
            })
          },
        },
        run.catalog,
      )
      const avoidUrls = new Set(run.avoid.map(a => a.url))
      const open = sampleEntries(
        entries.filter(e => !avoidUrls.has(e.url) && couldBeDinner(e.name)),
        NAMES_PER_RUN,
        `${args.planId}:${args.runId}`,
      )
      const { picks: picked, costUsd } = await pickByName(
        open.map(e => e.name),
        run.profile,
        run.avoid.map(a => a.title),
        candidatesWanted(run.household.dinnersPerWeek),
      )
      await ctx.runMutation(internal.functions.mealPlans.addClaudeCost, {
        ...args,
        costUsd,
      })
      if (picked.length === 0) {
        throw new Error('No candidates picked.')
      }
      await ctx.runMutation(internal.functions.mealPlans.setCandidates, {
        ...args,
        candidates: picked.map(i => open[i]!.url),
      })
      await ctx.scheduler.runAfter(
        0,
        internal.functions.mealPlans.readCandidate,
        args,
      )
    } catch (error) {
      console.error('Finding candidates failed:', error)
      await ctx.runMutation(internal.functions.mealPlans.fail, {
        ...args,
        error: failureMessage(error),
      })
    }
    return null
  },
})

/** Step 2: read the next candidate page, then the next after 5 seconds. */
export const readCandidate = internalAction({
  args: runArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan: Doc<'mealPlans'> | null = await ctx.runQuery(
      internal.functions.mealPlans.activePlan,
      args,
    )
    if (!plan?.progress) return null
    const index = plan.progress.done
    const url = plan.candidates[index]
    if (url === undefined) {
      await ctx.runMutation(internal.functions.mealPlans.setChoosing, args)
      await ctx.scheduler.runAfter(
        0,
        internal.functions.mealPlans.chooseSuggestionsStep,
        args,
      )
      return null
    }

    let recipeId: Id<'recipes'> | undefined
    let fetched = false
    const known: Doc<'recipes'> | null = await ctx.runQuery(
      internal.functions.recipes.recipeByUrl,
      { url },
    )
    if (known && known.fetchedAt > Date.now() - RECIPE_MAX_AGE_MS) {
      recipeId = known.isMain ? known._id : undefined
    } else {
      fetched = true
      try {
        const recipe = extractRecipe(await fetchText(url))
        if (recipe) {
          const id: Id<'recipes'> = await ctx.runMutation(
            internal.functions.recipes.saveRecipe,
            { url, host: COLRUYT.host, recipe, extractedBy: 'json-ld' },
          )
          recipeId = recipe.isMain ? id : undefined
        }
      } catch (error) {
        // One page that won't load doesn't stop the others.
        console.warn(`Couldn't read ${url}:`, error)
      }
    }
    await ctx.runMutation(internal.functions.mealPlans.recordRead, {
      ...args,
      recipeId,
    })
    await ctx.scheduler.runAfter(
      fetched ? READ_DELAY_SECONDS * 1000 : 0,
      internal.functions.mealPlans.readCandidate,
      args,
    )
    return null
  },
})

export const activePlan = internalQuery({
  args: runArgs,
  handler: async (ctx, args) => await activeRun(ctx, args),
})

export const recipesByIds = internalQuery({
  args: { ids: v.array(v.id('recipes')) },
  handler: async (ctx, args) => {
    const recipes = await Promise.all(args.ids.map(id => ctx.db.get(id)))
    return recipes.filter(r => r !== null)
  },
})

/** Step 3: the dinners that suit the household. */
export const chooseSuggestionsStep = internalAction({
  args: runArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.runQuery(
      internal.functions.mealPlans.runContext,
      args,
    )
    if (!run) return null
    try {
      const { household } = run
      const maxMinutes =
        Math.max(
          household.cookingMinutes.weekday,
          household.cookingMinutes.weekend,
        ) + 15
      const read: Doc<'recipes'>[] = await ctx.runQuery(
        internal.functions.mealPlans.recipesByIds,
        { ids: [...new Set(run.plan.readRecipeIds)] },
      )
      const rejected = new Set(run.plan.rejected)
      const fitting = read.filter(
        r =>
          !rejected.has(r._id) &&
          (r.totalMinutes === undefined || r.totalMinutes <= maxMinutes),
      )
      const wanted = suggestionsWanted(household.dinnersPerWeek)
      let chosen: { recipeId: Id<'recipes'>; reason: string }[] = []
      let note: string | null = null
      if (fitting.length > 0) {
        const result = await claudeChoose(
          fitting.map(r => ({
            title: r.title,
            totalMinutes: r.totalMinutes,
            servings: r.servings,
            tags: r.tags,
            ingredients: r.ingredients.map(i => i.text),
          })),
          run.profile,
          wanted,
        )
        await ctx.runMutation(internal.functions.mealPlans.addClaudeCost, {
          ...args,
          costUsd: result.costUsd,
        })
        chosen = result.chosen.map(c => ({
          recipeId: fitting[c.index]!._id,
          reason: c.reason,
        }))
        note = result.note
      }
      if (chosen.length < wanted && !note) {
        note =
          chosen.length === 0
            ? "None of the recipes we found suit everyone. Try again and we'll look further."
            : `Only ${chosen.length} of the recipes we found suit everyone.`
      }
      await ctx.runMutation(internal.functions.mealPlans.setSuggestions, {
        ...args,
        chosen,
        note: chosen.length < wanted ? (note ?? undefined) : undefined,
      })
    } catch (error) {
      console.error('Choosing suggestions failed:', error)
      await ctx.runMutation(internal.functions.mealPlans.fail, {
        ...args,
        error: failureMessage(error),
      })
    }
    return null
  },
})

// ============================================================================
// Picking
// ============================================================================

async function requireMyPlan(
  ctx: MutationCtx,
  planId: Id<'mealPlans'>,
  status: Doc<'mealPlans'>['status'],
) {
  const { household } = await requireMyHousehold(ctx)
  const plan = await ctx.db.get(planId)
  if (!plan || plan.householdId !== household._id) {
    throw permanentError('NOT_FOUND', 'This plan is no longer there.')
  }
  if (plan.status !== status) {
    throw permanentError(
      'INVALID_ARGUMENT',
      'This plan changed in the meantime. Have another look.',
    )
  }
  return { plan, household }
}

function requireSuggestion(plan: Doc<'mealPlans'>, index: number) {
  const suggestion = plan.suggestions[index]
  if (!suggestion) {
    throw permanentError('NOT_FOUND', 'This suggestion is no longer there.')
  }
  return suggestion
}

export const setPicked = mutation({
  args: { planId: v.id('mealPlans'), index: v.number(), picked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { plan } = await requireMyPlan(ctx, args.planId, 'choosing')
    requireSuggestion(plan, args.index)
    await ctx.db.patch(plan._id, {
      suggestions: plan.suggestions.map((s, i) =>
        i === args.index ? { ...s, picked: args.picked } : s,
      ),
      updatedAt: Date.now(),
    })
    return null
  },
})

export const setServings = mutation({
  args: { planId: v.id('mealPlans'), index: v.number(), servings: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { plan } = await requireMyPlan(ctx, args.planId, 'choosing')
    requireSuggestion(plan, args.index)
    if (
      !Number.isInteger(args.servings) ||
      args.servings < 1 ||
      args.servings > MAX_SERVINGS
    ) {
      throw permanentError(
        'INVALID_ARGUMENT',
        `Choose between 1 and ${MAX_SERVINGS} servings.`,
      )
    }
    await ctx.db.patch(plan._id, {
      suggestions: plan.suggestions.map((s, i) =>
        i === args.index ? { ...s, servings: args.servings } : s,
      ),
      updatedAt: Date.now(),
    })
    return null
  },
})

/** Swap a suggestion for the next one that suits them. */
export const replace = mutation({
  args: { planId: v.id('mealPlans'), index: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { plan, household } = await requireMyPlan(
      ctx,
      args.planId,
      'choosing',
    )
    const old = requireSuggestion(plan, args.index)
    const [spare, ...spares] = plan.spares
    if (!spare) {
      throw permanentError(
        'NOT_FOUND',
        'No more suggestions that suit you. Plan again to look further.',
      )
    }
    await ctx.db.patch(plan._id, {
      suggestions: plan.suggestions.map((s, i) =>
        i === args.index
          ? { ...spare, picked: false, servings: defaultServings(household) }
          : s,
      ),
      spares,
      rejected: [...plan.rejected, old.recipeId],
      updatedAt: Date.now(),
    })
    return null
  },
})

/** Confirm the picked dinners as the week's plan; they're saved. */
export const confirm = mutation({
  args: { planId: v.id('mealPlans') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { plan, household } = await requireMyPlan(
      ctx,
      args.planId,
      'choosing',
    )
    const picked = plan.suggestions.filter(s => s.picked)
    if (picked.length === 0) {
      throw permanentError('INVALID_ARGUMENT', 'Pick at least one dinner.')
    }
    for (const s of picked) {
      const saved = await ctx.db
        .query('householdRecipes')
        .withIndex('by_household_and_recipe', q =>
          q.eq('householdId', household._id).eq('recipeId', s.recipeId),
        )
        .first()
      if (!saved) {
        await ctx.db.insert('householdRecipes', {
          householdId: household._id,
          recipeId: s.recipeId,
          addedAt: Date.now(),
        })
      }
    }
    await ctx.db.patch(plan._id, { status: 'confirmed', updatedAt: Date.now() })
    return null
  },
})

/** Change a confirmed plan again. */
export const reopen = mutation({
  args: { planId: v.id('mealPlans') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { plan } = await requireMyPlan(ctx, args.planId, 'confirmed')
    await ctx.db.patch(plan._id, { status: 'choosing', updatedAt: Date.now() })
    return null
  },
})
