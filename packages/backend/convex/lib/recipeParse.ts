/**
 * Reading a recipe from a web page (see docs/PLAN.md, Phase 3).
 *
 * Most recipe sites describe the recipe in schema.org `Recipe` JSON-LD,
 * which this reads. colruyt.be also embeds each ingredient's quantity, unit
 * and its own ingredient id (`data-ingredient-data`), which is more precise
 * than splitting the ingredient lines, and the id helps find the product
 * later. Pages without JSON-LD are left to Claude (functions/recipes.ts).
 */

export type ParsedIngredient = {
  text: string
  quantity?: number
  unit?: string
  name: string
  note?: string
  sourceId?: string
}

export type ParsedRecipe = {
  title: string
  servings?: number
  totalMinutes?: number
  course?: string
  isMain: boolean
  ingredients: ParsedIngredient[]
  steps: string[]
  tags: string[]
  imageUrl?: string
}

// ============================================================================
// Addresses
// ============================================================================

/** "https://www.colruyt.be/nl" or "www.colruyt.be" → "colruyt.be" */
export function normalizeHost(urlOrHost: string): string | null {
  const text = urlOrHost.trim()
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
    if (!url.hostname.includes('.')) return null
    return url.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/** The address without fragment, tracking parameters or trailing slash. */
export function canonicalUrl(text: string): string | null {
  try {
    const url = new URL(text.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key)
    }
    const result = url.toString()
    return result.endsWith('/') && url.pathname !== '/'
      ? result.slice(0, -1)
      : result
  } catch {
    return null
  }
}

// ============================================================================
// Small values
// ============================================================================

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(parseInt(code.slice(2), 16))
    }
    if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)))
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

function cleanText(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

/** ISO 8601 durations: "PT1H10M" → 70, "P0DT45M" → 45. */
export function parseDurationMinutes(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const match =
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
      value.trim(),
    )
  if (!match) return undefined
  const [, days, hours, minutes, seconds] = match.map(Number)
  const total =
    (days || 0) * 24 * 60 +
    (hours || 0) * 60 +
    (minutes || 0) +
    (seconds || 0) / 60
  return total > 0 ? Math.round(total) : undefined
}

/** "4", 4, "4 personen", ["4", "4 servings"] → 4 */
export function parseServings(value: unknown): number | undefined {
  const first = Array.isArray(value) ? value[0] : value
  if (typeof first === 'number') return first > 0 ? first : undefined
  if (typeof first !== 'string') return undefined
  const match = /\d+/.exec(first)
  const n = match ? Number(match[0]) : 0
  return n > 0 ? n : undefined
}

const NOT_DINNER =
  /dessert|nagerecht|ontbijt|breakfast|brunch|snack|tussendoor|aperitief|apéritif|appetizer|hapje|voorgerecht|starter|bijgerecht|side|saus|sauce|drank|drink|cocktail|gebak|bakken|baking|koek|cake|taart|soep|soup|lunch|dip|smoothie|ijs/i

/**
 * Whether a course is a dinner. Most sites say "main course" in some
 * language; a page that names no course counts as one.
 */
export function isMainCourse(course: string | undefined): boolean {
  if (!course) return true
  if (
    /hoofd|main|dinner|diner|avondeten|plat principal|maaltijd/i.test(course)
  ) {
    return true
  }
  return !NOT_DINNER.test(course)
}

// ============================================================================
// Ingredient lines
// ============================================================================

const FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
}

const UNITS = [
  'kg',
  'g',
  'gr',
  'gram',
  'mg',
  'l',
  'liter',
  'dl',
  'cl',
  'ml',
  'el',
  'eetl.',
  'eetlepel',
  'eetlepels',
  'kl',
  'tl',
  'koffiel.',
  'koffielepel',
  'koffielepels',
  'theelepel',
  'theelepels',
  'snufje',
  'snuifje',
  'scheutje',
  'teen',
  'tenen',
  'teentje',
  'teentjes',
  'blaadje',
  'blaadjes',
  'takje',
  'takjes',
  'plantje',
  'bosje',
  'stuk',
  'stuks',
  'blik',
  'blikje',
  'pak',
  'pakje',
  'potje',
  'zakje',
  'cup',
  'cups',
  'tbsp',
  'tsp',
  'tablespoon',
  'tablespoons',
  'teaspoon',
  'teaspoons',
  'oz',
  'lb',
  'pinch',
  'clove',
  'cloves',
  'bunch',
  'can',
]
const UNIT_PATTERN = UNITS.map(u => u.replace('.', '\\.')).join('|')

function parseNumber(text: string): number | undefined {
  const trimmed = text.trim()
  if (FRACTIONS[trimmed] !== undefined) return FRACTIONS[trimmed]
  const mixed = /^(\d+)\s*([½¼¾⅓⅔⅛])$/.exec(trimmed)
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]!]!
  const fraction = /^(\d+)\/(\d+)$/.exec(trimmed)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  const n = Number(trimmed.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/**
 * "25 g borstfilets van braadkip (beenhouwerij)" →
 * { quantity: 25, unit: "g", name: "borstfilets van braadkip",
 *   note: "beenhouwerij" }. A quantity of 0 means the recipe gave none.
 */
export function parseIngredientLine(line: string): ParsedIngredient {
  const text = cleanText(line)
  let rest = text
  let quantity: number | undefined
  let unit: string | undefined

  const amount =
    /^(\d+\s*[½¼¾⅓⅔⅛]|[½¼¾⅓⅔⅛]|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*(?:-|–|à|tot)\s*\d+(?:[.,]\d+)?)?\s*/.exec(
      rest,
    )
  if (amount) {
    const n = parseNumber(amount[1]!)
    quantity = n && n > 0 ? n : undefined
    rest = rest.slice(amount[0].length)
  }
  const unitMatch = new RegExp(`^(${UNIT_PATTERN})(?=\\s|$)\\s*`, 'i').exec(
    rest,
  )
  if (unitMatch) {
    unit = unitMatch[1]!.toLowerCase()
    rest = rest.slice(unitMatch[0].length)
  }

  let note: string | undefined
  const bracket = /\s*\(([^)]*)\)\s*$/.exec(rest)
  if (bracket) {
    note = bracket[1]!.trim() || undefined
    rest = rest.slice(0, bracket.index)
  }
  const name = rest.replace(/^(?:of|de|het|een)\s+/i, '').trim() || text

  return { text, quantity, unit, name, note }
}

const GLYPHS: [number, string][] = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
]

/** 0.25 → "¼", 1.5 → "1½", 2.4 → "2,4": how a Dutch recipe writes it. */
export function formatQuantity(n: number): string {
  const whole = Math.floor(n)
  const fraction = n - whole
  if (fraction < 0.001) return String(whole)
  const glyph = GLYPHS.find(([value]) => Math.abs(value - fraction) < 0.01)
  if (glyph) return `${whole || ''}${glyph[1]}`
  return String(Math.round(n * 100) / 100).replace('.', ',')
}

// ============================================================================
// colruyt.be ingredient data
// ============================================================================

type ColruytIngredient = {
  id?: string
  quantity?: number
  unit?: { shortName?: string; name?: string }
  singular?: {
    ingredientText?: string
    unitText?: string
    ingredientId?: string
  }
  plural?: { ingredientText?: string; unitText?: string; ingredientId?: string }
}

/** The `data-ingredient-data` attribute colruyt.be puts on its recipe pages. */
function colruytIngredients(html: string): ParsedIngredient[] | null {
  const match = /data-ingredient-data="([^"]*)"/.exec(html)
  if (!match) return null
  let data: unknown
  try {
    data = JSON.parse(decodeEntities(match[1]!))
  } catch {
    return null
  }
  if (!Array.isArray(data)) return null
  return (data as ColruytIngredient[]).map(item => {
    const quantity =
      item.quantity && item.quantity > 0 ? item.quantity : undefined
    const form =
      (quantity !== undefined && quantity > 1 ? item.plural : item.singular) ??
      item.plural ??
      item.singular ??
      {}
    const unitText = form.unitText?.trim() || undefined
    const parsed = parseIngredientLine(form.ingredientText ?? '')
    return {
      text: [
        quantity === undefined ? '' : formatQuantity(quantity),
        unitText ?? '',
        form.ingredientText ?? '',
      ]
        .filter(Boolean)
        .join(' '),
      quantity,
      unit: unitText,
      name: parsed.name,
      note: parsed.note,
      sourceId: form.ingredientId,
    }
  })
}

// ============================================================================
// JSON-LD
// ============================================================================

type JsonObject = Record<string, unknown>

function isRecipe(node: unknown): node is JsonObject {
  if (!node || typeof node !== 'object') return false
  const type = (node as JsonObject)['@type']
  return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe'
}

/** Every JSON-LD `Recipe` on the page, including inside `@graph`. */
function jsonLdRecipes(html: string): JsonObject[] {
  const found: JsonObject[] = []
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    if (isRecipe(node)) found.push(node)
    const graph = (node as JsonObject)['@graph']
    if (graph) visit(graph)
  }
  const scripts =
    /<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = scripts.exec(html))) {
    try {
      visit(JSON.parse(match[1]!.trim()))
    } catch {
      // A broken block on the page; others may still hold the recipe.
    }
  }
  return found
}

function asText(value: unknown): string | undefined {
  if (typeof value === 'string') return cleanText(value) || undefined
  if (Array.isArray(value)) return asText(value[0])
  return undefined
}

function imageUrl(value: unknown): string | undefined {
  if (typeof value === 'string') return value || undefined
  if (Array.isArray(value)) return imageUrl(value[0])
  if (value && typeof value === 'object') {
    return imageUrl((value as JsonObject).url)
  }
  return undefined
}

function steps(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split(/\n+/).map(cleanText).filter(Boolean)
  }
  if (Array.isArray(value)) return value.flatMap(steps)
  if (value && typeof value === 'object') {
    const node = value as JsonObject
    if (node.itemListElement) return steps(node.itemListElement)
    return steps(node.text ?? node.name)
  }
  return []
}

/** Site bookkeeping that isn't a tag for anyone: colruyt.be's "te herschrijven". */
const HIDDEN_TAGS = /^te herschrijven$/i

function tags(recipe: JsonObject): string[] {
  const raw = [recipe.keywords, recipe.recipeCuisine, recipe.recipeCategory]
    .flatMap(value => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string')
    .flatMap(value => value.split(/[|,]/))
    .map(cleanText)
    .filter(tag => tag && !HIDDEN_TAGS.test(tag))
  const seen = new Set<string>()
  return raw.filter(tag => {
    const key = tag.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * The recipe on a page, or null when the page has no recipe data. Only a
 * recipe with a title and ingredients counts.
 */
export function extractRecipe(html: string): ParsedRecipe | null {
  const recipe = jsonLdRecipes(html)[0]
  if (!recipe) return null
  const title = asText(recipe.name)
  const lines = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient
    : Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : []
  const ingredients =
    colruytIngredients(html) ??
    lines
      .filter((line): line is string => typeof line === 'string')
      .map(parseIngredientLine)
      .filter(i => i.text)
  if (!title || ingredients.length === 0) return null

  const course = asText(recipe.recipeCategory)
  return {
    title,
    servings: parseServings(recipe.recipeYield),
    totalMinutes:
      parseDurationMinutes(recipe.totalTime) ??
      (() => {
        const prep = parseDurationMinutes(recipe.prepTime) ?? 0
        const cook = parseDurationMinutes(recipe.cookTime) ?? 0
        return prep + cook > 0 ? prep + cook : undefined
      })(),
    course,
    isMain: isMainCourse(course),
    ingredients,
    steps: steps(recipe.recipeInstructions),
    tags: tags(recipe),
    imageUrl: imageUrl(recipe.image),
  }
}

/**
 * The readable text of a page, for Claude when it has no recipe data:
 * scripts, styles and markup removed.
 */
export function pageText(html: string): string {
  return cleanText(
    html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<(br|p|li|h\d|div)[^>]*>/gi, '\n'),
  )
}

// ============================================================================
// robots.txt
// ============================================================================

export type RobotsRules = { disallow: string[]; crawlDelaySeconds?: number }

/** The rules robots.txt gives every crawler (`User-agent: *`). */
export function parseRobots(text: string): RobotsRules {
  const rules: RobotsRules = { disallow: [] }
  let applies = false
  let inGroup = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    if (key === 'user-agent') {
      if (!inGroup) applies = false
      inGroup = true
      if (value === '*') applies = true
      continue
    }
    inGroup = false
    if (!applies) continue
    if (key === 'disallow' && value) rules.disallow.push(value)
    if (key === 'crawl-delay') {
      const delay = Number(value)
      if (delay > 0) rules.crawlDelaySeconds = delay
    }
  }
  return rules
}

/** Whether robots.txt lets crawlers read this path ("*" and "$" supported). */
export function robotsAllows(rules: RobotsRules, path: string): boolean {
  return !rules.disallow.some(pattern => {
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/[.+?^${}()|[\]\\]/g, c => (c === '$' ? c : `\\${c}`))
          .replace(/\*/g, '.*'),
    )
    return regex.test(path)
  })
}
