/**
 * Turning what people type in the household forms into what the backend
 * takes, and back. The backend checks the ranges; these only parse.
 */

export type Diet = 'everything' | 'pescatarian' | 'vegetarian' | 'vegan'

export const DIET_OPTIONS: { value: Diet; label: string }[] = [
  { value: 'everything', label: 'Everything' },
  { value: 'pescatarian', label: 'Fish' },
  { value: 'vegetarian', label: 'Veggie' },
  { value: 'vegan', label: 'Vegan' },
]

/** How a diet reads in a sentence: "Eats everything", "Vegetarian". */
export function dietLabel(diet: Diet): string {
  switch (diet) {
    case 'everything':
      return 'Eats everything'
    case 'pescatarian':
      return 'Pescatarian'
    case 'vegetarian':
      return 'Vegetarian'
    case 'vegan':
      return 'Vegan'
  }
}

/** "nuts, milk , ,fish" → ["nuts", "milk", "fish"] */
export function splitList(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

export function joinList(items: readonly string[]): string {
  return items.join(', ')
}

/** A whole number typed in a field, or null when empty or not a number. */
export function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  return Number(trimmed)
}

/**
 * Euros typed the Belgian or English way ("120", "120,50", "€ 1.200,5",
 * "120.50") in cents, or null when it isn't an amount.
 */
export function parseEuroCents(text: string): number | null {
  let value = text.replace(/[€\s]/g, '')
  if (!value) return null
  // A comma is the decimal sign; dots before it group thousands.
  if (value.includes(',')) {
    value = value.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, '')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null
  return Math.round(Number(value) * 100)
}

/** Cents as an editable amount: 12050 → "120,50", 12000 → "120". */
export function centsToInput(cents: number): string {
  const whole = Math.floor(cents / 100)
  const fraction = cents % 100
  return fraction === 0
    ? String(whole)
    : `${whole},${String(fraction).padStart(2, '0')}`
}
