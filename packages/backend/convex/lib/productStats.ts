/**
 * What a household buys of one product, from its receipt lines: how often,
 * how much, and how long between purchases ("you buy this every 2 weeks").
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type PurchaseLine = {
  /** YYYY-MM-DD */
  date: string
  quantity: number
  amountCents: number
}

export type PurchaseStats = {
  timesBought: number
  totalQuantity: number
  totalSpentCents: number
  firstBoughtOn: string
  lastBoughtOn: string
  averageIntervalDays?: number
  averageQuantity: number
  lastUnitPriceCents?: number
}

function daysBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / DAY_MS
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Stats over a product's lines, or null when it was never actually bought.
 * A purchase is a day with a positive quantity: two receipts on one day
 * count once. Lines with no quantity (returns, card scans) are left out.
 */
export function purchaseStats(lines: PurchaseLine[]): PurchaseStats | null {
  const byDate = new Map<string, { quantity: number; amountCents: number }>()
  for (const line of lines) {
    if (line.quantity <= 0) continue
    const day = byDate.get(line.date) ?? { quantity: 0, amountCents: 0 }
    day.quantity += line.quantity
    day.amountCents += line.amountCents
    byDate.set(line.date, day)
  }
  if (byDate.size === 0) return null

  const dates = [...byDate.keys()].sort()
  const firstBoughtOn = dates[0]!
  const lastBoughtOn = dates[dates.length - 1]!
  const days = [...byDate.values()]
  const totalQuantity = days.reduce((sum, d) => sum + d.quantity, 0)
  const totalSpentCents = days.reduce((sum, d) => sum + d.amountCents, 0)
  const last = byDate.get(lastBoughtOn)!

  return {
    timesBought: dates.length,
    totalQuantity: round(totalQuantity, 3),
    totalSpentCents,
    firstBoughtOn,
    lastBoughtOn,
    averageIntervalDays:
      dates.length < 2
        ? undefined
        : round(
            daysBetween(firstBoughtOn, lastBoughtOn) / (dates.length - 1),
            1,
          ),
    averageQuantity: round(totalQuantity / dates.length, 3),
    lastUnitPriceCents:
      last.amountCents > 0
        ? Math.round(last.amountCents / last.quantity)
        : undefined,
  }
}
