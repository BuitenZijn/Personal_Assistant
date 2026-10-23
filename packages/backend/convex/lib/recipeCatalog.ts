/**
 * The recipe catalog: every recipe page of a site, by name, from its
 * sitemap (see docs/PLAN.md, Phase 4). Suggestions pick candidates from the
 * names, so only those pages are read.
 */

import { parseRobots, robotsAllows } from './recipeParse'

export type CatalogEntry = { url: string; name: string }

export type CatalogSite = {
  host: string
  robotsUrl: string
  sitemapUrl: string
  /** Which sitemap addresses are recipe pages. */
  recipePage: RegExp
}

/** For now the one site we plan from. */
export const COLRUYT: CatalogSite = {
  host: 'colruyt.be',
  robotsUrl: 'https://www.colruyt.be/robots.txt',
  sitemapUrl: 'https://www.colruyt.be/nl/sitemap.recipes.xml',
  recipePage: /^https:\/\/www\.colruyt\.be\/nl\/recepten\/[^/?#]+$/,
}

/** Seconds between page reads: colruyt.be's robots.txt asks for 5. */
export const READ_DELAY_SECONDS = 5

/**
 * A page address's last part as a name: ".../gnocchi-met-aubergine-en-kip"
 * → "gnocchi met aubergine en kip". A trailing "-0" (a second version of a
 * recipe) is dropped.
 */
export function nameFromUrl(url: string): string {
  const slug = decodeURIComponent(url.split('/').pop() ?? '')
  return slug.replace(/-\d+$/, '').replace(/-/g, ' ').trim()
}

/**
 * Names that are plainly not a dinner (Dutch): desserts and baking, drinks,
 * soups, breakfast, snacks and baby food. Claude is told to skip these too;
 * leaving them out first keeps the list it reads short. Most words may end
 * a compound ("chocolademousse", "kerstcake"); "koek" may not, as
 * "pannenkoeken" can be a dinner, and "taart" isn't here at all, as
 * "preitaart" is.
 */
const NOT_DINNER = new RegExp(
  `\\b(${[
    '\\w*cakes?',
    '\\w*brownies?',
    '\\w*muffins?',
    'koek\\w*',
    '\\w*koekjes?',
    'peperkoek',
    'speculaas\\w*',
    '\\w*wafels?',
    '\\w*desserts?',
    '\\w*mousse',
    '\\w*tiramisu',
    '\\w*pudding',
    'panna cotta',
    '\\w*crumble',
    '\\w*ijs',
    '\\w*ijsjes?',
    '\\w*sorbet',
    '\\w*bavarois',
    '\\w*macarons?',
    '\\w*pralines?',
    '\\w*bonbons?',
    '\\w*confituur',
    '\\w*jam',
    '\\w*smoothies?',
    '\\w*cocktails?',
    '\\w*mocktails?',
    '\\w*limonade',
    'sangria',
    '\\w*punch',
    '\\w*milkshakes?',
    '\\w*soep',
    'velout\\w*',
    'gazpacho',
    'ontbijt\\w*',
    '\\w*granola',
    '\\w*muesli',
    'porridge',
    'havermout\\w*',
    '\\w*hapjes?',
    'aperitief\\w*',
    '\\w*dips?',
    'baby\\w*',
    'peuter\\w*',
  ].join('|')})\\b`,
  'i',
)

/** Whether a recipe's name could be a dinner. */
export function couldBeDinner(name: string): boolean {
  return !NOT_DINNER.test(name)
}

/**
 * At most `max` entries, chosen at random but the same for the same `seed`
 * (so a retry in the same run sends the same, cached, list), in their
 * original order.
 */
export function sampleEntries<T>(entries: T[], max: number, seed: string): T[] {
  if (entries.length <= max) return entries
  // mulberry32, seeded from the seed's FNV-1a hash.
  let state = 2166136261
  for (const char of seed) {
    state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  }
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const indexes = entries.map((_, i) => i)
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[indexes[i], indexes[j]] = [indexes[j]!, indexes[i]!]
  }
  return indexes
    .slice(0, max)
    .sort((a, b) => a - b)
    .map(i => entries[i]!)
}

/** The recipe pages in a sitemap that robots.txt lets us read. */
export function catalogFromSitemap(
  site: CatalogSite,
  sitemapXml: string,
  robotsTxt: string,
): CatalogEntry[] {
  const robots = parseRobots(robotsTxt)
  const seen = new Set<string>()
  const entries: CatalogEntry[] = []
  for (const match of sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const url = match[1]!.replace(/&amp;/g, '&')
    if (seen.has(url) || !site.recipePage.test(url)) continue
    if (!robotsAllows(robots, new URL(url).pathname)) continue
    seen.add(url)
    entries.push({ url, name: nameFromUrl(url) })
  }
  return entries
}
