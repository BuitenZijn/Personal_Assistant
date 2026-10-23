/**
 * Claude's two parts in suggesting dinners (see docs/PLAN.md, Phase 4):
 * picking likely dinners from the recipe names, and, once those pages are
 * read, choosing the ones that suit the household. Claude only ever returns
 * numbers from the lists it is given, so it can't invent a recipe.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { Doc } from '../_generated/dataModel'
import { MODEL, claudeClient } from './claude'
import { describeUsage } from './claudeCost'

export { ClaudeUnavailableError as SuggestionsUnavailableError } from './claude'

const client = () => claudeClient('Dinner suggestions')

// ============================================================================
// The household, in words
// ============================================================================

const DIETS: Record<Doc<'households'>['people'][number]['diet'], string> = {
  everything: 'eats everything',
  pescatarian: 'pescatarian (fish, no meat)',
  vegetarian: 'vegetarian',
  vegan: 'vegan',
}

/** Everything about the household a dinner has to suit, as plain text. */
export function householdProfile(
  household: Doc<'households'>,
  usuallyBought: string[],
): string {
  const people = household.people.length
    ? household.people.map(p => {
        const parts = [
          p.age === undefined ? null : `age ${p.age}`,
          DIETS[p.diet],
          p.allergies.length ? `ALLERGIC to ${p.allergies.join(', ')}` : null,
          p.dislikes.length ? `dislikes ${p.dislikes.join(', ')}` : null,
        ].filter(Boolean)
        return `- ${p.name}: ${parts.join('; ')}`
      })
    : ['- (no people entered; assume 2 adults who eat everything)']
  const lines = [
    'People we cook for:',
    ...people,
    `Cooking time: at most ${household.cookingMinutes.weekday} minutes on weekdays, ${household.cookingMinutes.weekend} minutes at the weekend.`,
    household.cuisines.length
      ? `Cuisines they like: ${household.cuisines.join(', ')}.`
      : 'Cuisines: anything.',
    household.lessMeat
      ? 'They want to eat less meat: prefer vegetarian and fish dishes.'
      : null,
    household.budgetPerWeekCents === undefined
      ? null
      : `Weekly grocery budget: € ${Math.round(household.budgetPerWeekCents / 100)}; prefer affordable ingredients.`,
    usuallyBought.length
      ? `Products they often buy (a light hint, not a rule): ${usuallyBought.join(', ')}.`
      : null,
  ]
  return lines.filter(Boolean).join('\n')
}

// ============================================================================
// Step 1: likely dinners by name
// ============================================================================

const PICK_INSTRUCTIONS = `You help a Belgian household plan its dinners from Belgian recipe sites. Recipe names are Dutch.

You get a numbered list of all recipe names, then the household. Pick recipes that are likely to be a good dinner (a main course) for this household:
- Only main courses: no desserts, cakes, breakfasts, snacks, drinks, sauces, dips, soups, side dishes, baby or toddler food.
- Leave out names that obviously clash with someone's allergies or diet, or their dislikes.
- Prefer variety: different proteins, cuisines and kinds of dish.
- Only use numbers from the list.`

const Picks = z.object({
  picks: z
    .array(
      z.object({
        number: z.number().int(),
        why: z.string().describe('A few words on why it fits.'),
      }),
    )
    .describe('Best first.'),
})

/** Calls to get the picks asked for, when Claude returns too few. */
const PICK_ATTEMPTS = 3

/**
 * Indexes into `names` of `count` likely dinners, and what the calls cost.
 * The names list is cached for the few minutes a run's calls take. Claude
 * sometimes returns far fewer than asked for; then it is asked for the rest.
 */
export async function pickByName(
  names: string[],
  profile: string,
  avoid: string[],
  count: number,
): Promise<{ picks: number[]; costUsd: number }> {
  const list = names.map((name, i) => `${i} ${name}`).join('\n')
  const picked: number[] = []
  let costUsd = 0
  for (
    let attempt = 1;
    attempt <= PICK_ATTEMPTS && picked.length < count;
    attempt++
  ) {
    const missing = count - picked.length
    const response = await client().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'low', format: zodOutputFormat(Picks) },
      system: [
        { type: 'text', text: PICK_INSTRUCTIONS },
        {
          type: 'text',
          text: `<recipes>\n${list}\n</recipes>`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            `<household>\n${profile}\n</household>`,
            avoid.length
              ? `Don't pick these, they had them recently or turned them down:\n${avoid.join('\n')}`
              : '',
            picked.length
              ? `Already picked, don't pick these again: ${picked.join(', ')}.`
              : '',
            `Pick exactly ${missing} different recipes.`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
    })
    costUsd += describeUsage('Picking by name', response.usage)
    for (const { number } of response.parsed_output?.picks ?? []) {
      if (number >= 0 && number < names.length && !picked.includes(number)) {
        picked.push(number)
      }
    }
    console.log(
      `Picking by name, attempt ${attempt}: ${picked.length} of ${count}`,
    )
  }
  return { picks: picked.slice(0, count), costUsd }
}

// ============================================================================
// Step 3: the dinners that suit them
// ============================================================================

const CHOOSE_INSTRUCTIONS = `You choose dinners for a Belgian household from recipes that were read from Belgian recipe sites. Recipes and ingredients are in Dutch.

A recipe can only be suggested if:
- None of its ingredients contain anything a person is allergic to. Think about what Dutch ingredient names are made of (e.g. "pindakaas" contains peanuts, "pesto" usually nuts and cheese, "bloem" gluten).
- It suits the diet of every person (a vegetarian eats no meat or fish, a vegan no animal products, a pescatarian no meat).
- Its time fits: weekday dinners within the weekday cooking time; a few may take up to the weekend time. A recipe without a time is fine if it looks quick enough.
Then prefer what they like, variety, and their other preferences.

Write each reason in English, one short friendly sentence that says why it suits them (e.g. "Quick and vegetarian, with the spinach you often buy."). If fewer recipes suit them than asked for, say why in one sentence in "note"; otherwise note is null. Only use numbers from the list.`

const Choice = z.object({
  suggestions: z
    .array(z.object({ number: z.number().int(), reason: z.string() }))
    .describe('Only recipes that suit them, best first.'),
  note: z.string().nullable(),
})

export type RecipeForChoice = {
  title: string
  totalMinutes?: number
  servings?: number
  tags: string[]
  ingredients: string[]
}

/** The recipes (as indexes) that suit the household, best first. */
export async function chooseSuggestions(
  recipes: RecipeForChoice[],
  profile: string,
  count: number,
): Promise<{
  chosen: { index: number; reason: string }[]
  note: string | null
  costUsd: number
}> {
  const list = recipes
    .map((r, i) =>
      [
        `[${i}] ${r.title}`,
        r.totalMinutes ? `time: ${r.totalMinutes} min` : 'time: unknown',
        r.tags.length ? `tags: ${r.tags.join(', ')}` : null,
        `ingredients: ${r.ingredients.join('; ')}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: zodOutputFormat(Choice) },
    system: CHOOSE_INSTRUCTIONS,
    messages: [
      {
        role: 'user',
        content: `<household>\n${profile}\n</household>\n\n<recipes>\n${list}\n</recipes>\n\nChoose up to ${count} that suit them, plus any others that suit them after those (best first).`,
      },
    ],
  })
  const costUsd = describeUsage('Choosing suggestions', response.usage)
  const output = response.parsed_output
  const seen = new Set<number>()
  const chosen = (output?.suggestions ?? []).filter(s => {
    if (s.number < 0 || s.number >= recipes.length || seen.has(s.number)) {
      return false
    }
    seen.add(s.number)
    return true
  })
  return {
    chosen: chosen.map(s => ({ index: s.number, reason: s.reason.trim() })),
    note: output?.note?.trim() || null,
    costUsd,
  }
}
