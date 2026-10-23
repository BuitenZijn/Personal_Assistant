import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import {
  combineIngredients,
  dueProducts,
  usualQuantity,
} from '../convex/lib/shoppingList'
import { expectPermanentError, userFixture } from './fixtures'

const claude = vi.hoisted(() => ({ matchProducts: vi.fn() }))
vi.mock('../convex/lib/shoppingListClaude', async original => ({
  ...(await original<typeof import('../convex/lib/shoppingListClaude')>()),
  matchProducts: claude.matchProducts,
}))

const NOW = Date.parse('2026-10-22T10:00:00Z')

describe('shopping list helpers', () => {
  it('combines the week’s ingredients, scaled to servings', () => {
    const needs = combineIngredients([
      {
        title: 'Lasagne',
        servings: 4,
        cookFor: 2,
        ingredients: [
          { text: '400 g gehakt', name: 'gehakt', quantity: 400, unit: 'g' },
          { text: 'zout', name: 'zout' },
        ],
      },
      {
        title: 'Chili',
        cookFor: 2,
        ingredients: [
          { text: '300 g Gehakt', name: 'Gehakt', quantity: 300, unit: 'g' },
          { text: '1 ui', name: 'ui', quantity: 1 },
        ],
      },
    ])
    expect(needs).toEqual([
      {
        name: 'gehakt',
        unit: 'g',
        quantity: 500,
        from: ['400 g gehakt (Lasagne)', '300 g Gehakt (Chili)'],
      },
      { name: 'zout', from: ['zout (Lasagne)'] },
      { name: 'ui', quantity: 1, from: ['1 ui (Chili)'] },
    ])
  })

  it('finds products that are due, most overdue first', () => {
    const habit = (lastBoughtOn: string, interval?: number, times = 5) => ({
      name: lastBoughtOn,
      timesBought: times,
      lastBoughtOn,
      averageIntervalDays: interval,
    })
    const due = dueProducts(
      [
        habit('2026-10-20', 7), // 2 of 7 days: not yet
        habit('2026-10-15', 7), // 7 of 7: due
        habit('2026-10-10', 7), // 12 of 7: more due
        habit('2026-08-01', 7), // stopped buying it
        habit('2026-10-01', undefined), // no habit
        habit('2026-10-01', 7, 2), // bought too few times
      ],
      NOW,
      10,
    )
    expect(due.map(d => d.name)).toEqual(['2026-10-10', '2026-10-15'])
  })

  it('suggests the usual amount', () => {
    expect(usualQuantity(1.6, false)).toBe(2)
    expect(usualQuantity(0.2, false)).toBe(1)
    expect(usualQuantity(0.456, true)).toBe(0.46)
  })
})

describe('shopping lists', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    claude.matchProducts.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * A household with two products bought before, and this week's plan with
   * two dinners: confirmed unless it says otherwise.
   */
  async function household(status: 'choosing' | 'confirmed' = 'confirmed') {
    const fixture = await userFixture()
    const householdId = await fixture.authorClient.mutation(
      api.functions.households.setUp,
    )
    const ids = await fixture.t.run(async ctx => {
      const product = async (
        articleNumber: string,
        name: string,
        soldByWeight: boolean,
        lastBoughtOn: string,
      ) => {
        const productId = await ctx.db.insert('products', {
          articleNumber,
          name,
          soldByWeight,
        })
        await ctx.db.insert('productStats', {
          householdId,
          productId,
          name,
          soldByWeight,
          timesBought: 10,
          totalQuantity: 15,
          totalSpentCents: 4000,
          firstBoughtOn: '2026-01-01',
          lastBoughtOn,
          averageIntervalDays: 7,
          averageQuantity: 1.5,
          lastUnitPriceCents: 250,
        })
        return productId
      }
      const gehakt = await product('1', 'BONI GEHAKT 300G', false, '2026-10-20')
      const melk = await product('2', 'BONI MELK 1L', false, '2026-10-12')
      const recipe = (title: string, ingredients: string[][]) =>
        ctx.db.insert('recipes', {
          url: `https://www.colruyt.be/nl/recepten/${title}`,
          host: 'colruyt.be',
          title,
          servings: 2,
          isMain: true,
          ingredients: ingredients.map(([quantity, unit, name]) => ({
            text: `${quantity} ${unit} ${name}`,
            quantity: Number(quantity),
            unit,
            name: name!,
          })),
          steps: [],
          tags: [],
          extractedBy: 'json-ld',
          fetchedAt: NOW,
        })
      const lasagne = await recipe('Lasagne', [
        ['300', 'g', 'gehakt'],
        ['1', 'el', 'olijfolie'],
      ])
      const chili = await recipe('Chili', [
        ['300', 'g', 'gehakt'],
        ['2', 'stuks', 'chilipeper'],
      ])
      await ctx.db.insert('mealPlans', {
        householdId,
        weekStart: '2026-10-19',
        status,
        candidates: [],
        readRecipeIds: [],
        suggestions: [
          { recipeId: lasagne, reason: '', picked: true, servings: 4 },
          { recipeId: chili, reason: '', picked: true, servings: 2 },
        ],
        spares: [],
        rejected: [],
        runId: 1,
        updatedAt: NOW,
      })
      return { gehakt, melk }
    })
    return { ...fixture, ...ids }
  }

  async function build(fixture: Awaited<ReturnType<typeof household>>) {
    await fixture.authorClient.mutation(api.functions.shoppingLists.build)
    await fixture.t.finishAllScheduledFunctions(vi.runAllTimers)
    return await fixture.authorClient.query(api.functions.shoppingLists.current)
  }

  it('turns the confirmed dinners into products', async () => {
    const fixture = await household()
    // gehakt → 3 packs, olijfolie is pantry, chilipeper matches nothing.
    claude.matchProducts.mockImplementation(
      async (_needs, products: { name: string }[]) => ({
        matches: [
          {
            kind: 'product',
            product: products.findIndex(p => p.name === 'BONI GEHAKT 300G'),
            quantity: 3,
          },
          { kind: 'pantry' },
          { kind: 'none' },
        ],
        costUsd: 0.002,
      }),
    )
    const current = await build(fixture)

    const [needs, products] = claude.matchProducts.mock.calls[0]!
    // Lasagne for 4 from a recipe for 2: twice the gehakt.
    expect(needs[0]).toMatchObject({ name: 'gehakt', quantity: 900 })
    expect(products.map((p: { name: string }) => p.name)).toContain(
      'BONI GEHAKT 300G',
    )
    expect(current?.list).toMatchObject({
      status: 'ready',
      pantry: ['olijfolie'],
      claudeCostUsd: 0.002,
      estimateCents: 750,
      unpriced: 1,
    })
    expect(current?.list?.lines).toEqual([
      expect.objectContaining({
        productId: fixture.gehakt,
        name: 'BONI GEHAKT 300G',
        quantity: 3,
        reason: 'recipe',
        covers: ['300 g gehakt (Lasagne)', '300 g gehakt (Chili)'],
        unitPriceCents: 250,
      }),
      expect.objectContaining({
        name: 'chilipeper',
        quantity: 2,
        unit: 'stuks',
        reason: 'recipe',
      }),
    ])
  })

  it('needs confirmed dinners', async () => {
    const fixture = await household('choosing')
    await expectPermanentError(
      fixture.authorClient.mutation(api.functions.shoppingLists.build),
      'INVALID_ARGUMENT',
    )
  })

  it('recommends what is due, and keeps it when building again', async () => {
    const fixture = await household()
    // Milk: bought 10 days ago, usually every 7. Gehakt: 2 days ago.
    let recommended = await fixture.authorClient.query(
      api.functions.shoppingLists.recommendations,
    )
    expect(recommended).toEqual([
      expect.objectContaining({ productId: fixture.melk, quantity: 2 }),
    ])

    await fixture.authorClient.mutation(
      api.functions.shoppingLists.addProduct,
      {
        productId: fixture.melk,
      },
    )
    recommended = await fixture.authorClient.query(
      api.functions.shoppingLists.recommendations,
    )
    expect(recommended).toEqual([])

    claude.matchProducts.mockResolvedValue({
      matches: [{ kind: 'none' }, { kind: 'none' }, { kind: 'none' }],
      costUsd: 0,
    })
    const current = await build(fixture)
    expect(current?.list?.lines.map(l => l.name)).toEqual([
      'gehakt',
      'olijfolie',
      'chilipeper',
      'BONI MELK 1L',
    ])
  })

  it('changes amounts and removes lines', async () => {
    const fixture = await household()
    await fixture.authorClient.mutation(
      api.functions.shoppingLists.addProduct,
      {
        productId: fixture.melk,
      },
    )
    const lineId = (await fixture.authorClient.query(
      api.functions.shoppingLists.current,
    ))!.list!.lines[0]!.id
    await fixture.authorClient.mutation(
      api.functions.shoppingLists.setQuantity,
      {
        lineId,
        quantity: 4,
      },
    )
    let current = await fixture.authorClient.query(
      api.functions.shoppingLists.current,
    )
    expect(current?.list?.lines[0]?.quantity).toBe(4)
    await expectPermanentError(
      fixture.authorClient.mutation(api.functions.shoppingLists.setQuantity, {
        lineId,
        quantity: 0,
      }),
      'INVALID_ARGUMENT',
    )

    await fixture.authorClient.mutation(
      api.functions.shoppingLists.removeLine,
      {
        lineId,
      },
    )
    current = await fixture.authorClient.query(
      api.functions.shoppingLists.current,
    )
    expect(current?.list?.lines).toEqual([])
  })

  it('says what is missing when Claude is not set up', async () => {
    const fixture = await household()
    const { ClaudeUnavailableError } = await import('../convex/lib/claude')
    claude.matchProducts.mockRejectedValue(
      new ClaudeUnavailableError('Needs ANTHROPIC_API_KEY.'),
    )
    const current = await build(fixture)
    expect(current?.list).toMatchObject({
      status: 'failed',
      error: 'Needs ANTHROPIC_API_KEY.',
    })
  })

  it('deletes lists with the household', async () => {
    const fixture = await household()
    await fixture.authorClient.mutation(
      api.functions.shoppingLists.addProduct,
      {
        productId: fixture.melk,
      },
    )
    await fixture.t.mutation(internal.functions.users.processAccountDeletion, {
      userId: fixture.author,
    })
    await fixture.t.finishAllScheduledFunctions(vi.runAllTimers)
    const lists = await fixture.t.run(ctx =>
      ctx.db.query('shoppingLists').collect(),
    )
    expect(lists).toEqual([])
  })
})
