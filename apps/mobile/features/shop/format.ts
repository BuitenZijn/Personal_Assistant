/** "0,5 kg" or "3×" for a product; "200 g" for an ingredient; "" without. */
export function lineQuantity(line: {
  productId?: string
  quantity?: number
  unit?: string
  soldByWeight: boolean
}): string {
  if (line.quantity === undefined) return ''
  const n = String(Math.round(line.quantity * 100) / 100).replace('.', ',')
  if (!line.productId) return [n, line.unit].filter(Boolean).join(' ')
  return line.soldByWeight ? `${n} kg` : `${n}×`
}

/** One step on the − + buttons: 100 g by weight, one piece otherwise. */
export function quantityStep(soldByWeight: boolean): number {
  return soldByWeight ? 0.1 : 1
}

/** The quantity one step up or down, never below one step. */
export function stepQuantity(
  quantity: number,
  soldByWeight: boolean,
  direction: 1 | -1,
): number {
  const step = quantityStep(soldByWeight)
  const next = Math.round((quantity + direction * step) * 100) / 100
  return Math.max(step, next)
}

/** "Lasagne, Chili" from "300 g gehakt (Lasagne)", "300 g gehakt (Chili)". */
export function recipeTitles(covers: string[]): string {
  const titles = covers
    .map(c => /\(([^()]+)\)$/.exec(c)?.[1])
    .filter((t): t is string => !!t)
  return [...new Set(titles)].join(', ')
}

/** "12 products", "1 product" */
export function products(n: number): string {
  return n === 1 ? '1 product' : `${n} products`
}

/** The webshops the list will be ordered from (later; see docs/PLAN.md). */
export const WEBSHOPS = [
  { value: 'collect-and-go', label: 'Collect&Go' },
  { value: 'delhaize', label: 'Delhaize' },
  { value: 'albert-heijn', label: 'Albert Heijn' },
] as const

export type Webshop = (typeof WEBSHOPS)[number]['value']
