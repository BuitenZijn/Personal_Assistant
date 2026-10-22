/** Fetching recipe pages politely (see docs/PLAN.md, Phase 3). */

/** Who we say we are to the sites we read. */
export const USER_AGENT =
  'PersonalAssistantRecipes/1.0 (household dinner planner; reads one page at a time)'

const FETCH_TIMEOUT_MS = 30_000

/**
 * A page's text. Throws on a network error, a timeout or a status that
 * isn't 2xx, with a message saying which.
 */
export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error) {
    if (controller.signal.aborted) throw new Error('timed out')
    throw error
  } finally {
    clearTimeout(timer)
  }
}
