import {
  centsToInput,
  parseEuroCents,
  parseWholeNumber,
  splitList,
} from '../form'

describe('household form parsing', () => {
  it('splits a typed list', () => {
    expect(splitList('nuts, milk , ,fish\nshrimp')).toEqual([
      'nuts',
      'milk',
      'fish',
      'shrimp',
    ])
    expect(splitList('  ')).toEqual([])
  })

  it('reads whole numbers only', () => {
    expect(parseWholeNumber(' 30 ')).toBe(30)
    expect(parseWholeNumber('')).toBeNull()
    expect(parseWholeNumber('3.5')).toBeNull()
    expect(parseWholeNumber('-2')).toBeNull()
  })

  it('reads euros typed either way', () => {
    expect(parseEuroCents('120')).toBe(12000)
    expect(parseEuroCents('120,5')).toBe(12050)
    expect(parseEuroCents('€ 1.200,50')).toBe(120050)
    expect(parseEuroCents('1.200')).toBe(120000)
    expect(parseEuroCents('120.50')).toBe(12050)
    expect(parseEuroCents('')).toBeNull()
    expect(parseEuroCents('lots')).toBeNull()
  })

  it('writes cents back as an amount to edit', () => {
    expect(centsToInput(12000)).toBe('120')
    expect(centsToInput(12050)).toBe('120,50')
    expect(centsToInput(5)).toBe('0,05')
  })
})
