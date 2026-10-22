import {
  dateRange,
  interval,
  productName,
  shortDate,
  timesBought,
  unitPrice,
} from '../format'

describe('product formatting', () => {
  it('puts receipt names in sentence case', () => {
    expect(productName('BONI GER. EM.LIGHT 250G')).toBe(
      'Boni ger. em.light 250g',
    )
  })

  it('writes short dates', () => {
    expect(shortDate('2026-03-26', 2026)).toBe('26 Mar')
    expect(shortDate('2025-12-01', 2026)).toBe('1 Dec 2025')
    expect(dateRange('2026-01-02', '2026-09-28')).toBe('2 Jan – 28 Sep 2026')
    expect(dateRange('2025-11-02', '2026-09-28')).toBe(
      '2 Nov 2025 – 28 Sep 2026',
    )
    expect(dateRange('2026-01-02', '2026-01-02')).toBe('2 Jan 2026')
  })

  it('says how often in the unit that reads best', () => {
    expect(interval(1)).toBe('every day')
    expect(interval(4.6)).toBe('every 5 days')
    expect(interval(14)).toBe('every 2 weeks')
    expect(interval(83)).toBe('every 3 months')
  })

  it('writes prices per piece or per kg', () => {
    expect(unitPrice(189, true)).toBe('€ 1,89/kg')
    expect(unitPrice(460, false)).toBe('€ 4,60')
    expect(timesBought(1)).toBe('Bought once')
    expect(timesBought(3)).toBe('Bought 3 times')
  })
})
