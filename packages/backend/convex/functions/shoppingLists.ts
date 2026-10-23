/**
 * Shopping lists (see docs/PLAN.md, Phase 5)
 *
 * A household's list for the week is built from the dinners it confirmed:
 * the picked recipes' ingredients are combined and scaled to servings
 * (lib/shoppingList.ts), then Claude matches them to products the household
 * bought before (lib/shoppingListClaude.ts). Basics most kitchens have go to
 * a "check you have" list; ingredients no product matches stay on the list
 * as they are.
 *
 * Next to it, products the household is about to run out of, going by its
 * receipts, can be added. Ordering them in a webshop comes later (Phase 6).
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
import type { Infer } from 'convex/values'
import { internal } from '../_generated/api'
import { v } from 'convex/values'
import { getCurrentUserOrNull } from '../lib/auth'
import { permanentError } from '../lib/errors'
import { getMembership, requireMyHousehold } from '../lib/households'
import { planWeekStart } from '../lib/mealPlanWeek'
import { generateRandomString } from '../lib/random'
import { ClaudeUnavailableError } from '../lib/claude'
import {
  combineIngredients,
  dueProducts,
  usualQuantity,
} from '../lib/shoppingList'
import { matchProducts } from '../lib/shoppingListClaude'
import { shoppingLineValidator } from '../schema'

type ShoppingLine = Infer<typeof shoppingLineValidator>

/** Products Claude may match ingredients to: the most bought ones. */
const PRODUCTS_TO_MATCH = 600
/** Products looked at for recommendations. */
const PRODUCTS_FOR_RECOMMENDING = 500
const RECOMMENDATIONS = 12
/** A build still running after this long has stalled and can restart. */
const STALLED_AFTER_MS = 10 * 60 * 1000
const MAX_QUANTITY = 100

function newLineId(): string {
  return generateRandomString(10, 'abcdefghijklmnopqrstuvwxyz0123456789')
}

async function myHouseholdId(ctx: QueryCtx): Promise<Id<'households'> | null> {
  const user = await getCurrentUserOrNull(ctx)
  if (!user) return null
  return (await getMembership(ctx, user._id))?.householdId ?? null
}

async function listFor(
  ctx: QueryCtx,
  householdId: Id<'households'>,
  weekStart: string,
) {
  return await ctx.db
    .query('shoppingLists')
    .withIndex('by_household_and_week', q =>
      q.eq('householdId', householdId).eq('weekStart', weekStart),
    )
    .first()
}

async function statsFor(
  ctx: QueryCtx,
  householdId: Id<'households'>,
  productId: Id<'products'>,
) {
  return await ctx.db
    .query('productStats')
    .withIndex('by_household_and_product', q =>
      q.eq('householdId', householdId).eq('productId', productId),
    )
    .first()
}

// ============================================================================
// The current list
// ============================================================================

/**
 * This week's list with prices from the receipts, and where this week's
 * meal plan stands; null when signed out or without a household.
 */
export const current = query({
  args: {},
  handler: async ctx => {
    const householdId = await myHouseholdId(ctx)
    if (!householdId) return null
    const weekStart = planWeekStart(Date.now())
    const plan = await ctx.db
      .query('mealPlans')
      .withIndex('by_household_and_week', q =>
        q.eq('householdId', householdId).eq('weekStart', weekStart),
      )
      .first()
    const list = await listFor(ctx, householdId, weekStart)

    const lines = await Promise.all(
      (list?.lines ?? []).map(async line => {
        const stats = line.productId
          ? await statsFor(ctx, householdId, line.productId)
          : null
        return {
          ...line,
          soldByWeight: stats?.soldByWeight ?? false,
          unitPriceCents: stats?.lastUnitPriceCents ?? null,
        }
      }),
    )
    const estimateCents = lines.reduce(
      (sum, line) =>
        line.unitPriceCents === null || line.quantity === undefined
          ? sum
          : sum + Math.round(line.unitPriceCents * line.quantity),
      0,
    )
    return {
      weekStart,
      plan: plan
        ? {
            status: plan.status,
            dinners: plan.suggestions.filter(s => s.picked).length,
          }
        : null,
      list: list
        ? {
            _id: list._id,
            status: list.status,
            error: list.error ?? null,
            claudeCostUsd: list.claudeCostUsd ?? null,
            updatedAt: list.updatedAt,
            pantry: list.pantry,
            lines,
            estimateCents,
            /** Lines without a known price, left out of the estimate. */
            unpriced: lines.filter(l => l.unitPriceCents === null).length,
          }
        : null,
    }
  },
})

/**
 * Products the household is about to run out of, going by its receipts,
 * that aren't on this week's list yet.
 */
export const recommendations = query({
  args: {},
  handler: async ctx => {
    const householdId = await myHouseholdId(ctx)
    if (!householdId) return []
    const now = Date.now()
    const list = await listFor(ctx, householdId, planWeekStart(now))
    const onList = new Set(list?.lines.map(l => l.productId) ?? [])
    const stats = await ctx.db
      .query('productStats')
      .withIndex('by_household_and_times_bought', q =>
        q.eq('householdId', householdId),
      )
      .order('desc')
      .take(PRODUCTS_FOR_RECOMMENDING)
    return dueProducts(
      stats.filter(s => !onList.has(s.productId)),
      now,
      RECOMMENDATIONS,
    ).map(s => ({
      productId: s.productId,
      name: s.name,
      soldByWeight: s.soldByWeight,
      lastBoughtOn: s.lastBoughtOn,
      averageIntervalDays: s.averageIntervalDays ?? null,
      quantity: usualQuantity(s.averageQuantity, s.soldByWeight),
      unitPriceCents: s.lastUnitPriceCents ?? null,
    }))
  },
})

// ============================================================================
// Building from the meal plan
// ============================================================================

/**
 * Turn this week's confirmed dinners into products. Lines added from the
 * recommendations stay; the dinners' lines are made again.
 */
export const build = mutation({
  args: {},
  returns: v.id('shoppingLists'),
  handler: async ctx => {
    const { household } = await requireMyHousehold(ctx)
    const now = Date.now()
    const weekStart = planWeekStart(now)
    const plan = await ctx.db
      .query('mealPlans')
      .withIndex('by_household_and_week', q =>
        q.eq('householdId', household._id).eq('weekStart', weekStart),
      )
      .first()
    if (plan?.status !== 'confirmed') {
      throw permanentError(
        'INVALID_ARGUMENT',
        "Confirm this week's dinners on the Meal plan tab first.",
      )
    }
    const list = await listFor(ctx, household._id, weekStart)
    if (
      list?.status === 'building' &&
      list.updatedAt > now - STALLED_AFTER_MS
    ) {
      return list._id
    }
    let listId: Id<'shoppingLists'>
    let runId: number
    if (list) {
      runId = list.runId + 1
      await ctx.db.patch(list._id, {
        status: 'building',
        error: undefined,
        runId,
        updatedAt: now,
      })
      listId = list._id
    } else {
      runId = 1
      listId = await ctx.db.insert('shoppingLists', {
        householdId: household._id,
        weekStart,
        status: 'building',
        lines: [],
        pantry: [],
        runId,
        updatedAt: now,
      })
    }
    await ctx.scheduler.runAfter(
      0,
      internal.functions.shoppingLists.buildStep,
      { listId, runId },
    )
    return listId
  },
})

const runArgs = { listId: v.id('shoppingLists'), runId: v.number() }

async function activeBuild(
  ctx: QueryCtx,
  args: { listId: Id<'shoppingLists'>; runId: number },
) {
  const list = await ctx.db.get(args.listId)
  return list && list.runId === args.runId && list.status === 'building'
    ? list
    : null
}

/** The picked recipes and the products to match them to. */
export const buildContext = internalQuery({
  args: runArgs,
  handler: async (ctx, args) => {
    const list = await activeBuild(ctx, args)
    if (!list) return null
    const plan = await ctx.db
      .query('mealPlans')
      .withIndex('by_household_and_week', q =>
        q.eq('householdId', list.householdId).eq('weekStart', list.weekStart),
      )
      .first()
    const picked = plan?.suggestions.filter(s => s.picked) ?? []
    const recipes = await Promise.all(
      picked.map(async s => {
        const recipe = await ctx.db.get(s.recipeId)
        return recipe
          ? {
              title: recipe.title,
              servings: recipe.servings,
              cookFor: s.servings,
              ingredients: recipe.ingredients,
            }
          : null
      }),
    )
    const products = await ctx.db
      .query('productStats')
      .withIndex('by_household_and_times_bought', q =>
        q.eq('householdId', list.householdId),
      )
      .order('desc')
      .take(PRODUCTS_TO_MATCH)
    return {
      recipes: recipes.filter(r => r !== null),
      products: products.map(p => ({
        productId: p.productId,
        name: p.name,
        soldByWeight: p.soldByWeight,
        timesBought: p.timesBought,
      })),
    }
  },
})

export const finishBuild = internalMutation({
  args: {
    ...runArgs,
    lines: v.array(shoppingLineValidator),
    pantry: v.array(v.string()),
    costUsd: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const list = await activeBuild(ctx, args)
    if (!list) return null
    const fromDinners = new Set(args.lines.map(l => l.productId))
    // Recommended products the dinners now cover are left out.
    const kept = list.lines.filter(
      l => l.reason !== 'recipe' && !fromDinners.has(l.productId),
    )
    await ctx.db.patch(list._id, {
      status: 'ready',
      lines: [...args.lines, ...kept],
      pantry: args.pantry,
      claudeCostUsd: args.costUsd,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const failBuild = internalMutation({
  args: { ...runArgs, error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await activeBuild(ctx, args))) return null
    await ctx.db.patch(args.listId, {
      status: 'failed',
      error: args.error,
      updatedAt: Date.now(),
    })
    return null
  },
})

/** Combine the dinners' ingredients and match them to products. */
export const buildStep = internalAction({
  args: runArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.functions.shoppingLists.buildContext,
      args,
    )
    if (!context) return null
    try {
      const needs = combineIngredients(context.recipes)
      const { matches, costUsd } =
        needs.length > 0 && context.products.length > 0
          ? await matchProducts(needs, context.products)
          : {
              matches: needs.map(() => ({ kind: 'none' as const })),
              costUsd: 0,
            }

      const byProduct = new Map<Id<'products'>, ShoppingLine>()
      const unmatched: ShoppingLine[] = []
      const pantry: string[] = []
      needs.forEach((need, i) => {
        const match = matches[i]!
        if (match.kind === 'pantry') {
          pantry.push(need.name)
        } else if (match.kind === 'product') {
          const product = context.products[match.product]!
          const line = byProduct.get(product.productId)
          if (line) {
            line.quantity = (line.quantity ?? 0) + match.quantity
            line.covers.push(...need.from)
          } else {
            byProduct.set(product.productId, {
              id: newLineId(),
              productId: product.productId,
              name: product.name,
              quantity: match.quantity,
              reason: 'recipe',
              covers: [...need.from],
            })
          }
        } else {
          unmatched.push({
            id: newLineId(),
            name: need.name,
            quantity: need.quantity,
            unit: need.unit,
            reason: 'recipe',
            covers: need.from,
          })
        }
      })
      await ctx.runMutation(internal.functions.shoppingLists.finishBuild, {
        ...args,
        lines: [...byProduct.values(), ...unmatched],
        pantry,
        costUsd,
      })
    } catch (error) {
      console.error('Building the shopping list failed:', error)
      await ctx.runMutation(internal.functions.shoppingLists.failBuild, {
        ...args,
        error:
          error instanceof ClaudeUnavailableError
            ? error.message
            : "We couldn't make the shopping list. Check your connection and try again.",
      })
    }
    return null
  },
})

// ============================================================================
// Changing the list
// ============================================================================

/** This week's list, made empty when there is none yet. */
async function myList(ctx: MutationCtx): Promise<Doc<'shoppingLists'>> {
  const { household } = await requireMyHousehold(ctx)
  const now = Date.now()
  const weekStart = planWeekStart(now)
  const list = await listFor(ctx, household._id, weekStart)
  if (list) return list
  const id = await ctx.db.insert('shoppingLists', {
    householdId: household._id,
    weekStart,
    status: 'ready',
    lines: [],
    pantry: [],
    runId: 0,
    updatedAt: now,
  })
  return (await ctx.db.get(id))!
}

function requireLine(list: Doc<'shoppingLists'>, lineId: string) {
  const line = list.lines.find(l => l.id === lineId)
  if (!line) {
    throw permanentError('NOT_FOUND', 'This product is no longer on the list.')
  }
  return line
}

/** Add a product they bought before, in the amount they usually buy. */
export const addProduct = mutation({
  args: { productId: v.id('products') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const list = await myList(ctx)
    const stats = await statsFor(ctx, list.householdId, args.productId)
    if (!stats) {
      throw permanentError('NOT_FOUND', "You haven't bought this product yet.")
    }
    if (list.lines.some(l => l.productId === args.productId)) return null
    await ctx.db.patch(list._id, {
      lines: [
        ...list.lines,
        {
          id: newLineId(),
          productId: args.productId,
          name: stats.name,
          quantity: usualQuantity(stats.averageQuantity, stats.soldByWeight),
          reason: 'recommended',
          covers: [],
        },
      ],
      updatedAt: Date.now(),
    })
    return null
  },
})

/** Pieces, or kg for a product sold by weight. */
export const setQuantity = mutation({
  args: { lineId: v.string(), quantity: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const list = await myList(ctx)
    requireLine(list, args.lineId)
    if (
      !Number.isFinite(args.quantity) ||
      args.quantity <= 0 ||
      args.quantity > MAX_QUANTITY
    ) {
      throw permanentError(
        'INVALID_ARGUMENT',
        `Choose an amount between 0 and ${MAX_QUANTITY}.`,
      )
    }
    await ctx.db.patch(list._id, {
      lines: list.lines.map(l =>
        l.id === args.lineId
          ? { ...l, quantity: Math.round(args.quantity * 100) / 100 }
          : l,
      ),
      updatedAt: Date.now(),
    })
    return null
  },
})

export const removeLine = mutation({
  args: { lineId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const list = await myList(ctx)
    requireLine(list, args.lineId)
    await ctx.db.patch(list._id, {
      lines: list.lines.filter(l => l.id !== args.lineId),
      updatedAt: Date.now(),
    })
    return null
  },
})
