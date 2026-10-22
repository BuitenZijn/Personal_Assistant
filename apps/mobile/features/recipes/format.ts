/** "45 min", "1 h", "1 h 10 min" */
export function cookingTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

/** "70 min · 4 people", or whichever of the two the recipe has. */
export function recipeMeta(
  totalMinutes: number | null | undefined,
  servings: number | null | undefined,
): string {
  return [
    totalMinutes ? cookingTime(totalMinutes) : null,
    servings ? `${servings} ${servings === 1 ? 'person' : 'people'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Whether a title has every word of the search, ignoring case and accents. */
export function matchesSearch(title: string, search: string): boolean {
  const fold = (text: string) =>
    text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const haystack = fold(title)
  return fold(search)
    .split(/\s+/)
    .filter(Boolean)
    .every(word => haystack.includes(word))
}
