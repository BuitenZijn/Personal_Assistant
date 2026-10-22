import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import {
  canonicalUrl,
  extractRecipe,
  formatQuantity,
  isMainCourse,
  normalizeHost,
  parseDurationMinutes,
  parseIngredientLine,
  parseRobots,
  robotsAllows,
} from '../convex/lib/recipeParse'
import { expectPermanentError, userFixture } from './fixtures'

/** A page with schema.org Recipe data, the way most recipe sites have it. */
function recipePage(recipe: Record<string, unknown>, extra = '') {
  return `<html><head><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [{ '@type': 'WebPage' }, { '@type': 'Recipe', ...recipe }],
  })}</script></head><body>${extra}</body></html>`
}

const STEW = {
  name: 'Stoofvlees met friet',
  recipeYield: ['4', '4 personen'],
  totalTime: 'PT2H30M',
  recipeCategory: 'Hoofdgerecht',
  keywords: 'Belgisch|te herschrijven|Klassieker',
  image: { '@type': 'ImageObject', url: 'https://example.test/stew.jpg' },
  recipeIngredient: [
    '800 g runderstoofvlees (beenhouwerij)',
    '2 el bloem',
    '½ l bruin bier',
    ' peper',
  ],
  recipeInstructions: [
    {
      '@type': 'HowToSection',
      name: 'Vlees',
      itemListElement: [
        { '@type': 'HowToStep', text: 'Bak het vlees <b>bruin</b>.' },
        { '@type': 'HowToStep', text: '' },
      ],
    },
    { '@type': 'HowToStep', text: 'Laat 2 uur sudderen.' },
  ],
}

describe('reading a recipe page', () => {
  it('reads schema.org recipe data', () => {
    expect(extractRecipe(recipePage(STEW))).toEqual({
      title: 'Stoofvlees met friet',
      servings: 4,
      totalMinutes: 150,
      course: 'Hoofdgerecht',
      isMain: true,
      ingredients: [
        {
          text: '800 g runderstoofvlees (beenhouwerij)',
          quantity: 800,
          unit: 'g',
          name: 'runderstoofvlees',
          note: 'beenhouwerij',
        },
        expect.objectContaining({ quantity: 2, unit: 'el', name: 'bloem' }),
        expect.objectContaining({
          quantity: 0.5,
          unit: 'l',
          name: 'bruin bier',
        }),
        expect.objectContaining({ quantity: undefined, name: 'peper' }),
      ],
      steps: ['Bak het vlees bruin.', 'Laat 2 uur sudderen.'],
      tags: ['Belgisch', 'Klassieker', 'Hoofdgerecht'],
      imageUrl: 'https://example.test/stew.jpg',
    })
  })

  it("prefers colruyt.be's own ingredient data", () => {
    const data = JSON.stringify([
      {
        quantity: 0.25,
        unit: { shortName: '' },
        singular: { ingredientText: 'rodekool', ingredientId: 'ID-1' },
      },
      {
        quantity: 2,
        unit: { shortName: 'tenen' },
        plural: {
          ingredientText: 'look',
          unitText: 'tenen',
          ingredientId: 'ID-2',
        },
      },
    ]).replace(/"/g, '&#34;')
    const recipe = extractRecipe(
      recipePage(
        { ...STEW, recipeIngredient: ['0 rodekool', '2 tenen look'] },
        `<div data-vue="SWFIngredientList" data-ingredient-data="${data}"></div>`,
      ),
    )
    expect(recipe?.ingredients).toEqual([
      {
        text: '¼ rodekool',
        quantity: 0.25,
        unit: undefined,
        name: 'rodekool',
        note: undefined,
        sourceId: 'ID-1',
      },
      {
        text: '2 tenen look',
        quantity: 2,
        unit: 'tenen',
        name: 'look',
        note: undefined,
        sourceId: 'ID-2',
      },
    ])
  })

  it('finds nothing on a page without a recipe', () => {
    expect(extractRecipe('<html><body>Hello</body></html>')).toBeNull()
    expect(
      extractRecipe(recipePage({ name: 'Leeg', recipeIngredient: [] })),
    ).toBeNull()
  })

  it('splits ingredient lines', () => {
    expect(parseIngredientLine('1 koffiel. plantaardige olie')).toMatchObject({
      quantity: 1,
      unit: 'koffiel.',
      name: 'plantaardige olie',
    })
    expect(parseIngredientLine('1½ kg aardappelen')).toMatchObject({
      quantity: 1.5,
      unit: 'kg',
      name: 'aardappelen',
    })
    expect(parseIngredientLine('2-3 tomaten')).toMatchObject({
      quantity: 2,
      name: 'tomaten',
    })
    expect(parseIngredientLine('gram flour')).toMatchObject({
      quantity: undefined,
      unit: 'gram',
      name: 'flour',
    })
    expect(parseIngredientLine('0 rodekool').quantity).toBeUndefined()
  })

  it('reads times, courses, addresses and quantities', () => {
    expect(parseDurationMinutes('PT45M')).toBe(45)
    expect(parseDurationMinutes('P0DT1H')).toBe(60)
    expect(parseDurationMinutes('soon')).toBeUndefined()
    expect(isMainCourse('Hoofdgerecht')).toBe(true)
    expect(isMainCourse('Main course')).toBe(true)
    expect(isMainCourse('Dessert')).toBe(false)
    expect(isMainCourse('Soep')).toBe(false)
    expect(isMainCourse(undefined)).toBe(true)
    expect(normalizeHost('https://www.Colruyt.be/nl')).toBe('colruyt.be')
    expect(normalizeHost('colruyt.be')).toBe('colruyt.be')
    expect(normalizeHost('nonsense')).toBeNull()
    expect(
      canonicalUrl('https://example.test/r/stew/?utm_source=x&id=2#top'),
    ).toBe('https://example.test/r/stew/?id=2')
    expect(canonicalUrl('https://example.test/r/stew/')).toBe(
      'https://example.test/r/stew',
    )
    expect(canonicalUrl('ftp://example.test')).toBeNull()
    expect(formatQuantity(0.25)).toBe('¼')
    expect(formatQuantity(1.5)).toBe('1½')
    expect(formatQuantity(2.4)).toBe('2,4')
    expect(formatQuantity(3)).toBe('3')
  })

  it('follows robots.txt', () => {
    const rules = parseRobots(
      [
        'User-agent: Googlebot',
        'Disallow: /',
        '',
        'User-agent: *',
        'crawl-delay: 5',
        'Disallow: /fr/lekker-koken',
        'Disallow: /*.pdf$',
      ].join('\n'),
    )
    expect(rules.crawlDelaySeconds).toBe(5)
    expect(robotsAllows(rules, '/nl/recepten/stoofvlees')).toBe(true)
    expect(robotsAllows(rules, '/fr/lekker-koken/x')).toBe(false)
    expect(robotsAllows(rules, '/files/menu.pdf')).toBe(false)
  })
})

describe('saved recipes', () => {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>()

  /** Serve these pages; anything else is a 404. */
  function serve(pages: Record<string, string>) {
    fetchMock.mockImplementation(async (url: string) =>
      url in pages
        ? new Response(pages[url], { status: 200 })
        : new Response('not found', { status: 404 }),
    )
  }

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('ANTHROPIC_API_KEY', '')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  async function household() {
    const fixture = await userFixture()
    await fixture.authorClient.mutation(api.functions.households.setUp)
    return fixture
  }

  it('saves a recipe by its link, once', async () => {
    const { authorClient } = await household()
    serve({ 'https://example.test/stoofvlees': recipePage(STEW) })

    const id = await authorClient.action(api.functions.recipes.addFromUrl, {
      url: 'https://example.test/stoofvlees/?utm_source=share',
    })
    const recipe = await authorClient.query(api.functions.recipes.get, { id })
    expect(recipe).toMatchObject({
      title: 'Stoofvlees met friet',
      host: 'example.test',
      extractedBy: 'json-ld',
      saved: true,
    })
    expect(await authorClient.query(api.functions.recipes.saved)).toEqual([
      {
        _id: id,
        title: 'Stoofvlees met friet',
        host: 'example.test',
        imageUrl: 'https://example.test/stew.jpg',
        totalMinutes: 150,
        servings: 4,
      },
    ])

    // Read recently: not fetched again, and not saved twice.
    await authorClient.action(api.functions.recipes.addFromUrl, {
      url: 'https://example.test/stoofvlees',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await authorClient.query(api.functions.recipes.saved)).toHaveLength(
      1,
    )
  })

  it("keeps each household's saved recipes to itself", async () => {
    const { authorClient, playerClient } = await household()
    await playerClient.mutation(api.functions.households.setUp)
    serve({ 'https://example.test/stoofvlees': recipePage(STEW) })
    const id = await authorClient.action(api.functions.recipes.addFromUrl, {
      url: 'https://example.test/stoofvlees',
    })
    expect(await playerClient.query(api.functions.recipes.saved)).toEqual([])
    expect(
      await playerClient.query(api.functions.recipes.get, { id }),
    ).toMatchObject({ saved: false })
  })

  it('says so when a page has no recipe', async () => {
    const { authorClient } = await household()
    serve({ 'https://example.test/about': '<html>About us</html>' })
    await expectPermanentError(
      authorClient.action(api.functions.recipes.addFromUrl, {
        url: 'https://example.test/about',
      }),
      'NOT_FOUND',
    )
    await expectPermanentError(
      authorClient.action(api.functions.recipes.addFromUrl, {
        url: 'not a link',
      }),
      'INVALID_ARGUMENT',
    )
  })

  it('removes a saved recipe', async () => {
    const { authorClient } = await household()
    serve({ 'https://example.test/stoofvlees': recipePage(STEW) })
    const recipeId = await authorClient.action(
      api.functions.recipes.addFromUrl,
      { url: 'https://example.test/stoofvlees' },
    )
    await authorClient.mutation(api.functions.recipes.removeSaved, {
      recipeId,
    })
    expect(await authorClient.query(api.functions.recipes.saved)).toEqual([])
  })

  it("deletes a household's saved recipes with it", async () => {
    const { t, author, authorClient } = await household()
    serve({ 'https://example.test/stoofvlees': recipePage(STEW) })
    await authorClient.action(api.functions.recipes.addFromUrl, {
      url: 'https://example.test/stoofvlees',
    })
    await t.mutation(internal.functions.users.processAccountDeletion, {
      userId: author,
    })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const left = await t.run(async ctx => ({
      saved: await ctx.db.query('householdRecipes').collect(),
      recipes: (await ctx.db.query('recipes').collect()).length,
    }))
    // The recipe itself is the site's public content and stays.
    expect(left).toEqual({ saved: [], recipes: 1 })
  })
})
