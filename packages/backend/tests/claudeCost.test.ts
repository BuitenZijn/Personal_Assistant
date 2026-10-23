import { describe, expect, it } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { claudeCostUsd } from '../convex/lib/claudeCost'

function usage(fields: Partial<Anthropic.Usage>): Anthropic.Usage {
  return {
    cache_creation: null,
    cache_creation_input_tokens: null,
    cache_read_input_tokens: null,
    inference_geo: null,
    input_tokens: 0,
    output_tokens: 0,
    output_tokens_details: null,
    server_tool_use: null,
    service_tier: null,
    speed: null,
    ...fields,
  }
}

describe('claudeCostUsd', () => {
  it('prices cache reads at a tenth of the input price', () => {
    const cost = claudeCostUsd(
      usage({
        input_tokens: 1_000,
        cache_read_input_tokens: 80_000,
        output_tokens: 2_000,
      }),
    )
    // (1,000 + 8,000) × $0.10 + 2,000 × $0.50, per million.
    expect(cost).toBeCloseTo(0.0019, 6)
  })

  it('uses the higher rates for a prompt over 100K tokens', () => {
    const cost = claudeCostUsd(
      usage({
        input_tokens: 5_000,
        cache_creation_input_tokens: 100_000,
        cache_creation: {
          ephemeral_1h_input_tokens: 100_000,
          ephemeral_5m_input_tokens: 0,
        },
        output_tokens: 1_000,
      }),
    )
    // (5,000 + 2 × 100,000) × $0.50 + 1,000 × $2.50, per million.
    expect(cost).toBeCloseTo(0.105, 6)
  })
})
