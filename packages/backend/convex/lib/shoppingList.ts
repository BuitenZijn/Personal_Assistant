/**
 * The arithmetic behind the shopping list (see docs/PLAN.md, Phase 5):
 * combining the week's ingredients, and which products are due again.
 */

import { formatQuantity } from './recipeParse'

const DAY_MS = 24 * 60 * 60 * 1000

// ============================================================================
// Combining ingredients
// ============================================================================

export type RecipeToShopFor = {
  title: string
  /** What the recipe is written for, if it says. */
  servings?: number
  /** What we cook it for. */
  cookFor: number
  ingredients: {
    text: string
    name: string
    quantity?: number
    unit?: string
  }[]
}

/** One ingredient across the week: 2 × 200 g gehakt → 400 g gehakt. */
export type IngredientNeed = {
  name: string
  unit?: string
  /** Summed over the lines that give one; unset when none does. */
  quantity?: number
  /** Each line it came from, with its recipe: "200 g gehakt (Lasagne)". */
  from: string[]
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * The week's ingredients, scaled to the servings we cook for, with lines of
 * the same ingredient in the same unit added up.
 */
export function combineIngredients(
  recipes: RecipeToShopFor[],
): IngredientNeed[] {
  const needs = new Map<string, IngredientNeed>()
  for (const recipe of recipes) {
    const factor = recipe.servings ? recipe.cookFor / recipe.servings : 1
    for (const ingredient of recipe.ingredients) {
      const name = ingredient.name.trim()
      if (!name) continue
      const unit = ingredient.unit?.trim() || undefined
      const key = `${name.toLowerCase()}|${unit?.toLowerCase() ?? ''}`
      const need = needs.get(key) ?? { name, unit, from: [] }
      if (ingredient.quantity !== undefined) {
        need.quantity = round(
          (need.quantity ?? 0) + ingredient.quantity * factor,
        )
      }
      need.from.push(`${ingredient.text} (${recipe.title})`)
      needs.set(key, need)
    }
  }
  return [...needs.values()]
}

/** "400 g gehakt", or "gehakt" without a quantity. */
export function describeNeed(need: IngredientNeed): string {
  if (need.quantity === undefined) return need.name
  return [formatQuantity(need.quantity), need.unit, need.name]
    .filter(Boolean)
    .join(' ')
}

// ============================================================================
// Products that are due
// ============================================================================

export type BuyingHabit = {
  timesBought: number
  /** YYYY-MM-DD */
  lastBoughtOn: string
  averageIntervalDays?: number
}

/** Bought this often or more before we think it's a habit. */
const MIN_TIMES_BOUGHT = 3
/** Due from this share of the usual interval on. */
const DUE_FROM = 0.8
/** Not bought for this many intervals: they stopped buying it. */
const STOPPED_AFTER = 3

/**
 * The products a household is about to run out of, going by how often it
 * buys them: most overdue first, at most `limit`.
 */
export function dueProducts<T extends BuyingHabit>(
  habits: T[],
  now: number,
  limit: number,
): T[] {
  return habits
    .flatMap(habit => {
      const interval = habit.averageIntervalDays
      if (!interval || habit.timesBought < MIN_TIMES_BOUGHT) return []
      const since = (now - Date.parse(habit.lastBoughtOn)) / DAY_MS
      const due = since / interval
      return due >= DUE_FROM && due < STOPPED_AFTER ? [{ habit, due }] : []
    })
    .sort((a, b) => b.due - a.due)
    .slice(0, limit)
    .map(({ habit }) => habit)
}

/** What a household usually buys of a product at once. */
export function usualQuantity(averageQuantity: number, soldByWeight: boolean) {
  return soldByWeight
    ? Math.max(0.1, round(averageQuantity))
    : Math.max(1, Math.round(averageQuantity))
}
