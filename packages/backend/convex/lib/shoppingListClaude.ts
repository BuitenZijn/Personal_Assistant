/**
 * Claude's part in the shopping list (see docs/PLAN.md, Phase 5): matching
 * the week's ingredients to products the household has bought before.
 * Claude only returns numbers from the lists it is given, so it can't invent
 * a product.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { MODEL, claudeClient } from './claude'
import { describeUsage } from './claudeCost'
import { describeNeed, type IngredientNeed } from './shoppingList'

const INSTRUCTIONS = `You turn a Belgian household's dinner ingredients for the week into a shopping list of products they have bought before at Colruyt. Ingredients are in Dutch.

Product names are as printed on Colruyt receipts: abbreviated, in capitals, often with the size ("BONI GEHAKT 300G"). Products marked "per kg" are sold by weight.

For every ingredient:
- pantry: true for basics almost every kitchen has (zout, peper, olie, olijfolie, water, suiker, bloem or azijn in small amounts, dried herbs and spices). Then product is null.
- Otherwise product: the number of the product that is the best fit, or null when none of them is a reasonable fit. Don't force a match: "verse koriander" is not "PETERSELIE".
- quantity: how much of that product to buy to cover the amount. For products sold per kg, in kg (e.g. 0.6); for others, the number of packs or pieces, at least 1 (600 g gehakt with "BONI GEHAKT 300G" is 2). Null without a product.

Only use numbers from the lists.`

const Matches = z.object({
  items: z.array(
    z.object({
      ingredient: z.number().int(),
      pantry: z.boolean(),
      product: z.number().int().nullable(),
      quantity: z.number().nullable(),
    }),
  ),
})

export type ProductOption = {
  name: string
  soldByWeight: boolean
  timesBought: number
}

export type IngredientMatch =
  | { kind: 'pantry' }
  | { kind: 'product'; product: number; quantity: number }
  | { kind: 'none' }

/** For each need (by index), what to buy for it, and what the call cost. */
export async function matchProducts(
  needs: IngredientNeed[],
  products: ProductOption[],
): Promise<{ matches: IngredientMatch[]; costUsd: number }> {
  const ingredientList = needs
    .map((need, i) => `[${i}] ${describeNeed(need)}`)
    .join('\n')
  const productList = products
    .map(
      (p, i) =>
        `[${i}] ${p.name}${p.soldByWeight ? ' (per kg)' : ''} · bought ${p.timesBought}×`,
    )
    .join('\n')
  const response = await claudeClient('Shopping lists').messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low', format: zodOutputFormat(Matches) },
    system: INSTRUCTIONS,
    messages: [
      {
        role: 'user',
        content: `<products>\n${productList}\n</products>\n\n<ingredients>\n${ingredientList}\n</ingredients>`,
      },
    ],
  })
  const costUsd = describeUsage('Matching products', response.usage)

  const matches: IngredientMatch[] = needs.map(() => ({ kind: 'none' }))
  const seen = new Set<number>()
  for (const item of response.parsed_output?.items ?? []) {
    const i = item.ingredient
    if (i < 0 || i >= needs.length || seen.has(i)) continue
    seen.add(i)
    const product = products[item.product ?? -1]
    if (item.pantry) {
      matches[i] = { kind: 'pantry' }
    } else if (product && item.quantity && item.quantity > 0) {
      matches[i] = {
        kind: 'product',
        product: item.product!,
        quantity: product.soldByWeight
          ? Math.round(item.quantity * 100) / 100
          : Math.max(1, Math.round(item.quantity)),
      }
    }
  }
  return { matches, costUsd }
}
