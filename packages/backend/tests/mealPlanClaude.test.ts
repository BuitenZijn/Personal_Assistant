import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const parse = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { parse }
  },
}))

const { pickByName } = await import('../convex/lib/mealPlanClaude')

const NAMES = Array.from({ length: 50 }, (_, i) => `recept ${i}`)
const USAGE = { input_tokens: 1_000_000, output_tokens: 0 }

function answer(numbers: number[]) {
  return {
    usage: USAGE,
    parsed_output: { picks: numbers.map(number => ({ number, why: '' })) },
  }
}

describe('pickByName', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test')
    parse.mockReset()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('asks for the rest when Claude picks too few', async () => {
    parse
      .mockResolvedValueOnce(answer([7]))
      .mockResolvedValueOnce(answer([7, 8, 99, 9]))
      .mockResolvedValueOnce(answer([]))

    const result = await pickByName(NAMES, 'profile', [], 4)

    // Repeats and numbers outside the list are left out.
    expect(result.picks).toEqual([7, 8, 9])
    expect(parse).toHaveBeenCalledTimes(3)
    const second = parse.mock.calls[1]![0].messages[0].content as string
    expect(second).toContain("Already picked, don't pick these again: 7.")
    expect(second).toContain('Pick exactly 3 different recipes.')
    // Three calls, each 1M uncached input tokens at $0.50 (long prompt).
    expect(result.costUsd).toBeCloseTo(3 * 0.5)
  })

  it('stops once it has enough', async () => {
    parse.mockResolvedValueOnce(answer([1, 2, 3, 4, 5]))
    const result = await pickByName(NAMES, 'profile', [], 4)
    expect(result.picks).toEqual([1, 2, 3, 4])
    expect(parse).toHaveBeenCalledTimes(1)
  })
})
