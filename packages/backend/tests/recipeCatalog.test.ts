import { describe, expect, it } from 'vitest'
import { couldBeDinner, sampleEntries } from '../convex/lib/recipeCatalog'

describe('couldBeDinner', () => {
  it.each([
    'gnocchi met aubergine en kip',
    'preitaart met geitenkaas',
    'soepvlees met wortelen',
    'rijst met groenten',
    'pannenkoeken met spinazie',
  ])('keeps "%s"', name => {
    expect(couldBeDinner(name)).toBe(true)
  })

  it.each([
    'chocolademousse met frambozen',
    'tomatensoep met balletjes',
    'velouté van bloemkool',
    'smoothie met mango',
    'ontbijtgranola met noten',
    'kerstcake',
    'babypuree met wortel',
    'hapjes met zalm',
  ])('leaves out "%s"', name => {
    expect(couldBeDinner(name)).toBe(false)
  })
})

describe('sampleEntries', () => {
  const entries = Array.from({ length: 100 }, (_, i) => i)

  it('keeps a short list as it is', () => {
    expect(sampleEntries(entries, 200, 'seed')).toBe(entries)
  })

  it('takes the same entries for the same seed, in order', () => {
    const first = sampleEntries(entries, 10, 'plan:1')
    expect(first).toHaveLength(10)
    expect(sampleEntries(entries, 10, 'plan:1')).toEqual(first)
    expect([...first].sort((a, b) => a - b)).toEqual(first)
    expect(new Set(first).size).toBe(10)
  })

  it('takes other entries for another run', () => {
    expect(sampleEntries(entries, 10, 'plan:2')).not.toEqual(
      sampleEntries(entries, 10, 'plan:1'),
    )
  })
})
