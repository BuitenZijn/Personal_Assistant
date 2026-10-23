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
