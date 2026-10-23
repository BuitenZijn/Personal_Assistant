import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import { planWeekStart } from '../convex/lib/mealPlanWeek'
import {
  catalogFromSitemap,
  COLRUYT,
  nameFromUrl,
} from '../convex/lib/recipeCatalog'
import { householdProfile } from '../convex/lib/mealPlanClaude'
import { expectPermanentError, userFixture } from './fixtures'

const claude = vi.hoisted(() => ({
  pickByName: vi.fn(),
  chooseSuggestions: vi.fn(),
}))
vi.mock('../convex/lib/mealPlanClaude', async original => ({
  ...(await original<typeof import('../convex/lib/mealPlanClaude')>()),
  pickByName: claude.pickByName,
  chooseSuggestions: claude.chooseSuggestions,
}))

const BASE = 'https://www.colruyt.be/nl/recepten'

function recipePage(name: string, course = 'Hoofdgerecht', minutes = 30) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@type': 'Recipe',
    name,
    recipeCategory: course,
    totalTime: `PT${minutes}M`,
    recipeYield: '4',
    recipeIngredient: ['400 g pasta', '1 ui'],
    recipeInstructions: [{ '@type': 'HowToStep', text: 'Kook.' }],
  })}</script>`
}

/** colruyt.be as the tests see it: 6 recipes, one a dessert, one broken. */
const SITE: Record<string, string> = {
  'https://www.colruyt.be/robots.txt':
    'User-agent: *\ncrawl-delay: 5\nDisallow: /nl/recepten/verboden',
  'https://www.colruyt.be/nl/sitemap.recipes.xml': `<urlset>${[
    'pasta-pesto',
    'kip-curry',
    'tiramisu',
    'vispannetje',
    'kapot',
    'stoofvlees',
    'verboden',
  ]
    .map(slug => `<url><loc>${BASE}/${slug}</loc></url>`)
    .join(
      '',
    )}<url><loc>https://www.colruyt.be/nl/over-ons</loc></url></urlset>`,
  [`${BASE}/pasta-pesto`]: recipePage('Pasta pesto'),
  [`${BASE}/kip-curry`]: recipePage('Kip curry'),
  [`${BASE}/tiramisu`]: recipePage('Tiramisu', 'Dessert'),
  [`${BASE}/vispannetje`]: recipePage('Vispannetje'),
  [`${BASE}/stoofvlees`]: recipePage('Stoofvlees', 'Hoofdgerecht', 180),
}

const DK_BASE = 'https://dagelijksekost.vrt.be/gerechten'

/** dagelijksekost.vrt.be as the tests see it: 2 recipes. */
const DK_SITE: Record<string, string> = {
  'https://dagelijksekost.vrt.be/robots.txt':
    'User-agent:*\nAllow:/\nDisallow:/api/',
  'https://dagelijksekost.vrt.be/api/sitemaps/recipes/0/sitemap.xml': `<urlset>${[
    'balletjes-in-tomatensaus',
    'witloof-in-de-oven-1',
  ]
    .map(slug => `<url><loc>${DK_BASE}/${slug}</loc></url>`)
    .join('')}</urlset>`,
  [`${DK_BASE}/balletjes-in-tomatensaus`]: recipePage(
    'Balletjes in tomatensaus',
  ),
  [`${DK_BASE}/witloof-in-de-oven-1`]: recipePage('Witloof in de oven'),
}

describe('planning helpers', () => {
  it('plans this week until Thursday, next week from Friday (Belgian time)', () => {
    expect(planWeekStart(Date.parse('2026-10-19T10:00:00Z'))).toBe('2026-10-19')
    expect(planWeekStart(Date.parse('2026-10-22T10:00:00Z'))).toBe('2026-10-19')
    expect(planWeekStart(Date.parse('2026-10-23T10:00:00Z'))).toBe('2026-10-26')
    expect(planWeekStart(Date.parse('2026-10-25T10:00:00Z'))).toBe('2026-10-26')
    // Thursday 23:30 UTC is already Friday in Brussels.
    expect(planWeekStart(Date.parse('2026-10-22T23:30:00Z'))).toBe('2026-10-26')
  })

  it('reads the catalog from the sitemap, as robots.txt allows', () => {
    expect(nameFromUrl(`${BASE}/vol-au-veggie-0`)).toBe('vol au veggie')
    const catalog = catalogFromSitemap(
      COLRUYT,
      SITE['https://www.colruyt.be/nl/sitemap.recipes.xml']!,
      SITE['https://www.colruyt.be/robots.txt']!,
    )
    expect(catalog.map(c => c.name)).toEqual([
      'pasta pesto',
      'kip curry',
      'tiramisu',
      'vispannetje',
      'kapot',
      'stoofvlees',
    ])
  })

  it('describes the household', async () => {
    const { t, authorClient } = await userFixture()
    await authorClient.mutation(api.functions.households.setUp)
    await authorClient.mutation(api.functions.households.savePerson, {
      name: 'Mila',
      age: 7,
      diet: 'vegetarian',
      allergies: ['peanuts'],
      dislikes: [],
    })
    const household = await t.run(ctx => ctx.db.query('households').first())
    const profile = householdProfile(household!, ['boni bananen w'])
    expect(profile).toContain('Mila: age 7; vegetarian; ALLERGIC to peanuts')
    expect(profile).toContain('at most 30 minutes on weekdays')
    expect(profile).toContain('boni bananen w')
  })
})

describe('meal plans', () => {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>()

  beforeEach(() => {
    vi.useFakeTimers()
    // A Thursday: plans are for the week of Monday 19 October.
    vi.setSystemTime(new Date('2026-10-22T10:00:00Z'))
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (url: string) => {
      const page = SITE[url] ?? DK_SITE[url]
      return page === undefined
        ? new Response('not found', { status: 404 })
        : new Response(page, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    claude.pickByName.mockReset()
    claude.chooseSuggestions.mockReset()
    // Claude picks every name it is given, and finds every recipe suits.
    claude.pickByName.mockImplementation(async (names: string[]) => ({
      picks: names.map((_, i) => i),
      costUsd: 0.012,
    }))
    claude.chooseSuggestions.mockImplementation(
      async (recipes: { title: string }[]) => ({
        chosen: recipes.map((r, index) => ({
          index,
          reason: `${r.title} suits you.`,
        })),
        note: null,
        costUsd: 0.003,
      }),
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /**
   * A household planning 1 dinner a week (4 suggestions wanted), from
   * colruyt.be unless it says otherwise.
   */
  async function household(recipeSites = ['colruyt.be']) {
    const fixture = await userFixture()
    await fixture.authorClient.mutation(api.functions.households.setUp)
    await fixture.authorClient.mutation(
      api.functions.households.updateSettings,
      {
        dinnersPerWeek: 1,
        cookingMinutes: { weekday: 30, weekend: 60 },
        recipeSites,
      },
    )
    return fixture
  }

  async function suggest(fixture: Awaited<ReturnType<typeof household>>) {
    const planId = await fixture.authorClient.mutation(
      api.functions.mealPlans.suggest,
    )
    await fixture.t.finishAllScheduledFunctions(vi.runAllTimers)
    return planId
  }

  it('suggests dinners that were read and suit the household', async () => {
    const fixture = await household()
    const planId = await suggest(fixture)
    const plan = await fixture.authorClient.query(
      api.functions.mealPlans.current,
    )

    // The dessert, the broken page and the 3-hour stew are left out.
    expect(plan).toMatchObject({
      _id: planId,
      weekStart: '2026-10-19',
      status: 'choosing',
      progress: null,
      sparesLeft: 0,
      note: 'Only 3 of the recipes we found suit everyone.',
    })
    // Both Claude calls are counted.
    expect(plan?.claudeCostUsd).toBeCloseTo(0.015)
    expect(plan?.suggestions).toEqual([
      expect.objectContaining({
        title: 'Pasta pesto',
        reason: 'Pasta pesto suits you.',
        picked: false,
        servings: 1,
      }),
      expect.objectContaining({ title: 'Kip curry' }),
      expect.objectContaining({ title: 'Vispannetje' }),
    ])
    // Only the candidates were read, robots.txt was followed, and the
    // tiramisu was left out by its name, before reading.
    const fetched = fetchMock.mock.calls.map(([url]) => url)
    expect(fetched).not.toContain(`${BASE}/verboden`)
    expect(fetched).not.toContain(`${BASE}/tiramisu`)
    expect(fetched.filter(u => u.startsWith(`${BASE}/`))).toHaveLength(5)
    // Claude only saw dinners within the cooking time.
    const [given] = claude.chooseSuggestions.mock.calls[0]!
    expect(given.map((r: { title: string }) => r.title)).toEqual([
      'Pasta pesto',
      'Kip curry',
      'Vispannetje',
    ])
  })

  it('picks, sets servings, replaces and confirms', async () => {
    const fixture = await household()
    const { authorClient } = fixture
    // Two to suggest, one spare.
    claude.chooseSuggestions.mockImplementation(
      async (recipes: { title: string }[]) => ({
        chosen: recipes.map((r, index) => ({ index, reason: r.title })),
        note: null,
        costUsd: 0,
      }),
    )
    await authorClient.mutation(api.functions.households.updateSettings, {
      dinnersPerWeek: 1,
    })
    const planId = await suggest(fixture)
    // With 4 wanted and 3 found there is no spare: ask for fewer.
    await fixture.t.run(async ctx => {
      const plan = await ctx.db.get(planId)
      await ctx.db.patch(planId, {
        suggestions: plan!.suggestions.slice(0, 2),
        spares: [{ recipeId: plan!.suggestions[2]!.recipeId, reason: 'Spare' }],
      })
    })

    await authorClient.mutation(api.functions.mealPlans.setPicked, {
      planId,
      index: 0,
      picked: true,
    })
    await authorClient.mutation(api.functions.mealPlans.setServings, {
      planId,
      index: 0,
      servings: 4,
    })
    await authorClient.mutation(api.functions.mealPlans.replace, {
      planId,
      index: 1,
    })
    let plan = await authorClient.query(api.functions.mealPlans.current)
    expect(plan?.suggestions.map(s => [s.title, s.picked, s.servings])).toEqual(
      [
        ['Pasta pesto', true, 4],
        ['Vispannetje', false, 1],
      ],
    )
    await expectPermanentError(
      authorClient.mutation(api.functions.mealPlans.replace, {
        planId,
        index: 1,
      }),
      'NOT_FOUND',
    )
    await expectPermanentError(
      authorClient.mutation(api.functions.mealPlans.setServings, {
        planId,
        index: 0,
        servings: 0,
      }),
      'INVALID_ARGUMENT',
    )

    await authorClient.mutation(api.functions.mealPlans.confirm, { planId })
    plan = await authorClient.query(api.functions.mealPlans.current)
    expect(plan?.status).toBe('confirmed')
    // Picked this week: with this week's recipes.
    const saved = await authorClient.query(api.functions.recipes.saved)
    expect(saved.thisWeek.map(r => r.title)).toEqual(['Pasta pesto'])
    expect(saved.other).toEqual([])
    // A favourite picked this week stays with this week's dinners.
    await authorClient.mutation(api.functions.recipes.setFavourite, {
      recipeId: saved.thisWeek[0]!._id,
      favourite: true,
    })
    const again = await authorClient.query(api.functions.recipes.saved)
    expect(again.thisWeek.map(r => r.title)).toEqual(['Pasta pesto'])
    expect(again.favourites).toEqual([])

    // Every member sees the plan, and can change it again.
    await authorClient.mutation(api.functions.mealPlans.reopen, { planId })
    plan = await authorClient.query(api.functions.mealPlans.current)
    expect(plan?.status).toBe('choosing')
  })

  it('needs a pick to confirm', async () => {
    const fixture = await household()
    const planId = await suggest(fixture)
    await expectPermanentError(
      fixture.authorClient.mutation(api.functions.mealPlans.confirm, {
        planId,
      }),
      'INVALID_ARGUMENT',
    )
  })

  it('looks further when planning again, reusing what it read', async () => {
    const fixture = await household()
    await suggest(fixture)
    fetchMock.mockClear()
    await suggest(fixture)

    // The catalog and the recipes read before are reused; only the page
    // that failed is tried again.
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`${BASE}/kapot`])
    // Suggestions shown before (and not picked) count as turned down.
    const [names, , avoid] = claude.pickByName.mock.calls[1]!
    expect(avoid).toEqual(['Pasta pesto', 'Kip curry', 'Vispannetje'])
    expect(names).toEqual(['kapot', 'stoofvlees'])
    const plan = await fixture.authorClient.query(
      api.functions.mealPlans.current,
    )
    expect(plan?.suggestions).toEqual([])
    expect(plan?.note).toMatch(/None of the recipes/)
  })

  it('plans only from the sites the household chose', async () => {
    const fixture = await household(['dagelijksekost.vrt.be'])
    await suggest(fixture)

    const fetched = fetchMock.mock.calls.map(([url]) => url)
    expect(fetched.some(u => u.includes('colruyt.be'))).toBe(false)
    const [names] = claude.pickByName.mock.calls[0]!
    expect(names).toEqual(['balletjes in tomatensaus', 'witloof in de oven'])
    const plan = await fixture.authorClient.query(
      api.functions.mealPlans.current,
    )
    expect(plan?.suggestions.map(s => s.title)).toEqual([
      'Balletjes in tomatensaus',
      'Witloof in de oven',
    ])
    const recipes = await fixture.t.run(ctx =>
      ctx.db.query('recipes').collect(),
    )
    expect(recipes.map(r => r.host)).toEqual([
      'dagelijksekost.vrt.be',
      'dagelijksekost.vrt.be',
    ])
  })

  it('plans from every site, even when one will not load', async () => {
    const fixture = await userFixture()
    await fixture.authorClient.mutation(api.functions.households.setUp)
    fetchMock.mockImplementation(async (url: string) =>
      url in DK_SITE
        ? new Response('down', { status: 503 })
        : url in SITE
          ? new Response(SITE[url], { status: 200 })
          : new Response('not found', { status: 404 }),
    )
    await suggest(fixture)

    const [names] = claude.pickByName.mock.calls[0]!
    expect(names).toContain('pasta pesto')
    const plan = await fixture.authorClient.query(
      api.functions.mealPlans.current,
    )
    expect(plan?.status).toBe('choosing')
  })

  it('runs one suggestion at a time', async () => {
    const fixture = await household()
    const first = await fixture.authorClient.mutation(
      api.functions.mealPlans.suggest,
    )
    const second = await fixture.authorClient.mutation(
      api.functions.mealPlans.suggest,
    )
    expect(second).toBe(first)
    await fixture.t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(claude.pickByName).toHaveBeenCalledTimes(1)
  })

  it('says what is missing when Claude is not set up', async () => {
    const fixture = await household()
    const { SuggestionsUnavailableError } =
      await import('../convex/lib/mealPlanClaude')
    claude.pickByName.mockRejectedValue(
      new SuggestionsUnavailableError('Needs ANTHROPIC_API_KEY.'),
    )
    await suggest(fixture)
    const plan = await fixture.authorClient.query(
      api.functions.mealPlans.current,
    )
    expect(plan).toMatchObject({
      status: 'failed',
      error: 'Needs ANTHROPIC_API_KEY.',
    })
  })

  it('deletes plans with the household', async () => {
    const fixture = await household()
    await suggest(fixture)
    await fixture.t.mutation(internal.functions.users.processAccountDeletion, {
      userId: fixture.author,
    })
    await fixture.t.finishAllScheduledFunctions(vi.runAllTimers)
    const plans = await fixture.t.run(ctx =>
      ctx.db.query('mealPlans').collect(),
    )
    expect(plans).toEqual([])
  })
})
