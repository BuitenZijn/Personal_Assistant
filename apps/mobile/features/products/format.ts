import { formatEuro } from '@pa/shared'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * A receipt name in sentence case: "BONI GER. EM.LIGHT 250G" →
 * "Boni ger. em.light 250g". Receipts shout and abbreviate; this at least
 * stops the shouting.
 */
export function productName(receiptName: string): string {
  const lower = receiptName.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** "2026-03-26" → "26 Mar", with the year when it isn't `currentYear`. */
export function shortDate(date: string, currentYear: number): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  const label = `${day} ${MONTHS[month - 1]}`
  return year === currentYear ? label : `${label} ${year}`
}

/** "2 Jan – 28 Sep 2026", or one date when both are the same. */
export function dateRange(first: string, last: string): string {
  const firstYear = Number(first.slice(0, 4))
  const lastYear = Number(last.slice(0, 4))
  if (first === last) return shortDate(first, NaN)
  return `${shortDate(first, firstYear === lastYear ? firstYear : NaN)} – ${shortDate(last, NaN)}`
}

/** How often, in the unit that reads best: "every 5 days", "every 2 weeks". */
export function interval(days: number): string {
  if (days < 10) {
    const n = Math.max(1, Math.round(days))
    return n === 1 ? 'every day' : `every ${n} days`
  }
  if (days < 60) {
    const n = Math.round(days / 7)
    return n === 1 ? 'every week' : `every ${n} weeks`
  }
  const n = Math.round(days / 30)
  return n === 1 ? 'every month' : `every ${n} months`
}

/** "€ 1,89/kg" for products sold by weight, "€ 4,60" for the rest. */
export function unitPrice(cents: number, soldByWeight: boolean): string {
  return `${formatEuro(cents / 100)}${soldByWeight ? '/kg' : ''}`
}

export function timesBought(n: number): string {
  return n === 1 ? 'Bought once' : `Bought ${n} times`
}
