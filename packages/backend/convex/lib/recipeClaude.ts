/**
 * Reading a recipe with Claude, for pages without recipe data (see
 * docs/PLAN.md, Phase 3). Only runs when the deployment has an
 * ANTHROPIC_API_KEY. Claude copies what the page says; it never writes a
 * recipe of its own, and answers "not found" for a page without one.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import {
  isMainCourse,
  pageText,
  parseIngredientLine,
  type ParsedRecipe,
} from './recipeParse'

/** Cheap and good enough for copying a recipe out of a page (see the plan). */
const MODEL = 'claude-haiku-5-5'

/** Far more than a recipe page's text; only pages full of other text get cut. */
const MAX_PAGE_CHARS = 150_000

const RecipeOnPage = z.object({
  found: z
    .boolean()
    .describe('Whether the page contains a recipe with ingredients.'),
  title: z.string(),
  servings: z.number().int().nullable(),
  totalMinutes: z.number().int().nullable(),
  course: z
    .string()
    .nullable()
    .describe('The course as the page names it, e.g. "Main course".'),
  ingredients: z
    .array(z.string())
    .describe('Each ingredient line exactly as written, with its amount.'),
  steps: z.array(z.string()),
})

export function claudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/** The recipe in a page's text, or null when Claude finds none. */
export async function extractWithClaude(
  html: string,
  url: string,
): Promise<ParsedRecipe | null> {
  const text = pageText(html).slice(0, MAX_PAGE_CHARS)
  const client = new Anthropic()
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: 'low',
      format: zodOutputFormat(RecipeOnPage),
    },
    system:
      'You copy recipes out of web pages. Use only what the page says: never invent, complete or translate a recipe. Keep its language. If the page has no recipe with ingredients, set found to false.',
    messages: [
      {
        role: 'user',
        content: `Page: ${url}\n\n<page>\n${text}\n</page>`,
      },
    ],
  })

  const recipe = response.parsed_output
  if (response.stop_reason !== 'end_turn' || !recipe?.found) return null
  const ingredients = recipe.ingredients
    .map(parseIngredientLine)
    .filter(i => i.text)
  if (!recipe.title.trim() || ingredients.length === 0) return null

  const course = recipe.course?.trim() || undefined
  return {
    title: recipe.title.trim(),
    servings:
      recipe.servings && recipe.servings > 0 ? recipe.servings : undefined,
    totalMinutes:
      recipe.totalMinutes && recipe.totalMinutes > 0
        ? recipe.totalMinutes
        : undefined,
    course,
    isMain: isMainCourse(course),
    ingredients,
    steps: recipe.steps.map(s => s.trim()).filter(Boolean),
    tags: [],
  }
}
