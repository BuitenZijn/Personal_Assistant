/**
 * Receipts and products (see docs/PLAN.md, Phase 2)
 *
 * Receipts come in from the store's CSV export through the import script
 * (scripts/importReceipts.ts), signed in as a household member. Each import
 * rebuilds the `productStats` of the products it touched, which the
 * "Products" screen lists and later phases use to pick products and spot
 * what is due.
 */

import { query, mutation, internalMutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import { v } from 'convex/values'
import { getCurrentUserOrNull } from '../lib/auth'
import { permanentError } from '../lib/errors'
import { getMembership, requireMyHousehold } from '../lib/households'
import { purchaseStats } from '../lib/productStats'

/** Per import call; the script sends larger files in batches. */
const MAX_RECEIPTS_PER_IMPORT = 50
const MAX_LINES_PER_IMPORT = 1500
/** Products whose stats one scheduled pass rebuilds. */
const STATS_BATCH = 50
/** Rows one pass of `deleteHouseholdData` deletes. */
const DELETE_BATCH = 500

const receiptValidator = v.object({
  ticketNumber: v.string(),
  date: v.string(),
  store: v.string(),
  lines: v.array(
    v.object({
      articleNumber: v.string(),
      name: v.string(),
      quantity: v.number(),
      amountCents: v.number(),
      soldByWeight: v.boolean(),
    }),
  ),
})

// ============================================================================
// Import
// ============================================================================

/**
 * The product for an article number, created on first sight. A newer name
 * replaces the stored one; once seen sold by weight, a product stays so.
 */
async function upsertProduct(
  ctx: MutationCtx,
  line: { articleNumber: string; name: string; soldByWeight: boolean },
): Promise<Id<'products'>> {
  const existing = await ctx.db
    .query('products')
    .withIndex('by_article_number', q =>
      q.eq('articleNumber', line.articleNumber),
    )
    .first()
  if (!existing) {
    return await ctx.db.insert('products', {
      articleNumber: line.articleNumber,
      name: line.name,
      soldByWeight: line.soldByWeight,
    })
  }
  const soldByWeight = existing.soldByWeight || line.soldByWeight
  if (existing.name !== line.name || existing.soldByWeight !== soldByWeight) {
    await ctx.db.patch(existing._id, { name: line.name, soldByWeight })
  }
  return existing._id
}

/**
 * Add receipts to the household. A receipt imported before (same ticket
 * number) is replaced, so importing an export again, or one that overlaps
 * the last, adds nothing twice.
 */
export const importReceipts = mutation({
  args: { receipts: v.array(receiptValidator) },
  returns: v.object({
    created: v.number(),
    replaced: v.number(),
    lines: v.number(),
  }),
  handler: async (ctx, args) => {
    const { household } = await requireMyHousehold(ctx)
    const lineCount = args.receipts.reduce((n, r) => n + r.lines.length, 0)
    if (
      args.receipts.length > MAX_RECEIPTS_PER_IMPORT ||
      lineCount > MAX_LINES_PER_IMPORT
    ) {
      throw permanentError(
        'INVALID_ARGUMENT',
        `Send at most ${MAX_RECEIPTS_PER_IMPORT} receipts and ${MAX_LINES_PER_IMPORT} lines at a time.`,
      )
    }

    const productIds = new Map<string, Id<'products'>>()
    const touched = new Set<Id<'products'>>()
    let created = 0
    let replaced = 0

    for (const receipt of args.receipts) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt.date)) {
        throw permanentError(
          'INVALID_ARGUMENT',
          `Receipt ${receipt.ticketNumber} has no valid date.`,
        )
      }
      const totalCents = receipt.lines.reduce((n, l) => n + l.amountCents, 0)
      const fields = {
        date: receipt.date,
        store: receipt.store,
        totalCents,
      }

      const existing = await ctx.db
        .query('receipts')
        .withIndex('by_household_and_ticket', q =>
          q
            .eq('householdId', household._id)
            .eq('ticketNumber', receipt.ticketNumber),
        )
        .first()
      let receiptId: Id<'receipts'>
      if (existing) {
        const oldLines = await ctx.db
          .query('receiptLines')
          .withIndex('by_receipt', q => q.eq('receiptId', existing._id))
          .collect()
        for (const line of oldLines) {
          touched.add(line.productId)
          await ctx.db.delete(line._id)
        }
        await ctx.db.patch(existing._id, fields)
        receiptId = existing._id
        replaced++
      } else {
        receiptId = await ctx.db.insert('receipts', {
          householdId: household._id,
          ticketNumber: receipt.ticketNumber,
          ...fields,
        })
        created++
      }

      for (const line of receipt.lines) {
        let productId = productIds.get(line.articleNumber)
        if (!productId) {
          productId = await upsertProduct(ctx, line)
          productIds.set(line.articleNumber, productId)
        }
        touched.add(productId)
        await ctx.db.insert('receiptLines', {
          householdId: household._id,
          receiptId,
          productId,
          date: receipt.date,
          quantity: line.quantity,
          amountCents: line.amountCents,
        })
      }
    }

    const ids = [...touched]
    for (let i = 0; i < ids.length; i += STATS_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.receipts.refreshStats,
        {
          householdId: household._id,
          productIds: ids.slice(i, i + STATS_BATCH),
        },
      )
    }
    return { created, replaced, lines: lineCount }
  },
})

/** Rebuild the household's stats for these products from its receipt lines. */
export const refreshStats = internalMutation({
  args: {
    householdId: v.id('households'),
    productIds: v.array(v.id('products')),
  },
  returns: v.null(),
  handler: async (ctx, { householdId, productIds }) => {
    for (const productId of productIds) {
      const lines = await ctx.db
        .query('receiptLines')
        .withIndex('by_household_and_product', q =>
          q.eq('householdId', householdId).eq('productId', productId),
        )
        .collect()
      const existing = await ctx.db
        .query('productStats')
        .withIndex('by_household_and_product', q =>
          q.eq('householdId', householdId).eq('productId', productId),
        )
        .first()
      const stats = purchaseStats(lines)
      const product = await ctx.db.get(productId)
      if (!stats || !product) {
        if (existing) await ctx.db.delete(existing._id)
        continue
      }
      const row = {
        householdId,
        productId,
        name: product.name,
        soldByWeight: product.soldByWeight,
        ...stats,
      }
      if (existing) await ctx.db.replace(existing._id, row)
      else await ctx.db.insert('productStats', row)
    }
    return null
  },
})

// ============================================================================
// Queries
// ============================================================================

async function myHouseholdId(ctx: Parameters<typeof getMembership>[0]) {
  const user = await getCurrentUserOrNull(ctx)
  if (!user) return null
  const membership = await getMembership(ctx, user._id)
  return membership?.householdId ?? null
}

/** How many receipts the household imported, and the dates they span. */
export const summary = query({
  args: {},
  handler: async ctx => {
    const householdId = await myHouseholdId(ctx)
    if (!householdId) return null
    const receipts = await ctx.db
      .query('receipts')
      .withIndex('by_household_and_date', q => q.eq('householdId', householdId))
      .collect()
    return {
      receiptCount: receipts.length,
      firstDate: receipts[0]?.date ?? null,
      lastDate: receipts[receipts.length - 1]?.date ?? null,
    }
  },
})

const LIST_LIMIT = 100
const SEARCH_LIMIT = 30

/**
 * The household's products, most often bought first, or with `search`, the
 * ones whose name matches it.
 */
export const myProducts = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const householdId = await myHouseholdId(ctx)
    if (!householdId) return []
    const term = args.search?.trim()
    if (term) {
      return await ctx.db
        .query('productStats')
        .withSearchIndex('search_name', q =>
          q.search('name', term).eq('householdId', householdId),
        )
        .take(SEARCH_LIMIT)
    }
    return await ctx.db
      .query('productStats')
      .withIndex('by_household_and_times_bought', q =>
        q.eq('householdId', householdId),
      )
      .order('desc')
      .take(LIST_LIMIT)
  },
})

// ============================================================================
// Deletion
// ============================================================================

/**
 * Delete a deleted household's receipts, lines, stats and saved
 * recipes, a batch per pass
 * (a year of receipts is more than one transaction may delete).
 */
export const deleteHouseholdData = internalMutation({
  args: { householdId: v.id('households') },
  returns: v.null(),
  handler: async (ctx, { householdId }) => {
    let budget = DELETE_BATCH
    const lines = await ctx.db
      .query('receiptLines')
      .withIndex('by_household_and_product', q =>
        q.eq('householdId', householdId),
      )
      .take(budget)
    for (const row of lines) await ctx.db.delete(row._id)
    budget -= lines.length

    if (budget > 0) {
      const receipts = await ctx.db
        .query('receipts')
        .withIndex('by_household_and_date', q =>
          q.eq('householdId', householdId),
        )
        .take(budget)
      for (const row of receipts) await ctx.db.delete(row._id)
      budget -= receipts.length
    }
    if (budget > 0) {
      const saved = await ctx.db
        .query('householdRecipes')
        .withIndex('by_household', q => q.eq('householdId', householdId))
        .take(budget)
      for (const row of saved) await ctx.db.delete(row._id)
      budget -= saved.length
    }
    if (budget > 0) {
      const stats = await ctx.db
        .query('productStats')
        .withIndex('by_household_and_product', q =>
          q.eq('householdId', householdId),
        )
        .take(budget)
      for (const row of stats) await ctx.db.delete(row._id)
      budget -= stats.length
    }

    if (budget <= 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.receipts.deleteHouseholdData,
        { householdId },
      )
    }
    return null
  },
})
