/**
 * The Claude client every feature uses. Calls happen in Convex actions with
 * the key in the deployment's environment, never in the app.
 */

import Anthropic from '@anthropic-ai/sdk'

/** Cheap enough to run on every plan (see the plan's LLM decision). */
export const MODEL = 'claude-haiku-5-5'

/** Thrown when the deployment has no Anthropic key; its message is for people. */
export class ClaudeUnavailableError extends Error {}

/** A client, or a `ClaudeUnavailableError` saying what `feature` needs. */
export function claudeClient(feature: string): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ClaudeUnavailableError(
      `${feature} need an Anthropic API key on the server (ANTHROPIC_API_KEY).`,
    )
  }
  return new Anthropic()
}
