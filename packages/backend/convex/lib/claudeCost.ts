/**
 * What a Claude call cost, from the token counts in its response. Prices
 * are Claude Haiku 5.5's list prices in US dollars per million tokens; a
 * prompt over 100K tokens is billed at the higher rates.
 */

import type Anthropic from '@anthropic-ai/sdk'

const LONG_PROMPT_TOKENS = 100_000

const HAIKU = {
  short: { input: 0.1, output: 0.5 },
  long: { input: 0.5, output: 2.5 },
}
/** Cache reads and writes, as a share of the input price. */
const CACHE_READ = 0.1
const CACHE_WRITE_5M = 1.25
const CACHE_WRITE_1H = 2

export function claudeCostUsd(usage: Anthropic.Usage): number {
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const written = usage.cache_creation_input_tokens ?? 0
  const written1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0
  const written5m = usage.cache_creation
    ? usage.cache_creation.ephemeral_5m_input_tokens
    : written
  const prompt = usage.input_tokens + cacheRead + written
  const price = prompt > LONG_PROMPT_TOKENS ? HAIKU.long : HAIKU.short
  const inputEquivalent =
    usage.input_tokens +
    cacheRead * CACHE_READ +
    written5m * CACHE_WRITE_5M +
    written1h * CACHE_WRITE_1H
  return (
    (inputEquivalent * price.input + usage.output_tokens * price.output) /
    1_000_000
  )
}

/** The cost, and the tokens behind it for the logs. */
export function describeUsage(label: string, usage: Anthropic.Usage): number {
  const cost = claudeCostUsd(usage)
  console.log(
    `${label}: $${cost.toFixed(4)} (input ${usage.input_tokens}, cache read ${usage.cache_read_input_tokens ?? 0}, cache write ${usage.cache_creation_input_tokens ?? 0}, output ${usage.output_tokens})`,
  )
  return cost
}
